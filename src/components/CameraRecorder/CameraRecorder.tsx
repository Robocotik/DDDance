import React, { useEffect, useRef, useState } from 'react';
import Icon from '../Icon/Icon';
import styles from './CameraRecorder.module.scss';

type RecorderState = 'idle' | 'countdown' | 'recording' | 'done';

interface CameraRecorderProps {
	referenceVideoUrl: string | null;
	onDone: (blob: Blob) => void;
	onBack: () => void;
}

const CameraRecorder: React.FC<CameraRecorderProps> = ({
	referenceVideoUrl,
	onDone,
	onBack,
}) => {
	const cameraRef = useRef<HTMLVideoElement>(null);
	const referenceRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const canvasRafRef = useRef<number | null>(null);

	const [state, setState] = useState<RecorderState>('idle');
	const [countdown, setCountdown] = useState(3);
	const [error, setError] = useState<string | null>(null);
	const [recordingTime, setRecordingTime] = useState(0);

	useEffect(() => {
		const video = referenceRef.current;

		if (!video) {
			return;
		}

		const handleEnded = () => {
			stopRecording();
		};

		video.addEventListener('ended', handleEnded);
		return () => video.removeEventListener('ended', handleEnded);
	}, []);

	useEffect(() => {
		let cancelled = false;

		const initCamera = async () => {
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const videoInputs = devices.filter((d) => d.kind === 'videoinput');

				if (videoInputs.length === 0) {
					throw new Error('No video input devices found');
				}

				const stream = await navigator.mediaDevices.getUserMedia({
					video: {
						width: { ideal: 1280 },
						height: { ideal: 720 },
					},
					audio: false,
				});

				if (cancelled) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}

				streamRef.current = stream;

				if (cameraRef.current) {
					cameraRef.current.srcObject = stream;
				}

				if (videoInputs.length > 0) {
					try {
						const audioStream = await navigator.mediaDevices.getUserMedia({
							audio: true,
						});

						if (!cancelled) {
							audioStream
								.getTracks()
								.forEach((track) => stream.addTrack(track));
						} else {
							audioStream.getTracks().forEach((t) => t.stop());
						}
					} catch {}
				}
			} catch (err: any) {
				if (cancelled) {
					return;
				}

				if (
					err.name === 'NotFoundError' ||
					err.message?.includes('not found')
				) {
					setError(
						'Камера не найдена браузером. Проверьте: 1) Камера подключена 2) Не используется другой программой 3) Разрешения ОС',
					);
				} else if (err.name === 'NotAllowedError') {
					setError(
						'Доступ к камере запрещён. Нажмите на иконку замка в адресной строке и разрешите доступ.',
					);
				} else if (err.name === 'NotReadableError') {
					setError(
						'Камера занята. Закройте Zoom, Skype, Teams или другие приложения.',
					);
				} else {
					setError(`Ошибка камеры: ${err.message || 'Неизвестная ошибка'}`);
				}
			}
		};

		initCamera();

		return () => {
			cancelled = true;

			if (canvasRafRef.current) {
				cancelAnimationFrame(canvasRafRef.current);
			}

			streamRef.current?.getTracks().forEach((t) => t.stop());
		};
	}, []);

	useEffect(() => {
		if (state !== 'recording') {
			return;
		}

		const interval = setInterval(() => {
			setRecordingTime((t) => t + 1);
		}, 1000);

		return () => clearInterval(interval);
	}, [state]);

	const startCountdown = () => {
		setState('countdown');
		setCountdown(3);

		let count = 3;
		const interval = setInterval(() => {
			count--;
			setCountdown(count);

			if (count === 0) {
				clearInterval(interval);
				startRecording();
			}
		}, 1000);
	};

	const startRecording = () => {
		if (!streamRef.current) {
			return;
		}

		chunksRef.current = [];
		setRecordingTime(0);

		const videoTrack = streamRef.current.getVideoTracks()[0];
		const settings = videoTrack.getSettings();
		const width = settings.width || 1280;
		const height = settings.height || 720;

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d')!;

		const sourceVideo = cameraRef.current!;

		const drawFrame = () => {
			if (recorderRef.current?.state === 'recording') {
				ctx.save();
				ctx.translate(width, 0);
				ctx.scale(-1, 1);
				ctx.drawImage(sourceVideo, 0, 0, width, height);
				ctx.restore();
				canvasRafRef.current = requestAnimationFrame(drawFrame);
			}
		};

		const canvasStream = canvas.captureStream(30);

		streamRef.current.getAudioTracks().forEach((track) => {
			canvasStream.addTrack(track);
		});

		const recorder = new MediaRecorder(canvasStream, {
			mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
				? 'video/webm;codecs=vp9'
				: 'video/webm',
		});

		recorder.ondataavailable = (e) => {
			if (e.data.size > 0) {
				chunksRef.current.push(e.data);
			}
		};

		recorder.onstop = () => {
			cancelAnimationFrame(canvasRafRef.current!);
			const blob = new Blob(chunksRef.current, { type: 'video/webm' });
			onDone(blob);
		};

		recorder.start(100);
		recorderRef.current = recorder;
		canvasRafRef.current = requestAnimationFrame(drawFrame);
		setState('recording');

		if (referenceRef.current) {
			referenceRef.current.currentTime = 0;
			referenceRef.current.play().catch(() => {});
		}
	};

	const stopRecording = () => {
		recorderRef.current?.stop();
		referenceRef.current?.pause();
		setState('done');
	};

	const fmt = (sec: number) => {
		const m = Math.floor(sec / 60)
			.toString()
			.padStart(2, '0');

		const s = (sec % 60).toString().padStart(2, '0');
		return `${m}:${s}`;
	};

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<button className={styles.backBtn} onClick={onBack}>
					← Назад
				</button>
				<h2 className={styles.title}>Запись с камеры</h2>
			</div>

			{error && <p className={styles.error}>{error}</p>}

			<div className={styles.screens}>
				<div className={styles.screen}>
					<span className={styles.screenLabel}>Эталон</span>
					{referenceVideoUrl ? (
						<video
							ref={referenceRef}
							src={referenceVideoUrl}
							className={styles.video}
							muted
							playsInline
						/>
					) : (
						<div className={styles.noVideo}>Видео недоступно</div>
					)}
				</div>

				<div className={styles.screen}>
					<span className={styles.screenLabel}>Вы</span>
					<video
						ref={cameraRef}
						className={styles.video}
						autoPlay
						muted
						playsInline
					/>
					{state === 'recording' && (
						<div className={styles.recBadge}>⏺ {fmt(recordingTime)}</div>
					)}
				</div>
			</div>

			{state === 'countdown' && (
				<div className={styles.countdownOverlay}>
					<span className={styles.countdownNumber}>{countdown}</span>
				</div>
			)}

			<div className={styles.controls}>
				{state === 'idle' && !error && (
					<button className={styles.startBtn} onClick={startCountdown}>
						<Icon name="play" size="1em" alt="" /> Начать запись
					</button>
				)}
				{state === 'recording' && (
					<button className={styles.stopBtn} onClick={stopRecording}>
						<Icon name="stop" size="1em" alt="" /> Остановить
					</button>
				)}
				{state === 'done' && (
					<p className={styles.doneMsg}>Обрабатываем запись...</p>
				)}
			</div>
		</div>
	);
};

export default CameraRecorder;
