import type { LikeItem } from '@/api/users/likes';
import { S3_ADDRESS } from '@/consts/urls';
import { renameLikeItem } from '@/redux/features/likes/actions';
import type { AppDispatch } from '@/redux/store';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './LikedItem.module.scss';

interface LikedItemProps {
	item: LikeItem;
}

const LikedItemCard: React.FC<LikedItemProps> = ({ item }) => {
	const navigate = useNavigate();
	const dispatch = useDispatch<AppDispatch>();

	const [isEditing, setIsEditing] = useState(false);
	const [nameValue, setNameValue] = useState(item.name || 'Без названия');

	const videoSrc = `${(S3_ADDRESS || '').replace(/\/+$/, '')}/results/${item.dance_id}/video.mp4`;

	const handleOpenLesson = () => {
		navigate(`/lesson/${item.dance_id}`);
	};

	const handleRenameSubmit = () => {
		const trimmed = nameValue.trim();
		if (trimmed && trimmed !== item.name) {
			dispatch(renameLikeItem(item.dance_id, trimmed));
		}
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') handleRenameSubmit();
		if (e.key === 'Escape') {
			setNameValue(item.name || 'Без названия');
			setIsEditing(false);
		}
	};

	return (
		<div className={styles.card} onClick={handleOpenLesson}>
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
				controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
			/>

			<div className={styles.actions}>
				<button
					className={styles.editBtn}
					onClick={(e) => {
						e.stopPropagation();
						setIsEditing(true);
					}}
					title="Переименовать"
				>
					✏️
				</button>
			</div>

			<div className={styles.info} onClick={(e) => e.stopPropagation()}>
				{isEditing ? (
					<input
						className={styles.input}
						value={nameValue}
						autoFocus
						onChange={(e) => setNameValue(e.target.value)}
						onBlur={handleRenameSubmit}
						onKeyDown={handleKeyDown}
						onClick={(e) => e.stopPropagation()}
					/>
				) : (
					<span className={styles.name}>{nameValue}</span>
				)}
				<span className={styles.date}>
					{new Date(item.created_at).toLocaleDateString('ru-RU', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					})}
				</span>
			</div>
		</div>
	);
};

export default LikedItemCard;