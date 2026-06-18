import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { getDanceStats, type DanceStats } from '../../api/dances';
import {
	getActiveDuelsForDance,
	type ActiveDuelForDance,
} from '../../api/duels';
import { S3_ADDRESS } from '../../consts/urls';
import type { UploadLessonResult } from '../../redux/features/lesson/actions';
import { selectUser } from '../../redux/features/user/selectors';
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
	const user = useSelector(selectUser);
	const [stats, setStats] = useState<DanceStats | null>(null);
	const [activeDuels, setActiveDuels] = useState<ActiveDuelForDance[]>([]);

	useEffect(() => {
		let cancelled = false;
		getDanceStats(lesson.dance_id)
			.then((data) => {
				if (!cancelled) {
					setStats(data);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setStats(null);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [lesson.dance_id]);

	useEffect(() => {
		if (!user) {
			setActiveDuels([]);
			return;
		}

		const controller = new AbortController();
		getActiveDuelsForDance(lesson.dance_id, controller.signal)
			.then(setActiveDuels)
			.catch(() => {
				if (!controller.signal.aborted) {
					setActiveDuels([]);
				}
			});

		return () => controller.abort();
	}, [lesson.dance_id, user]);

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
				{lesson.author && (
					<LessonAuthor author={lesson.author} className={styles.authorCard} />
				)}

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
					{lesson.unique_viewers_approx != null &&
						lesson.unique_viewers_approx > 0 && (
							<>
								<div className={styles.statBarDivider} />
								<div
									className={styles.statChip}
									title="Уникальных зрителей (приблизительно)"
								>
									<span aria-hidden="true">👥</span>
									<span>{lesson.unique_viewers_approx}</span>
								</div>
							</>
						)}
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

				{activeDuels.length > 0 && (
					<div className={styles.duelBox}>
						<span className={styles.duelLabel}>
							⚔️ У тебя дуэль на этом танце:{' '}
							{activeDuels.map((d) => d.opponent_login).join(', ')}. Пройди урок
							и нажми «Отправить на дуэль» на экране результата.
						</span>
					</div>
				)}

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
