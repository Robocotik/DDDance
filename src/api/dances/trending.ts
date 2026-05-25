import http from '../http';

export interface TrendingItem {
	id: string;
	url: string;
	title?: string;
	attempt_count?: number;
	avg_score?: number;
	view_count?: number;
	like_count?: number;
}

export interface TrendingResponse {
	count: number;
	videos: TrendingItem[];
}

export const getTrendingWeek = async (): Promise<TrendingResponse> => {
	const response = await http.get<TrendingResponse>('/dances/trending');
	return response.data;
};
