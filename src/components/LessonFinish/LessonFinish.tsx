import React from 'react';
import { useNavigate } from 'react-router-dom';

import type { UploadLessonResult } from '../../redux/features/lesson/actions';
import Button from '../Button/Button';
import Paragraph from '../Paragraph/Paragraph';
import Title from '../Title/Title';

import styles from './LessonFinish.module.scss';

interface LessonFinishProps {
	lesson: UploadLessonResult;
}

const LessonFinish: React.FC<LessonFinishProps> = ({ lesson: _lesson }) => {
	const navigate = useNavigate();

	const handleRepeatLesson = () => {
		navigate(`?segment=start`);
	};

	const handleAllDances = () => {
		navigate('/');
	};

	return (
		<div className={styles.wrapper}>
		<div className={styles.lesson}>
			<div className={styles.container}>
				<Title className={styles.title}>Поздравляем</Title>
				<Paragraph className={styles.paragraph}>
					Вы успешно изучили танец
					<br />
					Продолжайте в том же ритме
				</Paragraph>
				<div className={styles.buttons}>
					<Button size="s" className={styles.button} onClick={handleRepeatLesson}>
						Пройти еще раз
					</Button>
					<Button size="s" className={styles.button} onClick={handleAllDances}>
						Все танцы
					</Button>
				</div>
			</div>
		</div>
		</div>
	);
};

export default LessonFinish;
