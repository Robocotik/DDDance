import type { LikeItem } from '@/api/users/likes';
import { S3_ADDRESS } from '@/consts/urls';
import { resolveDanceLabel } from '@/helpers/danceLabel';
import { toggleLikeThunk } from '@/redux/features/likes/actions';
import type { AppDispatch } from '@/redux/store';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon/Icon';
import styles from './LikedItem.module.scss';

interface LikedItemProps {
	item: LikeItem;
}

const LikedItemCard: React.FC<LikedItemProps> = ({ item }) => {
	const navigate = useNavigate();
	const dispatch = useDispatch<AppDispatch>();

	const videoSrc = `${(S3_ADDRESS || '').replace(/\/+$/, '')}/results/${item.dance_id}/video.mp4`;

	const handleOpenLesson = () => {
		navigate(`/lesson/${item.dance_id}?segment=full`);
	};

	const handleUnlike = (e: React.MouseEvent) => {
		e.stopPropagation();
		dispatch(toggleLikeThunk(item.dance_id, true));
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
					className={`${styles.actionBtn} ${styles.liked}`}
					onClick={handleUnlike}
					title="Убрать из понравившихся"
				>
					<Icon name="heart-filled" size="1.2em" alt="Убрать лайк" />
				</button>
			</div>

			<div className={styles.info}>
				<span className={styles.name}>{resolveDanceLabel(item)}</span>
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
