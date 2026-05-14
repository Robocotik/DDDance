import React from 'react';
import { useNavigate } from 'react-router-dom';

import { S3_ADDRESS } from '../../consts/urls';
import type { UploadLessonResult } from '../../redux/features/lesson/actions';
import Button from '../Button/Button';

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
		<div className={styles.lesson}>
			<div className={styles.content}>
				<video
					className={styles.video}
					src={resolveVideoPath(lesson.video_path)}
					autoPlay
					muted
					controls
					playsInline
					preload="metadata"
				/>
				<Button
					size="s"
					className={styles.startButton}
					onClick={handleStartLesson}
				>
					Начать урок
				</Button>
			</div>
		</div>
	);
};

export default LessonStart;
