const isBrowser = typeof window !== 'undefined';

const getCookieValue = (key: string) => {
	if (!isBrowser) return null;
	const cookieRow = document.cookie
		.split('; ')
		.find((cookie) => cookie.startsWith(`${key}=`));
	if (!cookieRow) return null;
	return decodeURIComponent(cookieRow.slice(cookieRow.indexOf('=') + 1));
};

// JWT хранится в HttpOnly-куке DDFilmsJWT и отправляется браузером
// автоматически (withCredentials). Из JS он намеренно недоступен.
// CSRF-токен — не HttpOnly, его читаем и шлём заголовком X-Csrf-Token.
export const getCsrfTokenFromCookies = () => getCookieValue('DDFilmsCSRF');
