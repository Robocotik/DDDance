import http from '../http';

export interface UserSearchItem {
	id: string;
	login: string;
	avatar: string;
}

export const searchUsers = async (
	q: string,
	signal?: AbortSignal,
): Promise<UserSearchItem[]> => {
	const res = await http.get<UserSearchItem[]>('/users/search', {
		params: { q },
		signal,
	});

	return res.data ?? [];
};
