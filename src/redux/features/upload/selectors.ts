import type { RootState } from '../../store';

export const selectUploadState = (state: RootState) => state.upload;

export const selectIsUploading = (state: RootState) => state.upload.isUploading;

export const selectIsProcessing = (state: RootState) =>
	state.upload.isProcessing;

export const selectUploadError = (state: RootState) => state.upload.error;

export const selectUserDanceId = (state: RootState) => state.upload.userDanceId;

export const selectShowRating = (state: RootState) => state.upload.showRating;

export const selectTaskId = (state: RootState) => state.upload.taskId;

export const selectTaskType = (state: RootState) => state.upload.taskType;

export const selectTaskProgress = (state: RootState) => state.upload.progress;

export const selectTaskStageName = (state: RootState) => state.upload.stageName;

export const selectTaskStatus = (state: RootState) => state.upload.taskStatus;

export const selectResultReady = (state: RootState) => state.upload.resultReady;

export const selectModerationFailed = (state: RootState) =>
	state.upload.moderationFailed;

export const selectModerationReason = (state: RootState) =>
	state.upload.moderationReason;

export const selectCompareResult = (state: RootState) =>
	state.upload.compareResult;

export const selectUploadDanceResult = (state: RootState) =>
	state.upload.uploadResult;

export const selectTaskDanceId = (state: RootState) => state.upload.danceId;
