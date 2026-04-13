import type { BaseAuthResponse } from '@/api/auth/register';

const VK_AUTH_USER_KEY = 'dddance_vk_auth_user';

const isBrowser = typeof window !== 'undefined';

export const saveVkAuthUser = (user: BaseAuthResponse) => {
	if (!isBrowser) {
		return;
	}

	localStorage.setItem(VK_AUTH_USER_KEY, JSON.stringify(user));
};

export const getVkAuthUser = () => {
	if (!isBrowser) {
		return null;
	}

	const rawUser = localStorage.getItem(VK_AUTH_USER_KEY);

	if (!rawUser) {
		return null;
	}

	try {
		return JSON.parse(rawUser) as BaseAuthResponse;
	} catch {
		return null;
	}
};

export const clearVkAuthUser = () => {
	if (!isBrowser) {
		return;
	}

	localStorage.removeItem(VK_AUTH_USER_KEY);
};
