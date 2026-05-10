import type { AnyAction, Reducer } from 'redux';
import LessonActionTypes from './actionTypes';
import type { UploadLessonResult } from './actions';
import type { SegmentsResult } from './actions';

export interface LessonState {
	resultLoading: boolean;
	result: UploadLessonResult | null;
	resultError: string | null;
	segmentsLoading: boolean;
	segments: SegmentsResult | null;
	segmentsError: string | null;
}

const initialState: LessonState = {
	resultLoading: false,
	result: null,
	resultError: null,
	segmentsLoading: false,
	segments: null,
	segmentsError: null,
};

const videoReducer: Reducer<LessonState, AnyAction> = (
	state = initialState,
	action,
): LessonState => {
	if (typeof action === 'function') {
		return state;
	}

	const { type, payload } = action;

	switch (type) {
		case LessonActionTypes.LESSON_UPLOAD_LOADING:
			return { ...state, resultLoading: true, resultError: null };

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

		case LessonActionTypes.SEGMENTS_LOADING:
			return { ...state, segmentsLoading: true, segmentsError: null };

		case LessonActionTypes.SEGMENTS_LOADED:
			return {
				...state,
				segmentsLoading: false,
				segments: payload.result,
				segmentsError: null,
			};

		case LessonActionTypes.SEGMENTS_ERROR:
			return {
				...state,
				segmentsLoading: false,
				segmentsError: payload.error,
			};

		case LessonActionTypes.CLEAR_LESSON:
			return initialState;

		default:
			return state;
	}
};

export default videoReducer;