import type { SavedAttemptItem } from '@/api/users/profile';
import { S3_ADDRESS } from '@/consts/urls';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SavedDanceCard.module.scss';

interface SavedDanceCardProps {
	item: SavedAttemptItem;
	onRemove?: (attemptId: string) => void;
	onTogglePrivacy?: (attemptId: string, makePrivate: boolean) => void;
	onRename?: (attemptId: string, name: string) => void;
}

const NAME_MAX = 40;

const PencilIcon: React.FC = () => (
	<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
		<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
	</svg>
);

const scoreColor = (score: number): string => {
	if (score >= 75) {
		return '#6fff9e';
	}

	if (score >= 50) {
		return '#ffd166';
	}

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
	onRename,
}) => {
	const navigate = useNavigate();
	const s3 = (S3_ADDRESS || '').replace(/\/+$/, '');
	const videoSrc = `${s3}/${item.reference_video_key}`;

	const [editing, setEditing] = useState(false);
	const [nameValue, setNameValue] = useState(item.user_name);

	const handleOpen = () => {
		if (editing) {
			return;
		}

		navigate(`/compare/${item.user_dance_id}`);
	};

	const handleRemove = (e: React.MouseEvent) => {
		e.stopPropagation();
		onRemove?.(item.user_dance_id);
	};

	const handleTogglePrivacy = (e: React.MouseEvent) => {
		e.stopPropagation();
		onTogglePrivacy?.(item.user_dance_id, !item.is_private);
	};

	const handleStartEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		setNameValue(item.user_name);
		setEditing(true);
	};

	const handleSaveName = (e: React.MouseEvent) => {
		e.stopPropagation();
		onRename?.(item.user_dance_id, nameValue);
		setEditing(false);
	};

	const handleCancelEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		setEditing(false);
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

			<div
				className={styles.scoreBadge}
				style={{ color: scoreColor(item.score) }}
			>
				{Math.round(item.score)}
			</div>

			{onTogglePrivacy && (
				<button
					type="button"
					className={`${styles.lockBadge} ${item.is_private ? styles.lockBadgeLocked : styles.lockBadgeOpen}`}
					title={
						item.is_private
							? 'Приватная — открыть для всех'
							: 'Открыта — сделать приватной'
					}
					onClick={handleTogglePrivacy}
				>
					{item.is_private ? <LockClosedIcon /> : <LockOpenIcon />}
				</button>
			)}

			{onRemove && (
				<button
					className={styles.removeBtn}
					onClick={handleRemove}
					title="Убрать из профиля"
				>
					×
				</button>
			)}

			<div className={styles.meta}>
				{editing ? (
					<div
						className={styles.renameRow}
						onClick={(e) => e.stopPropagation()}
					>
						<input
							className={styles.renameInput}
							value={nameValue}
							onChange={(e) => setNameValue(e.target.value)}
							maxLength={NAME_MAX}
							placeholder="Название попытки"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									onRename?.(item.user_dance_id, nameValue);
									setEditing(false);
								}

								if (e.key === 'Escape') {
									setEditing(false);
								}
							}}
						/>
						<button
							type="button"
							className={styles.renameSave}
							onClick={handleSaveName}
							title="Сохранить"
						>
							✓
						</button>
						<button
							type="button"
							className={styles.renameCancel}
							onClick={handleCancelEdit}
							title="Отмена"
						>
							×
						</button>
					</div>
				) : (
					<div className={styles.nameRow}>
						<span className={styles.name}>
							{item.user_name || 'Без названия'}
						</span>
						{onRename && (
							<button
								type="button"
								className={styles.renameBtn}
								onClick={handleStartEdit}
								title="Переименовать"
							>
								<PencilIcon />
							</button>
						)}
					</div>
				)}
				{item.dance_title && (
					<span className={styles.danceTitle}>🎵 {item.dance_title}</span>
				)}
			</div>
		</div>
	);
};

export default SavedDanceCard;
