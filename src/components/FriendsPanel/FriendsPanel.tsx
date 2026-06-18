import { getFriends, type Friend } from '@/api/users/friends';
import { S3_ADDRESS } from '@/consts/urls';
import { selectUser } from '@/redux/features/user/selectors';
import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './FriendsPanel.module.scss';

const DEFAULT_AVATAR =
	'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/assets/default_avatar.jpg';

const avatarUrl = (avatar: string): string => {
	if (!avatar) {
		return DEFAULT_AVATAR;
	}

	if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
		return avatar;
	}

	const base = (S3_ADDRESS || '').replace(/\/+$/, '');
	return `${base}/${avatar}`;
};

const PeopleIcon: FC = () => (
	<svg
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
		<path d="M16 3.13a4 4 0 0 1 0 7.75" />
	</svg>
);

const FriendsPanel: FC = () => {
	const user = useSelector(selectUser);
	const navigate = useNavigate();
	const wrapperRef = useRef<HTMLDivElement>(null);

	const [open, setOpen] = useState(false);
	const [friends, setFriends] = useState<Friend[]>([]);
	const [loading, setLoading] = useState(false);
	const [loaded, setLoaded] = useState(false);

	const loadFriends = useCallback(async () => {
		setLoading(true);

		try {
			const data = await getFriends();
			setFriends(data ?? []);
			setLoaded(true);
		} catch {
			setFriends([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}

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

			if (next && !loaded) {
				loadFriends();
			}

			return next;
		});
	}, [loaded, loadFriends]);

	const handleFriendClick = useCallback(
		(userId: string) => {
			setOpen(false);
			navigate(`/profile/${userId}`);
		},
		[navigate],
	);

	if (!user) {
		return null;
	}

	return (
		<div className={styles.wrapper} ref={wrapperRef}>
			<button
				type="button"
				className={styles.friendsBtn}
				onClick={handleToggle}
				aria-label="Друзья"
			>
				<PeopleIcon />
				{friends.length > 0 && (
					<span className={styles.badge}>
						{friends.length > 99 ? '99+' : friends.length}
					</span>
				)}
			</button>

			{open && (
				<div className={styles.panel}>
					<div className={styles.panelHeader}>
						<span className={styles.panelTitle}>Друзья</span>
						<button
							type="button"
							className={styles.refreshBtn}
							onClick={loadFriends}
							disabled={loading}
							aria-label="Обновить"
						>
							↻
						</button>
					</div>

					{loading && friends.length === 0 && (
						<div className={styles.empty}>Загрузка…</div>
					)}
					{!loading && friends.length === 0 && (
						<div className={styles.empty}>Друзей пока нет</div>
					)}

					<ul className={styles.list}>
						{friends.map((f) => (
							<li
								key={f.user_id}
								className={styles.item}
								onClick={() => handleFriendClick(f.user_id)}
							>
								<img
									src={avatarUrl(f.avatar)}
									alt={f.login}
									className={styles.avatar}
								/>
								<span className={styles.login}>{f.login}</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};

export default FriendsPanel;
