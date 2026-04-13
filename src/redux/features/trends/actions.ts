import http from '../../../api/http';
import actionTypes from './actionTypes';

export interface VideoItem {
	id: string;
	url: string;
}

export interface TrendVideos {
	count: number;
	videos: VideoItem[];
}

const DEFAULT_ERROR_MESSAGE = 'Произошла ошибка';

const clearTrendsAction = () => ({
	type: actionTypes.CLEAR_TRENDS,
});

const setTrendsLoadingAction = () => ({
	type: actionTypes.TRENDS_LOADING,
});

const returnTrendsLoadedAction = (data: TrendVideos) => ({
	type: actionTypes.TRENDS_LOADED,
	payload: {
		result: data,
	},
});

const returnTrendsErrorAction = (error: string) => ({
	type: actionTypes.TRENDS_ERROR,
	payload: {
		error,
	},
});

const getTrendVideosAction = () => async (dispatch: any) => {
	dispatch(setTrendsLoadingAction());

	try {
		const response = await http.get<TrendVideos>('/users/main_page/');

		dispatch(returnTrendsLoadedAction(response.data));
	} catch (error: any) {
		const errorMessage =
			error?.response?.data?.message ||
			error?.message ||
			(typeof error === 'string' ? error : DEFAULT_ERROR_MESSAGE);

		dispatch(returnTrendsErrorAction(errorMessage));
	}
};

export default {
	getTrendVideosAction,
	clearTrendsAction,
};
