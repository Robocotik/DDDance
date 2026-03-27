import axios from 'axios';
import type { Dispatch } from 'redux';
import VideoActionTypes from './actionTypes';

export interface UploadVideoResult {
	result_key: string;
	num_frames: number;
	num_segments: number;
	duration_sec: number;
}

interface VideoUploadLoadingAction {
	type: typeof VideoActionTypes.VIDEO_UPLOAD_LOADING;
}

interface VideoUploadLoadedAction {
	type: typeof VideoActionTypes.VIDEO_UPLOAD_LOADED;
	payload: UploadVideoResult;
}

interface VideoUploadErrorAction {
	type: typeof VideoActionTypes.VIDEO_UPLOAD_ERROR;
	payload: string;
}

interface ClearVideoAction {
	type: typeof VideoActionTypes.CLEAR_VIDEO;
}

export type VideoAction =
	| VideoUploadLoadingAction
	| VideoUploadLoadedAction
	| VideoUploadErrorAction
	| ClearVideoAction;

export const uploadVideo =
	(file: File) => async (dispatch: Dispatch<VideoAction>) => {
		dispatch({ type: VideoActionTypes.VIDEO_UPLOAD_LOADING });

		try {
			const formData = new FormData();
			formData.append('dance', file);

			console.log('GO TO BACK');

			const response = await axios.post<UploadVideoResult>(
				'http://localhost:5458/api/users/load',
				formData,
				{
					headers: { 'Content-Type': 'multipart/form-data' },
				},
			);

			dispatch({
				type: VideoActionTypes.VIDEO_UPLOAD_LOADED,
				payload: response.data,
			});
		} catch (err: any) {
			dispatch({
				type: VideoActionTypes.VIDEO_UPLOAD_ERROR,
				payload: err.message || 'Something went wrong',
			});
		}
	};

export const clearVideo = (): ClearVideoAction => ({
	type: VideoActionTypes.CLEAR_VIDEO,
});
