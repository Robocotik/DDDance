import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
	Navigate,
	useNavigate,
	useParams,
	useSearchParams,
} from 'react-router-dom';

import { selectUploadState } from '../../redux/features/upload/selectors';
import {
	resetUpload,
	setShowRating,
} from '../../redux/features/upload/uploadSlice';

import { uploadAndCompare } from '@/redux/features/upload/actions';
import arrowIcon from '../../assets/svg/arrow.svg';
import Button from '../../components/Button/Button';
import CheckYourself from '../../components/CheckYourself/CheckYourself';
import ErrorScreen from '../../components/Error/Error';
import LessonAuthor from '../../components/LessonAuthor/LessonAuthor';
import LessonFinish from '../../components/LessonFinish/LessonFinish';
import LessonStart from '../../components/LessonStart/LessonStart';
import LikeButton from '../../components/LikeButton/LikeButton';
import Loading from '../../components/Loading/Loading';
import RatingForm from '../../components/RatingForm/RatingForm';
import MixamoViewer, {
	type MixamoViewerHandle,
} from '../../components/SkeletonViewer/MixamoViewer';
import { S3_ADDRESS } from '../../consts/urls';
import { fetchHistory } from '../../redux/features/history/actions';
import lessonActions, {
	type DanceAuthor,
} from '../../redux/features/lesson/actions';
import {
	selectLesson,
	selectLessonError,
	selectLessonLoading,
	selectLessonModerationPending,
	selectSegments,
	selectSegmentsLoading,
} from '../../redux/features/lesson/selectors';
import { fetchLikes } from '../../redux/features/likes/actions';
import { selectIsUserAuthenticated } from '../../redux/features/user/selectors';
import type { AppDispatch } from '../../redux/store';

import http from '@/api/http';
import { recordDanceView } from '@/api/dances';
import { getDanceModerationStatus } from '@/api/dances/status';
import Icon from '../../components/Icon/Icon';
import styles from './LessonPage.module.scss';

const VIEW_DEDUP_KEY_PREFIX = 'view_sent_';
const VIEW_DEDUP_MIN_MS = 60 * 1000; // не чаще раза в минуту с одного устройства

function shouldSendView(danceId: string): boolean {
	try {
		const raw = sessionStorage.getItem(VIEW_DEDUP_KEY_PREFIX + danceId);
		if (!raw) return true;
		const last = parseInt(raw, 10);
		return Number.isFinite(last) && Date.now() - last >= VIEW_DEDUP_MIN_MS;
	} catch {
		return true;
	}
}

function markViewSent(danceId: string): void {
	try {
		sessionStorage.setItem(VIEW_DEDUP_KEY_PREFIX + danceId, String(Date.now()));
	} catch {
		/* sessionStorage недоступен — не страшно, бэк сам дедуплицирует */
	}
}

const CACHE_KEY_PREFIX = 'segment_desc_';

function getCacheKey(danceId: string, segmentIdx: number): string {
	return `${CACHE_KEY_PREFIX}${danceId}_${segmentIdx}`;
}

function getCachedDescription(
	danceId: string,
	segmentIdx: number,
): string | null {
	try {
		return localStorage.getItem(getCacheKey(danceId, segmentIdx));
	} catch {
		return null;
	}
}

function setCachedDescription(
	danceId: string,
	segmentIdx: number,
	description: string,
): void {
	try {
		localStorage.setItem(getCacheKey(danceId, segmentIdx), description);
	} catch {
		return;
	}
}

/** Текст-заглушка с бэкенда до готовности LLM-описания */
const PENDING_SEGMENT_DESCRIPTION = /скоро будет описание сегмента/i;

function formatSegmentDescriptionForDisplay(
	text: string | null,
): string | null {
	if (text === null) return null;
	const trimmed = text.trim();
	if (trimmed && PENDING_SEGMENT_DESCRIPTION.test(trimmed)) {
		return 'Готовим описание сегмента';
	}
	return text;
}

function useSegmentDescription(
	danceId: string | undefined,
	segmentIdx: number | null,
) {
	const [description, setDescription] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!danceId || segmentIdx === null || segmentIdx < 0) {
			setDescription(null);
			setLoading(false);
			return;
		}

		const cached = getCachedDescription(danceId, segmentIdx);
		if (cached !== null) {
			setDescription(cached);
			setLoading(false);
			return;
		}

		setLoading(true);
		setDescription(null);

		const controller = new AbortController();

		http
			.get(`/users/dance/${danceId}/segment/${segmentIdx}`, {
				signal: controller.signal,
			})
			.then((res) => {
				const desc: string = res.data.description ?? res.data.text ?? '';
				if (desc.trim() && !PENDING_SEGMENT_DESCRIPTION.test(desc.trim())) {
					setCachedDescription(danceId, segmentIdx, desc);
				}
				setDescription(desc || null);
			})
			.catch((err) => {
				if (err.name !== 'AbortError') {
					// Подсказка генерируется LLM; если сервер описаний недоступен,
					// показываем дружелюбное сообщение вместо тех-деталей.
					setDescription(
						'Подсказка к этому сегменту временно недоступна. Попробуй открыть позже.',
					);
				}
			})
			.finally(() => {
				setLoading(false);
			});

		return () => controller.abort();
	}, [danceId, segmentIdx]);

	return { description, loading };
}

const GPU_ERROR_PREFIX = /^GPU сервер недоступен!/i;

const DescriptionBlock: React.FC<{
	description: string | null;
	loading: boolean;
}> = ({ description, loading }) => {
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		const txt = formatSegmentDescriptionForDisplay(description);
		const isGpuError = txt !== null && GPU_ERROR_PREFIX.test(txt);
		if (!isGpuError) {
			setDismissed(false);
		}
	}, [description]);

	const displayText = formatSegmentDescriptionForDisplay(description);
	if (dismissed) return null;
	if (!loading && !displayText) return null;

	const isDismissible = displayText ? GPU_ERROR_PREFIX.test(displayText) : false;

	return (
		<div className={styles.descriptionBlock}>
			{loading ? (
				<div className={styles.descriptionShimmer}>
					<span className={styles.shimmerDot} />
					<span className={styles.shimmerDot} />
					<span className={styles.shimmerDot} />
				</div>
			) : (
				<>
					<p className={styles.descriptionText}>{displayText}</p>
					{isDismissible && (
						<button
							className={styles.descriptionClose}
							onClick={() => setDismissed(true)}
							aria-label="Закрыть"
						>
							×
						</button>
					)}
				</>
			)}
		</div>
	);
};

interface VideoClipHandle {
	start: () => void;
	pause: () => void;
	resume: () => void;
}

interface VideoClipProps {
	src: string;
	start: number;
	end: number;
	playbackSpeed: number;
	loading: boolean;
	onReady: () => void;
	onLoop: () => void;
}

const VideoClip = forwardRef<VideoClipHandle, VideoClipProps>(
	({ src, start, end, playbackSpeed, loading, onReady, onLoop }, ref) => {
		const videoRef = useRef<HTMLVideoElement>(null);
		const startRef = useRef(start);
		const endRef = useRef(end);
		const onReadyRef = useRef(onReady);
		const onLoopRef = useRef(onLoop);
		const playbackSpeedRef = useRef(playbackSpeed);
		const rafRef = useRef<number | null>(null);
		const isSeekingRef = useRef(false);
		const isLoopingRef = useRef(false);

		useEffect(() => {
			startRef.current = start;
		}, [start]);
		useEffect(() => {
			endRef.current = end;
		}, [end]);
		useEffect(() => {
			onReadyRef.current = onReady;
		}, [onReady]);
		useEffect(() => {
			onLoopRef.current = onLoop;
		}, [onLoop]);
		useEffect(() => {
			playbackSpeedRef.current = playbackSpeed;
		}, [playbackSpeed]);

		useEffect(() => {
			if (videoRef.current && !isSeekingRef.current) {
				videoRef.current.playbackRate = playbackSpeed;
			}
		}, [playbackSpeed]);

		useImperativeHandle(ref, () => ({
			start: () => {
				const video = videoRef.current;
				if (video && !isSeekingRef.current) {
					video.play().catch(() => {});
				}
			},
			pause: () => {
				videoRef.current?.pause();
			},
			resume: () => {
				const video = videoRef.current;
				if (video && !isSeekingRef.current) {
					video.play().catch(() => {});
				}
			},
		}));

		useEffect(() => {
			const video = videoRef.current;
			if (!video || loading) return;

			let destroyed = false;
			isSeekingRef.current = false;
			isLoopingRef.current = false;

			// Запуск loop-каскада: видео в начало → onLoop сбросит модель →
			// после seeked снова стартуем оба синхронно через handleVideoReady.
			const triggerLoop = () => {
				if (destroyed || isSeekingRef.current) return;
				isSeekingRef.current = true;
				isLoopingRef.current = true;
				onLoopRef.current();
				try {
					video.pause();
				} catch {
					/* play() мог быть в полёте — не страшно */
				}
				video.currentTime = startRef.current === 0 ? 0.001 : startRef.current;
			};

			const checkFrame = () => {
				if (destroyed) return;
				// Эффективный конец: min(заявленный end, натуральная duration минус
				// небольшой запас). Без этого, если duration_sec из segments.json
				// чуть больше реальной длины видео, currentTime упирается в
				// video.duration и >= endRef никогда не выполняется → зависание.
				const naturalEnd =
					video.duration && isFinite(video.duration) ? video.duration : Infinity;
				const effectiveEnd = Math.min(endRef.current, naturalEnd - 0.05);
				if (!isSeekingRef.current && video.currentTime >= effectiveEnd) {
					triggerLoop();
				}
				rafRef.current = requestAnimationFrame(checkFrame);
			};

			const handleSeeked = () => {
				if (destroyed) return;
				isSeekingRef.current = false;
				isLoopingRef.current = false;
				video.playbackRate = playbackSpeedRef.current;
				onReadyRef.current();
			};

			// Страховка от того, что RAF опоздает: если браузер сам поднимет
			// событие 'ended' (currentTime достиг video.duration) — запускаем
			// тот же loop-каскад. Иначе видео остаётся «замёрзшим» в конце,
			// а 3D-модель продолжает танцевать → рассинхрон.
			const handleEnded = () => {
				triggerLoop();
			};

			video.addEventListener('seeked', handleSeeked);
			video.addEventListener('ended', handleEnded);

			isSeekingRef.current = true;
			const safeStart = start === 0 ? 0.001 : start;
			video.currentTime = safeStart;

			rafRef.current = requestAnimationFrame(checkFrame);

			return () => {
				destroyed = true;
				if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
				video.removeEventListener('seeked', handleSeeked);
				video.removeEventListener('ended', handleEnded);
				video.pause();
			};
		}, [src, start, end, loading]);

		return (
			<div className={styles.videoClipWrapper}>
				{loading && <div className={styles.videoLoading}>Загрузка...</div>}
				<video
					ref={videoRef}
					src={src}
					muted
					playsInline
					preload="auto"
					className={styles.videoElement}
					controlsList="nofullscreen nodownload noremoteplayback"
					disablePictureInPicture
					disableRemotePlayback
				/>
			</div>
		);
	},
);

interface LessonLayoutProps {
	danceId: string;
	glbPath: string | null;
	stepLabel: string;
	author?: DanceAuthor;
	currentStepNumber?: number;
	totalSteps?: number;
	videoTimes?: { start: number; end: number } | null;
	videoUrl: string | null;
	isFullDance: boolean;
	playbackSpeed: number;
	segmentsLoading: boolean;
	lessonDuration: number;
	lastStep: number | null;
	description: string | null;
	descriptionLoading: boolean;
	preloadGlbPath?: string | null;
	onSpeedChange: (speed: number) => void;
	onNavigate: (segment: string) => void;
	onFullDance: () => void;
	onReturnFromFull: () => void;
	onFinish: () => void;
	onCheckYourself: () => void;
	// Последняя попытка пользователя на этом танце (если есть). При наличии
	// рисуем дополнительную кнопку «Моя последняя попытка → /compare/».
	lastAttemptId?: string;
	lastAttemptScore?: number;
}

const LessonLayout: React.FC<LessonLayoutProps> = ({
	danceId,
	glbPath,
	stepLabel,
	author,
	currentStepNumber,
	totalSteps,
	videoTimes,
	videoUrl,
	isFullDance,
	playbackSpeed,
	segmentsLoading,
	lessonDuration,
	lastStep,
	description,
	descriptionLoading,
	preloadGlbPath,
	onSpeedChange,
	onNavigate,
	onFullDance,
	onReturnFromFull,
	onFinish,
	onCheckYourself,
	lastAttemptId,
	lastAttemptScore,
}) => {
	const navigate = useNavigate();
	const viewerRef = useRef<MixamoViewerHandle>(null);
	const videoClipRef = useRef<VideoClipHandle>(null);
	const modelReadyRef = useRef(false);
	const videoReadyRef = useRef(false);
	const [isPaused, setIsPaused] = useState(false);

	const tryStart = () => {
		if (modelReadyRef.current && videoReadyRef.current) {
			viewerRef.current?.resume();
			videoClipRef.current?.start();
		}
	};

	const handleAnimationReady = () => {
		modelReadyRef.current = true;
		tryStart();
	};

	const handleVideoReady = () => {
		videoReadyRef.current = true;
		tryStart();
	};

	const handleVideoLoop = () => {
		videoReadyRef.current = false;
		modelReadyRef.current = true;
		viewerRef.current?.pause();
		viewerRef.current?.resetToStart();
	};

	const togglePause = () => {
		if (isPaused) {
			viewerRef.current?.resume();
			videoClipRef.current?.resume();
		} else {
			viewerRef.current?.pause();
			videoClipRef.current?.pause();
		}
		setIsPaused((p) => !p);
	};

	useEffect(() => {
		modelReadyRef.current = false;
		videoReadyRef.current = false;
		setIsPaused(false);
	}, [glbPath]);

	useEffect(() => {
		if (!glbPath) return;

		const timer = setTimeout(() => {
			if (modelReadyRef.current && !videoReadyRef.current) {
				videoReadyRef.current = true;
				tryStart();
			}
		}, 3000);

		return () => clearTimeout(timer);
	}, [glbPath]);

	return (
		<div className={styles.page}>
			<div className={styles.lesson}>
				<div className={styles.viewerColumn}>
					<div className={styles.viewerWrapper}>
						<div className={styles.modelContainer}>
							<MixamoViewer
								ref={viewerRef}
								glbPath={glbPath}
								timeScale={playbackSpeed}
								preloadPath={preloadGlbPath}
								onAnimationReady={handleAnimationReady}
							/>
						</div>
						{videoUrl && (
							<div className={styles.videoContainer}>
								<VideoClip
									ref={videoClipRef}
									key={`${glbPath}-${videoTimes?.start}-${videoTimes?.end}`}
									src={videoUrl}
									start={videoTimes?.start ?? 0}
									end={videoTimes?.end ?? lessonDuration}
									playbackSpeed={playbackSpeed}
									loading={segmentsLoading}
									onReady={handleVideoReady}
									onLoop={handleVideoLoop}
								/>
							</div>
						)}
					</div>
				</div>

				<div className={styles.controlsColumn}>
					<div className={styles.stepHeader}>
						<div className={`${styles.stepButtons} ${styles.stepButtonsLeft}`}>
							{!isFullDance && currentStepNumber !== undefined && (
								<button
									className={styles.stepButton}
									onClick={() =>
										onNavigate(
											currentStepNumber > 1
												? String(currentStepNumber - 2)
												: 'start',
										)
									}
								>
									<img
										src={arrowIcon}
										alt={currentStepNumber > 1 ? 'Предыдущий шаг' : 'К началу'}
										className={styles.arrowLeft}
									/>
								</button>
							)}
						</div>

						<h2
							className={isFullDance ? styles.stepTitleFull : styles.stepTitle}
						>
							{stepLabel}
						</h2>

						<div className={`${styles.stepButtons} ${styles.stepButtonsRight}`}>
							{!isFullDance &&
								currentStepNumber !== undefined &&
								totalSteps !== undefined && (
									<button
										className={styles.stepButton}
										onClick={() =>
											onNavigate(
												currentStepNumber < totalSteps
													? String(currentStepNumber)
													: 'finish',
											)
										}
									>
										<img
											src={arrowIcon}
											alt={
												currentStepNumber < totalSteps
													? 'Следующий шаг'
													: 'К финишу'
											}
											className={styles.arrowRight}
										/>
									</button>
								)}
						</div>
					</div>

					<div className={styles.authorLikeRow}>
						{author && <LessonAuthor author={author} />}
						<LikeButton danceId={danceId} />
					</div>

					<DescriptionBlock
						description={description}
						loading={descriptionLoading}
					/>

					<div className={styles.speedControl}>
						<div className={styles.speedRow}>
							<button
								className={styles.pauseButton}
								onClick={togglePause}
								aria-label={isPaused ? 'Воспроизвести' : 'Пауза'}
							>
								{isPaused ? '▶' : '⏸'}
							</button>
							<label htmlFor="speed-control">
								Скорость: {playbackSpeed.toFixed(1)}x
							</label>
						</div>
						<input
							id="speed-control"
							type="range"
							min={0.5}
							max={1.25}
							step={0.05}
							value={playbackSpeed}
							onChange={(e) => onSpeedChange(Number(e.target.value))}
						/>
					</div>

					{isFullDance ? (
						<Button size="s" className={styles.fullDanceButton} onClick={onReturnFromFull}>
							← Вернуться к шагу {lastStep !== null ? lastStep + 1 : 1}
						</Button>
					) : (
						<Button size="s" className={styles.fullDanceButton} onClick={onFullDance}>
							<Icon name="play" size="1em" alt="" /> Полный танец
						</Button>
					)}

					<Button size="s" className={styles.finishButton} onClick={onFinish}>
						Завершить урок
					</Button>

					<Button
						size="s"
						className={styles.finishButton}
						onClick={onCheckYourself}
					>
						Проверить себя
					</Button>

					{lastAttemptId && (
						<Button
							size="s"
							className={styles.finishButton}
							onClick={() => navigate(`/compare/${lastAttemptId}`)}
						>
							Моя последняя попытка
							{typeof lastAttemptScore === 'number'
								? ` · ${Math.round(lastAttemptScore)}/100`
								: ''}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};

const LessonPage: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	const [searchParams] = useSearchParams();

	const lesson = useSelector(selectLesson);
	const lessonError = useSelector(selectLessonError);
	const lessonLoading = useSelector(selectLessonLoading);
	const lessonModerationPending = useSelector(selectLessonModerationPending);
	const segments = useSelector(selectSegments);
	const segmentsLoading = useSelector(selectSegmentsLoading);
	const isAuthenticated = useSelector(selectIsUserAuthenticated);
	const uploadState = useSelector(selectUploadState);

	const segment = searchParams.get('segment');
	const [playbackSpeed, setPlaybackSpeed] = useState(1);
	const [showCheckYourself, setShowCheckYourself] = useState(false);
	const [isCompareFlight, setIsCompareFlight] = useState(false);
	const lastStepRef = useRef<number | null>(null);
	// Статус танца с бэка — нужен, чтобы при lessonError показывать понятный
	// экран (processing/pending/rejected) вместо общего «упс».
	const [danceStatus, setDanceStatus] = useState<{
		status: string;
		moderation_reason: string;
	} | null>(null);

	const handleCompareSubmit = async (
		blob: Blob,
		startTime: number,
		endTime: number,
	) => {
		if (!id) return;
		setIsCompareFlight(true);
		try {
			await dispatch(uploadAndCompare(blob, id, startTime, endTime) as any);
		} finally {
			setIsCompareFlight(false);
		}
	};

	const hasNavigatedRef = useRef(false);
	const hasShownRatingRef = useRef(false);
	const isNumericSegment = segment !== null && /^\d+$/.test(segment);
	const segmentIndex = isNumericSegment ? Number(segment) : -1;

	const { description, loading: descriptionLoading } = useSegmentDescription(
		id,
		isNumericSegment ? segmentIndex : null,
	);

	useEffect(() => {
		if (id && (!lesson || lesson.dance_id !== id)) {
			dispatch(lessonActions.uploadLessonByIdAction(id) as any).then(() => {
				if (isAuthenticated) {
					dispatch(fetchHistory() as any);
					dispatch(fetchLikes() as any);
				}
			});
		}
		return () => {
			if (id) {
				dispatch(lessonActions.clearLessonAction());
			}
		};
	}, [dispatch, id, isAuthenticated]);

	// Если пользователь открыл /lesson/{id} ещё до того, как пайплайн дописал
	// результат в S3, первый запрос вернёт 404. Как только активная задача с
	// этим dance_id завершится — перезапрашиваем урок, чтобы вместо
	// processing-экрана появился реальный разбор.
	// ВАЖНО: только для taskType === 'upload'. Для compare таска тоже имеет
	// danceId === id (referenceDanceId совпадает с уроком), но сам урок при
	// compare не меняется — лишний refetch перемонтировал бы LessonLayout и
	// сбрасывал воспроизведение видео.
	useEffect(() => {
		if (
			uploadState.resultReady &&
			uploadState.taskType === 'upload' &&
			uploadState.danceId === id &&
			id
		) {
			dispatch(lessonActions.uploadLessonByIdAction(id) as any);
		}
	}, [
		dispatch,
		id,
		uploadState.resultReady,
		uploadState.danceId,
		uploadState.taskType,
	]);

	// Когда compare для ЭТОГО же танца завершился — точечно обновляем
	// last_attempt_id на уроке, чтобы кнопка «Моя последняя попытка» сразу
	// указывала на свежую попытку (полный refetch уронил бы плеер).
	useEffect(() => {
		const cr = uploadState.compareResult;
		if (!cr || !id) return;
		if (cr.dance_id !== id) return;
		if (!cr.user_dance_id) return;
		dispatch(
			lessonActions.patchLessonLastAttemptAction(
				id,
				cr.user_dance_id,
				cr.score,
			) as any,
		);
	}, [dispatch, id, uploadState.compareResult]);

	// Анонимные попытки в БД не пишутся → бэк не вернёт last_attempt_id.
	// Зеркалим последнюю попытку анонима через localStorage и показываем
	// ту же кнопку «Моя последняя попытка».
	const [anonLastAttempt, setAnonLastAttempt] = useState<{
		attempt_id: string;
		score?: number;
	} | null>(null);

	useEffect(() => {
		if (!id || isAuthenticated) {
			setAnonLastAttempt(null);
			return;
		}
		try {
			const raw = localStorage.getItem(`anon_last_attempt_${id}`);
			setAnonLastAttempt(raw ? JSON.parse(raw) : null);
		} catch {
			setAnonLastAttempt(null);
		}
	}, [id, isAuthenticated, uploadState.compareResult]);

	// Когда урок не загрузился, тянем статус танца — чтобы понять, это «ещё
	// не готов» (processing/pending), «отклонён» или вообще не существует.
	// Используется в рендере ниже для подбора понятного экрана.
	useEffect(() => {
		if (!lessonError || !id) {
			setDanceStatus(null);
			return;
		}
		let cancelled = false;
		getDanceModerationStatus(id)
			.then((res) => {
				if (!cancelled) setDanceStatus(res);
			})
			.catch(() => {
				if (!cancelled) setDanceStatus(null);
			});
		return () => {
			cancelled = true;
		};
	}, [lessonError, id]);

	// Просмотр урока — отдельный эффект, чтобы дёргался ровно один раз
	// при смене dance_id. Дебаунс по sessionStorage защищает от F5-накрутки;
	// бэк всё равно дедуплицирует по (dance_id, viewer_id).
	useEffect(() => {
		if (!id) return;
		if (!shouldSendView(id)) return;
		recordDanceView(id)
			.then(() => markViewSent(id))
			.catch(() => {
				/* просмотры — не критичный сигнал, тихо проглатываем */
			});
	}, [id]);

	useEffect(() => {
		if (lesson?.segments_key && !segments) {
			dispatch(lessonActions.uploadSegmentsAction(lesson.segments_key) as any);
		}
	}, [dispatch, lesson, segments]);

	useEffect(() => {
		if (segment && /^\d+$/.test(segment)) {
			lastStepRef.current = Number(segment);
		}
	}, [segment]);

	useEffect(() => {
		hasNavigatedRef.current = false;
		hasShownRatingRef.current = false;
	}, [id]);

	const ratingOverlay = uploadState.showRating ? (
		<div className={styles.ratingOverlay}>
			<div className={styles.ratingModal}>
				<RatingForm
					userDanceId={uploadState.userDanceId ?? ''}
					danceId={id ?? ''}
					onSubmit={() => {
						sessionStorage.setItem(`hasRated_${id}`, 'true');
						dispatch(setShowRating(false));
					}}
					onClose={() => dispatch(setShowRating(false))}
				/>
			</div>
		</div>
	) : null;

	if (uploadState.error) {
		return (
			<>
				<div className={styles.fullscreenUpload}>
					<ErrorScreen
						title="Что-то пошло не так"
						description="Не удалось обработать видео. Попробуй ещё раз."
						actions={
							<Button
								onClick={() => {
									hasNavigatedRef.current = false;
									dispatch(resetUpload());
								}}
							>
								Попробовать снова
							</Button>
						}
					/>
				</div>
				{ratingOverlay}
			</>
		);
	}

	if (lessonLoading) {
		return (
			<>
				<div className={styles.fullscreenUpload}>
					<div className={styles.uploadContent}>
						<Loading
							subtitle="Обрабатываем твоё видео…"
							hint="Это может занять до минуты"
						/>
					</div>
				</div>
				{ratingOverlay}
			</>
		);
	}

	if (lessonModerationPending) {
		return (
			<>
				<div className={styles.page}>
					<div className={styles.moderationScreen}>
						<p className={styles.moderationTitle}>
							{isAuthenticated
								? 'Видео отправлено на модерацию'
								: 'Видео отправлено на модерацию'}
						</p>
						<p className={styles.moderationText}>
							{isAuthenticated ? (
								<>
									Мы получили ваше видео и скоро его проверим. Уведомление о
									результате придёт в колокольчик в шапке. Пожалуйста, учтите, что
									в кадре должен быть один человек — без животных и посторонних.
								</>
							) : (
								<>
									Мы получили ваше видео и скоро его проверим. Без регистрации
									мы не сможем сообщить вам о результате — зарегистрируйтесь,
									и уведомление придёт в колокольчик в шапке. Пожалуйста,
									учтите, что в кадре должен быть один человек — без животных
									и посторонних.
								</>
							)}
						</p>
						<div className={styles.moderationActions}>
							{!isAuthenticated && (
								<Button onClick={() => navigate('/register')}>
									Зарегистрироваться
								</Button>
							)}
							<Button
								className={styles.retryBtn}
								onClick={() => {
									dispatch(lessonActions.clearLessonAction());
									navigate('/');
									setTimeout(() => {
										document
											.getElementById('video-uploader')
											?.scrollIntoView({ behavior: 'smooth' });
									}, 150);
								}}
							>
								Загрузить другое видео
							</Button>
						</div>
					</div>
				</div>
				{ratingOverlay}
			</>
		);
	}

	// Танец сейчас обрабатывается этим же таб-сеансом — вместо общего
	// ErrorScreen показываем дружелюбный «обрабатывается» с подсказкой про
	// прогресс-бар внизу. Когда задача завершится, верхний useEffect перезапросит
	// урок, и эта ветка сменится готовым разбором.
	const isProcessingThisDance =
		uploadState.isProcessing && uploadState.danceId === id;

	if (lessonError && isProcessingThisDance) {
		return (
			<>
				<div className={styles.page}>
					<div className={styles.moderationScreen}>
						<p className={styles.moderationTitle}>Видео ещё обрабатывается</p>
						<p className={styles.moderationText}>
							Прогресс показан в нижней панели. Как только обработка
							завершится, разбор откроется здесь автоматически.
						</p>
					</div>
				</div>
				{ratingOverlay}
			</>
		);
	}

	// Урок не загрузился, in-flight таски тут нет — спрашиваем у бэка, в
	// каком состоянии танец (видим в логе «failed to get segments.json: NoSuchKey»
	// при заходе на свежеопубликованный танец, у которого ML-пайплайн ещё не
	// дописал артефакты в S3). Показываем понятный экран вместо «упс».
	if (lessonError && danceStatus) {
		const status = danceStatus.status;
		let title = 'Видео пока недоступно';
		let text =
			'Похоже, обработка не была завершена. Если танец нужен — переоткройте позже или удалите его и загрузите заново.';

		if (status === 'processing') {
			title = 'Видео ещё обрабатывается';
			text =
				'Пайплайн ML досчитывает разбор. Зайдите чуть позже — обычно это занимает несколько минут.';
		} else if (status === 'pending') {
			title = 'Видео на модерации';
			text =
				'Мы проверяем содержимое. Когда модерация завершится, разбор станет доступен.';
		} else if (status === 'rejected') {
			title = 'Видео отклонено модерацией';
			text =
				danceStatus.moderation_reason
					? `Причина: ${danceStatus.moderation_reason}. Удалите этот танец и загрузите другой.`
					: 'Удалите этот танец и загрузите другой.';
		}

		return (
			<>
				<div className={styles.page}>
					<div className={styles.moderationScreen}>
						<p className={styles.moderationTitle}>{title}</p>
						<p className={styles.moderationText}>{text}</p>
						<div className={styles.moderationActions}>
							<Button onClick={() => navigate('/')}>На главную</Button>
						</div>
					</div>
				</div>
				{ratingOverlay}
			</>
		);
	}

	if (lessonError) {
		return (
			<>
				<div className={styles.page}>
					<ErrorScreen />
				</div>
				{ratingOverlay}
			</>
		);
	}

	if (!id) {
		if (!lesson?.dance_id) return <Navigate to="/" replace />;
		return <Navigate to={`/lesson/${lesson.dance_id}`} replace />;
	}

	if (!lesson) {
		return <>{ratingOverlay}</>;
	}

	if (!segment) {
		return <Navigate to={`/lesson/${id}?segment=full`} replace />;
	}

	if (!lesson.glb_keys) {
		return <>{ratingOverlay}</>;
	}

	const totalSteps = lesson.glb_keys.length;

	const navigateToSegment = (nextSegment: string) => {
		navigate(`/lesson/${id}?segment=${nextSegment}`);
	};

	const handleFullDance = () => navigateToSegment('full');

	const handleReturnFromFull = () => {
		const returnTo =
			lastStepRef.current !== null ? String(lastStepRef.current) : '0';
		navigateToSegment(returnTo);
	};

	const getCurrentVideoTimes = (
		index: number,
	): { start: number; end: number } | null => {
		if (!segments || !lesson) return null;
		const seg = segments.segments[index];
		if (!seg) return null;
		const fps = segments.meta.fps;
		return {
			start: seg.start_frame / fps,
			end: (seg.end_frame - 5) / fps,
		};
	};

	const videoUrl = lesson.video_path
		? `${(S3_ADDRESS || '').replace(/\/+$/, '')}/${lesson.video_path.replace(/^\/+/, '')}`
		: null;

	if (segment === 'start') {
		return (
			<>
				<div className={styles.page}>
					<LessonStart lesson={lesson} />
				</div>
				{ratingOverlay}
			</>
		);
	}

	if (segment === 'finish') {
		return (
			<>
				<div className={styles.page}>
					<LessonFinish lesson={lesson} />
				</div>
				{ratingOverlay}
			</>
		);
	}

	if (segment === 'full') {
		return (
			<>
				<LessonLayout
					danceId={id}
					glbPath={lesson.full_glb_key}
					stepLabel="ПОЛНЫЙ ТАНЕЦ"
					author={lesson.author}
					videoTimes={{ start: 0, end: lesson.duration_sec }}
					videoUrl={videoUrl}
					isFullDance={true}
					playbackSpeed={playbackSpeed}
					segmentsLoading={segmentsLoading}
					lessonDuration={lesson.duration_sec}
					lastStep={lastStepRef.current}
					description={null}
					descriptionLoading={false}
					onSpeedChange={setPlaybackSpeed}
					onNavigate={navigateToSegment}
					onFullDance={handleFullDance}
					onReturnFromFull={handleReturnFromFull}
					onFinish={() => navigateToSegment('finish')}
					onCheckYourself={() => setShowCheckYourself(true)}
					preloadGlbPath={lesson.full_glb_key}
					lastAttemptId={lesson.last_attempt_id ?? anonLastAttempt?.attempt_id}
					lastAttemptScore={lesson.last_attempt_score ?? anonLastAttempt?.score}
				/>
				{showCheckYourself && id && (
					<CheckYourself
						referenceVideoUrl={videoUrl}
						referenceDanceId={id}
						onClose={() => setShowCheckYourself(false)}
						onSubmit={handleCompareSubmit}
						submitting={isCompareFlight}
					/>
				)}
				{ratingOverlay}
			</>
		);
	}

	if (isNumericSegment) {
		const isValidStep =
			segmentIndex >= 0 && segmentIndex < lesson.glb_keys.length;

		if (!isValidStep) {
			return <Navigate to={`/lesson/${id}?segment=finish`} replace />;
		}

		const glbPath = lesson.glb_keys[segmentIndex];
		const videoTimes = getCurrentVideoTimes(segmentIndex);

		return (
			<>
				<LessonLayout
					danceId={id}
					glbPath={glbPath}
					stepLabel={`Шаг ${segmentIndex + 1} / ${totalSteps}`}
					author={lesson.author}
					currentStepNumber={segmentIndex + 1}
					totalSteps={totalSteps}
					videoTimes={videoTimes}
					videoUrl={videoUrl}
					isFullDance={false}
					playbackSpeed={playbackSpeed}
					segmentsLoading={segmentsLoading}
					lessonDuration={lesson.duration_sec}
					lastStep={lastStepRef.current}
					description={description}
					descriptionLoading={descriptionLoading}
					onSpeedChange={setPlaybackSpeed}
					onNavigate={navigateToSegment}
					onFullDance={handleFullDance}
					onReturnFromFull={handleReturnFromFull}
					onFinish={() => navigateToSegment('finish')}
					onCheckYourself={() => setShowCheckYourself(true)}
					lastAttemptId={lesson.last_attempt_id ?? anonLastAttempt?.attempt_id}
					lastAttemptScore={lesson.last_attempt_score ?? anonLastAttempt?.score}
				/>
				{showCheckYourself && id && (
					<CheckYourself
						referenceVideoUrl={videoUrl}
						referenceDanceId={id}
						onClose={() => setShowCheckYourself(false)}
						onSubmit={handleCompareSubmit}
						submitting={isCompareFlight}
					/>
				)}
				{ratingOverlay}
			</>
		);
	}

	return (
		<>
			<div className={styles.page}>
				<p className={styles.error}>Некорректный параметр segment</p>
			</div>
			{ratingOverlay}
		</>
	);
};

export default LessonPage;
