import http from '../../../api/http';
import actionTypes from './actionTypes';

export interface UploadLessonResult {
	dance_id: string;
	duration_sec: number;
	full_glb_key: string;
	glb_keys: string[];
	num_frames: number;
	num_segments: number;
	num_segments_rendered: number;
	segments_key: string;
	video_path: string;
	title?: string;
}

interface ApiResponse {
	result: UploadLessonResult;
}

const DEFAULT_ERROR_MESSAGE = 'Произошла ошибка';

const clearLessonAction = () => ({
	type: actionTypes.CLEAR_LESSON,
});

const setLessonLoadingAction = () => ({
	type: actionTypes.LESSON_UPLOAD_LOADING,
});

const returnLessonLoadedAction = (data: UploadLessonResult) => ({
	type: actionTypes.LESSON_UPLOAD_LOADED,
	payload: {
		result: data,
	},
});

const returnLessonErrorAction = (error: string) => ({
	type: actionTypes.LESSON_UPLOAD_ERROR,
	payload: {
		error,
	},
});

const uploadLessonByVideoAction = (file: File) => async (dispatch: any) => {
	dispatch(setLessonLoadingAction());

	try {
		const formData = new FormData();
		formData.append('dance', file);

		const response = await http.post<ApiResponse>(
			'/users/load',
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		console.log(response.data);

		dispatch(returnLessonLoadedAction(response.data as UploadLessonResult));
	} catch (error: any) {
		const errorMessage =
			error?.message ||
			(typeof error === 'string' ? error : DEFAULT_ERROR_MESSAGE);

		dispatch(returnLessonErrorAction(errorMessage));
	}
};

const uploadLessonByIdAction =
	(id: string | number) => async (dispatch: any) => {
		dispatch(setLessonLoadingAction());

		try {
			const response = await http.get<ApiResponse>(`/users/dance/${id}`);

			dispatch(returnLessonLoadedAction(response.data.result));
		} catch (error: any) {
			const errorMessage =
				error?.message ||
				(typeof error === 'string' ? error : DEFAULT_ERROR_MESSAGE);

			dispatch(returnLessonErrorAction(errorMessage));
		}
	};

const uploadLessonByLinkAction = (url: string) => async (dispatch: any) => {
	dispatch(setLessonLoadingAction());

	try {
		const response = await http.post<ApiResponse>('/users/loadByURL', {
			url,
		});

		dispatch(returnLessonLoadedAction(response.data.result));
	} catch (error: any) {
		const errorMessage =
			error?.message ||
			(typeof error === 'string' ? error : DEFAULT_ERROR_MESSAGE);

		dispatch(returnLessonErrorAction(errorMessage));
	}
};

export default {
	uploadLessonByVideoAction,
	uploadLessonByIdAction,
	uploadLessonByLinkAction,
	clearLessonAction,
};