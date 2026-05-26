import { respondFriendRequest } from '@/api/users/friends';
import {
	clearAllNotificationsThunk,
	fetchNotifications,
	markAllNotificationsAsRead,
	markNotificationAsRead,
} from '@/redux/features/notifications/notificationsSlice';
import {
	selectNotifications,
	selectNotificationsLoaded,
	selectNotificationsLoading,
	selectUnreadCount,
} from '@/redux/features/notifications/selectors';
import type { AppDispatch } from '@/redux/store';
import { formatModerationRejection } from '@/helpers/moderationReason';
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type FC,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon/Icon';
import styles from './NotificationBell.module.scss';

const formatDate = (iso: string): string => {
	try {
		const d = new Date(iso);
		return d.toLocaleString('ru-RU', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch {
		return '';
	}
};

const NotificationBell: FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const navigate = useNavigate();
	const items = useSelector(selectNotifications);
	const unreadCount = useSelector(selectUnreadCount);
	const loading = useSelector(selectNotificationsLoading);
	const loaded = useSelector(selectNotificationsLoaded);
	const [open, setOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);
	// Track which friend_request notifications have been responded to locally
	// so we can hide the buttons immediately without waiting for reload.
	const [handledRequests, setHandledRequests] = useState<
		Map<number, 'accepted' | 'declined'>
	>(new Map());

	useEffect(() => {
		if (!loaded) {
			dispatch(fetchNotifications());
		}
	}, [dispatch, loaded]);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open]);

	const handleToggle = useCallback(() => {
		setOpen((v) => {
			const next = !v;
			if (next) {
				dispatch(fetchNotifications());
			}
			return next;
		});
	}, [dispatch]);

	const handleItemClick = useCallback(
		(id: number, type: string, danceId: string, fromUserId?: string) => {
			if (type === 'friend_request') {
				// Don't navigate — interaction is inline via accept/decline buttons
				return;
			}
			dispatch(markNotificationAsRead(id));
			setOpen(false);
			if (type === 'dance_approved' && danceId) {
				navigate(`/lesson/${danceId}`);
			}
			if (
				(type === 'friend_accepted' ||
					type === 'friend_declined' ||
					type === 'friend_removed') &&
				fromUserId
			) {
				navigate(`/profile/${fromUserId}`);
			}
		},
		[dispatch, navigate],
	);

	const handleFriendResponse = useCallback(
		async (notifId: number, friendshipId: number, accept: boolean) => {
			setHandledRequests((prev) => {
				const next = new Map(prev);
				next.set(notifId, accept ? 'accepted' : 'declined');
				return next;
			});
			dispatch(markNotificationAsRead(notifId));
			try {
				await respondFriendRequest(friendshipId, accept);
				// Refresh to get the response notification
				dispatch(fetchNotifications());
			} catch {
				// revert on failure
				setHandledRequests((prev) => {
					const next = new Map(prev);
					next.delete(notifId);
					return next;
				});
			}
		},
		[dispatch],
	);

	const handleMarkAllRead = useCallback(() => {
		dispatch(markAllNotificationsAsRead());
	}, [dispatch]);

	const handleClearAll = useCallback(() => {
		if (items.length === 0) return;
		if (!window.confirm('Удалить все уведомления?')) return;
		dispatch(clearAllNotificationsThunk());
	}, [dispatch, items.length]);

	return (
		<div className={styles.wrapper} ref={wrapperRef}>
			<button
				type="button"
				className={styles.bellBtn}
				onClick={handleToggle}
				aria-label="Уведомления"
			>
				<Icon name="bell" size={22} alt="Уведомления" />
				{unreadCount > 0 && (
					<span className={styles.badge}>
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</button>

			{open && (
				<div className={styles.panel}>
					<div className={styles.panelHeader}>
						<span className={styles.panelTitle}>
							Уведомления
							{items.length > 0 && (
								<span className={styles.panelCount}>
									{unreadCount > 0
										? `${unreadCount} из ${items.length}`
										: items.length}
								</span>
							)}
						</span>
						<div className={styles.panelActions}>
							{unreadCount > 0 && (
								<button
									type="button"
									className={styles.markAllBtn}
									onClick={handleMarkAllRead}
								>
									Прочитать все
								</button>
							)}
							{items.length > 0 && (
								<button
									type="button"
									className={styles.clearAllBtn}
									onClick={handleClearAll}
									title="Удалить все уведомления"
								>
									Очистить
								</button>
							)}
						</div>
					</div>

					{loading && items.length === 0 && (
						<div className={styles.empty}>Загрузка…</div>
					)}
					{!loading && items.length === 0 && (
						<div className={styles.empty}>Уведомлений пока нет</div>
					)}

					<ul className={styles.list}>
						{items.map((n) => {
							if (n.type === 'friend_request') {
								const handled = handledRequests.get(n.id);
								return (
									<li
										key={n.id}
										className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
									>
										<div className={styles.itemTitle}>
											Заявка в друзья
										</div>
										<div className={styles.itemSubtitle}>
											{n.from_login
												? `${n.from_login} хочет добавить вас в друзья`
												: 'Новая заявка в друзья'}
										</div>
										<div className={styles.itemDate}>
											{formatDate(n.created_at)}
										</div>
										{handled ? (
											<div className={styles.friendHandled}>
												{handled === 'accepted'
													? '✓ Принято'
													: '✗ Отклонено'}
											</div>
										) : (
											<div className={styles.friendActions}>
												<button
													type="button"
													className={styles.friendAcceptBtn}
													onClick={() =>
														handleFriendResponse(
															n.id,
															n.ref_id ?? 0,
															true,
														)
													}
												>
													Принять
												</button>
												<button
													type="button"
													className={styles.friendDeclineBtn}
													onClick={() =>
														handleFriendResponse(
															n.id,
															n.ref_id ?? 0,
															false,
														)
													}
												>
													Отклонить
												</button>
											</div>
										)}
									</li>
								);
							}

							if (
								n.type === 'friend_accepted' ||
								n.type === 'friend_declined' ||
								n.type === 'friend_removed'
							) {
								let title = '';
								let subtitle = '';
								if (n.type === 'friend_accepted') {
									title = 'Заявка принята';
									subtitle = n.from_login
										? `${n.from_login} принял(а) вашу заявку в друзья`
										: 'Ваша заявка принята';
								} else if (n.type === 'friend_declined') {
									title = 'Заявка отклонена';
									subtitle = n.from_login
										? `${n.from_login} отклонил(а) вашу заявку`
										: 'Ваша заявка отклонена';
								} else {
									title = 'Удалил(а) из друзей';
									subtitle = n.from_login
										? `${n.from_login} удалил(а) вас из друзей`
										: 'Вас удалили из друзей';
								}
								return (
									<li
										key={n.id}
										className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
										onClick={() =>
											handleItemClick(
												n.id,
												n.type,
												n.dance_id,
												n.from_user_id,
											)
										}
									>
										<div className={styles.itemTitle}>{title}</div>
										<div className={styles.itemSubtitle}>{subtitle}</div>
										<div className={styles.itemDate}>
											{formatDate(n.created_at)}
										</div>
									</li>
								);
							}

							const isApproved = n.type === 'dance_approved';
							const title = isApproved
								? 'Ваше видео загружено'
								: 'Ваше видео не прошло модерацию';
							const subtitle = isApproved
								? 'Перейти к уроку'
								: formatModerationRejection(n.reason);
							return (
								<li
									key={n.id}
									className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
									onClick={() =>
										handleItemClick(n.id, n.type, n.dance_id)
									}
								>
									<div className={styles.itemTitle}>{title}</div>
									<div className={styles.itemSubtitle}>{subtitle}</div>
									<div className={styles.itemDate}>
										{formatDate(n.created_at)}
									</div>
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
};

export default NotificationBell;
