import http from '../../../api/http';
import actionTypes from './actionTypes';

export interface UploadLessonResult {
	result_key: string;
	num_frames?: number;
	num_segments?: number;
	duration_sec?: number;
	lesson_id?: number;
	title?: string;
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

		const response = await http.post<UploadLessonResult>(
			'/users/load',
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		dispatch(returnLessonLoadedAction(response.data));
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
			const response = await http.get<UploadLessonResult>(`/users/dance/${id}`);

			dispatch(returnLessonLoadedAction(response.data));
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
		const response = await http.post<UploadLessonResult>('/users/loadByURL', {
			url,
		});

		dispatch(returnLessonLoadedAction(response.data));
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
