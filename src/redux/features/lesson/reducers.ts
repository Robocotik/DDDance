import type { AnyAction, Reducer } from 'redux';
import LessonActionTypes from './actionTypes';
import type { SegmentsResult, UploadLessonResult } from './actions';

export interface LessonState {
	resultLoading: boolean;
	result: UploadLessonResult | null;
	resultError: string | null;
	moderationPending: boolean;
	segmentsLoading: boolean;
	segments: SegmentsResult | null;
	segmentsError: string | null;
}

const initialState: LessonState = {
	resultLoading: false,
	result: null,
	resultError: null,
	moderationPending: false,
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

		case LessonActionTypes.LESSON_MODERATION_PENDING:
			return {
				...state,
				resultLoading: false,
				moderationPending: true,
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

		case LessonActionTypes.LESSON_PATCH_LAST_ATTEMPT:
			if (!state.result || state.result.dance_id !== payload.danceId) {
				return state;
			}

			return {
				...state,
				result: {
					...state.result,
					last_attempt_id: payload.attemptId,
					last_attempt_score: payload.score,
				},
			};

		case LessonActionTypes.CLEAR_LESSON:
			return initialState;

		default:
			return state;
	}
};

export default videoReducer;
