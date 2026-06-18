import type {
	CompareResponse,
	LoadDanceResult,
	TaskStatus,
} from '@/api/users/compare';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type TaskType = 'upload' | 'compare';

export interface UploadState {
	isUploading: boolean;
	isProcessing: boolean;
	userDanceId: string | null;
	error: string | null;
	referenceDanceId: string | null;
	showRating: boolean;
	taskId: string | null;
	taskType: TaskType | null;
	taskStatus: TaskStatus;
	progress: number;
	stageName: string;
	danceId: string | null;
	videoKey: string | null;
	resultReady: boolean;
	moderationFailed: boolean;
	moderationReason: string | null;
	compareResult: CompareResponse | null;
	uploadResult: LoadDanceResult | null;
}

const initialState: UploadState = {
	isUploading: false,
	isProcessing: false,
	userDanceId: null,
	error: null,
	referenceDanceId: null,
	showRating: false,
	taskId: null,
	taskType: null,
	taskStatus: 'queued',
	progress: 0,
	stageName: '',
	danceId: null,
	videoKey: null,
	resultReady: false,
	moderationFailed: false,
	moderationReason: null,
	compareResult: null,
	uploadResult: null,
};

const uploadSlice = createSlice({
	name: 'upload',
	initialState,
	reducers: {
		videoUploading: (_state, action: PayloadAction<{ taskType: TaskType }>) => {
			return {
				...initialState,
				isUploading: true,
				isProcessing: false,
				taskType: action.payload.taskType,
				stageName: 'Загрузка видео',
				progress: 0,
			};
		},
		taskEnqueued: (
			_state,
			action: PayloadAction<{
				taskId: string;
				taskType: TaskType;
				danceId?: string;
				userDanceId?: string;
				referenceDanceId?: string;
				videoKey?: string;
			}>,
		) => {
			const {
				taskId,
				taskType,
				danceId,
				userDanceId,
				referenceDanceId,
				videoKey,
			} = action.payload;

			return {
				...initialState,
				isUploading: false,
				isProcessing: true,
				taskId,
				taskType,
				taskStatus: 'queued' as TaskStatus,
				progress: 5,
				stageName: 'Проверка видео',
				danceId: danceId ?? null,
				userDanceId: userDanceId ?? null,
				referenceDanceId: referenceDanceId ?? null,
				videoKey: videoKey ?? null,
			};
		},
		taskProgressUpdated: (
			state,
			action: PayloadAction<{
				progress: number;
				stageName: string;
				taskStatus: TaskStatus;
			}>,
		) => {
			state.progress = action.payload.progress;
			state.stageName = action.payload.stageName;
			state.taskStatus = action.payload.taskStatus;
			state.isProcessing = true;
		},
		taskCompleted: (
			state,
			action: PayloadAction<{
				compareResult?: CompareResponse;
				uploadResult?: LoadDanceResult;
			}>,
		) => {
			state.isProcessing = false;
			state.taskStatus = 'done';
			state.progress = 100;
			state.stageName = 'Готово';
			state.resultReady = true;

			if (action.payload.compareResult) {
				state.compareResult = action.payload.compareResult;
				state.userDanceId = action.payload.compareResult.user_dance_id ?? null;
			}

			if (action.payload.uploadResult) {
				state.uploadResult = action.payload.uploadResult;
				state.danceId = action.payload.uploadResult.dance_id ?? null;
			}
		},
		taskFailed: (state, action: PayloadAction<string>) => {
			const err = action.payload ?? '';
			const isModerationError = /moderat/i.test(err) || /модерац/i.test(err);

			state.isUploading = false;
			state.isProcessing = false;
			state.taskStatus = 'failed';
			state.error = err;
			state.resultReady = false;
			state.moderationFailed = isModerationError;
		},
		moderationRejected: (state, action: PayloadAction<string>) => {
			state.isUploading = false;
			state.isProcessing = false;
			state.taskStatus = 'failed';
			state.resultReady = false;
			state.moderationFailed = true;
			state.moderationReason = action.payload || null;
		},
		resultAcknowledged: (state) => {
			state.resultReady = false;
			state.moderationFailed = false;
			state.moderationReason = null;
		},
		startUpload: (_state, action: PayloadAction<string>) => {
			return {
				...initialState,
				isUploading: true,
				isProcessing: true,
				referenceDanceId: action.payload,
			};
		},
		setProcessing: (state, action: PayloadAction<boolean>) => {
			state.isProcessing = action.payload;
		},
		setUploadResult: (state, action: PayloadAction<CompareResponse>) => {
			state.isProcessing = false;
			state.isUploading = false;
			state.userDanceId = action.payload.user_dance_id;
		},
		setUploadError: (state, action: PayloadAction<string>) => {
			state.error = action.payload;
			state.isProcessing = false;
		},
		setShowRating: (state, action: PayloadAction<boolean>) => {
			state.showRating = action.payload;
		},
		finishUpload: (state) => {
			state.isUploading = false;
			state.isProcessing = false;
			state.error = null;
			state.showRating = false;
		},
		clearUploadData: () => initialState,
		resetUpload: () => initialState,
	},
});

export const {
	videoUploading,
	taskEnqueued,
	taskProgressUpdated,
	taskCompleted,
	taskFailed,
	moderationRejected,
	resultAcknowledged,
	startUpload,
	setProcessing,
	setUploadResult,
	setUploadError,
	setShowRating,
	finishUpload,
	clearUploadData,
	resetUpload,
} = uploadSlice.actions;

export default uploadSlice.reducer;
