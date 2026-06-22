import { getUserAchievements } from '@/api/achievements';
import { getDuelHistory, type DuelStatus } from '@/api/duels';
import { setAchievementCounts } from '@/redux/features/achievements/achievementsSlice';
import { selectUser } from '@/redux/features/user/selectors';
import type { RootState } from '@/redux/store';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import AnonProgressPanel from '../AnonProgressPanel/AnonProgressPanel';
import { AvatarMenu } from '../AvatarMenu/AvatarMenu';
import Button from '../Button/Button';
import FriendsPanel from '../FriendsPanel/FriendsPanel';
import NotificationBell from '../NotificationBell/NotificationBell';
import Paragraph from '../Paragraph/Paragraph';
import Title from '../Title/Title';
import styles from './Header.module.scss';

const ACTIVE_DUEL_STATUSES: DuelStatus[] = [
	'pending',
	'active',
	'challenger_done',
	'opponent_done',
];

const Header: React.FC = () => {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const { pathname } = useLocation();
	const user = useSelector(selectUser);
	const achievements = useSelector((s: RootState) => s.achievements);
	const [activeDuelCount, setActiveDuelCount] = useState(0);
	const headerRef = useRef<HTMLElement>(null);

	useLayoutEffect(() => {
		const el = headerRef.current;

		if (!el) {
			return;
		}

		const apply = () => {
			document.documentElement.style.setProperty(
				'--header-height',
				`${el.offsetHeight}px`,
			);
		};

		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(el);

		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!user) {
			setActiveDuelCount(0);
			return;
		}

		getDuelHistory(100, 0)
			.then((res) => {
				const count = res.duels.filter((d) =>
					ACTIVE_DUEL_STATUSES.includes(d.status),
				).length;

				setActiveDuelCount(count);
			})
			.catch(() => {});
	}, [user]);

	useEffect(() => {
		if (!user) {
			return;
		}

		getUserAchievements(user.id)
			.then((res) =>
				dispatch(
					setAchievementCounts({
						unlocked: res.unlocked_count,
						total: res.total_count,
					}),
				),
			)
			.catch(() => {});
	}, [user, dispatch]);

	const navLinkClass = (path: string) =>
		`${styles.navLink} ${pathname === path || pathname.startsWith(path + '/') ? styles.navLinkActive : ''}`;

	return (
		<header id="header" ref={headerRef} className={styles.header}>
			<Title level="2" className={styles.logo} onClick={() => navigate('/')}>
				DDDance
			</Title>

			<nav className={styles.nav}>
				<Paragraph
					level="2"
					opacity="100"
					className={navLinkClass('/dances')}
					onClick={() => navigate('/dances')}
				>
					Все танцы
				</Paragraph>
				<Paragraph
					level="2"
					opacity="100"
					className={navLinkClass('/reels')}
					onClick={() => navigate('/reels')}
				>
					Reels
				</Paragraph>
				{user && (
					<Paragraph
						level="2"
						opacity="100"
						className={navLinkClass('/feed')}
						onClick={() => navigate('/feed')}
					>
						Лента новостей
					</Paragraph>
				)}
				<span className={styles.navDuelsWrapper}>
					<Paragraph
						level="2"
						opacity="100"
						className={navLinkClass('/duels')}
						onClick={() => navigate('/duels')}
					>
						Дуэли
					</Paragraph>
					{user && activeDuelCount > 0 && (
						<span className={styles.navBadge}>{activeDuelCount}</span>
					)}
				</span>
			</nav>

			<span className={styles.right}>
				{user ? (
					<>
						<FriendsPanel />
						<button
							type="button"
							className={styles.achievementsBadge}
							onClick={() => navigate(`/profile/${user.id}`)}
							aria-label="Достижения"
							title="Достижения"
						>
							🏆 {achievements.unlockedCount}/{achievements.totalCount}
						</button>
						<NotificationBell />
						<Paragraph
							level="2"
							opacity="100"
							className={styles.userLogin}
							onClick={() => navigate(`/profile/${user.id}`)}
						>
							{user.login}
						</Paragraph>
						<AvatarMenu user={user} />
					</>
				) : (
					<>
						<AnonProgressPanel />
						<Paragraph
							onClick={() => navigate('/register')}
							level="2"
							opacity="100"
							className={styles.register}
						>
							Зарегистрироваться
						</Paragraph>
						<Button onClick={() => navigate('/login')} size="m">
							Войти
						</Button>
					</>
				)}
			</span>
		</header>
	);
};

export default Header;
