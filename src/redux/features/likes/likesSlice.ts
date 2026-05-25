import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { LikeItem } from '../../../api/users/likes';

export interface LikesState {
	items: LikeItem[];
	loading: boolean;
	error: string | null;
}

const initialState: LikesState = {
	items: [],
	loading: false,
	error: null,
};

const likesSlice = createSlice({
	name: 'likes',
	initialState,
	reducers: {
		setLikesItems: (state, action: PayloadAction<LikeItem[]>) => {
			state.items = action.payload;
			state.loading = false;
			state.error = null;
		},
		setLikesLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload;
		},
		setLikesError: (state, action: PayloadAction<string>) => {
			state.error = action.payload;
			state.loading = false;
		},
		addLike: (state, action: PayloadAction<LikeItem>) => {
			state.items.unshift(action.payload);
		},
		removeLike: (state, action: PayloadAction<string>) => {
			state.items = state.items.filter((i) => i.dance_id !== action.payload);
		},
	},
});

export const {
	setLikesItems,
	setLikesLoading,
	setLikesError,
	addLike,
	removeLike,
} = likesSlice.actions;

export default likesSlice.reducer;
