import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BaseAuthResponse } from '../../../api/auth/register';

export interface UserState {
	user: BaseAuthResponse | null;
	loading: boolean;
	error: string | null;
	isAuthChecked: boolean;
}

const initialState: UserState = {
	user: null,
	loading: false,
	error: null,
	isAuthChecked: false,
};

const userSlice = createSlice({
	name: 'user',
	initialState,
	reducers: {
		setUser: (state, action: PayloadAction<BaseAuthResponse>) => {
			state.user = action.payload;
			state.error = null;
			state.loading = false;
			state.isAuthChecked = true;
		},
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload;
		},
		setError: (state, action: PayloadAction<string>) => {
			state.error = action.payload;
			state.loading = false;
			state.isAuthChecked = true;
		},
		clearUser: (state) => {
			state.user = null;
			state.error = null;
			state.loading = false;
			state.isAuthChecked = true;
		},
	},
});

export const { setUser, setLoading, setError, clearUser } = userSlice.actions;
export default userSlice.reducer;
