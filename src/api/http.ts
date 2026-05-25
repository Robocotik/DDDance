import { getCsrfTokenFromCookies } from '@/helpers/authToken';
import axios from 'axios';

const http = axios.create({
	baseURL: import.meta.env.VITE_BACKEND_BASE_URL ?? 'http://localhost:5458/api',
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Аутентификация — через HttpOnly-куку JWT (шлётся автоматически благодаря
// withCredentials). Здесь добавляем только CSRF-токен.
http.interceptors.request.use((config) => {
	const csrfToken = getCsrfTokenFromCookies();
	if (csrfToken) {
		config.headers['X-Csrf-Token'] = csrfToken;
	}
	return config;
});

export default http;
