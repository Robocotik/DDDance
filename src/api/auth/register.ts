import http from '../http';

const path = '/auth/signup';

export type BaseAuthResponse = {
	avatar: string;
	created_at: string;
	has_2fa: boolean;
	id: string;
	is_foreign: boolean;
	login: string;
	updated_at: string;
	version: number;
};

export type RegisterPayload = {
	login: string;
	password: string;
};

export type RegisterResponse = BaseAuthResponse;

export const registerUser = async (payload: RegisterPayload) => {
	const response = await http.post<RegisterResponse>(path, payload);
	return response.data;
};
