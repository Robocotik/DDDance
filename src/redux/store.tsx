import { applyMiddleware, combineReducers, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import type { VideoState } from './features/video/reducers';
import { videoReducer } from './features/video/reducers';

// Объединяем редьюсеры (пока один, но можно расширять)
const rootReducer = combineReducers({
	video: videoReducer,
});

// Тип глобального состояния Redux
export interface RootState {
	video: VideoState;
}

// Создаём store с thunk middleware
export const store = createStore(rootReducer, applyMiddleware(thunk));
