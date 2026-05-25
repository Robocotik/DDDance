import type { FrameScore } from '@/api/users/compare';
import React, { useEffect, useRef } from 'react';
import styles from './FrameScoreTimeline.module.scss';

interface FrameScoreTimelineProps {
	frameScores: FrameScore[];
	/** Текущее время воспроизведения видео в секундах (для подсветки). null — нет привязки. */
	currentTime?: number | null;
	/** Колбэк при клике/перетаскивании, ms-точное seek в видео. */
	onSeek?: (timeSec: number) => void;
}

/**
 * Цветной таймлайн: каждый кадр — вертикальная полоска.
 * error 0..1 → цвет: 0–0.2 зелёный, 0.2–0.5 жёлтый, >0.5 красный.
 * Над полосой — подвижный маркер currentTime.
 */
const errorColor = (e: number): string => {
	if (e <= 0.2) return '#5be0a0';
	if (e <= 0.5) return '#f5c542';
	return '#ff6b6b';
};

const FrameScoreTimeline: React.FC<FrameScoreTimelineProps> = ({
	frameScores,
	currentTime,
	onSeek,
}) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const durationRef = useRef(0);

	const duration =
		frameScores.length > 0
			? frameScores[frameScores.length - 1].time_sec
			: 0;
	durationRef.current = duration;

	useEffect(() => {
		const wrapper = wrapperRef.current;
		const canvas = canvasRef.current;
		if (!wrapper || !canvas || frameScores.length === 0) return;

		const ro = new ResizeObserver(() => draw());
		ro.observe(wrapper);
		draw();
		return () => ro.disconnect();

		function draw() {
			const w = wrapper!.clientWidth || 800;
			const h = 48;
			canvas!.width = w * window.devicePixelRatio;
			canvas!.height = h * window.devicePixelRatio;
			canvas!.style.width = `${w}px`;
			canvas!.style.height = `${h}px`;

			const ctx = canvas!.getContext('2d');
			if (!ctx) return;
			ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
			ctx.clearRect(0, 0, w, h);

			if (duration <= 0) return;

			// Группируем кадры в столбцы пикселя — для длинных видео.
			const N = frameScores.length;
			const stepPx = Math.max(1, Math.floor(w / N));
			for (let i = 0; i < N; i++) {
				const fs = frameScores[i];
				const x = Math.floor((fs.time_sec / duration) * w);
				ctx.fillStyle = errorColor(fs.error);
				ctx.fillRect(x, 0, stepPx, h);
			}
		}
	}, [frameScores, duration]);

	const handlePointer = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!onSeek || duration <= 0) return;
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		const rect = wrapper.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		onSeek(ratio * duration);
	};

	const markerLeft =
		currentTime != null && duration > 0
			? `${Math.max(0, Math.min(100, (currentTime / duration) * 100))}%`
			: null;

	const hits = frameScores.filter((f) => f.error <= 0.2).length;
	const mid = frameScores.filter((f) => f.error > 0.2 && f.error <= 0.5).length;
	const miss = frameScores.filter((f) => f.error > 0.5).length;

	return (
		<div className={styles.wrapper}>
			<div
				ref={wrapperRef}
				className={`${styles.canvasWrap} ${onSeek ? styles.clickable : ''}`}
				onClick={handlePointer}
			>
				<canvas ref={canvasRef} className={styles.canvas} />
				{markerLeft && (
					<div className={styles.marker} style={{ left: markerLeft }} />
				)}
			</div>
			<div className={styles.legend}>
				<span>
					<span
						className={styles.swatch}
						style={{ background: '#5be0a0' }}
					/>
					точно ({hits})
				</span>
				<span>
					<span
						className={styles.swatch}
						style={{ background: '#f5c542' }}
					/>
					средне ({mid})
				</span>
				<span>
					<span
						className={styles.swatch}
						style={{ background: '#ff6b6b' }}
					/>
					промах ({miss})
				</span>
			</div>
		</div>
	);
};

export default FrameScoreTimeline;
