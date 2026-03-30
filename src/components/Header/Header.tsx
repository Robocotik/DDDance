import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../Button/Button';
import Paragraph from '../Paragraph/Paragraph';
import Title from '../Title/Title';
import styles from './Header.module.scss';

const Header: React.FC = () => {
	const navigate = useNavigate();

	return (
		<header id="header" className={styles.header}>
			<Title level="2" className={styles.logo} onClick={() => navigate('/')}>
				DDDance
			</Title>

			<span className={styles.right}>
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
			</span>
		</header>
	);
};

export default Header;
