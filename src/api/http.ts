import {
	getAuthToken,
	getCsrfTokenFromCookies,
	getJwtFromCookies,
	setAuthToken,
} from '@/helpers/authToken';
import axios from 'axios';

const http = axios.create({
	baseURL: import.meta.env.BACKEND_BASE_URL ?? 'http://localhost:5458/api',
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});

http.interceptors.request.use((config) => {
	const token = getAuthToken() ?? getJwtFromCookies();
	const csrfToken = getCsrfTokenFromCookies();

	if (token) {
		config.headers.Authorization = token.startsWith('Bearer ')
			? token
			: `Bearer ${token}`;
	}

	if (csrfToken) {
		config.headers['X-Csrf-Token'] = csrfToken;
	}

	return config;
});

http.interceptors.response.use(
	(response) => {
		const authHeader = response.headers.authorization;

		if (typeof authHeader === 'string' && authHeader.length > 0) {
			setAuthToken(authHeader);
		}

		return response;
	},
	(error) => {
		return Promise.reject(error);
	},
);

export default http;
