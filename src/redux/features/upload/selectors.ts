import type { RootState } from '../../store';

export const selectUploadState = (state: RootState) => state.upload;
export const selectIsUploading = (state: RootState) => state.upload.isUploading;
export const selectIsProcessing = (state: RootState) => state.upload.isProcessing;
export const selectUploadError = (state: RootState) => state.upload.error;
export const selectUserDanceId = (state: RootState) => state.upload.userDanceId;
export const selectShowRating = (state: RootState) => state.upload.showRating;