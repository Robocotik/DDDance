import http from '../http';
import type { BaseAuthResponse } from './register';

const path = '/auth/check';

export type CheckAuthResponse = BaseAuthResponse;

export const checkAuth = async () => {
	const response = await http.get<CheckAuthResponse>(path);
	return response.data;
};
