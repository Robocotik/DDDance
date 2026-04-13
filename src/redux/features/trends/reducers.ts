import type { AnyAction, Reducer } from 'redux';
import TrendActionTypes from './actionTypes';
import type { TrendVideos } from './actions';

export interface TrendsState {
	resultLoading: boolean;
	result: TrendVideos | null;
	resultError: string | null;
}

const initialState: TrendsState = {
	resultLoading: false,
	result: null,
	resultError: null,
};

const trendsReducer: Reducer<TrendsState, AnyAction> = (
	state = initialState,
	action,
): TrendsState => {
	if (typeof action === 'function') {
		return state;
	}

	const { type, payload } = action;

	console.log({ type, payload });

	switch (type) {
		case TrendActionTypes.TRENDS_LOADING:
			return {
				...state,
				resultLoading: true,
				resultError: null,
			};

		case TrendActionTypes.TRENDS_LOADED:
			return {
				...state,
				resultLoading: false,
				result: payload.result,
				resultError: null,
			};

		case TrendActionTypes.TRENDS_ERROR:
			return {
				...state,
				resultLoading: false,
				resultError: payload.error,
			};

		case TrendActionTypes.CLEAR_TRENDS:
			return initialState;

		default:
			return state;
	}
};

export default trendsReducer;
