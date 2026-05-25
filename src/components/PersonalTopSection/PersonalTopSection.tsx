import type { PersonalTopItem } from '@/api/users/profile';
import { S3_ADDRESS } from '@/consts/urls';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PersonalTopSection.module.scss';

interface PersonalTopSectionProps {
	items: PersonalTopItem[];
	// true — это собственный профиль пользователя; иначе — чужой.
	isOwn?: boolean;
}

const RANK_LABELS = ['I', 'II', 'III'];

const scoreColor = (score: number): string => {
	if (score >= 75) return '#6fff9e';
	if (score >= 50) return '#ffd166';
	return '#ff6b6b';
};

const PersonalTopSection: React.FC<PersonalTopSectionProps> = ({
	items,
	isOwn,
}) => {
	const navigate = useNavigate();
	const s3 = (S3_ADDRESS || '').replace(/\/+$/, '');

	// Защита от мусорных строк: личный топ строится по dance_attempts,
	// у старых записей до миграции attempt_id может быть NULL → undefined
	// на фронте → /compare/undefined. Просто пропускаем такие.
	const safeItems = items.filter((it) => !!it.user_dance_id);

	if (safeItems.length === 0) {
		return (
			<section className={styles.section}>
				<h2 className={styles.title}>Личный топ</h2>
				<p className={styles.empty}>
					{isOwn
						? 'Добавь свои лучшие попытки в раздел «Мои танцы» — топ-3 из них появятся здесь'
						: 'Личный топ пользователя пока пуст'}
				</p>
			</section>
		);
	}

	return (
		<section className={styles.section}>
			<h2 className={styles.title}>Личный топ</h2>
			<div className={styles.row}>
				{safeItems.map((item, idx) => (
					<div
						key={item.user_dance_id || item.dance_id}
						className={`${styles.card} ${idx === 0 ? styles.cardGold : ''}`}
						onClick={() => navigate(`/compare/${item.user_dance_id}`)}
					>
						<span className={styles.rank}>{RANK_LABELS[idx] ?? `${idx + 1}`}</span>
						<video
							className={styles.thumb}
							src={`${s3}/results/${item.dance_id}/video.mp4`}
							muted
							loop
							autoPlay
							playsInline
							preload="metadata"
							disablePictureInPicture
							disableRemotePlayback
						/>
						<div className={styles.info}>
							<span className={styles.name}>
								{item.dance_title || 'Танец'}
							</span>
							<span className={styles.date}>
								{new Date(item.achieved_at).toLocaleDateString('ru-RU', {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric',
								})}
							</span>
						</div>
						<div className={styles.scoreBlock}>
							<span
								className={styles.scoreValue}
								style={{ color: scoreColor(item.best_score) }}
							>
								{Math.round(item.best_score)}
							</span>
							<span className={styles.scoreLabel}>/100</span>
						</div>
					</div>
				))}
			</div>
		</section>
	);
};

export default PersonalTopSection;
