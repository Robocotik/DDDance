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
import lessonActions from '../../redux/features/lesson/actions';
import {
	selectLesson,
	selectLessonError,
	selectLessonLoading,
	selectSegments,
	selectSegmentsLoading,
} from '../../redux/features/lesson/selectors';
import { fetchLikes } from '../../redux/features/likes/actions';
import { selectIsUserAuthenticated } from '../../redux/features/user/selectors';
import type { AppDispatch } from '../../redux/store';

import http from '@/api/http';
import styles from './LessonPage.module.scss';

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
				setDescription(desc);
			})
			.catch((err) => {
				if (err.name !== 'AbortError') {
					console.error('Failed to load segment description:', err);
					setDescription('');
				}
			})
			.finally(() => {
				setLoading(false);
			});

		return () => controller.abort();
	}, [danceId, segmentIdx]);

	return { description, loading };
}

const DescriptionBlock: React.FC<{
	description: string | null;
	loading: boolean;
}> = ({ description, loading }) => {
	const displayText = formatSegmentDescriptionForDisplay(description);
	if (!loading && !displayText) return null;

	return (
		<div className={styles.descriptionBlock}>
			{loading ? (
				<div className={styles.descriptionShimmer}>
					<span className={styles.shimmerDot} />
					<span className={styles.shimmerDot} />
					<span className={styles.shimmerDot} />
				</div>
			) : (
				<p className={styles.descriptionText}>{displayText}</p>
			)}
		</div>
	);
};

interface VideoClipHandle {
	start: () => void;
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
		}));

		useEffect(() => {
			const video = videoRef.current;
			if (!video || loading) return;

			let destroyed = false;
			isSeekingRef.current = false;
			isLoopingRef.current = false;

			const checkFrame = () => {
				if (destroyed) return;
				if (!isSeekingRef.current && video.currentTime >= endRef.current) {
					isSeekingRef.current = true;
					isLoopingRef.current = true;
					onLoopRef.current();
					video.pause();
					video.currentTime = startRef.current === 0 ? 0.001 : startRef.current;
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

			video.addEventListener('seeked', handleSeeked);

			isSeekingRef.current = true;
			const safeStart = start === 0 ? 0.001 : start;
			video.currentTime = safeStart;

			rafRef.current = requestAnimationFrame(checkFrame);

			return () => {
				destroyed = true;
				if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
				video.removeEventListener('seeked', handleSeeked);
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
	stepLabel: React.ReactNode;
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
}

const LessonLayout: React.FC<LessonLayoutProps> = ({
	danceId,
	glbPath,
	stepLabel,
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
}) => {
	const viewerRef = useRef<MixamoViewerHandle>(null);
	const videoClipRef = useRef<VideoClipHandle>(null);
	const modelReadyRef = useRef(false);
	const videoReadyRef = useRef(false);

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

	useEffect(() => {
		modelReadyRef.current = false;
		videoReadyRef.current = false;
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

					<LikeButton danceId={danceId} />

					<DescriptionBlock
						description={description}
						loading={descriptionLoading}
					/>

					<div className={styles.speedControl}>
						<label htmlFor="speed-control">
							Скорость: {playbackSpeed.toFixed(1)}x
						</label>
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
						<Button
							size="s"
							className={styles.fullDanceButton}
							onClick={onReturnFromFull}
						>
							<img
								src={arrowIcon}
								alt=""
								className={styles.returnStepArrow}
								aria-hidden
							/>
							Вернуться к шагу {lastStep !== null ? lastStep + 1 : 1}
						</Button>
					) : (
						<Button
							size="s"
							className={`${styles.fullDanceButton} ${styles.fullDancePlayButton}`}
							onClick={onFullDance}
						>
							Полный танец
							<span className={styles.fullDancePlayIcon} aria-hidden>
								{'\u25B6\uFE0E'}
							</span>
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
	const segments = useSelector(selectSegments);
	const segmentsLoading = useSelector(selectSegmentsLoading);
	const isAuthenticated = useSelector(selectIsUserAuthenticated);
	const uploadState = useSelector(selectUploadState);

	const segment = searchParams.get('segment');
	const [playbackSpeed, setPlaybackSpeed] = useState(1);
	const [showCheckYourself, setShowCheckYourself] = useState(false);
	const lastStepRef = useRef<number | null>(null);

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
		if (uploadState.isUploading && showCheckYourself) {
			setShowCheckYourself(false);
		}
	}, [uploadState.isUploading, showCheckYourself]);

	useEffect(() => {
		const alreadyRated =
			id && sessionStorage.getItem(`hasRated_${id}`) === 'true';

		if (
			uploadState.isUploading &&
			isAuthenticated &&
			!uploadState.showRating &&
			!hasShownRatingRef.current &&
			!alreadyRated
		) {
			hasShownRatingRef.current = true;
			dispatch(setShowRating(true));
		}
	}, [
		uploadState.isUploading,
		isAuthenticated,
		uploadState.showRating,
		dispatch,
		id,
	]);

	useEffect(() => {
		hasNavigatedRef.current = false;
		hasShownRatingRef.current = false;
	}, [id]);

	useEffect(() => {
		if (
			!uploadState.isUploading &&
			!uploadState.isProcessing &&
			!uploadState.error &&
			uploadState.userDanceId &&
			!hasNavigatedRef.current
		) {
			hasNavigatedRef.current = true;
			navigate(`/compare/${uploadState.userDanceId}`);
		}
	}, [
		uploadState.isUploading,
		uploadState.isProcessing,
		uploadState.error,
		uploadState.userDanceId,
		navigate,
	]);

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

	if (uploadState.isUploading || uploadState.isProcessing) {
		return (
			<>
				<div className={styles.fullscreenUpload}>
					<div className={styles.uploadContent}>
						<Loading />

						{uploadState.isProcessing && !uploadState.error && (
							<>
								<p className={styles.uploadText}>Обрабатываем твоё видео…</p>
								<p className={styles.uploadHint}>Это может занять до минуты</p>
							</>
						)}

						{uploadState.error && (
							<>
								<p className={`${styles.uploadText} ${styles.uploadError}`}>
									❌ {uploadState.error}
								</p>
								<button
									className={styles.retryBtn}
									onClick={() => {
										hasNavigatedRef.current = false;
										dispatch(resetUpload());
									}}
								>
									Попробовать снова
								</button>
							</>
						)}
					</div>
				</div>
				{ratingOverlay}
			</>
		);
	}

	if (lessonLoading) {
		return (
			<>
				<div className={styles.page}>
					<div className={styles.pageCenter}>
						<Loading />
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
		return <Navigate to={`/lesson/${lesson?.dance_id}`} replace />;
	}

	if (!lesson) {
		return <>{ratingOverlay}</>;
	}

	if (!segment) {
		return <Navigate to={`/lesson/${id}?segment=start`} replace />;
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
					stepLabel={
						<>
							ПОЛНЫЙ
							<br />
							ТАНЕЦ
						</>
					}
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
				/>
				{showCheckYourself && id && (
					<CheckYourself
						referenceVideoUrl={videoUrl}
						referenceDanceId={id}
						onClose={() => setShowCheckYourself(false)}
						onSubmit={(blob) => dispatch(uploadAndCompare(blob, id) as any)}
						submitting={uploadState.isProcessing}
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
					stepLabel={`${segmentIndex + 1} / ${totalSteps}`}
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
				/>
				{showCheckYourself && id && (
					<CheckYourself
						referenceVideoUrl={videoUrl}
						referenceDanceId={id}
						onClose={() => setShowCheckYourself(false)}
						onSubmit={(blob) => dispatch(uploadAndCompare(blob, id) as any)}
						submitting={uploadState.isProcessing}
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
