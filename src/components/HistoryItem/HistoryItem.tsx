import type { HistoryItem } from '@/api/users/history';
import { S3_ADDRESS } from '@/consts/urls';
import { toggleLikeThunk } from '@/redux/features/likes/actions';
import { selectIsLiked } from '@/redux/features/likes/selectors';
import type { AppDispatch } from '@/redux/store';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './HistoryItem.module.scss';

interface HistoryItemProps {
	item: HistoryItem;
}

const HistoryItemCard: React.FC<HistoryItemProps> = ({ item }) => {
	const navigate = useNavigate();
	const dispatch = useDispatch<AppDispatch>();

	const isLiked = useSelector(selectIsLiked(item.dance_id));

	const videoSrc = `${(S3_ADDRESS || '').replace(/\/+$/, '')}/results/${item.dance_id}/video.mp4`;

	const handleOpenLesson = () => {
		navigate(`/lesson/${item.dance_id}`);
	};

	const handleToggleLike = (e: React.MouseEvent) => {
		e.stopPropagation();
		dispatch(toggleLikeThunk(item.dance_id, isLiked));
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
					className={`${styles.likeBtn} ${isLiked ? styles.liked : ''}`}
					onClick={handleToggleLike}
					title={
						isLiked ? 'Убрать из понравившихся' : 'Добавить в понравившиеся'
					}
				>
					{isLiked ? '❤️' : '🤍'}
				</button>
			</div>

			<div className={styles.info} onClick={(e) => e.stopPropagation()}>
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

export default HistoryItemCard;
