import http from '../http';

const path = '/users/likes';

export type LikeItem = {
	history_id: string;
	dance_id: string;
	created_at: string;
	// name — пользовательская метка из истории, dance_title — fallback на оригинал.
	name: string;
	dance_title?: string;
};

export type LikesResponse = {
	likes: LikeItem[];
};

export type LikeResponse = {
	dance_id: string;
	liked: boolean;
	likes_count: number;
};

export const getLikes = async (): Promise<LikesResponse> => {
	const response = await http.get<LikesResponse>(path);
	return response.data;
};

export const toggleLike = async (danceId: string): Promise<LikeResponse> => {
	const response = await http.post<LikeResponse>(`/users/dance/${danceId}/like`);
	return response.data;
};
