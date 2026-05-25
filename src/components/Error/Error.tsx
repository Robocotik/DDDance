import React from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../Button/Button';
import Paragraph from '../Paragraph/Paragraph';
import Title from '../Title/Title';

import styles from './Error.module.scss';

interface ErrorScreenProps {
	title?: string;
	description?: string;
	actions?: React.ReactNode;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({
	title = 'Упс, что-то пошло не так',
	description = 'Мы уже работаем над этим',
	actions,
}) => {
	const navigate = useNavigate();

	return (
		<div className={styles.root}>
			<div className={styles.inner}>
				<Title className={styles.title}>{title}</Title>
				<Paragraph className={styles.paragraph}>{description}</Paragraph>
				{actions ?? (
					<Button className={styles.button} onClick={() => navigate('/')}>
						Вернуться на главную
					</Button>
				)}
			</div>
		</div>
	);
};

export default ErrorScreen;
