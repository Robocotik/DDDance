import type { TrendVideos } from '@/redux/features/trends/actions';
import http from '../http';

export interface TopDancerEntry {
	user_id: string;
	username: string;
	avatar: string;
	avg_score: number;
	attempt_count: number;
	best_score: number;
}

export const getTopDancers = async (): Promise<TopDancerEntry[]> => {
	const response = await http.get<TopDancerEntry[]>('/top/dancers');
	return response.data;
};

export const getTopDances = async (): Promise<TrendVideos> => {
	const response = await http.get<TrendVideos>('/top/dances');
	return response.data;
};
