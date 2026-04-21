import type { AnyAction, Reducer } from 'redux';
import LessonActionTypes from './actionTypes';
import type { UploadLessonResult } from './actions';

export interface LessonState {
	resultLoading: boolean;
	result: UploadLessonResult | null;
	resultError: string | null;
}

const initialState: LessonState = {
	resultLoading: false,
	result: null,
	resultError: null,
};

const videoReducer: Reducer<LessonState, AnyAction> = (
	state = initialState,
	action,
): LessonState => {
	if (typeof action === 'function') {
		return state;
	}

	const { type, payload } = action;

	console.log({type});

	switch (type) {
		case LessonActionTypes.LESSON_UPLOAD_LOADING:
			return {
				...state,
				resultLoading: true,
				resultError: null,
			};

		case LessonActionTypes.LESSON_UPLOAD_LOADED:
			return {
				...state,
				resultLoading: false,
				result: payload.result,
				resultError: null,
			};

		case LessonActionTypes.LESSON_UPLOAD_ERROR:
			return {
				...state,
				resultLoading: false,
				resultError: payload.error,
			};

		case LessonActionTypes.CLEAR_LESSON:
			return initialState;

		default:
			return state;
	}
};

export default videoReducer;
