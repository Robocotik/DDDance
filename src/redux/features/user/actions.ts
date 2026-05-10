import { checkAuth } from '@/api/auth/check';
import { logout } from '@/api/auth/logout';
import { clearAuthToken } from '@/helpers/authToken';
import { getAuthErrorMessage } from '@/helpers/getAuthErrorMessage';
import { clearVkAuthUser, getVkAuthUser } from '@/helpers/vkIdSession';
import type { AppDispatch } from '@/redux/store';
import { clearUser, setError, setLoading, setUser } from './userSlice';

export const checkAuthStatus = () => async (dispatch: AppDispatch) => {
	dispatch(setLoading(true));

	try {
		const user = await checkAuth();
		dispatch(setUser(user));
	} catch (error) {
		const vkUser = getVkAuthUser();

		if (vkUser) {
			dispatch(setUser(vkUser));
			return;
		}

		dispatch(clearUser());
	}
};

export const logoutUser = () => async (dispatch: AppDispatch) => {
	dispatch(setLoading(true));

	try {
		await logout();
		clearAuthToken();
		clearVkAuthUser();
		dispatch(clearUser());
	} catch (error) {
		if (
			typeof error === 'object' &&
			error !== null &&
			'response' in error &&
			typeof error.response === 'object' &&
			error.response !== null &&
			'status' in error.response &&
			error.response.status === 401
		) {
			clearAuthToken();
			clearVkAuthUser();
			dispatch(clearUser());
			return;
		}

		const errorMessage = getAuthErrorMessage(error);
		dispatch(setError(errorMessage));
	}
};