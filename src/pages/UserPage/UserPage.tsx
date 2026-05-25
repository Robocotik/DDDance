import {
	getPublicProfile,
	getUserAttempts,
	saveAttemptToProfile,
	unsaveAttemptFromProfile,
	type PublicProfileResponse,
	type SavedAttemptItem,
	type UserAttemptItem,
} from '@/api/users/profile';
import {
	sendFriendRequest,
	removeFriend,
	respondFriendRequest,
	getFriendsByUserId,
	type Friend,
} from '@/api/users/friends';
import {
	deleteDance,
	getUploadedDances,
	publishDance,
	setDanceName,
	unpublishDance,
	type UploadedDance,
} from '@/api/users/uploadedDances';
import EditProfileModal from '@/components/EditProfileModal/EditProfileModal';
import HistoryItemCard from '@/components/HistoryItem/HistoryItem';
import LikedItemCard from '@/components/LikedItem/LikedItem';
import ErrorScreen from '@/components/Error/Error';
import Loading from '@/components/Loading/Loading';
import PersonalTopSection from '@/components/PersonalTopSection/PersonalTopSection';
import SavedDanceCard from '@/components/SavedDanceCard/SavedDanceCard';
import UploadedDanceCard from '@/components/UploadedDanceCard/UploadedDanceCard';
import { S3_ADDRESS } from '@/consts/urls';
import type { Difficulty } from '@/consts/danceDifficulty';
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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

// Статусы, лейблы и плюрализация теперь живут внутри UploadedDanceCard —
// здесь оставлен только функционал, относящийся к шапке профиля и модалкам.

const avatarUrl = (avatar: string, updatedAt: string): string => {
	if (!avatar) return DEFAULT_AVATAR;
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

type TabKey = 'history' | 'likes' | 'saved' | 'friends' | 'uploaded' | 'attempts';

// pending_sent — заявку отправил Я, жду ответа.
// pending_received — заявку отправил собеседник, мне отвечать.
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
	const [friendBtnState, setFriendBtnState] = useState<FriendButtonState>('none');
	const [linkCopied, setLinkCopied] = useState(false);

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

	const isOwn = !!(me && profileId && me.id === profileId);

	const loadProfile = useCallback(async () => {
		if (!profileId) return;
		setProfileLoading(true);
		setProfileError(null);
		try {
			const data = await getPublicProfile(profileId);
			setProfile(data);
			// Derive initial friend button state from profile.
			// is_sender различает «я отправил» и «мне отправили» — без него
			// входящая заявка выглядела как «Заявка отправлена» (исходящая).
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
		if (!profileId) return;
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

	const handleRemoveSaved = useCallback(
		async (attemptId: string) => {
			if (!isOwn || !profile) return;
			const optimistic = profile.saved_attempts.filter(
				(s) => s.user_dance_id !== attemptId,
			);
			setProfile({ ...profile, saved_attempts: optimistic });
			try {
				await unsaveAttemptFromProfile(attemptId);
			} catch {
				loadProfile();
			}
		},
		[isOwn, profile, loadProfile],
	);

	// Замочек на «Мои танцы»: тогл приватности. Бэкенд UPSERT'ит saved_attempts
	// по attempt_id, поэтому повторный save с обновлённым is_private просто
	// переключит флаг — score/user_name/has_video переотправляем как есть.
	const handleTogglePrivacy = useCallback(
		async (attemptId: string, makePrivate: boolean) => {
			if (!isOwn || !profile) return;
			const item = profile.saved_attempts.find(
				(s) => s.user_dance_id === attemptId,
			);
			if (!item) return;
			// Optimistic: меняем флаг локально.
			setProfile({
				...profile,
				saved_attempts: profile.saved_attempts.map((s) =>
					s.user_dance_id === attemptId
						? { ...s, is_private: makePrivate }
						: s,
				),
			});
			try {
				await saveAttemptToProfile(attemptId, item.dance_id, {
					includeVideo: item.has_video,
					userName: item.user_name,
					isPrivate: makePrivate,
					score: item.score,
				});
			} catch {
				loadProfile();
			}
		},
		[isOwn, profile, loadProfile],
	);

	const handleSendFriendRequest = useCallback(async () => {
		if (!profileId || friendBtnState === 'loading') return;
		setFriendBtnState('loading');
		try {
			await sendFriendRequest(profileId);
			setFriendBtnState('pending_sent');
		} catch {
			setFriendBtnState('none');
		}
	}, [profileId, friendBtnState]);

	// Ответ на ВХОДЯЩУЮ заявку прямо со страницы профиля.
	const handleRespondFriendRequest = useCallback(
		async (accept: boolean) => {
			const fs = profile?.friendship_status;
			if (!fs || !fs.friendship_id) return;
			setFriendBtnState('loading');
			try {
				await respondFriendRequest(fs.friendship_id, accept);
				setFriendBtnState(accept ? 'accepted' : 'none');
				// После принятия пере-fetch'имся, чтобы friends_count в шапке
				// и список «Друзья» актуализировались.
				if (accept) {
					loadProfile();
				}
			} catch {
				setFriendBtnState('pending_received');
			}
		},
		[profile, loadProfile],
	);

	// «Удалить из друзей» — двухэтапно: открыть подтверждение, потом удалить.
	const [removeFriendConfirm, setRemoveFriendConfirm] = useState(false);
	const handleRemoveFriendClick = useCallback(() => {
		if (friendBtnState === 'loading') return;
		setRemoveFriendConfirm(true);
	}, [friendBtnState]);

	const handleRemoveFriendConfirmed = useCallback(async () => {
		if (!profileId) return;
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
		if (!isOwn) return;
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

	// Грузим загруженные танцы сразу при заходе в свой профиль — чтобы
	// бейдж-счётчик «Загруженные N» на вкладке показывал реальное число
	// до клика по вкладке.
	useEffect(() => {
		if (isOwn) {
			loadUploadedDances();
		}
	}, [loadUploadedDances, isOwn]);

	const loadAttempts = useCallback(async () => {
		if (!isOwn) return;
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
		if (isOwn) loadAttempts();
	}, [isOwn, loadAttempts]);

	const handleToggleVisibility = useCallback(
		async (dance: UploadedDance) => {
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
			} catch {
				// оставляем текущий статус
			}
			setVisibilityConfirm(null);
		},
		[],
	);

	const handleDeleteDance = useCallback(async (dance: UploadedDance) => {
		try {
			await deleteDance(dance.dance_id);
			setUploadedDances((prev) =>
				prev.filter((d) => d.dance_id !== dance.dance_id),
			);
		} catch {
			// Бэкенд логирует; UI не падает — танец просто останется в списке.
		}
		setDeleteConfirm(null);
	}, []);

	// Переименование загруженного танца. Доступно только во вкладке «Загруженные»
	// собственного профиля; на бэкенде SetDanceName дополнительно проверяет,
	// что текущий пользователь — загрузивший этот танец.
	const handleRenameSubmit = async (dance: UploadedDance) => {
		const trimmed = renameValue.trim();
		const titleChanged = !!trimmed && trimmed !== dance.title;
		const currentDifficulty = dance.difficulty ?? 'medium';
		const difficultyChanged = editingDifficulty !== currentDifficulty;

		if (!titleChanged && !difficultyChanged) {
			setRenamingId(null);
			return;
		}

		// Если название не трогали — отправим прежнее (бэкенд не разрешает пустое).
		// Сложность — только когда поменялась, чтобы рейтинг по оценкам
		// пользователей не «откатывался» к выбору автора без нужды.
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
		} catch {
			/* оставляем прежние значения */
		}
		setRenamingId(null);
	};

	const handleCopyLink = useCallback(() => {
		const url = `${window.location.origin}/profile/${profileId}`;
		navigator.clipboard.writeText(url).then(() => {
			setLinkCopied(true);
			setTimeout(() => setLinkCopied(false), 2000);
		});
	}, [profileId]);

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
				{ key: 'saved', label: 'Мои танцы', count: saved.length },
				{ key: 'attempts', label: 'Мои попытки', count: attempts.length },
				{ key: 'friends', label: 'Друзья', count: friendsCount },
				{ key: 'history', label: 'История', count: historyItems.length },
				{ key: 'likes', label: 'Понравившиеся', count: likedItems.length },
				{ key: 'uploaded', label: 'Загруженные', count: uploadedDances.length },
			]
		: [
				{ key: 'saved', label: 'Танцы', count: saved.length },
				{ key: 'friends', label: 'Друзья', count: friendsCount },
			];

	const renderFriendButton = () => {
		if (isOwn || !me) return null;
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

	const renderTabContent = () => {
		if (activeTab === 'saved') {
			if (saved.length === 0) {
				return (
					<p className={styles.tabEmpty}>
						{isOwn
							? 'Здесь будут танцы, которые ты добавишь в профиль со страницы результата'
							: 'У этого пользователя пока нет опубликованных танцев'}
					</p>
				);
			}
			return (
				<div className={styles.cardGrid}>
					{saved.map((item) => (
						<SavedDanceCard
							key={item.user_dance_id}
							item={item}
							onRemove={isOwn ? handleRemoveSaved : undefined}
							onTogglePrivacy={isOwn ? handleTogglePrivacy : undefined}
						/>
					))}
				</div>
			);
		}

		if (activeTab === 'friends') {
			if (friendsLoading) return <p className={styles.tabEmpty}>Загрузка...</p>;
			if (friends.length === 0) {
				return (
					<p className={styles.tabEmpty}>
						{isOwn ? 'У вас пока нет друзей' : 'У этого пользователя пока нет друзей'}
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
						</Link>
					))}
				</div>
			);
		}

		if (activeTab === 'history') {
			if (historyLoading) return <p className={styles.tabEmpty}>Загрузка...</p>;
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
			if (likesLoading) return <p className={styles.tabEmpty}>Загрузка...</p>;
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

		if (activeTab === 'attempts') {
			if (attemptsLoading) return <p className={styles.tabEmpty}>Загрузка...</p>;
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
						// UserAttemptItem → SavedAttemptItem-shape: SavedDanceCard
						// строит preview-видео из reference_video_key, поэтому
						// собираем его из dance_id. Поля user_animation_key /
						// skeleton/has_video не нужны для отображения карточки.
						const cardItem = {
							user_dance_id: a.attempt_id,
							dance_id: a.dance_id,
							dance_title: a.dance_title,
							user_name: '',
							is_private: false,
							score: a.score,
							saved_at: a.created_at,
							reference_video_key: `results/${a.dance_id}/video.mp4`,
							user_animation_key: '',
							user_skeleton_key: '',
							has_video: false,
						};
						return (
							<SavedDanceCard
								key={a.attempt_id}
								item={cardItem}
								showSavedBadge={a.is_saved}
							/>
						);
					})}
				</div>
			);
		}

		if (activeTab === 'uploaded') {
			if (uploadedLoading) return <p className={styles.tabEmpty}>Загрузка...</p>;
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
					</div>
					<div className={styles.headerActions}>
						<button
							className={styles.copyLinkBtn}
							onClick={handleCopyLink}
							title="Скопировать ссылку на профиль"
						>
							{linkCopied ? (
								<>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
									Скопировано
								</>
							) : (
								<>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
									Поделиться
								</>
							)}
						</button>
						{isOwn ? (
							<button
								className={styles.editBtn}
								onClick={() => setEditing(true)}
							>
								Редактировать
							</button>
						) : (
							renderFriendButton()
						)}
					</div>
				</header>

				<PersonalTopSection items={profile.personal_top} isOwn={isOwn} />

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
								{visibilityConfirm.dance.status === 'published' ? 'Скрыть' : 'Опубликовать'}
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
					if (!dance) return null;

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
										if (e.key === 'Enter') handleRenameSubmit(dance);
										if (e.key === 'Escape') setRenamingId(null);
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
		</div>
	);
};

export default UserPage;
