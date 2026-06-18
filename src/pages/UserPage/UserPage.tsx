import {
	getUserAchievements,
	type AchievementsWithMeta,
	type UserAchievement,
} from '@/api/achievements';
import {
	getFriendsByUserId,
	removeFriend,
	respondFriendRequest,
	sendFriendRequest,
	type Friend,
} from '@/api/users/friends';
import {
	getCreatorAnalytics,
	getMostImprovedDance,
	getPublicProfile,
	getTelegramLinkCode,
	getUserAttempts,
	saveAttemptToProfile,
	type CreatorAnalytics,
	type MostImprovedDance,
	type PublicProfileResponse,
	type SavedAttemptItem,
	type TelegramLinkCode,
	type UserAttemptItem,
} from '@/api/users/profile';
import {
	deleteDance,
	getUploadedDances,
	publishDance,
	setDanceName,
	unpublishDance,
	type UploadedDance,
} from '@/api/users/uploadedDances';
import AchievementBadge from '@/components/AchievementBadge/AchievementBadge';
import ActivityHeatmap from '@/components/ActivityHeatmap/ActivityHeatmap';
import CreatorDashboard from '@/components/CreatorDashboard/CreatorDashboard';
import DuelChallenge from '@/components/DuelChallenge/DuelChallenge';
import EditProfileModal from '@/components/EditProfileModal/EditProfileModal';
import ErrorScreen from '@/components/Error/Error';
import HistoryItemCard from '@/components/HistoryItem/HistoryItem';
import LikedItemCard from '@/components/LikedItem/LikedItem';
import Loading from '@/components/Loading/Loading';
import PersonalTopSection from '@/components/PersonalTopSection/PersonalTopSection';
import ProfileStatsBanner from '@/components/ProfileStatsBanner/ProfileStatsBanner';
import SavedDanceCard from '@/components/SavedDanceCard/SavedDanceCard';
import UploadedDanceCard from '@/components/UploadedDanceCard/UploadedDanceCard';
import VerticalVideo from '@/components/VerticalVideo/VerticalVideo';
import type { Difficulty } from '@/consts/danceDifficulty';
import { S3_ADDRESS } from '@/consts/urls';
import { fetchHistory } from '@/redux/features/history/actions';
import {
	selectHistoryItems,
	selectHistoryLoading,
} from '@/redux/features/history/selectors';
import { fetchLikes } from '@/redux/features/likes/actions';
import {
	selectLikesItems,
	selectLikesLoading,
} from '@/redux/features/likes/selectors';
import {
	selectIsAuthChecked,
	selectUser,
} from '@/redux/features/user/selectors';
import type { AppDispatch } from '@/redux/store';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useParams } from 'react-router-dom';
import styles from './UserPage.module.scss';

const DEFAULT_AVATAR =
	'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/assets/default_avatar.jpg';

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
	{ value: 'easy', label: 'Лёгкий' },
	{ value: 'medium', label: 'Средний' },
	{ value: 'hard', label: 'Сложный' },
];

const avatarUrl = (avatar: string, updatedAt: string): string => {
	if (!avatar) {
		return DEFAULT_AVATAR;
	}

	if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
		return avatar;
	}

	const base = (S3_ADDRESS || '').replace(/\/+$/, '');
	const bust = encodeURIComponent(updatedAt || '');
	return `${base}/${avatar}?u=${bust}`;
};

const formatDate = (iso: string): string => {
	try {
		const d = new Date(iso);
		return d.toLocaleDateString('ru-RU', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	} catch {
		return '';
	}
};

type TabKey =
	| 'history'
	| 'likes'
	| 'saved'
	| 'friends'
	| 'uploaded'
	| 'achievements'
	| 'analytics';

const pluralizeDelta = (delta: number): string => {
	const d = Math.round(delta);

	if (d >= 10 && d <= 14) {
		return 'баллов';
	}

	if (d % 10 === 1) {
		return 'балл';
	}

	if (d % 10 >= 2 && d % 10 <= 4) {
		return 'балла';
	}

	return 'баллов';
};

type FriendButtonState =
	| 'none'
	| 'pending_sent'
	| 'pending_received'
	| 'accepted'
	| 'loading';

const UserPage: React.FC = () => {
	const { id: profileId } = useParams<{ id: string }>();
	const dispatch = useDispatch<AppDispatch>();

	const me = useSelector(selectUser);
	const isAuthChecked = useSelector(selectIsAuthChecked);
	const historyItems = useSelector(selectHistoryItems) ?? [];
	const historyLoading = useSelector(selectHistoryLoading);
	const likedItems = useSelector(selectLikesItems) ?? [];
	const likesLoading = useSelector(selectLikesLoading);

	const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
	const [profileLoading, setProfileLoading] = useState(true);
	const [profileError, setProfileError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<TabKey>('saved');
	const [editing, setEditing] = useState(false);

	const [friends, setFriends] = useState<Friend[]>([]);
	const [friendsLoading, setFriendsLoading] = useState(false);
	const [friendBtnState, setFriendBtnState] =
		useState<FriendButtonState>('none');

	const [linkCopied, setLinkCopied] = useState(false);

	const [telegramLink, setTelegramLink] = useState<TelegramLinkCode | null>(
		null,
	);

	const [telegramLoading, setTelegramLoading] = useState(false);
	const [telegramCopied, setTelegramCopied] = useState(false);

	const [uploadedDances, setUploadedDances] = useState<UploadedDance[]>([]);
	const [uploadedLoading, setUploadedLoading] = useState(false);
	const [attempts, setAttempts] = useState<UserAttemptItem[]>([]);
	const [attemptsLoading, setAttemptsLoading] = useState(false);
	const [visibilityConfirm, setVisibilityConfirm] = useState<{
		dance: UploadedDance;
	} | null>(null);

	const [deleteConfirm, setDeleteConfirm] = useState<{
		dance: UploadedDance;
	} | null>(null);

	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState('');
	const [editingDifficulty, setEditingDifficulty] =
		useState<Difficulty>('medium');

	const [achievements, setAchievements] = useState<UserAchievement[]>([]);
	const [achievementsMeta, setAchievementsMeta] = useState<Omit<
		AchievementsWithMeta,
		'achievements'
	> | null>(null);

	const [achievementsLoading, setAchievementsLoading] = useState(false);
	const [achievementToast, setAchievementToast] = useState<UserAchievement[]>(
		[],
	);

	const toastShownRef = useRef(false);
	const achievementToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const linkCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			clearTimeout(achievementToastTimerRef.current ?? undefined);
			clearTimeout(linkCopiedTimerRef.current ?? undefined);
		},
		[],
	);

	const [duelChallengeOpen, setDuelChallengeOpen] = useState(false);
	const [mostImproved, setMostImproved] = useState<MostImprovedDance | null>(
		null,
	);

	const [creatorAnalytics, setCreatorAnalytics] =
		useState<CreatorAnalytics | null>(null);

	const [creatorAnalyticsLoading, setCreatorAnalyticsLoading] = useState(false);

	const isOwn = !!(me && profileId && me.id === profileId);

	const loadProfile = useCallback(async () => {
		if (!profileId) {
			return;
		}

		setProfileLoading(true);
		setProfileError(null);

		try {
			const data = await getPublicProfile(profileId);
			setProfile(data);

			if (!data.is_own_profile && data.friendship_status) {
				const fs = data.friendship_status;

				if (fs.status === 'accepted') {
					setFriendBtnState('accepted');
				} else if (fs.status === 'pending') {
					setFriendBtnState(fs.is_sender ? 'pending_sent' : 'pending_received');
				} else {
					setFriendBtnState('none');
				}
			}
		} catch {
			setProfileError('Не удалось загрузить профиль.');
		} finally {
			setProfileLoading(false);
		}
	}, [profileId]);

	useEffect(() => {
		loadProfile();
	}, [loadProfile]);

	useEffect(() => {
		if (isOwn) {
			dispatch(fetchHistory());
			dispatch(fetchLikes());
		}
	}, [dispatch, isOwn]);

	const loadFriends = useCallback(async () => {
		if (!profileId) {
			return;
		}

		setFriendsLoading(true);

		try {
			const data = await getFriendsByUserId(profileId);
			setFriends(data ?? []);
		} catch {
			setFriends([]);
		} finally {
			setFriendsLoading(false);
		}
	}, [profileId]);

	useEffect(() => {
		if (activeTab === 'friends') {
			loadFriends();
		}
	}, [activeTab, loadFriends]);

	const loadAttempts = useCallback(async () => {
		if (!isOwn) {
			return;
		}

		setAttemptsLoading(true);

		try {
			const data = await getUserAttempts();
			setAttempts(data ?? []);
		} catch {
			setAttempts([]);
		} finally {
			setAttemptsLoading(false);
		}
	}, [isOwn]);

	useEffect(() => {
		if (isOwn) {
			loadAttempts();
		}
	}, [isOwn, loadAttempts]);

	const handleToggleAttemptOpen = useCallback(
		async (attemptId: string, makePrivate: boolean) => {
			if (!isOwn) {
				return;
			}

			const a = attempts.find((x) => x.attempt_id === attemptId);

			if (!a) {
				return;
			}

			setAttempts((prev) =>
				prev.map((x) =>
					x.attempt_id === attemptId
						? { ...x, is_open: !makePrivate, is_saved: true }
						: x,
				),
			);

			try {
				await saveAttemptToProfile(attemptId, a.dance_id, {
					includeVideo: true,
					userName: a.user_name,
					isPrivate: makePrivate,
					score: a.score,
				});
			} catch {
				loadAttempts();
			}
		},
		[isOwn, attempts, loadAttempts],
	);

	const handleRenameAttempt = useCallback(
		async (attemptId: string, name: string) => {
			if (!isOwn) {
				return;
			}

			const a = attempts.find((x) => x.attempt_id === attemptId);

			if (!a) {
				return;
			}

			const trimmed = name.trim();

			setAttempts((prev) =>
				prev.map((x) =>
					x.attempt_id === attemptId
						? { ...x, user_name: trimmed, is_saved: true }
						: x,
				),
			);

			try {
				await saveAttemptToProfile(attemptId, a.dance_id, {
					includeVideo: true,
					userName: trimmed,
					isPrivate: !a.is_open,
					score: a.score,
				});
			} catch {
				loadAttempts();
			}
		},
		[isOwn, attempts, loadAttempts],
	);

	const handleSendFriendRequest = useCallback(async () => {
		if (!profileId || friendBtnState === 'loading') {
			return;
		}

		setFriendBtnState('loading');

		try {
			await sendFriendRequest(profileId);
			setFriendBtnState('pending_sent');
		} catch {
			setFriendBtnState('none');
		}
	}, [profileId, friendBtnState]);

	const handleRespondFriendRequest = useCallback(
		async (accept: boolean) => {
			const fs = profile?.friendship_status;

			if (!fs || !fs.friendship_id) {
				return;
			}

			setFriendBtnState('loading');

			try {
				await respondFriendRequest(fs.friendship_id, accept);
				setFriendBtnState(accept ? 'accepted' : 'none');

				if (accept) {
					loadProfile();
				}
			} catch {
				setFriendBtnState('pending_received');
			}
		},
		[profile, loadProfile],
	);

	const [removeFriendConfirm, setRemoveFriendConfirm] = useState(false);
	const handleRemoveFriendClick = useCallback(() => {
		if (friendBtnState === 'loading') {
			return;
		}

		setRemoveFriendConfirm(true);
	}, [friendBtnState]);

	const handleRemoveFriendConfirmed = useCallback(async () => {
		if (!profileId) {
			return;
		}

		setRemoveFriendConfirm(false);
		setFriendBtnState('loading');

		try {
			await removeFriend(profileId);
			setFriendBtnState('none');
			setFriends((prev) => prev.filter((f) => f.user_id !== profileId));
		} catch {
			setFriendBtnState('accepted');
		}
	}, [profileId]);

	const loadUploadedDances = useCallback(async () => {
		if (!isOwn) {
			return;
		}

		setUploadedLoading(true);

		try {
			const data = await getUploadedDances();
			setUploadedDances(data ?? []);
		} catch {
			setUploadedDances([]);
		} finally {
			setUploadedLoading(false);
		}
	}, [isOwn]);

	useEffect(() => {
		if (isOwn) {
			loadUploadedDances();
		}
	}, [loadUploadedDances, isOwn]);

	useEffect(() => {
		if (!isOwn) {
			return;
		}

		getMostImprovedDance()
			.then(setMostImproved)
			.catch(() => setMostImproved(null));
	}, [isOwn]);

	const loadAchievements = useCallback(async () => {
		if (!profileId) {
			return;
		}

		setAchievementsLoading(true);

		try {
			const data = await getUserAchievements(profileId);
			const list = data?.achievements ?? [];
			setAchievements(list);
			setAchievementsMeta({
				unlocked_count: data?.unlocked_count ?? 0,
				total_count: data?.total_count ?? 0,
				percentile: data?.percentile ?? 0,
			});

			if (isOwn && !toastShownRef.current) {
				toastShownRef.current = true;
				const cutoff = Date.now() - 24 * 60 * 60 * 1000;
				const fresh = list.filter(
					(a) =>
						a.unlocked &&
						a.unlocked_at &&
						new Date(a.unlocked_at).getTime() > cutoff,
				);

				if (fresh.length > 0) {
					setAchievementToast(fresh);
					achievementToastTimerRef.current = setTimeout(
						() => setAchievementToast([]),
						4000,
					);
				}
			}
		} catch {
			setAchievements([]);
			setAchievementsMeta(null);
		} finally {
			setAchievementsLoading(false);
		}
	}, [profileId, isOwn]);

	useEffect(() => {
		if (activeTab === 'achievements') {
			loadAchievements();
		}
	}, [activeTab, loadAchievements]);

	useEffect(() => {
		if (activeTab !== 'analytics' || !isOwn || creatorAnalytics) {
			return;
		}

		const controller = new AbortController();
		setCreatorAnalyticsLoading(true);
		getCreatorAnalytics(controller.signal)
			.then((data) => {
				if (!controller.signal.aborted) {
					setCreatorAnalytics(data);
				}
			})
			.catch(() => {
				if (!controller.signal.aborted) {
					setCreatorAnalytics(null);
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setCreatorAnalyticsLoading(false);
				}
			});

		return () => controller.abort();
	}, [activeTab, isOwn, creatorAnalytics]);

	const handleToggleVisibility = useCallback(async (dance: UploadedDance) => {
		const isPublic = dance.status === 'published';

		try {
			if (isPublic) {
				await unpublishDance(dance.dance_id);
			} else {
				await publishDance(dance.dance_id);
			}

			setUploadedDances((prev) =>
				prev.map((d) =>
					d.dance_id === dance.dance_id
						? { ...d, status: isPublic ? 'private' : 'published' }
						: d,
				),
			);
		} catch {}

		setVisibilityConfirm(null);
	}, []);

	const handleDeleteDance = useCallback(async (dance: UploadedDance) => {
		try {
			await deleteDance(dance.dance_id);
			setUploadedDances((prev) =>
				prev.filter((d) => d.dance_id !== dance.dance_id),
			);
		} catch {}

		setDeleteConfirm(null);
	}, []);

	const handleRenameSubmit = async (dance: UploadedDance) => {
		const trimmed = renameValue.trim();
		const titleChanged = !!trimmed && trimmed !== dance.title;
		const currentDifficulty = dance.difficulty ?? 'medium';
		const difficultyChanged = editingDifficulty !== currentDifficulty;

		if (!titleChanged && !difficultyChanged) {
			setRenamingId(null);
			return;
		}

		const nextTitle = titleChanged ? trimmed : dance.title;

		try {
			await setDanceName(
				dance.dance_id,
				nextTitle,
				dance.status === 'published',
				difficultyChanged ? editingDifficulty : undefined,
			);

			setUploadedDances((prev) =>
				prev.map((d) =>
					d.dance_id === dance.dance_id
						? {
								...d,
								title: nextTitle,
								difficulty: difficultyChanged
									? editingDifficulty
									: d.difficulty,
								difficulty_by_users: difficultyChanged
									? false
									: d.difficulty_by_users,
							}
						: d,
				),
			);
		} catch {}

		setRenamingId(null);
	};

	const handleCopyLink = useCallback(() => {
		const url = `${window.location.origin}/profile/${profileId}`;
		navigator.clipboard.writeText(url).then(() => {
			setLinkCopied(true);
			linkCopiedTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
		});
	}, [profileId]);

	const handleConnectTelegram = useCallback(async () => {
		setTelegramLoading(true);
		setTelegramCopied(false);

		try {
			const link = await getTelegramLinkCode();
			setTelegramLink(link);
		} catch {
			setTelegramLink(null);
		} finally {
			setTelegramLoading(false);
		}
	}, []);

	const headerUser = useMemo(() => {
		if (isOwn && me) {
			return {
				login: me.login,
				avatar: me.avatar,
				updatedAt: me.updated_at,
			};
		}

		if (profile) {
			return {
				login: profile.user.login,
				avatar: profile.user.avatar,
				updatedAt: profile.user.updated_at,
			};
		}

		return null;
	}, [isOwn, me, profile]);

	if (!profileId) {
		return <Navigate to="/" replace />;
	}

	if (!isAuthChecked) {
		return null;
	}

	if (profileLoading && !profile) {
		return (
			<div className={styles.page}>
				<Loading />
			</div>
		);
	}

	if (profileError || !profile || !headerUser) {
		return <ErrorScreen />;
	}

	const saved: SavedAttemptItem[] = profile.saved_attempts;
	const friendsCount = profile.friends_count ?? 0;

	const tabs: { key: TabKey; label: string; count?: number }[] = isOwn
		? [
				{ key: 'saved', label: 'Мои танцы', count: attempts.length },
				{ key: 'friends', label: 'Друзья', count: friendsCount },
				{ key: 'history', label: 'История', count: historyItems.length },
				{ key: 'likes', label: 'Понравившиеся', count: likedItems.length },
				{ key: 'uploaded', label: 'Загруженные', count: uploadedDances.length },
				{ key: 'achievements', label: 'Достижения' },
				{ key: 'analytics', label: 'Аналитика' },
			]
		: [
				{ key: 'saved', label: 'Танцы', count: saved.length },
				{
					key: 'uploaded',
					label: 'Загруженные',
					count: profile.uploaded_dances?.length ?? 0,
				},
				{ key: 'friends', label: 'Друзья', count: friendsCount },
				{ key: 'achievements', label: 'Достижения' },
			];

	const renderFriendButton = () => {
		if (isOwn || !me) {
			return null;
		}

		if (friendBtnState === 'accepted') {
			return (
				<button
					className={`${styles.friendBtn} ${styles.friendBtnActive}`}
					onClick={handleRemoveFriendClick}
					disabled={friendBtnState === ('loading' as FriendButtonState)}
				>
					В друзьях
				</button>
			);
		}

		if (friendBtnState === 'pending_sent') {
			return (
				<button
					className={`${styles.friendBtn} ${styles.friendBtnPending}`}
					disabled
				>
					Заявка отправлена
				</button>
			);
		}

		if (friendBtnState === 'pending_received') {
			return (
				<div className={styles.friendRespondGroup}>
					<span className={styles.friendRespondHint}>
						Хочет добавить тебя в друзья
					</span>
					<div className={styles.friendRespondActions}>
						<button
							className={`${styles.friendBtn} ${styles.friendAcceptBtn}`}
							onClick={() => handleRespondFriendRequest(true)}
						>
							Принять
						</button>
						<button
							className={`${styles.friendBtn} ${styles.friendDeclineBtn}`}
							onClick={() => handleRespondFriendRequest(false)}
						>
							Отклонить
						</button>
					</div>
				</div>
			);
		}

		return (
			<button
				className={styles.friendBtn}
				onClick={handleSendFriendRequest}
				disabled={friendBtnState === 'loading'}
			>
				{friendBtnState === 'loading' ? 'Отправка...' : 'Добавить в друзья'}
			</button>
		);
	};

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const renderTabContent = () => {
		if (activeTab === 'saved') {
			if (isOwn) {
				if (attemptsLoading && attempts.length === 0) {
					return <p className={styles.tabEmpty}>Загрузка...</p>;
				}

				if (attempts.length === 0) {
					return (
						<p className={styles.tabEmpty}>
							Здесь будут все твои попытки. Сравни танец, чтобы записать первую
						</p>
					);
				}

				return (
					<div className={styles.cardGrid}>
						{attempts.map((a) => {
							const cardItem: SavedAttemptItem = {
								user_dance_id: a.attempt_id,
								dance_id: a.dance_id,
								dance_title: a.dance_title,
								user_name: a.user_name,
								is_private: !a.is_open,
								score: a.score,
								saved_at: a.created_at,
								reference_video_key: `users/${profileId}/${a.attempt_id}/video.mp4`,
								user_animation_key: '',
								user_skeleton_key: '',
								has_video: true,
							};

							return (
								<SavedDanceCard
									key={a.attempt_id}
									item={cardItem}
									onTogglePrivacy={handleToggleAttemptOpen}
									onRename={handleRenameAttempt}
								/>
							);
						})}
					</div>
				);
			}

			if (saved.length === 0) {
				return (
					<p className={styles.tabEmpty}>
						У этого пользователя пока нет открытых танцев
					</p>
				);
			}

			return (
				<div className={styles.cardGrid}>
					{saved.map((item) => (
						<SavedDanceCard
							key={item.user_dance_id}
							item={{
								...item,
								reference_video_key: `users/${profileId}/${item.user_dance_id}/video.mp4`,
							}}
						/>
					))}
				</div>
			);
		}

		if (activeTab === 'friends') {
			if (friendsLoading) {
				return <p className={styles.tabEmpty}>Загрузка...</p>;
			}

			if (friends.length === 0) {
				return (
					<p className={styles.tabEmpty}>
						{isOwn
							? 'У вас пока нет друзей'
							: 'У этого пользователя пока нет друзей'}
					</p>
				);
			}

			return (
				<div className={styles.friendsList}>
					{friends.map((f) => (
						<Link
							key={f.user_id}
							to={`/profile/${f.user_id}`}
							className={styles.friendCard}
						>
							<img
								src={avatarUrl(f.avatar, '')}
								alt={f.login}
								className={styles.friendAvatar}
							/>
							<div className={styles.friendInfo}>
								<div className={styles.friendLogin}>{f.login}</div>
								<div className={styles.friendSince}>
									Друзья с {formatDate(f.friended_at)}
								</div>
							</div>
							{f.active_duel_id && (
								<span className={styles.duelBadge} title="В дуэли">
									⚔️
								</span>
							)}
						</Link>
					))}
				</div>
			);
		}

		if (activeTab === 'history') {
			if (historyLoading) {
				return <p className={styles.tabEmpty}>Загрузка...</p>;
			}

			if (historyItems.length === 0) {
				return <p className={styles.tabEmpty}>История пуста</p>;
			}

			return (
				<div className={styles.cardGrid}>
					{historyItems.map((item) => (
						<div key={item.id} className={styles.legacyCardWrap}>
							<HistoryItemCard item={item} />
						</div>
					))}
				</div>
			);
		}

		if (activeTab === 'likes') {
			if (likesLoading) {
				return <p className={styles.tabEmpty}>Загрузка...</p>;
			}

			if (likedItems.length === 0) {
				return <p className={styles.tabEmpty}>Нет понравившихся танцев</p>;
			}

			return (
				<div className={styles.cardGrid}>
					{likedItems.map((item) => (
						<div key={item.dance_id} className={styles.legacyCardWrap}>
							<LikedItemCard item={item} />
						</div>
					))}
				</div>
			);
		}

		if (activeTab === 'uploaded') {
			if (!isOwn) {
				const uploaded = profile.uploaded_dances ?? [];

				if (uploaded.length === 0) {
					return (
						<p className={styles.tabEmpty}>
							У этого пользователя пока нет загруженных танцев
						</p>
					);
				}

				return (
					<div className={styles.cardGrid}>
						{uploaded.map((d) => (
							<VerticalVideo
								key={d.dance_id}
								video={{
									id: d.dance_id,
									url: d.video_path,
									title: d.title,
									attempt_count: d.attempt_count,
									view_count: d.view_count,
									like_count: d.like_count,
								}}
							/>
						))}
					</div>
				);
			}

			if (uploadedLoading) {
				return <p className={styles.tabEmpty}>Загрузка...</p>;
			}

			if (uploadedDances.length === 0) {
				return (
					<p className={styles.tabEmpty}>У вас пока нет загруженных танцев</p>
				);
			}

			return (
				<div className={styles.cardGrid}>
					{uploadedDances.map((dance) => (
						<div key={dance.dance_id} className={styles.legacyCardWrap}>
							<UploadedDanceCard
								dance={dance}
								onEdit={(d) => {
									setRenamingId(d.dance_id);
									setRenameValue(d.title || '');
									setEditingDifficulty(d.difficulty ?? 'medium');
								}}
								onToggleVisibility={(d) => setVisibilityConfirm({ dance: d })}
								onDelete={(d) => setDeleteConfirm({ dance: d })}
							/>
						</div>
					))}
				</div>
			);
		}

		if (activeTab === 'achievements') {
			if (achievementsLoading) {
				return <p className={styles.tabEmpty}>Загрузка...</p>;
			}

			if (achievements.length === 0) {
				return <p className={styles.tabEmpty}>Нет данных о достижениях</p>;
			}

			const unlocked = achievements
				.filter((a) => a.unlocked)
				.sort(
					(a, b) =>
						new Date(b.unlocked_at ?? 0).getTime() -
						new Date(a.unlocked_at ?? 0).getTime(),
				);

			const locked = achievements.filter((a) => !a.unlocked);
			return (
				<>
					<div className={styles.achievementsGrid}>
						{[...unlocked, ...locked].map((a) => (
							<AchievementBadge key={a.id} achievement={a} />
						))}
					</div>
					{achievementsMeta && (
						<p className={styles.achievementsPercentile}>
							{achievementsMeta.unlocked_count} из{' '}
							{achievementsMeta.total_count}
							{achievementsMeta.percentile > 0 && (
								<>
									{' '}
									· лучше {Math.round(achievementsMeta.percentile)}% участников
								</>
							)}
						</p>
					)}
				</>
			);
		}

		if (activeTab === 'analytics') {
			if (creatorAnalyticsLoading) {
				return <p className={styles.tabEmpty}>Загрузка...</p>;
			}

			if (!creatorAnalytics) {
				return <p className={styles.tabEmpty}>Нет данных аналитики</p>;
			}

			return <CreatorDashboard data={creatorAnalytics} />;
		}

		return null;
	};

	return (
		<div className={styles.page}>
			<div className={styles.inner}>
				<header className={styles.profileHeader}>
					<div className={styles.avatarWrap}>
						<img
							src={avatarUrl(headerUser.avatar, headerUser.updatedAt)}
							alt={headerUser.login}
							className={styles.avatar}
						/>
					</div>
					<div className={styles.identity}>
						<h1 className={styles.login}>{headerUser.login}</h1>
						<p className={styles.identitySub}>
							Сохранённых танцев: {saved.length}
							{friendsCount > 0 && ` · Друзей: ${friendsCount}`}
						</p>
						{profile?.stats && <ProfileStatsBanner stats={profile.stats} />}
					</div>
					<div className={styles.headerActions}>
						<button
							className={styles.copyLinkBtn}
							onClick={handleCopyLink}
							title="Скопировать ссылку на профиль"
						>
							{linkCopied ? (
								<>
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.5"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<polyline points="20 6 9 17 4 12" />
									</svg>
									Скопировано
								</>
							) : (
								<>
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
										<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
									</svg>
									Поделиться
								</>
							)}
						</button>
						{isOwn ? (
							<>
								<button
									className={styles.editBtn}
									onClick={() => setEditing(true)}
								>
									Редактировать
								</button>
								<button
									className={styles.editBtn}
									onClick={handleConnectTelegram}
									disabled={telegramLoading}
									title="Привязать аккаунт к Telegram-боту"
								>
									{telegramLoading ? '...' : 'Привязать Telegram'}
								</button>
							</>
						) : (
							<>
								{renderFriendButton()}
								{me && (
									<button
										className={styles.duelBtn}
										onClick={() => setDuelChallengeOpen(true)}
									>
										Бросить вызов
									</button>
								)}
							</>
						)}
					</div>
				</header>

				<PersonalTopSection items={profile.personal_top} isOwn={isOwn} />

				<ActivityHeatmap userId={profile.user.id} />

				{mostImproved && (
					<div className={styles.mostImproved}>
						<span className={styles.mostImprovedIcon}>📈</span>
						<span className={styles.mostImprovedText}>
							Наибольший прогресс:&nbsp;
							<strong>{mostImproved.title}</strong>
							&nbsp;+{Math.round(mostImproved.delta)}&nbsp;
							{pluralizeDelta(mostImproved.delta)}
						</span>
					</div>
				)}

				<nav className={styles.tabsNav}>
					{tabs.map((t) => (
						<button
							key={t.key}
							className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
							onClick={() => setActiveTab(t.key)}
						>
							{t.label}
							{typeof t.count === 'number' && (
								<span className={styles.tabCount}>{t.count}</span>
							)}
						</button>
					))}
				</nav>

				<section className={styles.tabContent}>{renderTabContent()}</section>
			</div>

			{visibilityConfirm && (
				<div
					className={styles.visibilityOverlay}
					onClick={() => setVisibilityConfirm(null)}
				>
					<div
						className={styles.visibilityCard}
						onClick={(e) => e.stopPropagation()}
					>
						<p className={styles.visibilityTitle}>
							{visibilityConfirm.dance.status === 'published'
								? 'Сделать танец приватным?'
								: 'Опубликовать танец?'}
						</p>
						<p className={styles.visibilitySub}>
							{visibilityConfirm.dance.status === 'published'
								? 'Танец будет скрыт из общего каталога и станет виден только вам.'
								: 'Танец появится в общем каталоге и будет доступен всем пользователям.'}
						</p>
						<div className={styles.visibilityActions}>
							<button
								className={styles.visibilityOkBtn}
								onClick={() => handleToggleVisibility(visibilityConfirm.dance)}
							>
								{visibilityConfirm.dance.status === 'published'
									? 'Скрыть'
									: 'Опубликовать'}
							</button>
							<button
								className={styles.visibilityCancelBtn}
								onClick={() => setVisibilityConfirm(null)}
							>
								Отмена
							</button>
						</div>
					</div>
				</div>
			)}

			{removeFriendConfirm && (
				<div
					className={styles.visibilityOverlay}
					onClick={() => setRemoveFriendConfirm(false)}
				>
					<div
						className={styles.visibilityCard}
						onClick={(e) => e.stopPropagation()}
					>
						<p className={styles.visibilityTitle}>Удалить из друзей?</p>
						<p className={styles.visibilitySub}>
							{profile?.user.login
								? `${profile.user.login} перестанет быть в твоих друзьях и получит уведомление об этом.`
								: 'Этот пользователь перестанет быть у тебя в друзьях и получит уведомление.'}
						</p>
						<div className={styles.visibilityActions}>
							<button
								className={`${styles.visibilityOkBtn} ${styles.visibilityDangerBtn}`}
								onClick={handleRemoveFriendConfirmed}
							>
								Удалить
							</button>
							<button
								className={styles.visibilityCancelBtn}
								onClick={() => setRemoveFriendConfirm(false)}
							>
								Отмена
							</button>
						</div>
					</div>
				</div>
			)}

			{deleteConfirm && (
				<div
					className={styles.visibilityOverlay}
					onClick={() => setDeleteConfirm(null)}
				>
					<div
						className={styles.visibilityCard}
						onClick={(e) => e.stopPropagation()}
					>
						<p className={styles.visibilityTitle}>Удалить танец навсегда?</p>
						<p className={styles.visibilitySub}>
							«{deleteConfirm.dance.title || 'Без названия'}» исчезнет из
							каталога и хранилища: лайки, оценки и попытки других пользователей
							тоже будут удалены. Действие необратимо.
						</p>
						<div className={styles.visibilityActions}>
							<button
								className={`${styles.visibilityOkBtn} ${styles.visibilityDangerBtn}`}
								onClick={() => handleDeleteDance(deleteConfirm.dance)}
							>
								Удалить
							</button>
							<button
								className={styles.visibilityCancelBtn}
								onClick={() => setDeleteConfirm(null)}
							>
								Отмена
							</button>
						</div>
					</div>
				</div>
			)}

			{renamingId &&
				(() => {
					const dance = uploadedDances.find((d) => d.dance_id === renamingId);

					if (!dance) {
						return null;
					}

					return (
						<div
							className={styles.visibilityOverlay}
							onClick={() => setRenamingId(null)}
						>
							<div
								className={styles.visibilityCard}
								onClick={(e) => e.stopPropagation()}
							>
								<p className={styles.visibilityTitle}>Изменить танец</p>
								<input
									className={styles.uploadedEditInput}
									value={renameValue}
									autoFocus
									maxLength={60}
									placeholder="Название танца"
									onChange={(e) => setRenameValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											handleRenameSubmit(dance);
										}

										if (e.key === 'Escape') {
											setRenamingId(null);
										}
									}}
								/>
								<div className={styles.uploadedDifficultyEdit}>
									<span className={styles.uploadedDifficultyEditLabel}>
										Сложность:
									</span>
									{DIFFICULTY_OPTIONS.map((opt) => (
										<button
											key={opt.value}
											type="button"
											className={`${styles.uploadedDifficultyOption} ${
												editingDifficulty === opt.value
													? styles.uploadedDifficultyOptionActive
													: ''
											}`}
											onClick={() => setEditingDifficulty(opt.value)}
										>
											{opt.label}
										</button>
									))}
								</div>
								<div className={styles.visibilityActions}>
									<button
										className={styles.visibilityOkBtn}
										onClick={() => handleRenameSubmit(dance)}
									>
										Сохранить
									</button>
									<button
										className={styles.visibilityCancelBtn}
										onClick={() => setRenamingId(null)}
									>
										Отмена
									</button>
								</div>
							</div>
						</div>
					);
				})()}

			{editing && me && (
				<EditProfileModal
					currentLogin={me.login}
					onClose={() => setEditing(false)}
					onSaved={loadProfile}
				/>
			)}

			{telegramLink && (
				<div
					className={styles.visibilityOverlay}
					onClick={() => setTelegramLink(null)}
				>
					<div
						className={styles.visibilityCard}
						onClick={(e) => e.stopPropagation()}
					>
						<p className={styles.visibilityTitle}>Привязка Telegram</p>
						<p className={styles.visibilitySub}>
							Открой бота и пришли этот код (или нажми «Открыть в Telegram»).
							Код действует 10 минут.
						</p>
						<p
							style={{
								fontSize: '1.6rem',
								fontWeight: 700,
								letterSpacing: '0.15em',
								textAlign: 'center',
								margin: '10px 0',
								color: '#c084fc',
							}}
						>
							{telegramLink.code}
						</p>
						<div className={styles.visibilityActions}>
							{telegramLink.deep_link && (
								<a
									className={styles.visibilityOkBtn}
									href={telegramLink.deep_link}
									target="_blank"
									rel="noopener noreferrer"
									style={{ textDecoration: 'none', textAlign: 'center' }}
								>
									Открыть в Telegram
								</a>
							)}
							<button
								className={styles.visibilityCancelBtn}
								onClick={() =>
									navigator.clipboard
										.writeText(telegramLink.code)
										.then(() => setTelegramCopied(true))
								}
							>
								{telegramCopied ? 'Скопировано' : 'Копировать код'}
							</button>
						</div>
					</div>
				</div>
			)}

			{duelChallengeOpen && !isOwn && profile && me && (
				<DuelChallenge
					opponentId={profile.user.id}
					opponentLogin={profile.user.login}
					onClose={() => setDuelChallengeOpen(false)}
				/>
			)}

			{achievementToast.length > 0 && (
				<div className={styles.achievementToastWrap}>
					{achievementToast.map((a) => (
						<div key={a.id} className={styles.achievementToastItem}>
							<span className={styles.achievementToastIcon}>🏅</span>
							<div className={styles.achievementToastText}>
								<span className={styles.achievementToastLabel}>
									Новое достижение
								</span>
								<span className={styles.achievementToastTitle}>{a.title}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default UserPage;
