import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AchievementsState {
	unlockedCount: number;
	totalCount: number;
	loaded: boolean;
}

const initialState: AchievementsState = {
	unlockedCount: 0,
	totalCount: 0,
	loaded: false,
};

const achievementsSlice = createSlice({
	name: 'achievements',
	initialState,
	reducers: {
		setAchievementCounts: (
			state,
			action: PayloadAction<{ unlocked: number; total: number }>,
		) => {
			state.unlockedCount = action.payload.unlocked;
			state.totalCount = action.payload.total;
			state.loaded = true;
		},
		incrementUnlocked: (state) => {
			state.unlockedCount += 1;
		},
		resetAchievements: () => initialState,
	},
});

export const { setAchievementCounts, incrementUnlocked, resetAchievements } =
	achievementsSlice.actions;

export default achievementsSlice.reducer;
