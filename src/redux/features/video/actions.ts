import http from '../../../api/http';
import actionTypes from './actionTypes';

export interface UploadVideoResult {
	result_key: string;
	num_frames: number;
	num_segments: number;
	duration_sec: number;
}

const DEFAULT_ERROR_MESSAGE = 'Произошла ошибка';

/**
 * Action: очистка данных видео.
 */
const clearVideoAction = () => ({
	type: actionTypes.CLEAR_VIDEO,
});

/**
 * Action: начало загрузки видео.
 */
const setVideoLoadingAction = () => ({
	type: actionTypes.VIDEO_UPLOAD_LOADING,
});

/**
 * Action: успешная загрузка видео.
 */
const returnVideoLoadedAction = (data: UploadVideoResult) => ({
	type: actionTypes.VIDEO_UPLOAD_LOADED,
	payload: {
		video: data,
	},
});

/**
 * Action: ошибка при загрузке видео.
 */
const returnVideoErrorAction = (error: string) => ({
	type: actionTypes.VIDEO_UPLOAD_ERROR,
	payload: {
		error,
	},
});

/**
 * Thunk: асинхронная загрузка видео на сервер.
 */
const uploadVideoAction = (file: File) => async (dispatch: any) => {
	dispatch(setVideoLoadingAction());

	try {
		const formData = new FormData();
		formData.append('dance', file);

		const response = await http.post<UploadVideoResult>(
			'/users/load',
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		dispatch(returnVideoLoadedAction(response.data));
	} catch (error: any) {
		const errorMessage =
			error?.message ||
			(typeof error === 'string' ? error : DEFAULT_ERROR_MESSAGE);

		dispatch(returnVideoErrorAction(errorMessage));
	}
};

export default {
	uploadVideoAction,
	clearVideoAction,
};
