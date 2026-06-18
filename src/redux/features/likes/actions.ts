import { getLikes, toggleLike } from '../../../api/users/likes';
import type { AppDispatch, RootState } from '../../store';
import {
	addLike,
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
	(danceId: string, isLiked: boolean) =>
	async (dispatch: AppDispatch, getState: () => RootState) => {
		const originalLikeItem = isLiked
			? (getState().likes.items.find((i) => i.dance_id === danceId) ?? null)
			: null;

		if (isLiked) {
			dispatch(removeLike(danceId));
		}

		try {
			await toggleLike(danceId);
			const data = await getLikes();
			dispatch(setLikesItems(data.likes));
		} catch {
			try {
				const data = await getLikes();
				dispatch(setLikesItems(data.likes));
			} catch {
				if (originalLikeItem) {
					dispatch(addLike(originalLikeItem));
				}
			}

			dispatch(setLikesError('Не удалось обновить лайк'));
		}
	};
