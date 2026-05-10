import { getLikes, toggleLike, updateLikeName } from '../../../api/users/likes';
import type { AppDispatch } from '../../store';

import {
	addLike,
	removeLike,
	setLikesError,
	setLikesItems,
	setLikesLoading,
	renameLike,
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
		} else {
			dispatch(addLike({ dance_id: danceId, created_at: new Date().toISOString(), name: undefined }));
		}

		try {
			await toggleLike(danceId);
		} catch {
			if (isLiked) {
				dispatch(addLike({ dance_id: danceId, created_at: new Date().toISOString(), name: undefined }));
			} else {
				dispatch(removeLike(danceId));
			}
			dispatch(setLikesError('Не удалось обновить лайк'));
		}
	};

export const renameLikeItem =
	(danceId: string, newName: string) => async (dispatch: AppDispatch) => {
		dispatch(renameLike({ danceId, newName }));

		try {
			await updateLikeName(danceId, newName);
		} catch {
			dispatch(setLikesError('Не удалось сохранить новое название'));
		}
	};