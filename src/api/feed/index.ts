import http from '../http';

export interface FeedItem {
	id: string;
	action_type: string;
	metadata: Record<string, unknown>;
	created_at: string;
	actor_login: string;
	actor_avatar: string;
	dance_title?: string;
}

export interface FeedResponse {
	items: FeedItem[];
	next_cursor?: string;
}

export const getFeed = async (
	limit = 20,
	cursor?: string,
	signal?: AbortSignal,
): Promise<FeedResponse> => {
	const params: Record<string, string | number> = { limit };

	if (cursor) {
		params.cursor = cursor;
	}

	const response = await http.get<FeedResponse>('/users/me/feed', {
		params,
		signal,
	});

	return response.data;
};
