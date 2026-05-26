import { checkAuth } from '@/api/auth/check';
import { logout } from '@/api/auth/logout';
import { updateProfile, type UpdateProfilePayload } from '@/api/users/profile';
import { getAuthErrorMessage } from '@/helpers/getAuthErrorMessage';
import { clearVkAuthUser } from '@/helpers/vkIdSession';
import type { AppDispatch } from '@/redux/store';
import { clearUser, setError, setLoading, setUser } from './userSlice';

export const checkAuthStatus = () => async (dispatch: AppDispatch) => {
	dispatch(setLoading(true));

	try {
		const user = await checkAuth();
		dispatch(setUser(user));
	} catch (error) {
		// /auth/check упал → реальной сессии нет. Раньше тут подставлялся
		// закэшированный VK-user из localStorage, и юзер «отображался
		// зарегистрированным», хотя cookie была мертва — все запросы
		// возвращали 401. Чистим всё.
		clearVkAuthUser();
		dispatch(clearUser());
	}
};

export const logoutUser = () => async (dispatch: AppDispatch) => {
	dispatch(setLoading(true));

	try {
		await logout();
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
			clearVkAuthUser();
			dispatch(clearUser());
			return;
		}

		const errorMessage = getAuthErrorMessage(error);
		dispatch(setError(errorMessage));
	}
};

export const updateUserProfile =
	(payload: UpdateProfilePayload) => async (dispatch: AppDispatch) => {
		const updated = await updateProfile(payload);
		dispatch(setUser(updated));
		return updated;
	};
