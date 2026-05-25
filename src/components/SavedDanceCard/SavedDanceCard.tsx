import type { SavedAttemptItem } from '@/api/users/profile';
import { S3_ADDRESS } from '@/consts/urls';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SavedDanceCard.module.scss';

interface SavedDanceCardProps {
	item: SavedAttemptItem;
	onRemove?: (attemptId: string) => void;
	/**
	 * Переключить приватность сохранённого танца. Передавать только в режиме
	 * собственного профиля; вызов получает новое значение is_private.
	 */
	onTogglePrivacy?: (attemptId: string, makePrivate: boolean) => void;
	/** Показать бейдж «В Мои танцы» — для контекста вкладки «Мои попытки». */
	showSavedBadge?: boolean;
}

const scoreColor = (score: number): string => {
	if (score >= 75) return '#6fff9e';
	if (score >= 50) return '#ffd166';
	return '#ff6b6b';
};

const LockClosedIcon: React.FC = () => (
	<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
		<path d="M12 2a5 5 0 0 0-5 5v2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v2H9V7a3 3 0 0 1 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
	</svg>
);

const LockOpenIcon: React.FC = () => (
	<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
		<path d="M12 2a5 5 0 0 0-5 5h2a3 3 0 0 1 6 0v2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V7a5 5 0 0 0-5-5zm0 11a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
	</svg>
);

const SavedDanceCard: React.FC<SavedDanceCardProps> = ({
	item,
	onRemove,
	onTogglePrivacy,
	showSavedBadge,
}) => {
	const navigate = useNavigate();
	const s3 = (S3_ADDRESS || '').replace(/\/+$/, '');
	const videoSrc = `${s3}/${item.reference_video_key}`;
	const isOwn = !!onRemove;

	const handleOpen = () => navigate(`/compare/${item.user_dance_id}`);

	const handleRemove = (e: React.MouseEvent) => {
		e.stopPropagation();
		onRemove?.(item.user_dance_id);
	};

	const handleTogglePrivacy = (e: React.MouseEvent) => {
		e.stopPropagation();
		onTogglePrivacy?.(item.user_dance_id, !item.is_private);
	};

	return (
		<div className={styles.card} onClick={handleOpen}>
			<video
				className={styles.video}
				src={videoSrc}
				autoPlay
				muted
				loop
				playsInline
				preload="metadata"
				disablePictureInPicture
				disableRemotePlayback
			/>

			<div className={styles.scoreBadge} style={{ color: scoreColor(item.score) }}>
				{Math.round(item.score)}
			</div>

			{showSavedBadge && (
				<div className={styles.savedBadge} title="Эта попытка добавлена в «Мои танцы»">
					В Мои танцы
				</div>
			)}

			{isOwn && (
				<button
					type="button"
					className={`${styles.lockBadge} ${item.is_private ? styles.lockBadgeLocked : styles.lockBadgeOpen}`}
					title={item.is_private ? 'Приватный — сделать публичным' : 'Публичный — сделать приватным'}
					onClick={handleTogglePrivacy}
					disabled={!onTogglePrivacy}
				>
					{item.is_private ? <LockClosedIcon /> : <LockOpenIcon />}
				</button>
			)}

			{isOwn && (
				<button
					className={styles.removeBtn}
					onClick={handleRemove}
					title="Убрать из профиля"
				>
					×
				</button>
			)}

			<div className={styles.meta}>
				<span className={styles.name}>
					{item.user_name || item.dance_title || 'Танец'}
				</span>
				<span className={styles.date}>
					{new Date(item.saved_at).toLocaleDateString('ru-RU', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					})}
				</span>
			</div>
		</div>
	);
};

export default SavedDanceCard;
