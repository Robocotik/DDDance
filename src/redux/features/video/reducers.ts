import type { AnyAction, Reducer } from 'redux';
import VideoActionTypes from './actionTypes';
import type { UploadVideoResult } from './actions';

export interface VideoState {
	resultLoading: boolean;
	result: UploadVideoResult | null;
	resultError: string | null;
}

/**
 * Начальное состояние редьюсера видео.
 */
const initialState: VideoState = {
	resultLoading: false,
	result: null,
	resultError: null,
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
				resultLoading: true,
				resultError: null,
			};

		case VideoActionTypes.VIDEO_UPLOAD_LOADED:
			return {
				...state,
				resultLoading: false,
				result: payload.result,
				resultError: null,
			};

		case VideoActionTypes.VIDEO_UPLOAD_ERROR:
			return {
				...state,
				resultLoading: false,
				resultError: payload.error,
			};

		case VideoActionTypes.CLEAR_VIDEO:
			return initialState;

		default:
			return state;
	}
};

export default videoReducer;
