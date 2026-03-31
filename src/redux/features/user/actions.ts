import { checkAuth } from '@/api/auth/check';
import type { AppDispatch } from '@/redux/store';
import { clearUser, setError, setLoading, setUser } from './userSlice';

export const checkAuthStatus = () => async (dispatch: AppDispatch) => {
	dispatch(setLoading(true));

	try {
		const user = await checkAuth();
		dispatch(setUser(user));
	} catch (error) {
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
