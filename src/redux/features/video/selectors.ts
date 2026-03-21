import type { RootState } from "../../store";

export const selectVideoStatus = (state: RootState) => state.video.status;
export const selectVideoResult = (state: RootState) => state.video.result;
export const selectVideoError = (state: RootState) => state.video.error;