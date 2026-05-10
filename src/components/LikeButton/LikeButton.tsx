import { toggleLikeThunk } from '@/redux/features/likes/actions';
import { selectIsLiked } from '@/redux/features/likes/selectors';
import { selectIsUserAuthenticated } from '@/redux/features/user/selectors';
import type { AppDispatch } from '@/redux/store';
import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './LikeButton.module.scss';

interface LikeButtonProps {
	danceId: string;
}

const LikeButton: React.FC<LikeButtonProps> = ({ danceId }) => {
	const dispatch = useDispatch<AppDispatch>();
	const isAuthenticated = useSelector(selectIsUserAuthenticated);
	const isLikedSelector = useMemo(() => selectIsLiked(danceId), [danceId]);
	const isLiked = useSelector(isLikedSelector);

	if (!isAuthenticated) return null;

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		dispatch(toggleLikeThunk(danceId, isLiked));
	};

	return (
		<button
			className={`${styles.btn} ${isLiked ? styles.liked : ''}`}
			onClick={handleClick}
			title={isLiked ? 'Убрать лайк' : 'Нравится'}
		>
			{isLiked ? '❤️' : '🤍'}
		</button>
	);
};

export default LikeButton;