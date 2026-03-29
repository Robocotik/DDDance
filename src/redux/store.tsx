import { applyMiddleware, combineReducers, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import type { VideoState } from './features/video/reducers';
import videoReducer from './features/video/reducers';

const rootReducer = combineReducers({
	video: videoReducer,
});

export interface RootState {
	video: VideoState;
}

export const store = createStore(rootReducer, applyMiddleware(thunk));
