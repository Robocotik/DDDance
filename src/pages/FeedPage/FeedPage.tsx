import { getFeed, type FeedItem } from '@/api/feed';
import { searchUsers, type UserSearchItem } from '@/api/users/search';
import { S3_ADDRESS } from '@/consts/urls';
import { selectUser } from '@/redux/features/user/selectors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './FeedPage.module.scss';

const ACTION_LABELS: Record<string, string> = {
	attempt_saved: 'сохранил(а) попытку',
	dance_uploaded: 'загрузил(а) танец',
	like: 'поставил(а) лайк танцу',
};

function formatTime(iso: string): string {
	const d = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffMin = Math.floor(diffMs / 60000);

	if (diffMin < 1) {
		return 'только что';
	}

	if (diffMin < 60) {
		return `${diffMin} мин. назад`;
	}

	const diffH = Math.floor(diffMin / 60);

	if (diffH < 24) {
		return `${diffH} ч. назад`;
	}

	const diffD = Math.floor(diffH / 24);

	if (diffD < 7) {
		return `${diffD} д. назад`;
	}

	return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function buildAvatarUrl(avatar: string): string {
	if (!avatar) {
		return '';
	}

	if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
		return avatar;
	}

	const base = (S3_ADDRESS || '').replace(/\/+$/, '');
	return `${base}/${avatar}`;
}

function renderMeta(item: FeedItem): string {
	const m = item.metadata as Record<string, unknown>;

	if (item.action_type === 'attempt_saved' && typeof m.score === 'number') {
		return ` (счёт: ${m.score.toFixed(1)})`;
	}

	return '';
}

function danceIdOf(item: FeedItem): string | undefined {
	const id = (item.metadata as Record<string, unknown>).dance_id;
	return typeof id === 'string' && id ? id : undefined;
}

interface DuelMeta {
	result: 'win' | 'loss' | 'draw';
	opponentLogin: string;
	myScore?: number;
	oppScore?: number;
	isPublic: boolean;
	attemptId?: string;
}

function duelMetaOf(item: FeedItem): DuelMeta {
	const m = item.metadata as Record<string, unknown>;
	const result = m.result === 'win' || m.result === 'loss' ? m.result : 'draw';

	return {
		result,
		opponentLogin:
			typeof m.opponent_login === 'string' && m.opponent_login
				? m.opponent_login
				: 'соперником',
		myScore: typeof m.my_score === 'number' ? m.my_score : undefined,
		oppScore: typeof m.opp_score === 'number' ? m.opp_score : undefined,
		isPublic: m.is_public === true,
		attemptId:
			typeof m.attempt_id === 'string' && m.attempt_id
				? m.attempt_id
				: undefined,
	};
}

function duelActionText(d: DuelMeta): string {
	const scores =
		d.myScore !== undefined && d.oppScore !== undefined
			? ` (${d.myScore.toFixed(0)}:${d.oppScore.toFixed(0)})`
			: '';

	if (d.result === 'win') {
		return `🏆 победил(а) в дуэли с ${d.opponentLogin}${scores}`;
	}

	if (d.result === 'loss') {
		return `⚔️ проиграл(а) дуэль игроку ${d.opponentLogin}${scores}`;
	}

	return `🤝 сыграл(а) вничью в дуэли с ${d.opponentLogin}${scores}`;
}

const LIMIT = 20;

const FeedPage: React.FC = () => {
	const user = useSelector(selectUser);
	const navigate = useNavigate();

	const [items, setItems] = useState<FeedItem[]>([]);
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);
	const [initialLoaded, setInitialLoaded] = useState(false);

	const loadingRef = useRef(false);

	const [peopleQuery, setPeopleQuery] = useState('');
	const [people, setPeople] = useState<UserSearchItem[]>([]);
	const [peopleLoading, setPeopleLoading] = useState(false);

	const loadMore = useCallback(
		async (cur?: string, signal?: AbortSignal) => {
			if (loadingRef.current || !hasMore) {
				return;
			}

			loadingRef.current = true;
			setLoading(true);

			try {
				const resp = await getFeed(LIMIT, cur, signal);

				if (signal?.aborted) {
					return;
				}

				const newItems = resp.items ?? [];
				setItems((prev) => (cur ? [...prev, ...newItems] : newItems));
				setCursor(resp.next_cursor);
				setHasMore(!!resp.next_cursor);
			} catch {
			} finally {
				if (!signal?.aborted) {
					loadingRef.current = false;
					setLoading(false);
					setInitialLoaded(true);
				}
			}
		},
		[hasMore],
	);

	useEffect(() => {
		if (!user) {
			return;
		}

		let active = true;
		setLoading(true);

		getFeed(LIMIT)
			.then((resp) => {
				if (!active) {
					return;
				}

				const newItems = resp.items ?? [];
				setItems(newItems);
				setCursor(resp.next_cursor);
				setHasMore(!!resp.next_cursor);
			})
			.catch(() => {})
			.finally(() => {
				if (active) {
					setLoading(false);
					setInitialLoaded(true);
				}
			});

		return () => {
			active = false;
		};
	}, [user]);

	useEffect(() => {
		const q = peopleQuery.trim();

		if (q.length < 2) {
			setPeople([]);
			setPeopleLoading(false);
			return;
		}

		const controller = new AbortController();
		setPeopleLoading(true);

		const timer = setTimeout(() => {
			searchUsers(q, controller.signal)
				.then((res) => {
					setPeople(res);
					setPeopleLoading(false);
				})
				.catch(() => {
					if (!controller.signal.aborted) {
						setPeople([]);
						setPeopleLoading(false);
					}
				});
		}, 300);

		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [peopleQuery]);

	if (!user) {
		return (
			<div className={styles.page}>
				<p className={styles.empty}>Войдите, чтобы увидеть ленту друзей.</p>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<h1 className={styles.title}>Лента друзей</h1>

			<div className={styles.peopleSearch}>
				<input
					className={styles.searchInput}
					value={peopleQuery}
					onChange={(e) => setPeopleQuery(e.target.value)}
					placeholder="Найти человека по имени"
					aria-label="Поиск людей по имени"
				/>
				{peopleQuery.trim().length >= 2 && (
					<ul className={styles.searchResults}>
						{peopleLoading && <li className={styles.searchHint}>Поиск...</li>}
						{!peopleLoading && people.length === 0 && (
							<li className={styles.searchHint}>Никого не найдено</li>
						)}
						{people.map((u) => (
							<li key={u.id}>
								<button
									className={styles.searchResult}
									onClick={() => navigate(`/profile/${u.id}`)}
								>
									{u.avatar ? (
										<img
											src={buildAvatarUrl(u.avatar)}
											alt={u.login}
											className={styles.searchAvatar}
										/>
									) : (
										<span className={styles.searchAvatarFallback}>
											{u.login.charAt(0).toUpperCase()}
										</span>
									)}
									<span className={styles.searchLogin}>{u.login}</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			{loading && !initialLoaded && <p className={styles.empty}>Загрузка...</p>}

			{initialLoaded && items.length === 0 && (
				<p className={styles.empty}>
					Пока новостей нет. Добавьте друзей, чтобы видеть их активность.
				</p>
			)}

			<ul className={styles.list}>
				{items.map((item) => {
					const danceId = danceIdOf(item);
					const showDanceLink =
						item.action_type === 'dance_uploaded' && !!danceId;

					const duel =
						item.action_type === 'duel_completed' ? duelMetaOf(item) : null;

					return (
						<li key={item.id} className={styles.item}>
							<button
								className={styles.avatar}
								onClick={() => navigate(`/profile/${item.actor_id}`)}
								aria-label={item.actor_login}
							>
								{item.actor_avatar ? (
									<img
										src={buildAvatarUrl(item.actor_avatar)}
										alt={item.actor_login}
										className={styles.avatarImg}
									/>
								) : (
									<span className={styles.avatarFallback}>
										{item.actor_login.charAt(0).toUpperCase()}
									</span>
								)}
							</button>
							<div className={styles.content}>
								<span className={styles.login}>{item.actor_login}</span>{' '}
								<span className={styles.action}>
									{duel ? (
										<>
											{duelActionText(duel)}
											{duel.isPublic && duel.attemptId && (
												<>
													{' '}
													<button
														type="button"
														className={styles.danceLink}
														onClick={() =>
															navigate(`/compare/${duel.attemptId}`)
														}
													>
														Смотреть результат
													</button>
												</>
											)}
										</>
									) : (
										<>
											{ACTION_LABELS[item.action_type] ?? item.action_type}
											{showDanceLink && (
												<>
													{' '}
													<button
														type="button"
														className={styles.danceLink}
														onClick={() => navigate(`/lesson/${danceId}`)}
													>
														«{item.dance_title || 'без названия'}»
													</button>
												</>
											)}
											{renderMeta(item)}
										</>
									)}
								</span>
							</div>
							<span className={styles.time}>{formatTime(item.created_at)}</span>
						</li>
					);
				})}
			</ul>

			{hasMore && initialLoaded && (
				<button
					className={styles.loadMore}
					onClick={() => void loadMore(cursor)}
					disabled={loading}
				>
					{loading ? 'Загрузка...' : 'Загрузить ещё'}
				</button>
			)}
		</div>
	);
};

export default FeedPage;
