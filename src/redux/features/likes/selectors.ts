import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../store';

const selectLikesState = (state: RootState) => state.likes;

export const selectLikesItems = createSelector(
	selectLikesState,
	(likes) => likes?.items ?? [],
);

export const selectLikesLoading = createSelector(
	selectLikesState,
	(likes) => likes?.loading ?? false,
);

export const selectIsLiked = (danceId: string) =>
	createSelector(selectLikesItems, (items) =>
		items.some((i) => i.dance_id === danceId),
	);
