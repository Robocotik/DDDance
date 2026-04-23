import React from 'react';
import { useNavigate } from 'react-router-dom';

import { S3_ADDRESS } from '../../consts/urls';
import type { UploadLessonResult } from '../../redux/features/lesson/actions';

import styles from './LessonStart.module.scss';

interface LessonStartProps {
	lesson: UploadLessonResult;
}

const resolveVideoPath = (path: string): string => {
	if (path.startsWith('http://') || path.startsWith('https://')) {
		return path;
	}

	const base = S3_ADDRESS.replace(/\/+$/, '');
	const cleanPath = path.replace(/^\/+/, '');

	return `${base}/${cleanPath}`;
};

const LessonStart: React.FC<LessonStartProps> = ({ lesson }) => {
	const navigate = useNavigate();

	const handleStartLesson = () => {
		navigate(`?segment=0`);
	};

	return (
		<div className={styles.container}>
			<video
				className={styles.video}
				src={resolveVideoPath(lesson.video_path)}
				controls
				playsInline
				preload="metadata"
			/>
			<button className={styles.button} onClick={handleStartLesson}>
				Начать урок
			</button>
		</div>
	);
};

export default LessonStart;
