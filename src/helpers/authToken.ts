const AUTH_TOKEN_KEY = 'dddance_auth_token';
const isBrowser = typeof window !== 'undefined';

const getCookieValue = (key: string) => {
	if (!isBrowser) return null;
	const cookieRow = document.cookie
		.split('; ')
		.find((cookie) => cookie.startsWith(`${key}=`));
	if (!cookieRow) return null;
	return decodeURIComponent(cookieRow.split('=')[1] ?? '');
};

export const getAuthToken = () =>
	isBrowser ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
export const setAuthToken = (token: string) =>
	isBrowser && localStorage.setItem(AUTH_TOKEN_KEY, token);
export const clearAuthToken = () =>
	isBrowser && localStorage.removeItem(AUTH_TOKEN_KEY);
export const getJwtFromCookies = () => getCookieValue('DDFilmsJWT');
export const getCsrfTokenFromCookies = () => getCookieValue('DDFilmsCSRF');
