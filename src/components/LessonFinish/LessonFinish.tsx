import React from 'react';
import { useNavigate } from 'react-router-dom';

import type { UploadLessonResult } from '../../redux/features/lesson/actions';

import styles from './LessonFinish.module.scss';

interface LessonFinishProps {
	lesson: UploadLessonResult;
}

const LessonFinish: React.FC<LessonFinishProps> = ({ lesson }) => {
	const navigate = useNavigate();
	const lessonTitle = lesson.title ? ` "${lesson.title}"` : '';

	const handleRepeatLesson = () => {
		navigate(`?segment=0`);
	};

	return (
		<div className={styles.container}>
			<h2 className={styles.title}>
				Поздравляем, вы завершили урок{lessonTitle}!
			</h2>
			<button className={styles.button} onClick={handleRepeatLesson}>
				Повторить урок
			</button>
		</div>
	);
};

export default LessonFinish;
