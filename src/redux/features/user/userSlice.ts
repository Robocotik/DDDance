import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BaseAuthResponse } from '../../../api/auth/register';

export interface UserState {
	user: BaseAuthResponse | null;
	loading: boolean;
	error: string | null;
}

const initialState: UserState = {
	user: null,
	loading: false,
	error: null,
};

const userSlice = createSlice({
	name: 'user',
	initialState,
	reducers: {
		setUser: (state, action: PayloadAction<BaseAuthResponse>) => {
			state.user = action.payload;
			state.error = null;
			state.loading = false;
		},
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload;
		},
		setError: (state, action: PayloadAction<string>) => {
			state.error = action.payload;
			state.loading = false;
		},
		clearUser: (state) => {
			state.user = null;
			state.error = null;
			state.loading = false;
		},
	},
});

export const { setUser, setLoading, setError, clearUser } = userSlice.actions;
export default userSlice.reducer;
