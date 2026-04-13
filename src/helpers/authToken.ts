const AUTH_TOKEN_KEY = 'dddance_auth_token';

const isBrowser = typeof window !== 'undefined';

const getCookieValue = (key: string) => {
	if (!isBrowser) {
		return null;
	}

	const cookieRow = document.cookie
		.split('; ')
		.find((cookie) => cookie.startsWith(`${key}=`));

	if (!cookieRow) {
		return null;
	}

	return decodeURIComponent(cookieRow.split('=')[1] ?? '');
};

export const getAuthToken = () => {
	if (!isBrowser) {
		return null;
	}

	return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = (token: string) => {
	if (!isBrowser) {
		return;
	}

	localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
	if (!isBrowser) {
		return;
	}

	localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const getJwtFromCookies = () => {
	return getCookieValue('DDFilmsJWT');
};

export const getCsrfTokenFromCookies = () => {
	return getCookieValue('DDFilmsCSRF');
};
