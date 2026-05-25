import { getLikes, toggleLike } from '../../../api/users/likes';
import type { AppDispatch } from '../../store';
import {
	removeLike,
	setLikesError,
	setLikesItems,
	setLikesLoading,
} from './likesSlice';

export const fetchLikes = () => async (dispatch: AppDispatch) => {
	dispatch(setLikesLoading(true));
	try {
		const data = await getLikes();
		dispatch(setLikesItems(data.likes));
	} catch {
		dispatch(setLikesError('Не удалось загрузить лайки'));
	}
};

export const toggleLikeThunk =
	(danceId: string, isLiked: boolean) => async (dispatch: AppDispatch) => {
		if (isLiked) {
			dispatch(removeLike(danceId));
		}

		try {
			await toggleLike(danceId);
			const data = await getLikes();
			dispatch(setLikesItems(data.likes));
		} catch {
			const data = await getLikes();
			dispatch(setLikesItems(data.likes));
			dispatch(setLikesError('Не удалось обновить лайк'));
		}
	};
