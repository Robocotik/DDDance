import type { RootState } from '../../store';
import type { TrendVideos } from './actions';

export const selectTrends = (state: RootState): TrendVideos | null =>
	state.trends.result;

export const selectTrendsError = (state: RootState): string | null =>
	state.trends.resultError;

export const selectTrendsLoading = (state: RootState): boolean =>
	state.trends.resultLoading;
