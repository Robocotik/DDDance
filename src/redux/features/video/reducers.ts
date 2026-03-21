import VideoActionTypes from "./actionTypes";
import type { UploadVideoResult, VideoAction } from "./actions";

export interface VideoState {
  status: "idle" | "loading" | "loaded" | "error";
  result?: UploadVideoResult;
  error?: string;
}

const initialState: VideoState = {
  status: "idle",
  result: undefined,
  error: undefined,
};

export const videoReducer = (
  state = initialState,
  action: VideoAction
): VideoState => {
  switch (action.type) {
    case VideoActionTypes.VIDEO_UPLOAD_LOADING:
      return { ...state, status: "loading", error: undefined };

    case VideoActionTypes.VIDEO_UPLOAD_LOADED:
      return { ...state, status: "loaded", result: action.payload, error: undefined };

    case VideoActionTypes.VIDEO_UPLOAD_ERROR:
      return { ...state, status: "error", error: action.payload };

    case VideoActionTypes.CLEAR_VIDEO:
      return { ...initialState };

    default:
      return state;
  }
};