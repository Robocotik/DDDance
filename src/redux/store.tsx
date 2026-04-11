import { configureStore } from '@reduxjs/toolkit';
import { thunk } from 'redux-thunk';
import type { UserState } from './features/user/userSlice';
import userReducer from './features/user/userSlice';
import type { VideoState } from './features/video/reducers';
import videoReducer from './features/video/reducers';

export const store = configureStore({
	reducer: {
		video: videoReducer,
		user: userReducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({ thunk: false }).concat(thunk),
});

export interface RootState {
	video: VideoState;
	user: UserState;
}

export type AppDispatch = typeof store.dispatch;
