import http from '../../../api/http';
import actionTypes from './actionTypes';

const inFlightLessonById = new Map<string, Promise<void>>();

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

const DEFAULT_ERROR_MESSAGE = 'Произошла ошибка';

const clearLessonAction = () => {
	inFlightLessonById.clear();
	return {
		type: actionTypes.CLEAR_LESSON,
	};
};

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
		const key = String(id);
		const existing = inFlightLessonById.get(key);
		if (existing) {
			return existing;
		}

		const promise = (async () => {
			dispatch(setLessonLoadingAction());

			try {
				const response = await http.get<UploadLessonResult>(
					`/users/dance/${id}`,
				);

				dispatch(returnLessonLoadedAction(response.data));
			} catch (error: any) {
				const errorMessage =
					error?.message ||
					(typeof error === 'string' ? error : DEFAULT_ERROR_MESSAGE);

				dispatch(returnLessonErrorAction(errorMessage));
			} finally {
				inFlightLessonById.delete(key);
			}
		})();

		inFlightLessonById.set(key, promise);
		return promise;
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
