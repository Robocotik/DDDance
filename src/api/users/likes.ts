import http from '../http';

const path = '/users/likes';

export type LikeItem = {
	history_id: string;
	dance_id: string;
	created_at: string;
	name: string;
};

export type LikesResponse = {
	likes: LikeItem[];
	count: number;
};

export const getLikes = async (): Promise<LikesResponse> => {
	const response = await http.get<LikesResponse>(path);
	return response.data;
};

export const toggleLike = async (danceId: string): Promise<void> => {
	await http.post(`/users/dance/${danceId}/like`);
};

export const updateLikeName = async (historyId: string, newName: string): Promise<void> => {
	await http.put(`/users/history/${historyId}`, { name: newName });
};