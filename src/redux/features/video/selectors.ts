import type { RootState } from '../../store';
import type { UploadVideoResult } from './actions';

export const selectVideo = (
	state: RootState,
): UploadVideoResult | null => state.video.video;

export const selectVideoError = (state: RootState): string | null =>
	state.video.videoError;

export const selectVideoLoading = (state: RootState): boolean =>
	state.video.videoLoading;