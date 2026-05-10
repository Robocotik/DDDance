import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CompareResponse } from '@/api/users/compare';

export interface UploadState {
	isUploading: boolean;
	isProcessing: boolean;
	userDanceId: string | null;
	error: string | null;
	referenceDanceId: string | null;
	showRating: boolean;
}

const initialState: UploadState = {
	isUploading: false,
	isProcessing: false,
	userDanceId: null,
	error: null,
	referenceDanceId: null,
	showRating: false,
};

const uploadSlice = createSlice({
	name: 'upload',
	initialState,
	reducers: {
		startUpload: (state, action: PayloadAction<string>) => {
			return {
				...initialState,
				isUploading: true,
				isProcessing: true,
				referenceDanceId: action.payload,
			};
		},
		setProcessing: (state, action: PayloadAction<boolean>) => {
			state.isProcessing = action.payload;
		},
		setUploadResult: (state, action: PayloadAction<CompareResponse>) => {
			state.isProcessing = false;
			state.isUploading = false;
			state.userDanceId = action.payload.user_dance_id;
		},
		setUploadError: (state, action: PayloadAction<string>) => {
			state.error = action.payload;
			state.isProcessing = false;
		},
		setShowRating: (state, action: PayloadAction<boolean>) => {
			state.showRating = action.payload;
		},
		finishUpload: (state) => {
			state.isUploading = false;
			state.isProcessing = false;
			state.error = null;
			state.showRating = false;
		},
		clearUploadData: () => initialState,
		resetUpload: () => initialState,
	},
});

export const {
	startUpload,
	setProcessing,
	setUploadResult,
	setUploadError,
	setShowRating,
	finishUpload,
	clearUploadData,
	resetUpload,
} = uploadSlice.actions;

export default uploadSlice.reducer;