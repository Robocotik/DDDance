import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../Icon/Icon';
import styles from './VideoEditor.module.scss';

type DragHandle = 'start' | 'end' | null;

interface VideoEditorProps {
	videoBlob: Blob;
	onBack: () => void;
	onSubmit: (blob: Blob, startTime: number, endTime: number) => void;
	submitting?: boolean;
	maxDuration?: number;
}

const fmt = (sec: number) => {
	const m = Math.floor(sec / 60)
		.toString()
		.padStart(2, '0');
	const s = Math.floor(sec % 60)
		.toString()
		.padStart(2, '0');
	return `${m}:${s}`;
};

const VideoEditor: React.FC<VideoEditorProps> = ({
	videoBlob,
	onBack,
	onSubmit,
	submitting = false,
	maxDuration,
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const loopRafRef = useRef<number | null>(null);

	const [duration, setDuration] = useState(0);
	const [startTime, setStartTime] = useState(0);
	const [endTime, setEndTime] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [dragging, setDragging] = useState<DragHandle>(null);
	const [durationWarning, setDurationWarning] = useState(false);

	const startRef = useRef(0);
	const endRef = useRef(0);
	const durationHackActiveRef = useRef(false);

	useEffect(() => {
		startRef.current = startTime;
	}, [startTime]);
	useEffect(() => {
		endRef.current = endTime;
	}, [endTime]);

	useEffect(() => {
		return () => {
			if (loopRafRef.current) cancelAnimationFrame(loopRafRef.current);
		};
	}, []);

	useEffect(() => {
		const url = URL.createObjectURL(videoBlob);
		const video = videoRef.current;
		if (!video) return;

		durationHackActiveRef.current = false;
		video.src = url;
		video.load();

		const applyDuration = (dur: number) => {
			setDuration(dur);
			setEndTime(dur);
			endRef.current = dur;
		};

		const handleLoadedMetadata = () => {
			const dur = video.duration;
			if (isFinite(dur) && dur > 0) {
				applyDuration(dur);
			} else {
				durationHackActiveRef.current = true;
				video.currentTime = 1e10;
			}
		};

		const handleSeeked = () => {
			if (!durationHackActiveRef.current) return;
			const dur = video.duration;
			if (isFinite(dur) && dur > 0) {
				durationHackActiveRef.current = false;
				applyDuration(dur);
				video.currentTime = 0;
			}
		};

		const handleDurationChange = () => {
			const dur = video.duration;
			if (isFinite(dur) && dur > 0 && !durationHackActiveRef.current) {
				applyDuration(dur);
			}
		};

		video.addEventListener('loadedmetadata', handleLoadedMetadata);
		video.addEventListener('seeked', handleSeeked);
		video.addEventListener('durationchange', handleDurationChange);

		return () => {
			video.removeEventListener('loadedmetadata', handleLoadedMetadata);
			video.removeEventListener('seeked', handleSeeked);
			video.removeEventListener('durationchange', handleDurationChange);
			URL.revokeObjectURL(url);
		};
	}, [videoBlob]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || duration === 0) return;

		const checkLoop = () => {
			if (!durationHackActiveRef.current && !video.paused) {
				if (video.currentTime < startRef.current) {
					video.currentTime = startRef.current;
				} else if (video.currentTime >= endRef.current) {
					video.currentTime = startRef.current;
				}
			}
			loopRafRef.current = requestAnimationFrame(checkLoop);
		};

		loopRafRef.current = requestAnimationFrame(checkLoop);
		return () => {
			if (loopRafRef.current) cancelAnimationFrame(loopRafRef.current);
		};
	}, [duration]);

	const seekAndPlay = useCallback((time: number) => {
		const video = videoRef.current;
		if (!video) return;
		video.currentTime = time;
		if (video.paused) video.play().catch(() => {});
	}, []);

	const getTimeFromPointer = useCallback(
		(clientX: number): number => {
			const track = trackRef.current;
			if (!track || duration === 0) return 0;
			const rect = track.getBoundingClientRect();
			const ratio = Math.max(
				0,
				Math.min(1, (clientX - rect.left) / rect.width),
			);
			return ratio * duration;
		},
		[duration],
	);

	const handleMouseMove = useCallback(
		(e: MouseEvent | Touch) => {
			if (!dragging) return;
			const t = getTimeFromPointer((e as MouseEvent).clientX);
			if (dragging === 'start') {
				const newStart = Math.max(0, Math.min(t, endRef.current - 0.5));
				setStartTime(newStart);
				seekAndPlay(newStart);
			} else {
				const newEnd = Math.min(duration, Math.max(t, startRef.current + 0.5));
				setEndTime(newEnd);
			}
			setDurationWarning(false);
		},
		[dragging, getTimeFromPointer, duration, seekAndPlay],
	);

	const handleMouseUp = useCallback(() => setDragging(null), []);

	useEffect(() => {
		if (!dragging) return;
		const onMove = (e: MouseEvent) => handleMouseMove(e);
		const onTouchMove = (e: TouchEvent) => handleMouseMove(e.touches[0] as any);
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', handleMouseUp);
		window.addEventListener('touchmove', onTouchMove);
		window.addEventListener('touchend', handleMouseUp);
		return () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('touchmove', onTouchMove);
			window.removeEventListener('touchend', handleMouseUp);
		};
	}, [dragging, handleMouseMove, handleMouseUp]);

	const clipDuration = endTime - startTime;
	const isTooLong = maxDuration !== undefined && clipDuration > maxDuration;

	const handleSubmit = () => {
		setError(null);

		if (isTooLong) {
			setDurationWarning(true);
			return;
		}

		setDurationWarning(false);
		onSubmit(videoBlob, startTime, endTime);
	};

	const startPct = duration > 0 ? (startTime / duration) * 100 : 0;
	const endPct = duration > 0 ? (endTime / duration) * 100 : 100;

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<button className={styles.backBtn} onClick={onBack}>
					← Назад
				</button>
				<h2 className={styles.title}>Редактор видео</h2>
			</div>

			{error && <p className={styles.error}>{error}</p>}

			<div className={styles.layout}>
				<div className={styles.videoWrapper}>
					<video
						ref={videoRef}
						className={styles.video}
						autoPlay
						muted
						playsInline
						loop
					/>
				</div>

				<div className={styles.controls}>
					<div className={styles.timeInfo}>
						<div className={styles.timeChip}>
							<span className={styles.timeChipLabel}>Начало</span>
							<span className={styles.timeChipValue}>{fmt(startTime)}</span>
						</div>
						<span className={styles.timeSeparator}>→</span>
						<div className={styles.timeChip}>
							<span className={styles.timeChipLabel}>Конец</span>
							<span className={styles.timeChipValue}>{fmt(endTime)}</span>
						</div>
					</div>

					<div className={styles.durationChip}>
						Длительность:{' '}
						<strong>{duration > 0 ? fmt(clipDuration) : '—'}</strong>
						{maxDuration !== undefined && (
							<span
								className={isTooLong ? styles.durationBad : styles.durationGood}
							>
								{' '}
								/ макс. {fmt(maxDuration)}
							</span>
						)}
					</div>

					{duration > 0 && (
						<div className={styles.trackWrapper}>
							<div className={styles.track} ref={trackRef}>
								<div
									className={styles.trackInactive}
									style={{ left: 0, width: `${startPct}%` }}
								/>
								<div
									className={styles.trackActive}
									style={{
										left: `${startPct}%`,
										width: `${endPct - startPct}%`,
									}}
								/>
								<div
									className={styles.trackInactive}
									style={{ left: `${endPct}%`, width: `${100 - endPct}%` }}
								/>
								<div
									className={`${styles.handle} ${styles.handleStart} ${dragging === 'start' ? styles.handleDragging : ''}`}
									style={{ left: `${startPct}%` }}
									onMouseDown={(e) => {
										e.preventDefault();
										setDragging('start');
									}}
									onTouchStart={(e) => {
										e.preventDefault();
										setDragging('start');
									}}
								/>
								<div
									className={`${styles.handle} ${styles.handleEnd} ${dragging === 'end' ? styles.handleDragging : ''}`}
									style={{ left: `${endPct}%` }}
									onMouseDown={(e) => {
										e.preventDefault();
										setDragging('end');
									}}
									onTouchStart={(e) => {
										e.preventDefault();
										setDragging('end');
									}}
								/>
							</div>

							<div className={styles.trackLabels}>
								<span>0:00</span>
								<span>{fmt(duration / 2)}</span>
								<span>{fmt(duration)}</span>
							</div>
						</div>
					)}

					{duration === 0 && (
						<p className={styles.durationChip}>Загрузка видео...</p>
					)}

					<button
						className={`${styles.submitBtn} ${isTooLong ? styles.submitBtnDisabled : ''}`}
						onClick={handleSubmit}
						disabled={submitting || duration === 0}
					>
						{submitting ? 'Отправка...' : 'Отправить на анализ'}
					</button>

					{durationWarning && (
						<div className={styles.durationWarning}>
							<Icon
								name="scissors"
								size="1.2em"
								alt=""
								className={styles.durationWarningIcon}
							/>
							<div className={styles.durationWarningText}>
								<strong>Видео слишком длинное</strong>
								<p>
									Твой фрагмент — <strong>{fmt(clipDuration)}</strong>, а танец
									длится <strong>{fmt(maxDuration!)}</strong>. Передвинь ручки
									на шкале, чтобы выбрать более короткий отрезок — оставь самый
									удачный момент.
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default VideoEditor;
