import {
	acceptDuel,
	createDuel,
	declineDuel,
	getDuelById,
	getDuelHistory,
	type CreateDuelRequest,
	type DuelHistoryResponse,
	type DuelWithUsers,
} from '@/api/duels';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import type { AppDispatch } from '../../store';

export interface DuelsState {
	currentDuel: DuelWithUsers | null;
	duelHistory: DuelHistoryResponse | null;
	loading: boolean;
	error: string | null;
}

const initialState: DuelsState = {
	currentDuel: null,
	duelHistory: null,
	loading: false,
	error: null,
};

const duelsSlice = createSlice({
	name: 'duels',
	initialState,
	reducers: {
		fetchStart: (state) => {
			state.loading = true;
			state.error = null;
		},
		fetchError: (state, action: PayloadAction<string>) => {
			state.loading = false;
			state.error = action.payload;
		},
		setCurrentDuel: (state, action: PayloadAction<DuelWithUsers | null>) => {
			state.currentDuel = action.payload;
			state.loading = false;
		},
		setDuelHistory: (state, action: PayloadAction<DuelHistoryResponse>) => {
			state.duelHistory = action.payload;
			state.loading = false;
		},
		updateDuelInHistory: (state, action: PayloadAction<DuelWithUsers>) => {
			if (state.duelHistory) {
				const idx = state.duelHistory.duels.findIndex(
					(d) => d.id === action.payload.id,
				);

				if (idx !== -1) {
					state.duelHistory.duels[idx] = action.payload;
				}
			}

			if (state.currentDuel?.id === action.payload.id) {
				state.currentDuel = action.payload;
			}

			state.loading = false;
		},
		clear: () => initialState,
	},
});

export const {
	fetchStart,
	fetchError,
	setCurrentDuel,
	setDuelHistory,
	updateDuelInHistory,
	clear,
} = duelsSlice.actions;

export default duelsSlice.reducer;

export const createDuelThunk =
	(req: CreateDuelRequest) =>
	async (dispatch: AppDispatch): Promise<DuelWithUsers | 'exists' | null> => {
		dispatch(fetchStart());

		try {
			const duel = await createDuel(req);
			dispatch(setCurrentDuel(duel));
			return duel;
		} catch (err: unknown) {
			if (axios.isAxiosError(err) && err.response?.status === 409) {
				dispatch(fetchError('Вызов уже отправлен'));
				return 'exists';
			}

			const msg =
				err instanceof Error ? err.message : 'Не удалось создать дуэль';

			dispatch(fetchError(msg));
			return null;
		}
	};

export const acceptDuelThunk =
	(duelId: string) => async (dispatch: AppDispatch) => {
		dispatch(fetchStart());

		try {
			const duel = await acceptDuel(duelId);
			dispatch(updateDuelInHistory(duel));
			return duel;
		} catch (err: unknown) {
			try {
				const data = await getDuelHistory();
				dispatch(setDuelHistory(data));
			} catch {}

			const msg =
				err instanceof Error ? err.message : 'Не удалось принять дуэль';

			dispatch(fetchError(msg));
			return null;
		}
	};

export const declineDuelThunk =
	(duelId: string) => async (dispatch: AppDispatch) => {
		dispatch(fetchStart());

		try {
			await declineDuel(duelId);
			const data = await getDuelHistory();
			dispatch(setDuelHistory(data));
			return true;
		} catch (err: unknown) {
			try {
				const data = await getDuelHistory();
				dispatch(setDuelHistory(data));
			} catch {}

			const msg =
				err instanceof Error ? err.message : 'Не удалось отклонить дуэль';

			dispatch(fetchError(msg));
			return false;
		}
	};

export const fetchDuelHistoryThunk =
	(limit = 20, offset = 0) =>
	async (dispatch: AppDispatch) => {
		dispatch(fetchStart());

		try {
			const data = await getDuelHistory(limit, offset);
			dispatch(setDuelHistory(data));
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : 'Не удалось загрузить дуэли';

			dispatch(fetchError(msg));
		}
	};

export const fetchDuelByIdThunk =
	(duelId: string) => async (dispatch: AppDispatch) => {
		dispatch(fetchStart());

		try {
			const duel = await getDuelById(duelId);
			dispatch(setCurrentDuel(duel));
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : 'Не удалось загрузить дуэль';

			dispatch(fetchError(msg));
		}
	};
