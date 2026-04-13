import http from '../http';

const path = '/auth/logout';

export const logout = async () => {
	await http.post(path);
};
