import http from '../../../api/http';
import { S3_ADDRESS } from '../../../consts/urls';
import actionTypes from './actionTypes';
const inFlightLessonById = new Map<string, Promise<void>>();

export interface DanceAuthor {
	id: string;
	login: string;
	avatar: string;
}

export type LessonDifficulty = 'easy' | 'medium' | 'hard';

export interface SegmentInfo {
	index: number;
	start_time: number;
	end_time: number;
	description?: string;
}

export interface UploadLessonResult {
	dance_id: string;
	duration_sec: number;
	full_glb_key: string;
	glb_keys: string[];
	keyframes_url?: string;
	segments?: SegmentInfo[];
	num_frames: number;
	num_segments: number;
	num_segments_rendered: number;
	segments_key: string;
	video_path: string;
	title?: string;
	likes_count?: number;
	is_liked?: boolean;
	author?: DanceAuthor;
	difficulty?: LessonDifficulty;
	difficulty_by_users?: boolean;
	last_attempt_id?: string;
	last_attempt_score?: number;
	unique_viewers_approx?: number;
}

export interface ModerationPendingResponse {
	error_code: 'MODERATION_PENDING';
	message: string;
	dance_id?: string;
}

const isModerationPending = (
	status: number,
	data: unknown,
): data is ModerationPendingResponse =>
	status === 202 &&
	typeof data === 'object' &&
	data !== null &&
	(data as { error_code?: string }).error_code === 'MODERATION_PENDING';

const PENDING_UPLOADS_KEY = 'pending_anonymous_uploads';

const savePendingUpload = (danceId: string | undefined): void => {
	if (!danceId) {
		return;
	}

	try {
		const raw = localStorage.getItem(PENDING_UPLOADS_KEY);
		const list: string[] = raw ? JSON.parse(raw) : [];

		if (!list.includes(danceId)) {
			list.push(danceId);
			localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(list));
		}
	} catch {}
};

export const getPendingAnonymousUploads = (): string[] => {
	try {
		const raw = localStorage.getItem(PENDING_UPLOADS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
};

export const clearPendingAnonymousUploads = (): void => {
	try {
		localStorage.removeItem(PENDING_UPLOADS_KEY);
	} catch {}
};

const DEFAULT_ERROR_MESSAGE = 'Произошла ошибка';

const clearLessonAction = () => {
	inFlightLessonById.clear();
	return {
		type: actionTypes.CLEAR_LESSON,
	};
};

const patchLessonLastAttemptAction = (
	danceId: string,
	attemptId: string,
	score?: number,
) => ({
	type: actionTypes.LESSON_PATCH_LAST_ATTEMPT,
	payload: { danceId, attemptId, score },
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

const returnLessonModerationPendingAction = () => ({
	type: actionTypes.LESSON_MODERATION_PENDING,
});

const uploadLessonByVideoAction = (file: File) => async (dispatch: any) => {
	dispatch(setLessonLoadingAction());

	try {
		const formData = new FormData();
		formData.append('dance', file);

		const response = await http.post<
			UploadLessonResult | ModerationPendingResponse
		>('/users/load', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
			timeout: 300_000,
		});

		if (isModerationPending(response.status, response.data)) {
			savePendingUpload(response.data.dance_id);
			dispatch(returnLessonModerationPendingAction());
			return;
		}

		dispatch(returnLessonLoadedAction(response.data as UploadLessonResult));
	} catch {
		dispatch(
			returnLessonErrorAction('Что-то пошло не так, но мы это уже чиним'),
		);
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
		const response = await http.post<
			UploadLessonResult | ModerationPendingResponse
		>('/users/loadByURL', { url });

		if (isModerationPending(response.status, response.data)) {
			savePendingUpload(response.data.dance_id);
			dispatch(returnLessonModerationPendingAction());
			return;
		}

		dispatch(returnLessonLoadedAction(response.data as UploadLessonResult));
	} catch {
		dispatch(
			returnLessonErrorAction(
				'Что-то пошло не так! Попробуйте скачать видео и отправить на разбор',
			),
		);
	}
};

const uploadLessonByTrimAction =
	(file: File, startSec: number, endSec: number) => async (dispatch: any) => {
		dispatch(setLessonLoadingAction());

		try {
			const formData = new FormData();
			formData.append('dance', file);
			formData.append('start_sec', String(startSec));
			formData.append('end_sec', String(endSec));

			const response = await http.post<
				UploadLessonResult | ModerationPendingResponse
			>('/users/load/trim', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
				timeout: 300_000,
			});

			if (isModerationPending(response.status, response.data)) {
				savePendingUpload(response.data.dance_id);
				dispatch(returnLessonModerationPendingAction());
				return;
			}

			dispatch(returnLessonLoadedAction(response.data as UploadLessonResult));
		} catch {
			dispatch(returnLessonErrorAction('Не удалось обработать видео'));
		}
	};

export interface SegmentData {
	index: number;
	label: string;
	start_frame: number;
	end_frame: number;
	llm_description: string;
	features: string;
	choreographerDescription?: string;
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
	uploadLessonByTrimAction,
	clearLessonAction,
	patchLessonLastAttemptAction,
	uploadSegmentsAction,
};
