import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getDanceStats, type DanceStats } from '../../api/dances';
import { S3_ADDRESS } from '../../consts/urls';
import type { UploadLessonResult } from '../../redux/features/lesson/actions';
import Button from '../Button/Button';
import DifficultyBadge from '../DifficultyBadge/DifficultyBadge';
import Icon from '../Icon/Icon';
import LessonAuthor from '../LessonAuthor/LessonAuthor';

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
	const [stats, setStats] = useState<DanceStats | null>(null);

	useEffect(() => {
		let cancelled = false;
		getDanceStats(lesson.dance_id)
			.then((data) => {
				if (!cancelled) setStats(data);
			})
			.catch(() => {
				if (!cancelled) setStats(null);
			});
		return () => {
			cancelled = true;
		};
	}, [lesson.dance_id]);

	const handleStartLesson = () => {
		navigate(`?segment=full`);
	};

	const hasStats = stats !== null && stats.attempt_count > 0;

	return (
		<div className={styles.lesson}>
			<div className={styles.videoCard}>
				<video
					className={styles.video}
					src={resolveVideoPath(lesson.video_path)}
					autoPlay
					muted
					controls
					playsInline
					preload="metadata"
					loop
					disablePictureInPicture
					disableRemotePlayback
					controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
				/>
			</div>

			<div className={styles.sidebar}>
				{lesson.author && <LessonAuthor author={lesson.author} className={styles.authorCard} />}

				{lesson.difficulty && (
					<div className={styles.difficultyRow}>
						<span className={styles.difficultyLabel}>Сложность</span>
						<DifficultyBadge
							difficulty={lesson.difficulty}
							byUsers={lesson.difficulty_by_users}
						/>
					</div>
				)}

				<div className={styles.statsBar}>
					<div className={styles.statChip}>
						<Icon name="eye" size="1.1em" alt="Просмотры" />
						<span>{stats?.view_count ?? '—'}</span>
					</div>
					<div className={styles.statBarDivider} />
					<div className={styles.statChip}>
						<Icon name="heart-filled" size="1.1em" alt="Лайки" />
						<span>{lesson.likes_count ?? '—'}</span>
					</div>
					<div className={styles.statBarDivider} />
					<div className={styles.statChip}>
						<Icon name="star" size="1.1em" alt="Рейтинг" />
						<span>{hasStats && stats ? Math.round(stats.avg_score) : '—'}</span>
					</div>
				</div>

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
