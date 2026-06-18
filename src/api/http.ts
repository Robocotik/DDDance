import { getCsrfTokenFromCookies } from '@/helpers/authToken';
import { clearVkAuthUser } from '@/helpers/vkIdSession';
import axios from 'axios';

const http = axios.create({
	baseURL: import.meta.env.VITE_BACKEND_BASE_URL ?? 'http://localhost:5458/api',
	withCredentials: true,
	timeout: 30_000,
	headers: {
		'Content-Type': 'application/json',
	},
});

http.interceptors.request.use((config) => {
	const csrfToken = getCsrfTokenFromCookies();

	if (csrfToken) {
		config.headers['X-Csrf-Token'] = csrfToken;
	}

	return config;
});

const AUTH_AGNOSTIC_ENDPOINTS = [
	'/auth/check',
	'/auth/signin',
	'/auth/signup',
	'/auth/vk',
];

http.interceptors.response.use(
	(response) => response,
	(error) => {
		const status = error?.response?.status;
		const url: string = error?.config?.url ?? '';
		const isAuthAgnostic = AUTH_AGNOSTIC_ENDPOINTS.some((e) => url.includes(e));

		if (status === 401 && !isAuthAgnostic) {
			try {
				clearVkAuthUser();
				localStorage.removeItem('dddance_auth_token');
			} catch {}

			import('@/redux/store').then(({ store }) => {
				import('@/redux/features/user/userSlice').then(({ clearUser }) => {
					store.dispatch(clearUser());
				});
			});
		}

		return Promise.reject(error);
	},
);

export default http;
