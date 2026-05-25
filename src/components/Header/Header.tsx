import { selectUser } from '@/redux/features/user/selectors';
import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AnonProgressPanel from '../AnonProgressPanel/AnonProgressPanel';
import { AvatarMenu } from '../AvatarMenu/AvatarMenu';
import Button from '../Button/Button';
import FriendsPanel from '../FriendsPanel/FriendsPanel';
import NotificationBell from '../NotificationBell/NotificationBell';
import Paragraph from '../Paragraph/Paragraph';
import Title from '../Title/Title';
import styles from './Header.module.scss';

const Header: React.FC = () => {
	const navigate = useNavigate();
	const user = useSelector(selectUser);

	return (
		<header id="header" className={styles.header}>
			<Title level="2" className={styles.logo} onClick={() => navigate('/')}>
				DDDance
			</Title>

			<nav className={styles.nav}>
				<Paragraph
					level="2"
					opacity="100"
					className={styles.navLink}
					onClick={() => navigate('/dances')}
				>
					Все танцы
				</Paragraph>
			</nav>

			<span className={styles.right}>
				{user ? (
					<>
						<FriendsPanel />
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
