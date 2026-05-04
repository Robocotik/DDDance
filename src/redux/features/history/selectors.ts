import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../store';

const selectHistoryState = (state: RootState) => state.history;

export const selectHistoryItems = createSelector(
    selectHistoryState,
    (history) => history?.items ?? []
);

export const selectHistoryLoading = createSelector(
    selectHistoryState,
    (history) => history?.loading ?? false
);

export const selectHistoryError = createSelector(
    selectHistoryState,
    (history) => history?.error ?? null
);