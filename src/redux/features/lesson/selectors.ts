import type { RootState } from '../../store';
import type { UploadLessonResult } from './actions';

export const selectLesson = (state: RootState): UploadLessonResult | null =>
	state.video.result;

export const selectLessonError = (state: RootState): string | null =>
	state.video.resultError;

export const selectLessonLoading = (state: RootState): boolean =>
	state.video.resultLoading;
