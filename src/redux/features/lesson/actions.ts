import http from '../../../api/http';
import { S3_ADDRESS } from '../../../consts/urls';
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
		const errorMessage = 'Что-то пошло не так, но мы это уже чиним';

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
			'Что-то пошло не так! Попробуйте скачать видео и отправить на разбор';

		dispatch(returnLessonErrorAction(errorMessage));
	}
};

export interface SegmentData {
	index: number;
	label: string;
	start_frame: number;
	end_frame: number;
	llm_description: string;
	features: string;
}

export interface SegmentsResult {
	dance_id: string;
	meta: {
		fps: number;
		num_frames: number;
		duration_sec: number;
	};
	num_segments: number;
	segments: SegmentData[];
}

const setSegmentsLoadingAction = () => ({
	type: actionTypes.SEGMENTS_LOADING,
});

const returnSegmentsLoadedAction = (data: SegmentsResult) => ({
	type: actionTypes.SEGMENTS_LOADED,
	payload: { result: data },
});

const returnSegmentsErrorAction = (error: string) => ({
	type: actionTypes.SEGMENTS_ERROR,
	payload: { error },
});

const uploadSegmentsAction = (segmentsKey: string) => async (dispatch: any) => {
	dispatch(setSegmentsLoadingAction());

	try {
		const base = (S3_ADDRESS || '').replace(/\/+$/, '');
		const cleanKey = segmentsKey.replace(/^\/+/, '');
		const url = `${base}/${cleanKey}`;

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data: SegmentsResult = await response.json();
		dispatch(returnSegmentsLoadedAction(data));
	} catch (error: any) {
		const errorMessage =
			error?.message ||
			(typeof error === 'string' ? error : DEFAULT_ERROR_MESSAGE);
		dispatch(returnSegmentsErrorAction(errorMessage));
	}
};

export default {
	uploadLessonByVideoAction,
	uploadLessonByIdAction,
	uploadLessonByLinkAction,
	clearLessonAction,
	uploadSegmentsAction,
};
