import { getCsrfTokenFromCookies } from '@/helpers/authToken';
import { clearVkAuthUser } from '@/helpers/vkIdSession';
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

// Эндпоинты, для которых 401 — норма (не залогинен → не считаем за «протухла сессия»).
// Если бить тут /auth/check ножом по Redux'у, на старте у анона мигнёт «вылогинили».
const AUTH_AGNOSTIC_ENDPOINTS = ['/auth/check', '/auth/signin', '/auth/signup', '/auth/vk'];

// Если JWT в куке протух за время открытой вкладки — сервер начнёт возвращать 401
// на каждом запросе. Старое поведение: Redux user остаётся заполненным, юзер
// видит себя залогиненым, но ничего не работает. Теперь: ловим 401 и чистим
// клиентскую сессию. SPA после этого либо покажет анон-шапку, либо страница
// сама перенаправит на /login.
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
			} catch {
				/* localStorage может быть недоступен */
			}
			// Lazy import редакса, чтобы не делать циклические зависимости.
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
