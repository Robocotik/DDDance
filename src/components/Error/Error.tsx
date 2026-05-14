import React from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../Button/Button';
import Paragraph from '../Paragraph/Paragraph';
import Title from '../Title/Title';

import styles from './Error.module.scss';

const ErrorScreen: React.FC = () => {
	const navigate = useNavigate();

	const handleGoHome = () => {
		navigate('/');
	};

	return (
		<div className={styles.root}>
			<div className={styles.inner}>
				<Title className={styles.title}>Упс, что-то пошло не так</Title>
				<Paragraph className={styles.paragraph}>
					Мы уже работаем над этим
				</Paragraph>
				<Button className={styles.button} onClick={handleGoHome}>
					Вернуться на главную
				</Button>
			</div>
		</div>
	);
};

export default ErrorScreen;
