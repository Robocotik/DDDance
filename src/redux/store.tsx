import { configureStore } from '@reduxjs/toolkit';
import { thunk } from 'redux-thunk';
import type { LessonState } from './features/lesson/reducers';
import videoReducer from './features/lesson/reducers';
import type { TrendsState } from './features/trends/reducers';
import trendsReducer from './features/trends/reducers';
import type { UserState } from './features/user/userSlice';
import userReducer from './features/user/userSlice';

export const store = configureStore({
	reducer: {
		video: videoReducer,
		user: userReducer,
		trends: trendsReducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({ thunk: false }).concat(thunk),
});

export interface RootState {
	video: LessonState;
	user: UserState;
	trends: TrendsState;
}

export type AppDispatch = typeof store.dispatch;
