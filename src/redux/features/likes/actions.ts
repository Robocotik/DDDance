import { getLikes, toggleLike, updateLikeName } from '../../../api/users/likes';
import type { AppDispatch, RootState } from '../../store';
import {
	removeLike,
	renameLike,
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

export const renameLikeItem =
	(historyId: string, danceId: string, newName: string) =>
	async (dispatch: AppDispatch, getState: () => RootState) => {
		const oldName = getState().likes.items.find(
			(i) => i.dance_id === danceId,
		)?.name;

		dispatch(renameLike({ danceId, newName }));

		try {
			await updateLikeName(historyId, newName);
		} catch {
			if (oldName !== undefined) {
				dispatch(renameLike({ danceId, newName: oldName }));
			}
			dispatch(setLikesError('Не удалось сохранить новое название'));
		}
	};
