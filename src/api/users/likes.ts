import http from '../http';

const path = '/users/likes';

export type LikeItem = {
	dance_id: string;
	created_at: string;
    name?: string;
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

export const updateLikeName = async (danceId: string, newName: string): Promise<void> => {
	const response = await fetch(`/api/users/dance/${danceId}/like`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ name: newName }),
	});

	if (!response.ok) {
		throw new Error('Failed to update like name');
	}
};