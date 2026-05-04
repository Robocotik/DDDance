import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { HistoryItem } from '../../../api/users/history';

export interface HistoryState {
	items: HistoryItem[];
	loading: boolean;
	error: string | null;
}

const initialState: HistoryState = {
	items: [],
	loading: false,
	error: null,
};

const historySlice = createSlice({
	name: 'history',
	initialState,
	reducers: {
		setHistoryItems: (state, action: PayloadAction<HistoryItem[]>) => {
			state.items = action.payload;
			state.loading = false;
			state.error = null;
		},
		setHistoryLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload;
		},
		setHistoryError: (state, action: PayloadAction<string>) => {
			state.error = action.payload;
			state.loading = false;
		},
		updateItem: (state, action: PayloadAction<HistoryItem>) => {
			const index = state.items.findIndex((i) => i.id === action.payload.id);
			if (index !== -1) {
				state.items[index] = action.payload;
			}
		},
		removeItem: (state, action: PayloadAction<string>) => {
			state.items = state.items.filter((i) => i.id !== action.payload);
		},
	},
});

export const {
	setHistoryItems,
	setHistoryLoading,
	setHistoryError,
	updateItem,
	removeItem,
} = historySlice.actions;

export default historySlice.reducer;
