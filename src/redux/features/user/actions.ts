import { checkAuth } from '@/api/auth/check';
import { logout } from '@/api/auth/logout';
import { clearAuthToken } from '@/helpers/authToken';
import { clearVkAuthUser, getVkAuthUser } from '@/helpers/vkIdSession';
import type { AppDispatch } from '@/redux/store';
import { clearUser, setError, setLoading, setUser } from './userSlice';

export const checkAuthStatus = () => async (dispatch: AppDispatch) => {
	dispatch(setLoading(true));

	try {
		const user = await checkAuth();
		// const user = baseAuthResponseMock;
		dispatch(setUser(user));
	} catch (error) {
		const vkUser = getVkAuthUser();

		if (vkUser) {
			dispatch(setUser(vkUser));
			return;
		}

		dispatch(clearUser());

		if (
			typeof error === 'object' &&
			error !== null &&
			'response' in error &&
			typeof error.response === 'object' &&
			error.response !== null &&
			'status' in error.response &&
			error.response.status === 500
		) {
			dispatch(setError('Internal Server Error'));
		}
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

		if (
			typeof error === 'object' &&
			error !== null &&
			'response' in error &&
			typeof error.response === 'object' &&
			error.response !== null &&
			'status' in error.response &&
			error.response.status === 500
		) {
			dispatch(setError('Internal Server Error'));
			return;
		}

		dispatch(setError('Не удалось выйти из профиля'));
	}
};
