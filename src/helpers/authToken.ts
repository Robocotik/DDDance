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

	return decodeURIComponent(cookieRow.slice(cookieRow.indexOf('=') + 1));
};

export const getCsrfTokenFromCookies = () => getCookieValue('DDDanceCSRF');
