import { configureStore } from '@reduxjs/toolkit';
import { thunk } from 'redux-thunk';
import achievementsReducer, {
	type AchievementsState,
} from './features/achievements/achievementsSlice';
import duelsReducer, { type DuelsState } from './features/duels/duelsSlice';
import historyReducer, {
	type HistoryState,
} from './features/history/historySlice.ts';
import type { LessonState } from './features/lesson/reducers';
import videoReducer from './features/lesson/reducers';
import likesReducer from './features/likes/likesSlice';
import notificationsReducer, {
	type NotificationsState,
} from './features/notifications/notificationsSlice';
import reelsReducer, { type ReelsState } from './features/reels/reelsSlice';
import type { TrendsState } from './features/trends/reducers';
import trendsReducer from './features/trends/reducers';
import type { UploadState } from './features/upload/uploadSlice';
import uploadReducer from './features/upload/uploadSlice';
import type { UserState } from './features/user/userSlice';
import userReducer from './features/user/userSlice';

export const store = configureStore({
	reducer: {
		video: videoReducer,
		user: userReducer,
		trends: trendsReducer,
		history: historyReducer,
		likes: likesReducer,
		upload: uploadReducer,
		notifications: notificationsReducer,
		duels: duelsReducer,
		reels: reelsReducer,
		achievements: achievementsReducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({ thunk: false }).concat(thunk),
});

export interface RootState {
	video: LessonState;
	user: UserState;
	trends: TrendsState;
	history: HistoryState;
	likes: ReturnType<typeof likesReducer>;
	upload: UploadState;
	notifications: NotificationsState;
	duels: DuelsState;
	reels: ReelsState;
	achievements: AchievementsState;
}

export type AppDispatch = typeof store.dispatch;
