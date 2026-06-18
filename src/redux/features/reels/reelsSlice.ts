import {
	getReelsFeed,
	markDanceViewed,
	type BehaviorLogEntry,
	type ReelItem,
} from '@/api/reels';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../../store';

const REELS_PAGE_SIZE = 5;
const MAX_BEHAVIOR_LOG = 50;

export interface ReelsState {
	items: ReelItem[];
	currentIndex: number;
	loading: boolean;
	error: string | null;
	hasMore: boolean;
	seenIds: string[];
	behaviorLog: BehaviorLogEntry[];
}

const initialState: ReelsState = {
	items: [],
	currentIndex: 0,
	loading: false,
	error: null,
	hasMore: true,
	seenIds: [],
	behaviorLog: [],
};

const reelsSlice = createSlice({
	name: 'reels',
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
		setItems: (
			state,
			action: PayloadAction<{ items: ReelItem[]; total: number }>,
		) => {
			const { items } = action.payload;
			state.hasMore = items.length >= REELS_PAGE_SIZE + 1;
			state.items = items.slice(0, REELS_PAGE_SIZE);
			state.loading = false;
		},
		appendItems: (
			state,
			action: PayloadAction<{ items: ReelItem[]; total: number }>,
		) => {
			const { items } = action.payload;
			state.hasMore = items.length >= REELS_PAGE_SIZE + 1;
			state.items = [...state.items, ...items.slice(0, REELS_PAGE_SIZE)];
			state.loading = false;
		},
		setCurrentIndex: (state, action: PayloadAction<number>) => {
			state.currentIndex = action.payload;
		},
		addSeenId: (state, action: PayloadAction<string>) => {
			if (!state.seenIds.includes(action.payload)) {
				state.seenIds.push(action.payload);
			}
		},
		logBehavior: (state, action: PayloadAction<BehaviorLogEntry>) => {
			state.behaviorLog.push(action.payload);

			if (state.behaviorLog.length > MAX_BEHAVIOR_LOG) {
				state.behaviorLog = state.behaviorLog.slice(-MAX_BEHAVIOR_LOG);
			}
		},
		reset: () => initialState,
	},
});

export const {
	fetchStart,
	fetchError,
	setItems,
	appendItems,
	setCurrentIndex,
	addSeenId,
	logBehavior,
	reset,
} = reelsSlice.actions;

export default reelsSlice.reducer;

export const fetchReelsFeedThunk = () => async (dispatch: AppDispatch) => {
	dispatch(reset());
	dispatch(fetchStart());

	try {
		const data = await getReelsFeed({ limit: REELS_PAGE_SIZE + 1 });
		dispatch(setItems({ items: data.items, total: data.total }));
	} catch (err: unknown) {
		const msg =
			err instanceof Error ? err.message : 'Не удалось загрузить ленту';

		dispatch(fetchError(msg));
	}
};

export const fetchMoreReelsThunk =
	() => async (dispatch: AppDispatch, getState: () => RootState) => {
		const { loading, hasMore, seenIds, behaviorLog } = getState().reels;

		if (loading || !hasMore) {
			return;
		}

		dispatch(fetchStart());

		try {
			const data = await getReelsFeed({
				limit: REELS_PAGE_SIZE + 1,
				excludeIds: seenIds,
				behaviorLog: behaviorLog.length > 0 ? behaviorLog : undefined,
			});

			dispatch(appendItems({ items: data.items, total: data.total }));
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : 'Не удалось загрузить ещё видео';

			dispatch(fetchError(msg));
		}
	};

export const markViewedThunk =
	(danceId: string) => async (dispatch: AppDispatch) => {
		try {
			await markDanceViewed(danceId);
		} catch {}

		dispatch(addSeenId(danceId));
	};
