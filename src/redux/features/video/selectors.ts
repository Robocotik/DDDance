import type { RootState } from '../../store';
import type { UploadVideoResult } from './actions';

export const selectResult = (state: RootState): UploadVideoResult | null =>
	state.video.result;

export const selectResultError = (state: RootState): string | null =>
	state.video.resultError;

export const selectResultLoading = (state: RootState): boolean =>
	state.video.resultLoading;
