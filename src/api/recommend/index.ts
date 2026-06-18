import http from '../http';

export interface RecommendRequest {
	query: string;
	user_id?: string;
	history?: string[];
}

export interface RecommendDance {
	id: string;
	title: string;
	url: string;
	avg_score: number;
	view_count: number;
}

export interface RecommendResponse {
	reasoning: string;
	dances: RecommendDance[];
}

export const recommendDances = async (
	query: string,
	opts?: Pick<RecommendRequest, 'user_id' | 'history'>,
): Promise<RecommendResponse> => {
	const payload: RecommendRequest = { query, ...opts };
	const response = await http.post<RecommendResponse>('/recommend', payload);
	return response.data;
};

export const getSimilarDances = async (
	danceId: string,
): Promise<RecommendDance[]> => {
	const response = await http.get<RecommendDance[]>('/recommend/similar', {
		params: { dance_id: danceId },
	});

	return response.data ?? [];
};
