import React from 'react';
import Button from '../Button/Button';
import Paragraph from '../Paragraph/Paragraph';
import Title from '../Title/Title';
import styles from './Header.module.scss';

const Header: React.FC = () => {
	return (
		<header id="header" className={styles.header}>
			<Title level="2" className={styles.logo}>
				DDDance
			</Title>
			<span className={styles.right}>
				<Paragraph level="2" opacity="100">
					Зарегистрироваться
				</Paragraph>
				<Button size="m">Войти</Button>
			</span>
		</header>
	);
};

export default Header;
