import type { AnyAction, Reducer } from 'redux';
import VideoActionTypes from './actionTypes';
import type { UploadVideoResult } from './actions';

export interface VideoState {
	videoLoading: boolean;
	video: UploadVideoResult | null;
	videoError: string | null;
}

/**
 * Начальное состояние редьюсера видео.
 */
const initialState: VideoState = {
	videoLoading: false,
	video: null,
	videoError: null,
};

/**
 * Редьюсер для управления состоянием загрузки видео.
 */
const videoReducer: Reducer<VideoState, AnyAction> = (
	state = initialState,
	action,
): VideoState => {
	if (typeof action === 'function') {
		return state;
	}

	const { type, payload } = action;

	switch (type) {
		case VideoActionTypes.VIDEO_UPLOAD_LOADING:
			return {
				...state,
				videoLoading: true,
				videoError: null,
			};

		case VideoActionTypes.VIDEO_UPLOAD_LOADED:
			return {
				...state,
				videoLoading: false,
				video: payload.video,
				videoError: null,
			};

		case VideoActionTypes.VIDEO_UPLOAD_ERROR:
			return {
				...state,
				videoLoading: false,
				videoError: payload.error,
			};

		case VideoActionTypes.CLEAR_VIDEO:
			return initialState;

		default:
			return state;
	}
};

export default videoReducer;