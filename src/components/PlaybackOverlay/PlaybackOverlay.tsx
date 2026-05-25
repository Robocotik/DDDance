import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import Icon from '../Icon/Icon';
import styles from './PlaybackOverlay.module.scss';
import {
	drawSkeleton,
	nearestIndex,
	type SkeletonData,
	type SkeletonFrame,
} from './skeletonDraw';

interface PlaybackOverlayProps {
	/** S3 URL до видео пользователя; если undefined — рисуем только скелет. */
	userVideoUrl?: string;
	userSkeletonUrl: string;
	/** Эталонная сторона side-by-side; если оба undefined — режим single. */
	referenceVideoUrl?: string;
	referenceSkeletonUrl?: string;
	maxPanelHeight?: number;
}

const SPEEDS = [0.5, 0.75, 1, 1.5] as const;
const DEFAULT_ASPECT = 9 / 16;
/** Порог дрейфа для жёсткого seek'а (в секундах). */
const HARD_SEEK_THRESHOLD = 2.0;
/** Порог дрейфа для мягкой коррекции playbackRate. */
const SOFT_SYNC_THRESHOLD = 0.08;

function useSkeletonLoader(url: string | undefined) {
	const [data, setData] = useState<SkeletonData | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!url) {
			setData(null);
			setError(null);
			return;
		}
		let cancelled = false;
		setError(null);
		setData(null);
		fetch(url)
			.then(async (r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return (await r.json()) as SkeletonData;
			})
			.then((d) => {
				if (!cancelled) setData(d);
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				setError(e instanceof Error ? e.message : 'load failed');
			});
		return () => {
			cancelled = true;
		};
	}, [url]);

	return { data, error };
}

function useCanvasSize(
	containerRef: React.RefObject<HTMLDivElement | null>,
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	enabled: boolean,
) {
	useEffect(() => {
		if (!enabled) return;
		const container = containerRef.current;
		const canvas = canvasRef.current;
		if (!container || !canvas) return;
		const fit = () => {
			const w = container.clientWidth;
			const h = container.clientHeight;
			if (w === 0 || h === 0) return;
			canvas.width = Math.round(w * window.devicePixelRatio);
			canvas.height = Math.round(h * window.devicePixelRatio);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
		};
		fit();
		const ro = new ResizeObserver(fit);
		ro.observe(container);
		return () => ro.disconnect();
	}, [containerRef, canvasRef, enabled]);
}

interface PanelProps {
	label: string;
	videoUrl?: string;
	skeleton: SkeletonData | null;
	containerRef: React.RefObject<HTMLDivElement | null>;
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	videoRef: React.RefObject<HTMLVideoElement | null>;
	aspect: number;
	maxHeight: number;
	muted: boolean;
	onVideoError?: () => void;
	videoFailed?: boolean;
}

const PlaybackPanel: React.FC<PanelProps> = ({
	label,
	videoUrl,
	skeleton,
	containerRef,
	canvasRef,
	videoRef,
	aspect,
	maxHeight,
	muted,
	onVideoError,
	videoFailed,
}) => {
	useCanvasSize(containerRef, canvasRef, !!skeleton);
	const containerStyle: React.CSSProperties = {
		aspectRatio: `${aspect}`,
		maxHeight,
	};
	// Показываем видео-элемент пока URL есть (даже если упало — для onError),
	// но прячем визуально при ошибке чтобы не оставалась чёрная заглушка браузера.
	const hasVideoUrl = !!videoUrl;
	const showVideoEl = hasVideoUrl;
	const showVideoVisually = hasVideoUrl && !videoFailed;
	const showSkeletonHint = skeleton && ((!hasVideoUrl) || videoFailed);
	return (
		<div className={styles.panel}>
			<div className={styles.panelLabel}>{label}</div>
			<div
				ref={containerRef}
				className={`${styles.viewport} ${showVideoVisually ? '' : styles.viewportNoVideo}`}
				style={containerStyle}
			>
				{showVideoEl && (
					<video
						ref={videoRef}
						src={videoUrl}
						className={styles.video}
						style={videoFailed ? { display: 'none' } : undefined}
						playsInline
						preload="auto"
						muted={muted}
						disablePictureInPicture
						disableRemotePlayback
						onError={onVideoError}
					/>
				)}
				<canvas ref={canvasRef} className={styles.canvas} />
				{showSkeletonHint && (
					<div className={styles.noVideoHint}>
						{videoFailed ? 'Видео недоступно — только скелет' : 'Видео не сохранено — только скелет'}
					</div>
				)}
			</div>
		</div>
	);
};

const PlaybackOverlay: React.FC<PlaybackOverlayProps> = ({
	userVideoUrl,
	userSkeletonUrl,
	referenceVideoUrl,
	referenceSkeletonUrl,
	maxPanelHeight = 480,
}) => {
	const { data: userSkeleton, error: userErr } = useSkeletonLoader(userSkeletonUrl);
	const { data: refSkeleton, error: refErr } = useSkeletonLoader(referenceSkeletonUrl);

	const hasReference = !!(referenceSkeletonUrl) && !refErr;

	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0); // натуральная длительность видео пользователя
	const [refDuration, setRefDuration] = useState(0); // натуральная длительность эталона
	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState<number>(1);
	/** true когда <video> для юзера вернул onError (файл недоступен / CORS) */
	const [userVideoFailed, setUserVideoFailed] = useState(false);
	/** true когда оба видео (юзера и эталона, если есть) полностью забуферизированы.
	 * Пока false — кнопка play заблокирована и показывается оверлей загрузки, чтобы
	 * избежать рассинхрона из-за подгрузки во время воспроизведения. */
	const [userVideoReady, setUserVideoReady] = useState(false);
	const [refVideoReady, setRefVideoReady] = useState(false);
	/** Звук берётся из видео пользователя. По умолчанию выключен (автоплей-полиси). */
	const [userMuted, setUserMuted] = useState(true);
	/** Показывать ли разметку MediaPipe-скелета поверх видео. */
	const [showSkeleton, setShowSkeleton] = useState(true);

	// "Эффективный" флаг наличия видео: URL есть И он не упал.
	const hasUserVideo = !!userVideoUrl && !userVideoFailed;

	const userContainerRef = useRef<HTMLDivElement>(null);
	const userCanvasRef = useRef<HTMLCanvasElement>(null);
	const userVideoRef = useRef<HTMLVideoElement>(null);
	const refContainerRef = useRef<HTMLDivElement>(null);
	const refCanvasRef = useRef<HTMLCanvasElement>(null);
	const refVideoRef = useRef<HTMLVideoElement>(null);

	const clockRef = useRef(0); // часы для no-video режима
	const lastTickRef = useRef(0);
	const rafRef = useRef<number | null>(null);

	// Длительность мастера: HTML video onLoadedMetadata перезапишет, а пока
	// fallback'имся на длительность скелета (last frame .t).
	useEffect(() => {
		if (hasUserVideo) return;
		if (!userSkeleton) return;
		const last = userSkeleton.frames[userSkeleton.frames.length - 1];
		setDuration(last ? last.t : userSkeleton.num_frames / Math.max(userSkeleton.fps, 1));
	}, [hasUserVideo, userSkeleton]);

	useEffect(() => {
		if (referenceVideoUrl) return;
		if (!refSkeleton) return;
		const last = refSkeleton.frames[refSkeleton.frames.length - 1];
		setRefDuration(last ? last.t : refSkeleton.num_frames / Math.max(refSkeleton.fps, 1));
	}, [referenceVideoUrl, refSkeleton]);

	// playbackRate обоих видео
	useEffect(() => {
		if (userVideoRef.current) userVideoRef.current.playbackRate = speed;
		if (refVideoRef.current) refVideoRef.current.playbackRate = speed;
	}, [speed]);

	// Сброс готовности при смене URL. Ждём полной загрузки, чтобы избежать
	// stalling-рассинхрона во время воспроизведения.
	useEffect(() => {
		setUserVideoReady(false);
	}, [userVideoUrl]);
	useEffect(() => {
		setRefVideoReady(false);
	}, [referenceVideoUrl]);

	// Ждём canplaythrough для юзер-видео (мастер).
	useEffect(() => {
		const v = userVideoRef.current;
		if (!hasUserVideo || !v) {
			setUserVideoReady(true); // нет видео — нечего ждать
			return;
		}
		const onReady = () => setUserVideoReady(true);
		v.addEventListener('canplaythrough', onReady);
		v.addEventListener('loadeddata', () => {
			if (v.readyState >= 4) setUserVideoReady(true);
		});
		if (v.readyState >= 4) setUserVideoReady(true);
		return () => {
			v.removeEventListener('canplaythrough', onReady);
		};
	}, [hasUserVideo, userVideoUrl]);

	// Ждём canplaythrough для эталонного видео (если оно есть).
	useEffect(() => {
		const v = refVideoRef.current;
		const refUrlPresent = typeof referenceVideoUrl === 'string' && referenceVideoUrl.length > 0;
		if (!refUrlPresent || !v) {
			setRefVideoReady(true);
			return;
		}
		const onReady = () => setRefVideoReady(true);
		const onMeta = () => {
			if (isFinite(v.duration) && v.duration > 0) {
				setRefDuration(v.duration);
			}
		};
		v.addEventListener('canplaythrough', onReady);
		v.addEventListener('loadedmetadata', onMeta);
		v.addEventListener('loadeddata', () => {
			if (v.readyState >= 4) setRefVideoReady(true);
		});
		if (v.readyState >= 4) setRefVideoReady(true);
		if (isFinite(v.duration) && v.duration > 0) setRefDuration(v.duration);
		return () => {
			v.removeEventListener('canplaythrough', onReady);
			v.removeEventListener('loadedmetadata', onMeta);
		};
	}, [referenceVideoUrl]);

	const videosReady = userVideoReady && refVideoReady;

	// Эффективная длительность — min(пользователь, эталон). Оба видео обрезаются
	// до этого порога и зацикливаются, чтобы «более длинное» не пыталось
	// угнаться за «более коротким» через растягивание скорости (старый баг).
	// Если одна из длительностей ещё неизвестна — используем ту, что есть.
	const effectiveDuration = useMemo(() => {
		if (duration > 0 && refDuration > 0) {
			return Math.min(duration, refDuration);
		}
		return Math.max(duration, refDuration);
	}, [duration, refDuration]);

	// Применяем mute к юзер-видео динамически.
	useEffect(() => {
		const v = userVideoRef.current;
		if (v) v.muted = userMuted;
	}, [userMuted, hasUserVideo]);

	const findFrame = useCallback(
		(skel: SkeletonData | null, t: number): SkeletonFrame | null => {
			if (!skel || skel.frames.length === 0) return null;
			const idx = nearestIndex(skel.frames, t, (f) => f.t);
			return idx >= 0 ? skel.frames[idx] : null;
		},
		[],
	);

	const clearCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
	}, []);

	const drawAll = useCallback(
		(masterTime: number) => {
			if (!showSkeleton) {
				clearCanvas(userCanvasRef.current);
				clearCanvas(refCanvasRef.current);
				return;
			}
			// Покадровая раскраска снята вместе с FrameScoreTimeline —
			// рисуем оба скелета базовым белым.
			// ВАЖНО: для каждого скелета берём время ЕГО видео, а не общий
			// masterTime. Эталон может дрейфовать относительно мастера до
			// SOFT_SYNC_THRESHOLD — если рисовать его по masterTime, скелет
			// «не догоняет» видео, что и выглядит как рассинхрон разметки.
			const userCanvas = userCanvasRef.current;
			const userVideo = userVideoRef.current;
			if (userCanvas && userSkeleton) {
				const userTime = hasUserVideo && userVideo
					? userVideo.currentTime
					: masterTime;
				const frame = findFrame(userSkeleton, userTime);
				if (frame) {
					drawSkeleton({
						canvas: userCanvas,
						frame,
						baseColor: '#ffffff',
						videoWidth: userSkeleton.width,
						videoHeight: userSkeleton.height,
					});
				}
			}
			// Reference side: время — currentTime эталонного видео.
			if (hasReference && refCanvasRef.current && refSkeleton) {
				const refVideo = refVideoRef.current;
				const refTime = refVideo ? refVideo.currentTime : masterTime;
				const frame = findFrame(refSkeleton, refTime);
				if (frame) {
					drawSkeleton({
						canvas: refCanvasRef.current,
						frame,
						baseColor: '#ffffff',
						videoWidth: refSkeleton.width,
						videoHeight: refSkeleton.height,
					});
				}
			}
		},
		[
			showSkeleton,
			clearCanvas,
			userSkeleton,
			refSkeleton,
			hasReference,
			hasUserVideo,
			findFrame,
		],
	);

	// Главный RAF — мастер-источник времени.
	useEffect(() => {
		if (!userSkeleton && !hasUserVideo) return;
		const tick = (ts: number) => {
			const userVideo = userVideoRef.current;
			const refVideo = refVideoRef.current;
			let t: number;
			if (hasUserVideo && userVideo) {
				t = userVideo.currentTime;
				if (userVideo.duration && userVideo.duration !== duration) {
					setDuration(userVideo.duration);
				}
			} else {
				const delta = lastTickRef.current === 0 ? 0 : (ts - lastTickRef.current) / 1000;
				lastTickRef.current = ts;
				if (isPlaying) {
					clockRef.current += delta * speed;
					if (effectiveDuration > 0 && clockRef.current >= effectiveDuration) {
						clockRef.current = 0;
					}
				}
				t = clockRef.current;
			}

			// Зацикливание по k = min(длительность пользователя, длительность эталона).
			// Меньшее видео диктует длину цикла: оба перематываются на 0 в один и тот
			// же тик, эталон не «ускоряется», чтобы догнать. Если effectiveDuration ещё
			// неизвестен (метаданные не подъехали) — пропускаем, позволяем видео идти.
			if (effectiveDuration > 0 && t >= effectiveDuration) {
				if (hasUserVideo && userVideo) {
					try { userVideo.currentTime = 0; } catch { /* ignore */ }
				} else {
					clockRef.current = 0;
				}
				if (refVideo) {
					try { refVideo.currentTime = 0; } catch { /* ignore */ }
				}
				t = 0;
			} else if (refVideo && refDuration > 0 && refVideo.currentTime >= effectiveDuration && effectiveDuration > 0) {
				// Если эталон самостоятельно успел дойти до k раньше пользователя
				// (например, из-за крохотного дрифта), тоже вернём в начало.
				try { refVideo.currentTime = 0; } catch { /* ignore */ }
			}

			// Синхронизация эталонного видео с мастером (без растяжения):
			// при заметном дрейфе мягко правим playbackRate, при большом — seek.
			if (refVideo && !refVideo.paused) {
				const drift = refVideo.currentTime - t;
				if (Math.abs(drift) > HARD_SEEK_THRESHOLD) {
					try { refVideo.currentTime = t; } catch { /* ignore */ }
				} else if (Math.abs(drift) > SOFT_SYNC_THRESHOLD) {
					refVideo.playbackRate = speed * (drift > 0 ? 0.85 : 1.15);
				} else if (refVideo.playbackRate !== speed) {
					refVideo.playbackRate = speed;
				}
			}

			setCurrentTime(t);
			drawAll(t);
			rafRef.current = requestAnimationFrame(tick);
		};
		lastTickRef.current = 0;
		rafRef.current = requestAnimationFrame(tick);
		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		};
	}, [userSkeleton, hasUserVideo, isPlaying, speed, duration, refDuration, effectiveDuration, drawAll]);

	const handleTogglePlay = useCallback(() => {
		if (!videosReady) return; // ждём полной загрузки обоих видео
		const userVideo = userVideoRef.current;
		const refVideo = refVideoRef.current;
		const refUrlPresent = typeof referenceVideoUrl === 'string' && referenceVideoUrl.length > 0;
		if (hasUserVideo && userVideo) {
			// Маршрутизация через нативный play()/pause(): onPlay/onPause-эффект
			// ниже синхронизирует isPlaying и эталонное видео.
			if (userVideo.paused) {
				userVideo.play().catch(() => {});
			} else {
				userVideo.pause();
			}
		} else {
			if (refUrlPresent && refVideo) {
				if (isPlaying) refVideo.pause();
				else refVideo.play().catch(() => {});
			}
			setIsPlaying((p) => !p);
		}
	}, [hasUserVideo, referenceVideoUrl, isPlaying, videosReady]);

	const handleToggleMute = useCallback(() => {
		setUserMuted((m) => !m);
	}, []);

	/** Перемотать оба видео (и часы no-video режима) на указанное время. */
	const handleSeek = useCallback(
		(t: number) => {
			const limit = effectiveDuration > 0 ? effectiveDuration : duration;
			const clamped = Math.max(0, Math.min(limit > 0 ? limit : t, t));
			const userVideo = userVideoRef.current;
			const refVideo = refVideoRef.current;
			if (hasUserVideo && userVideo) {
				try { userVideo.currentTime = clamped; } catch { /* ignore */ }
			} else {
				clockRef.current = clamped;
			}
			if (refVideo) {
				try { refVideo.currentTime = clamped; } catch { /* ignore */ }
			}
			setCurrentTime(clamped);
			drawAll(clamped);
		},
		[hasUserVideo, duration, effectiveDuration, drawAll],
	);

	// Когда юзер-видео — мастер, держим isPlaying и refVideo в синхроне.
	useEffect(() => {
		const userVideo = userVideoRef.current;
		if (!hasUserVideo || !userVideo) return;
		const refUrlPresent = typeof referenceVideoUrl === 'string' && referenceVideoUrl.length > 0;
		const onPlay = () => {
			setIsPlaying(true);
			const refVideo = refVideoRef.current;
			if (refUrlPresent && refVideo) refVideo.play().catch(() => {});
		};
		const onPause = () => {
			setIsPlaying(false);
			const refVideo = refVideoRef.current;
			if (refUrlPresent && refVideo) refVideo.pause();
		};
		const onEnded = () => {
			setIsPlaying(false);
		};
		userVideo.addEventListener('play', onPlay);
		userVideo.addEventListener('pause', onPause);
		userVideo.addEventListener('ended', onEnded);
		return () => {
			userVideo.removeEventListener('play', onPlay);
			userVideo.removeEventListener('pause', onPause);
			userVideo.removeEventListener('ended', onEnded);
		};
	}, [hasUserVideo, referenceVideoUrl]);

	// Аспект каждой панели — из соответствующего скелета.
	const userAspect = useMemo(() => skeletonAspect(userSkeleton), [userSkeleton]);
	const refAspect = useMemo(() => skeletonAspect(refSkeleton), [refSkeleton]);

	// Перемотка через клик/драг по дорожке.
	const seekTrackRef = useRef<HTMLDivElement>(null);
	const draggingRef = useRef(false);
	const wasPlayingRef = useRef(false);

	const seekFromPointer = useCallback(
		(clientX: number) => {
			const track = seekTrackRef.current;
			if (!track) return;
			const rect = track.getBoundingClientRect();
			if (rect.width <= 0) return;
			const total = effectiveDuration > 0 ? effectiveDuration : duration;
			if (total <= 0) return;
			const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
			handleSeek(fraction * total);
		},
		[duration, effectiveDuration, handleSeek],
	);

	const onSeekPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!videosReady) return;
			e.preventDefault();
			(e.target as Element).setPointerCapture?.(e.pointerId);
			draggingRef.current = true;
			wasPlayingRef.current = isPlaying;
			// На драге паузим — иначе RAF сразу перезатрёт seek.
			const userVideo = userVideoRef.current;
			const refVideo = refVideoRef.current;
			if (hasUserVideo && userVideo && !userVideo.paused) userVideo.pause();
			else if (refVideo && !refVideo.paused) refVideo.pause();
			seekFromPointer(e.clientX);
		},
		[hasUserVideo, isPlaying, seekFromPointer, videosReady],
	);

	const onSeekPointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!draggingRef.current) return;
			seekFromPointer(e.clientX);
		},
		[seekFromPointer],
	);

	const onSeekPointerUp = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!draggingRef.current) return;
			(e.target as Element).releasePointerCapture?.(e.pointerId);
			draggingRef.current = false;
			if (wasPlayingRef.current) {
				const userVideo = userVideoRef.current;
				const refVideo = refVideoRef.current;
				if (hasUserVideo && userVideo) userVideo.play().catch(() => {});
				else if (refVideo) refVideo.play().catch(() => {});
			}
		},
		[hasUserVideo],
	);

	if (!userSkeleton && !userErr && !hasUserVideo) {
		return (
			<div className={styles.loading}>
				<p>Загружаем разбор движений…</p>
			</div>
		);
	}

	if (!userSkeleton && userErr && !hasUserVideo) {
		return (
			<div className={styles.error}>
				<p>Не удалось загрузить анализ движений</p>
			</div>
		);
	}

	return (
		<div className={styles.wrapper}>
			<div className={`${styles.panels} ${hasReference ? styles.panelsTwo : ''}`}>
				<PlaybackPanel
					label="Ты"
					videoUrl={userVideoUrl}
					skeleton={userSkeleton}
					containerRef={userContainerRef}
					canvasRef={userCanvasRef}
					videoRef={userVideoRef}
					aspect={userAspect}
					maxHeight={maxPanelHeight}
					muted={userMuted}
					onVideoError={() => setUserVideoFailed(true)}
					videoFailed={userVideoFailed}
				/>
				{hasReference && (
					<PlaybackPanel
						label="Эталон"
						videoUrl={referenceVideoUrl}
						skeleton={refSkeleton}
						containerRef={refContainerRef}
						canvasRef={refCanvasRef}
						videoRef={refVideoRef}
						aspect={refAspect}
						maxHeight={maxPanelHeight}
						muted
					/>
				)}
			</div>

			{!videosReady && (
				<div className={styles.bufferHint}>
					<p>Загружаем видео целиком, чтобы избежать рассинхрона…</p>
				</div>
			)}

			<div
				ref={seekTrackRef}
				className={`${styles.seekTrack} ${!videosReady ? styles.seekTrackDisabled : ''}`}
				onPointerDown={onSeekPointerDown}
				onPointerMove={onSeekPointerMove}
				onPointerUp={onSeekPointerUp}
				onPointerCancel={onSeekPointerUp}
				role="slider"
				aria-label="Перемотка"
				aria-valuemin={0}
				aria-valuemax={effectiveDuration > 0 ? effectiveDuration : duration}
				aria-valuenow={currentTime}
			>
				<div
					className={styles.seekFill}
					style={{
						width: `${
							effectiveDuration > 0
								? Math.max(0, Math.min(1, currentTime / effectiveDuration)) * 100
								: 0
						}%`,
					}}
				/>
				<div
					className={styles.seekThumb}
					style={{
						left: `${
							effectiveDuration > 0
								? Math.max(0, Math.min(1, currentTime / effectiveDuration)) * 100
								: 0
						}%`,
					}}
				/>
			</div>

			<div className={styles.controls}>
				<button
					className={styles.playBtn}
					onClick={handleTogglePlay}
					disabled={!videosReady}
					aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
				>
					<Icon
						name={isPlaying ? 'pause' : 'play'}
						size="1.1em"
						alt={isPlaying ? 'Пауза' : 'Воспроизвести'}
					/>
				</button>
				{hasUserVideo && (
					<button
						className={styles.muteBtn}
						onClick={handleToggleMute}
						aria-label={userMuted ? 'Включить звук' : 'Выключить звук'}
						title={userMuted ? 'Включить звук' : 'Выключить звук'}
					>
						<Icon
							name={userMuted ? 'volume-off' : 'volume-on'}
							size="1.1em"
							alt={userMuted ? 'Без звука' : 'Со звуком'}
						/>
					</button>
				)}
				<button
					className={`${styles.muteBtn} ${showSkeleton ? styles.toggleActive : ''}`}
					onClick={() => setShowSkeleton((v) => !v)}
					aria-label={showSkeleton ? 'Скрыть разметку' : 'Показать разметку'}
					title={showSkeleton ? 'Скрыть разметку скелета' : 'Показать разметку скелета'}
				>
					<Icon
						name="eye"
						size="1.1em"
						alt={showSkeleton ? 'Разметка включена' : 'Разметка скрыта'}
					/>
				</button>
				<span className={styles.timeReadout}>
					{formatTime(currentTime)} /{' '}
					{formatTime(effectiveDuration > 0 ? effectiveDuration : duration)}
				</span>
				<div className={styles.speedGroup}>
					{SPEEDS.map((s) => (
						<button
							key={s}
							className={`${styles.speedBtn} ${speed === s ? styles.speedBtnActive : ''}`}
							onClick={() => setSpeed(s)}
						>
							{s}x
						</button>
					))}
				</div>
			</div>

		</div>
	);
};

function skeletonAspect(skel: SkeletonData | null): number {
	if (skel && skel.width > 0 && skel.height > 0) {
		return skel.width / skel.height;
	}
	return DEFAULT_ASPECT;
}

function formatTime(sec: number): string {
	if (!isFinite(sec) || sec < 0) sec = 0;
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec - m * 60);
	const ms = Math.floor((sec - Math.floor(sec)) * 10);
	return `${m}:${String(s).padStart(2, '0')}.${ms}`;
}

export default PlaybackOverlay;
