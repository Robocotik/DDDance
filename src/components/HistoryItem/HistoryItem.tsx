import type { HistoryItem } from '@/api/users/history';
import { S3_ADDRESS } from '@/consts/urls';
import { resolveDanceLabel } from '@/helpers/danceLabel';
import { deleteHistoryItemThunk } from '@/redux/features/history/actions';
import { toggleLikeThunk } from '@/redux/features/likes/actions';
import { selectIsLiked } from '@/redux/features/likes/selectors';
import type { AppDispatch } from '@/redux/store';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon/Icon';
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
		navigate(`/lesson/${item.dance_id}?segment=full`);
	};

	const handleToggleLike = (e: React.MouseEvent) => {
		e.stopPropagation();
		dispatch(toggleLikeThunk(item.dance_id, isLiked));
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		dispatch(deleteHistoryItemThunk(item.id));
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
					className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
					onClick={handleToggleLike}
					title={isLiked ? 'Убрать из понравившихся' : 'Добавить в понравившиеся'}
				>
					<Icon
						name={isLiked ? 'heart-filled' : 'heart-outline'}
						size="1.2em"
						alt={isLiked ? 'Лайкнуто' : 'Лайкнуть'}
					/>
				</button>
				<button
					className={styles.actionBtn}
					onClick={handleDelete}
					title="Удалить из истории"
				>
					<Icon name="trash" size="1.2em" alt="Удалить" />
				</button>
			</div>

			<div className={styles.info} onClick={(e) => e.stopPropagation()}>
				<span className={styles.name}>{resolveDanceLabel(item)}</span>
				<div className={styles.meta}>
					{item.score != null && (
						<span className={styles.score}>{Math.round(item.score)} pts</span>
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
		</div>
	);
};

export default HistoryItemCard;
