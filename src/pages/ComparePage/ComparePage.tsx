import type { LeaderboardEntry, LeaderboardResponse } from '@/api/dances';
import {
	getFriendsScores,
	getLeaderboard,
	type FriendScore,
} from '@/api/dances';
import {
	getActiveDuelsForDance,
	submitAttemptToDuels,
	type ActiveDuelForDance,
} from '@/api/duels';
import type { RecommendDance } from '@/api/recommend';
import { getSimilarDances } from '@/api/recommend';
import type {
	CompareResponse,
	RateResponse,
	SegmentDiagnostic,
} from '@/api/users/compare';
import { getCompareResult, getRating } from '@/api/users/compare';
import {
	getDanceProgress,
	saveAttemptToProfile,
	unsaveAttemptFromProfile,
	type DanceProgressEntry,
} from '@/api/users/profile';
import Button from '@/components/Button/Button';
import CheckYourself from '@/components/CheckYourself/CheckYourself';
import CompareViewer from '@/components/CompareViewer/CompareViewer';
import ErrorScreen from '@/components/Error/Error';
import Loading from '@/components/Loading/Loading';
import NotDetectedWarning from '@/components/NotDetectedWarning/NotDetectedWarning';
import PlaybackOverlay from '@/components/PlaybackOverlay/PlaybackOverlay';
import {
	AggregatedResults,
	RatingForm,
} from '@/components/RatingForm/RatingForm';
import SaveToProfileDialog, {
	type SaveOptions,
} from '@/components/SaveToProfileDialog/SaveToProfileDialog';
import ScoreSparkline from '@/components/ScoreSparkline/ScoreSparkline';
import SimilarDances from '@/components/SimilarDances/SimilarDances';
import { S3_ADDRESS } from '@/consts/urls';
import { uploadAndCompare } from '@/redux/features/upload/actions';
import {
	selectCompareResult,
	selectIsProcessing,
	selectIsUploading,
	selectTaskType,
	selectUploadError,
	selectUserDanceId,
} from '@/redux/features/upload/selectors';
import { resetUpload } from '@/redux/features/upload/uploadSlice';
import { selectIsUserAuthenticated } from '@/redux/features/user/selectors';
import type { AppDispatch } from '@/redux/store';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './ComparePage.module.scss';

const JOINT_BONE_NAMES = [
	'LeftArm',
	'RightArm',
	'LeftForeArm',
	'RightForeArm',
	'LeftUpLeg',
	'RightUpLeg',
	'LeftLeg',
	'RightLeg',
] as const;

const metricColor = (v: number) => {
	if (v >= 75) {
		return '#5be0a0';
	}

	if (v >= 40) {
		return '#f5c542';
	}

	return '#ff6b6b';
};

const scoreMotivation = (score: number): React.ReactNode => {
	if (score >= 80) {
		return <>Ты просто огонь! Настоящий танцор в деле</>;
	}

	if (score >= 60) {
		return <>Отличная работа! Ты заметно прогрессируешь</>;
	}

	if (score >= 40) {
		return <>Неплохо! Ещё пара тренировок — и будет идеально</>;
	}

	if (score >= 20) {
		return <>Хорошее начало! Движения становятся точнее с каждым разом</>;
	}

	return <>Не сдавайся! Каждый танцор начинал с нуля — ты на верном пути</>;
};

const avatarInitials = (login: string) => login.slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
	{ bg: 'rgba(245,197,66,0.2)', color: '#f5c542' },
	{ bg: 'rgba(91,224,160,0.15)', color: '#5be0a0' },
	{ bg: 'rgba(140,60,255,0.15)', color: '#a97fff' },
	{ bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b' },
	{ bg: 'rgba(100,180,255,0.15)', color: '#64b4ff' },
];

interface MetricRowProps {
	iconName: string;
	label: string;
	value: number;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value }) => {
	const color = metricColor(value);
	const rounded = Math.round(value);
	return (
		<div className={styles.metricRow}>
			<div className={styles.metricHeader}>
				<span className={styles.metricName}>{label}</span>
				<span className={styles.metricVal} style={{ color }}>
					{rounded}
				</span>
			</div>
			<div className={styles.barBg}>
				<div
					className={styles.barFill}
					style={{ width: `${rounded}%`, background: color }}
				/>
			</div>
		</div>
	);
};

interface SegmentBarChartProps {
	segments: SegmentDiagnostic[];
	danceId: string;
}

const FEEDBACK_LABEL: Record<string, string> = {
	on_time: 'В ритм',
	early: 'Слишком рано',
	late: 'Слишком поздно',
	low_amplitude: 'Маленькая амплитуда',
	not_performed: 'Не выполнен',
};

const SegmentBarChart: React.FC<SegmentBarChartProps> = ({
	segments,
	danceId,
}) => {
	const navigate = useNavigate();

	const handleSegmentClick = (idx: number) => {
		navigate(`/lesson/${danceId}?segment=${idx}`);
	};

	return (
		<div className={styles.segmentsBlock}>
			<div className={styles.segTitle}>По сегментам — нажми чтобы перейти</div>
			<div className={styles.segTimeline}>
				{segments.map((seg) => {
					const color = metricColor(seg.score);
					const heightPct = Math.max(seg.score, 8);
					const fbLabel = seg.feedback
						? ` · ${FEEDBACK_LABEL[seg.feedback] ?? seg.feedback}`
						: '';

					const displayNum = seg.segment_id;
					const segmentParam = Math.max(0, seg.segment_id - 1);
					return (
						<div
							key={seg.segment_id}
							className={styles.segBarWrap}
							onClick={() => handleSegmentClick(segmentParam)}
							title={`${seg.label || `Сегмент ${displayNum}`}: ${Math.round(seg.score)}${fbLabel}`}
						>
							<div
								className={styles.segBar}
								style={{ height: `${heightPct}%`, background: color }}
							/>
							<div className={styles.segNum}>{displayNum}</div>
						</div>
					);
				})}
			</div>
			<div className={styles.timelineHint}>
				<span className={styles.hintGood}>● отлично</span>
				<span className={styles.hintMid}>● можно лучше</span>
				<span className={styles.hintBad}>● поработай над этим</span>
			</div>
		</div>
	);
};

interface LeaderboardCardProps {
	data: LeaderboardResponse;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ data }) => {
	const navigate = useNavigate();
	const userInTop = data.top.some((e) => e.is_me);
	const userEntry = data.user_entry ?? data.top.find((e) => e.is_me);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const renderRow = (entry: LeaderboardEntry, idx: number) => {
		const { bg, color } =
			AVATAR_COLORS[Math.min(idx, AVATAR_COLORS.length - 1)];

		const clickable = !entry.is_me && !!entry.user_id;
		const s3 = (S3_ADDRESS || '').replace(/\/+$/, '');
		let avatarSrc: string | null = null;

		if (entry.avatar) {
			avatarSrc = entry.avatar.startsWith('http')
				? entry.avatar
				: `${s3}/${entry.avatar}`;
		}

		return (
			<div
				key={`${entry.rank}-${entry.login}`}
				className={`${styles.lbRow} ${entry.is_me ? styles.lbRowMe : ''} ${clickable ? styles.lbRowClickable : ''}`}
				onClick={
					clickable ? () => navigate(`/profile/${entry.user_id}`) : undefined
				}
				role={clickable ? 'link' : undefined}
			>
				<div
					className={`${styles.lbRank} ${entry.rank === 1 ? styles.lbRankGold : ''}`}
				>
					{entry.rank}
				</div>
				<div
					className={styles.lbAvatar}
					style={avatarSrc ? undefined : { background: bg, color }}
				>
					{avatarSrc ? (
						<img
							src={avatarSrc}
							alt={entry.login}
							className={styles.lbAvatarImg}
						/>
					) : (
						avatarInitials(entry.login)
					)}
				</div>
				<div
					className={`${styles.lbName} ${entry.is_me ? styles.lbNameMe : ''}`}
				>
					{entry.is_me ? 'ты' : entry.login}
				</div>
				<div
					className={styles.lbScore}
					style={entry.is_me ? { color: '#ff5a8a' } : undefined}
				>
					{Math.round(entry.score)}
				</div>
			</div>
		);
	};

	return (
		<div className={styles.leaderboardCard}>
			<div className={styles.lbTitleRow}>
				<span className={styles.cardSectionTitle}>Топ этого танца</span>
				{userEntry && <span className={styles.lbBadge}>Ты здесь</span>}
			</div>

			{data.top.length === 0 ? (
				<p className={styles.lbEmpty}>Пока никто не прошёл этот танец</p>
			) : (
				<>
					{data.top.map((entry, i) => renderRow(entry, i))}
					{!userInTop && userEntry && (
						<>
							<div className={styles.lbSeparator}>···</div>
							{renderRow(userEntry, 4)}
						</>
					)}
				</>
			)}
		</div>
	);
};

interface RatingSectionProps {
	isAuthenticated: boolean;
	hasRated: boolean;
	ratingData: RateResponse | null;
	ratingLoading: boolean;
	userDanceId: string;
	danceId: string;
	onRated: (data: RateResponse) => void;
	onHasRatedChange: () => void;
}

const RatingSection: React.FC<RatingSectionProps> = ({
	isAuthenticated,
	hasRated,
	ratingData,
	ratingLoading,
	userDanceId,
	danceId,
	onRated,
	onHasRatedChange,
}) => {
	const navigate = useNavigate();
	const [showForm, setShowForm] = useState(false);

	let statsBlock: React.ReactNode = null;

	if (ratingLoading) {
		statsBlock = (
			<div className={styles.ratingLoading}>
				<Loading />
			</div>
		);
	} else if (ratingData) {
		statsBlock = <AggregatedResults data={ratingData} />;
	}

	if (!isAuthenticated) {
		return (
			<div className={styles.ratingSection}>
				<h2 className={styles.sectionTitle}>Оценки участников</h2>
				{statsBlock}
				<div className={styles.prompt}>
					<p className={styles.promptText}>Войдите, чтобы оценить этот танец</p>
					<button
						className={styles.actionBtn}
						onClick={() => navigate('/login')}
					>
						Войти и оценить
					</button>
				</div>
			</div>
		);
	}

	if (!hasRated) {
		return (
			<div className={styles.ratingSection}>
				<h2 className={styles.sectionTitle}>Оценки участников</h2>
				{statsBlock}
				{showForm ? (
					<div className={styles.inlineForm}>
						<RatingForm
							userDanceId={userDanceId}
							danceId={danceId}
							onSubmit={(_, aggregated) => {
								if (aggregated) {
									onRated(aggregated);
								}

								sessionStorage.setItem(`hasRated_${userDanceId}`, 'true');
								onHasRatedChange();
								setShowForm(false);
							}}
							onClose={() => setShowForm(false)}
						/>
					</div>
				) : (
					<div className={styles.prompt}>
						<p className={styles.promptText}>
							Хотите оценить сложность танца или изменить оценку?
						</p>
						<button
							className={styles.actionBtn}
							onClick={() => setShowForm(true)}
						>
							Оценить танец
						</button>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className={styles.ratingSection}>
			<h2 className={styles.sectionTitle}>Оценки участников</h2>
			{statsBlock}
			{!ratingLoading && !ratingData && (
				<div className={styles.emptyState}>
					<p className={styles.emptyStateTitle}>Оценок пока нет</p>
					<p className={styles.emptyStateHint}>
						Будь первым, кто оценит этот танец!
					</p>
				</div>
			)}
		</div>
	);
};

const ComparePage: React.FC = () => {
	const { userDanceId } = useParams<{ userDanceId: string }>();
	const navigate = useNavigate();
	const dispatch = useDispatch<AppDispatch>();
	const isAuthenticated = useSelector(selectIsUserAuthenticated);

	const uploadIsUploading = useSelector(selectIsUploading);
	const uploadIsProcessing = useSelector(selectIsProcessing);
	const uploadTaskType = useSelector(selectTaskType);
	const uploadUserDanceId = useSelector(selectUserDanceId);
	const uploadError = useSelector(selectUploadError);
	const uploadCompareResult = useSelector(selectCompareResult);

	const initialFromCache = ((): CompareResponse | null => {
		if (!userDanceId) {
			return null;
		}

		try {
			const stored = sessionStorage.getItem(`compare_result_${userDanceId}`);
			return stored ? (JSON.parse(stored) as CompareResponse) : null;
		} catch {
			return null;
		}
	})();

	const [result, setResult] = useState<CompareResponse | null>(
		initialFromCache,
	);

	const [loading, setLoading] = useState(initialFromCache === null);
	const [error, setError] = useState<string | null>(null);

	const jointHeatmap = useMemo<Record<string, number> | undefined>(() => {
		const labels = result?.frame_labels;

		if (!labels || labels.length === 0) {
			return undefined;
		}

		const sums = new Array<number>(8).fill(0);
		let count = 0;

		for (const f of labels) {
			if (!f.joint_errors || f.joint_errors.length < 8) {
				continue;
			}

			for (let i = 0; i < 8; i++) {
				sums[i] += f.joint_errors[i];
			}

			count++;
		}

		if (count === 0) {
			return undefined;
		}

		const heatmap: Record<string, number> = {};

		for (let i = 0; i < 8; i++) {
			heatmap[JOINT_BONE_NAMES[i]] = sums[i] / count;
		}

		return heatmap;
	}, [result?.frame_labels]);

	const [ratingData, setRatingData] = useState<RateResponse | null>(null);
	const [ratingLoading, setRatingLoading] = useState(false);
	const [hasRated, setHasRated] = useState(false);
	const [ratingRefreshKey, setRatingRefreshKey] = useState(0);

	const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(
		null,
	);

	const [progressData, setProgressData] = useState<DanceProgressEntry[]>([]);
	const [similarDances, setSimilarDances] = useState<RecommendDance[]>([]);
	const [friendsScores, setFriendsScores] = useState<FriendScore[]>([]);

	useEffect(() => {
		if (!userDanceId) {
			return;
		}

		const stored = sessionStorage.getItem(`compare_result_${userDanceId}`);

		if (stored) {
			try {
				setResult(JSON.parse(stored));
				setError(null);
				setLoading(false);
				return;
			} catch {}
		}

		if (
			uploadIsProcessing &&
			uploadTaskType === 'compare' &&
			uploadUserDanceId === userDanceId
		) {
			return;
		}

		setResult(null);
		setLoading(true);
		setError(null);

		getCompareResult(userDanceId)
			.then((data) => {
				setResult(data);
				sessionStorage.setItem(
					`compare_result_${userDanceId}`,
					JSON.stringify(data),
				);
			})
			.catch(() => {
				setError('Результат не найден. Вернитесь и попробуйте снова.');
			})
			.finally(() => setLoading(false));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userDanceId]);

	useEffect(() => {
		if (
			uploadCompareResult &&
			uploadCompareResult.user_dance_id === userDanceId
		) {
			setResult(uploadCompareResult);
			setError(null);
			setLoading(false);
		}
	}, [uploadCompareResult, userDanceId]);

	useEffect(() => {
		if (result?.dance_id) {
			setHasRated(
				sessionStorage.getItem(`hasRated_${result.dance_id}`) === 'true',
			);
		}
	}, [result?.dance_id]);

	useEffect(() => {
		if (!result?.dance_id) {
			return;
		}

		getLeaderboard(result.dance_id)
			.then(setLeaderboard)
			.catch(() => setLeaderboard(null));
	}, [result?.dance_id]);

	useEffect(() => {
		if (!result?.dance_id) {
			return;
		}

		getSimilarDances(result.dance_id)
			.then(setSimilarDances)
			.catch(() => setSimilarDances([]));
	}, [result?.dance_id]);

	useEffect(() => {
		if (!result?.dance_id || !isAuthenticated) {
			return;
		}

		const controller = new AbortController();
		getDanceProgress(result.dance_id, controller.signal)
			.then((data) => {
				if (!controller.signal.aborted) {
					setProgressData(data);
				}
			})
			.catch(() => {
				if (!controller.signal.aborted) {
					setProgressData([]);
				}
			});

		return () => controller.abort();
	}, [result?.dance_id, isAuthenticated]);

	useEffect(() => {
		if (!result?.dance_id || !isAuthenticated) {
			return;
		}

		getFriendsScores(result.dance_id)
			.then(setFriendsScores)
			.catch(() => setFriendsScores([]));
	}, [result?.dance_id, isAuthenticated]);

	const fetchRating = useCallback(() => {
		if (!result?.dance_id) {
			return;
		}

		setRatingLoading(true);
		getRating(result.dance_id)
			.then(setRatingData)
			.catch(() => setRatingData(null))
			.finally(() => setRatingLoading(false));
	}, [result?.dance_id]);

	useEffect(() => {
		fetchRating();
	}, [fetchRating, ratingRefreshKey]);

	useEffect(
		() => () => {
			dispatch(resetUpload());
		},
		[dispatch],
	);

	const prevUploadUserDanceIdRef = useRef(uploadUserDanceId);
	useEffect(() => {
		const prev = prevUploadUserDanceIdRef.current;
		prevUploadUserDanceIdRef.current = uploadUserDanceId;

		if (uploadUserDanceId === prev) {
			return;
		}

		if (!uploadUserDanceId) {
			return;
		}

		if (uploadIsUploading || uploadIsProcessing || uploadError) {
			return;
		}

		if (uploadUserDanceId === userDanceId) {
			return;
		}

		navigate(`/compare/${uploadUserDanceId}`);
	}, [
		uploadUserDanceId,
		uploadIsUploading,
		uploadIsProcessing,
		uploadError,
		userDanceId,
		navigate,
	]);

	const segs = result?.segments ?? [];
	const avg = (fn: (s: SegmentDiagnostic) => number) =>
		segs.length > 0
			? segs.reduce((acc, s) => acc + fn(s), 0) / segs.length
			: (result?.score ?? 0);

	const avgTiming = avg((s) => s.timing);
	const avgAmplitude = avg((s) => s.amplitude);
	const avgTechnique = avg((s) => s.pose_accuracy);

	const hitRate = useMemo(() => {
		const labels = result?.frame_labels;

		if (!labels || labels.length === 0) {
			return null;
		}

		return (labels.filter((f) => f.hit).length / labels.length) * 100;
	}, [result?.frame_labels]);

	const notDetectedPct = useMemo(() => {
		const labels = result?.frame_labels;

		if (!labels || labels.length === 0) {
			return null;
		}

		const notDetectedCount = labels.filter(
			(f) => f.reason === 'not_detected',
		).length;

		return (notDetectedCount / labels.length) * 100;
	}, [result?.frame_labels]);

	const score = Math.round(result?.score ?? 0);

	const handleBackToLesson = () => {
		dispatch(resetUpload());
		navigate(`/lesson/${result!.dance_id}?segment=full`);
	};

	const [showRecord, setShowRecord] = useState(false);

	const handleRetry = () => {
		dispatch(resetUpload());
		setShowRecord(true);
	};

	const handleShare = async () => {
		const url = window.location.href;

		if (navigator.share) {
			await navigator
				.share({ title: 'Мой результат в DDDance', url })
				.catch(() => {});
		} else {
			await navigator.clipboard.writeText(url).catch(() => {});
		}
	};

	const [savedToProfile, setSavedToProfile] = useState(false);
	const [savingToProfile, setSavingToProfile] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

	const [activeDuels, setActiveDuels] = useState<ActiveDuelForDance[]>([]);
	const [duelSubmitting, setDuelSubmitting] = useState(false);
	const [duelSubmitted, setDuelSubmitted] = useState(false);
	const [duelError, setDuelError] = useState<string | null>(null);
	const duelSubmitInFlightRef = useRef(false);

	useEffect(() => {
		if (!isAuthenticated || !result?.dance_id) {
			setActiveDuels([]);
			return;
		}

		const controller = new AbortController();
		getActiveDuelsForDance(result.dance_id, controller.signal)
			.then(setActiveDuels)
			.catch(() => {
				if (!controller.signal.aborted) {
					setActiveDuels([]);
				}
			});

		return () => controller.abort();
	}, [isAuthenticated, result?.dance_id]);

	const handleSubmitToDuel = async () => {
		if (!result?.dance_id || !userDanceId) {
			return;
		}

		if (duelSubmitInFlightRef.current || duelSubmitted) {
			return;
		}

		duelSubmitInFlightRef.current = true;

		setDuelSubmitting(true);
		setDuelError(null);

		try {
			await submitAttemptToDuels(userDanceId, result.dance_id);
			setDuelSubmitted(true);
			setActiveDuels([]);
		} catch {
			setDuelError('Не удалось отправить на дуэль. Попробуй ещё раз.');
		} finally {
			setDuelSubmitting(false);
			duelSubmitInFlightRef.current = false;
		}
	};

	const handleSaveBtnClick = () => {
		if (!result?.dance_id) {
			return;
		}

		setSaveError(null);

		if (!isAuthenticated) {
			setShowRegisterPrompt(true);
			return;
		}

		if (savedToProfile) {
			handleUnsave();
		} else {
			setShowSaveDialog(true);
		}
	};

	const handleRegisterFromPrompt = () => {
		const returnTo = `/compare/${userDanceId}`;
		navigate(`/register?returnTo=${encodeURIComponent(returnTo)}`);
	};

	const handleLoginFromPrompt = () => {
		const returnTo = `/compare/${userDanceId}`;
		navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
	};

	const handleConfirmSave = async ({ userName, isPrivate }: SaveOptions) => {
		if (!result?.dance_id || !userDanceId) {
			return;
		}

		setSavingToProfile(true);
		setSaveError(null);

		try {
			const segs = result.segments ?? [];
			const avgMetric = (key: 'timing' | 'amplitude' | 'pose_accuracy') =>
				segs.length > 0
					? segs.reduce((s, seg) => s + (seg[key] ?? 0), 0) / segs.length
					: undefined;

			await saveAttemptToProfile(userDanceId, result.dance_id, {
				includeVideo: !isPrivate,
				userName,
				isPrivate,
				score: result.score,
				timingScore: avgMetric('timing'),
				amplitudeScore: avgMetric('amplitude'),
				poseScore: avgMetric('pose_accuracy'),
			});

			setSavedToProfile(true);
			setShowSaveDialog(false);
		} catch {
			setSaveError('Не удалось сохранить. Попробуй позже.');
		} finally {
			setSavingToProfile(false);
		}
	};

	const handleUnsave = async () => {
		if (!userDanceId) {
			return;
		}

		setSavingToProfile(true);
		setSaveError(null);

		try {
			await unsaveAttemptFromProfile(userDanceId);
			setSavedToProfile(false);
		} catch {
			setSaveError('Не удалось убрать. Попробуй позже.');
		} finally {
			setSavingToProfile(false);
		}
	};

	if (loading) {
		return (
			<div className={styles.page}>
				<Loading />
			</div>
		);
	}

	if (error || !result) {
		return (
			<ErrorScreen
				title="Попытка недоступна"
				description={
					error ||
					'Результаты этой попытки не найдены. Возможно, файлы уже удалены — попробуйте записать новую попытку.'
				}
				actions={<Button onClick={() => navigate('/')}>На главную</Button>}
			/>
		);
	}

	let saveButtonLabel: string;

	if (savingToProfile) {
		saveButtonLabel = 'Сохраняем...';
	} else if (savedToProfile) {
		saveButtonLabel = 'В профиле';
	} else {
		saveButtonLabel = 'Добавить в профиль';
	}

	return (
		<div className={styles.page}>
			<div className={styles.inner}>
				{}
				<div className={styles.header}>
					<button className={styles.backBtn} onClick={handleBackToLesson}>
						← Назад к уроку
					</button>
					<h1 className={styles.title}>
						{result.owner ? 'Чужая попытка' : 'Результат сравнения'}
					</h1>
				</div>

				{}
				{result.owner && (
					<div
						className={styles.foreignBanner}
						onClick={() => navigate(`/profile/${result.owner!.user_id}`)}
						role="link"
					>
						<span className={styles.foreignBannerLabel}>
							Танец пользователя
						</span>
						<span className={styles.foreignBannerLogin}>
							{result.owner.login}
						</span>
						<span className={styles.foreignBannerHint}>
							→ перейти в профиль
						</span>
					</div>
				)}

				{}
				<div className={styles.mainGrid}>
					<div className={styles.scoreCard}>
						<div className={styles.scoreLabel}>
							{result.owner
								? `Результат @${result.owner.login}`
								: 'Твой результат'}
						</div>
						<div className={styles.scoreNumberRow}>
							<span
								className={styles.scoreNumber}
								style={{ color: metricColor(score) }}
							>
								{score}
							</span>
							<span className={styles.scoreDenom}>/100</span>
						</div>
						<div className={styles.scoreCaption}>{scoreMotivation(score)}</div>
						{result.dance_stats && result.dance_stats.attempt_count > 0 && (
							<div className={styles.scorePersonal}>
								Лучшая попытка: {Math.round(result.dance_stats.best_score)}
								{' · '}
								Попыток: {result.dance_stats.attempt_count}
							</div>
						)}
					</div>

					<div className={styles.metricsCard}>
						<div className={styles.metricsTitle}>Разбивка по метрикам</div>
						<MetricRow iconName="clock" label="Тайминг" value={avgTiming} />
						<MetricRow iconName="wave" label="Амплитуда" value={avgAmplitude} />
						<MetricRow
							iconName="target"
							label="Точность позиции"
							value={avgTechnique}
						/>
						{hitRate !== null && (
							<MetricRow
								iconName="rhythm"
								label="Попадания в ритм"
								value={hitRate}
							/>
						)}
					</div>
				</div>

				{}
				{progressData.length >= 2 && (
					<div className={styles.sparklineSection}>
						<span className={styles.sparklineSectionTitle}>Прогресс</span>
						<ScoreSparkline data={progressData} />
					</div>
				)}

				{}
				{segs.length > 0 && (
					<SegmentBarChart segments={segs} danceId={result.dance_id} />
				)}

				{}
				{notDetectedPct !== null && notDetectedPct > 5 && (
					<NotDetectedWarning pct={notDetectedPct} />
				)}

				{}
				{result.user_skeleton_key &&
					(() => {
						const s3 = (S3_ADDRESS || '').replace(/\/+$/, '');
						return (
							<div className={styles.frameTimelineSection}>
								<h2 className={styles.sectionTitle}>Разбор полёта</h2>
								<PlaybackOverlay
									userVideoUrl={
										result.user_video_key
											? `${s3}/${result.user_video_key}`
											: undefined
									}
									userSkeletonUrl={`${s3}/${result.user_skeleton_key}`}
									referenceVideoUrl={`${s3}/results/${result.dance_id}/video.mp4`}
									referenceSkeletonUrl={
										result.reference_skeleton_key
											? `${s3}/${result.reference_skeleton_key}`
											: undefined
									}
								/>
							</div>
						);
					})()}

				{}
				{leaderboard && (
					<div className={styles.bottomGrid}>
						<LeaderboardCard data={leaderboard} />
					</div>
				)}

				{}
				{isAuthenticated && friendsScores.length > 0 && (
					<div className={styles.friendsScoresCard}>
						<h2 className={styles.sectionTitle}>Результаты друзей</h2>
						<div className={styles.friendsScoresList}>
							{friendsScores.map((fs) => (
								<div key={fs.friend_login} className={styles.friendScoreRow}>
									<img
										src={fs.avatar_url ? `${S3_ADDRESS}/${fs.avatar_url}` : ''}
										alt={fs.friend_login}
										className={styles.friendScoreAvatar}
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none';
										}}
									/>
									<span className={styles.friendScoreLogin}>
										{fs.friend_login}
									</span>
									<span className={styles.friendScoreValue}>
										{Math.round(fs.best_score)}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{!result.owner && activeDuels.length > 0 && !duelSubmitted && (
					<div className={styles.duelBanner}>
						<span className={styles.duelBannerIcon}>⚔️</span>
						<div className={styles.duelBannerBody}>
							<p className={styles.duelBannerTitle}>
								Тебя вызвали на дуэль на этот танец!
							</p>
							<p className={styles.duelBannerText}>
								{activeDuels.length > 1 ? 'Соперники' : 'Соперник'}:{' '}
								{activeDuels.map((d) => d.opponent_login).join(', ')}. Нажми
								«Отправить на дуэль», чтобы засчитать эту попытку в бой — иначе
								это просто тренировка.
							</p>
						</div>
					</div>
				)}

				{}
				<div className={styles.actionRow}>
					<button className={styles.btnPrimary} onClick={handleRetry}>
						{result.owner ? 'Записать свою попытку' : 'Попробовать ещё раз'}
					</button>
					<button className={styles.btnSecondary} onClick={handleShare}>
						Поделиться результатом
					</button>
					{}
					{!result.owner && (
						<button
							className={`${styles.btnSecondary} ${savedToProfile ? styles.btnSecondaryActive : ''}`}
							onClick={handleSaveBtnClick}
							disabled={savingToProfile}
						>
							{saveButtonLabel}
						</button>
					)}
					{!result.owner && activeDuels.length > 0 && !duelSubmitted && (
						<button
							className={styles.btnDuel}
							onClick={handleSubmitToDuel}
							disabled={duelSubmitting}
						>
							{duelSubmitting
								? 'Отправляем…'
								: `⚔️ Отправить на дуэль (${activeDuels
										.map((d) => d.opponent_login)
										.join(', ')})`}
						</button>
					)}
				</div>
				{!result.owner && duelSubmitted && (
					<div className={styles.duelDoneBanner}>
						<span className={styles.duelBannerIcon}>✅</span>
						<div className={styles.duelBannerBody}>
							<p className={styles.duelBannerTitle}>
								Попытка отправлена на дуэль!
							</p>
							<p className={styles.duelBannerText}>
								{activeDuels.length > 1 ? 'Соперники' : 'Соперник'}:{' '}
								{activeDuels.map((d) => d.opponent_login).join(', ')}. Как
								только{' '}
								{activeDuels.length > 1 ? 'они станцуют' : 'соперник станцует'},
								результат боя появится в разделе «Дуэли».
							</p>
						</div>
					</div>
				)}
				{saveError && <p className={styles.saveError}>{saveError}</p>}
				{duelError && <p className={styles.saveError}>{duelError}</p>}

				{}
				<RatingSection
					isAuthenticated={isAuthenticated}
					hasRated={hasRated}
					ratingData={ratingData}
					ratingLoading={ratingLoading}
					userDanceId={userDanceId ?? ''}
					danceId={result.dance_id}
					onRated={setRatingData}
					onHasRatedChange={() => {
						setHasRated(true);
						setRatingRefreshKey((p) => p + 1);
					}}
				/>

				{}
				<div className={styles.viewerSection}>
					<h2 className={styles.sectionTitle}>Сравнение движений</h2>
					<div className={styles.viewerWrapper}>
						<CompareViewer
							userGlbKey={result.user_glb_key}
							referenceGlbKey={result.reference_glb_key}
							userJointHeatmap={jointHeatmap}
						/>
					</div>
				</div>

				{similarDances.length > 0 && <SimilarDances dances={similarDances} />}
			</div>

			{showRecord && result && (
				<CheckYourself
					referenceVideoUrl={`${(S3_ADDRESS || '').replace(/\/+$/, '')}/results/${result.dance_id}/video.mp4`}
					referenceDanceId={result.dance_id}
					onClose={() => setShowRecord(false)}
					onSubmit={(blob, startTime, endTime) => {
						setShowRecord(false);
						dispatch(
							uploadAndCompare(blob, result.dance_id, startTime, endTime),
						);
					}}
					submitting={uploadIsProcessing}
				/>
			)}

			{showSaveDialog && (
				<SaveToProfileDialog
					onClose={() => setShowSaveDialog(false)}
					onConfirm={handleConfirmSave}
					submitting={savingToProfile}
				/>
			)}

			{showRegisterPrompt && (
				<div
					className={styles.modalBackdrop}
					onClick={() => setShowRegisterPrompt(false)}
				>
					<div
						className={styles.modalCard}
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className={styles.modalTitle}>Сохрани результат в профиль</h3>
						<p className={styles.modalText}>
							Чтобы добавить попытку в профиль и вернуться к ней позже, нужна
							регистрация. Это бесплатно и займёт минуту — твой результат не
							потеряется.
						</p>
						<div className={styles.modalActions}>
							<button
								className={styles.btnPrimary}
								onClick={handleRegisterFromPrompt}
							>
								Зарегистрироваться
							</button>
							<button
								className={styles.btnSecondary}
								onClick={handleLoginFromPrompt}
							>
								Войти
							</button>
						</div>
						<button
							className={styles.modalDismiss}
							onClick={() => setShowRegisterPrompt(false)}
						>
							Не сейчас
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default ComparePage;
