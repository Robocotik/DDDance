import http from '../http';
import type { BaseAuthResponse } from './register';

const path = '/auth/signin';

export type LoginPayload = {
	login: string;
	password: string;
	user_code?: string;
};

export type LoginResponse = BaseAuthResponse;

export const loginUser = async (payload: LoginPayload) => {
	const response = await http.post<LoginResponse>(path, payload);
	return response.data;
};
