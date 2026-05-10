import type { RootState } from '../../store';
import type { UploadLessonResult } from './actions';
import type { SegmentsResult } from './actions';

export const selectLesson = (state: RootState): UploadLessonResult | null =>
	state.video.result;

export const selectLessonError = (state: RootState): string | null =>
	state.video.resultError;

export const selectLessonLoading = (state: RootState): boolean =>
	state.video.resultLoading;

export const selectSegments = (state: RootState): SegmentsResult | null =>
	state.video.segments;

export const selectSegmentsLoading = (state: RootState): boolean =>
	state.video.segmentsLoading;

export const selectSegmentsError = (state: RootState): string | null =>
	state.video.segmentsError;