import type { Difficulty } from '../../consts/danceDifficulty';
import http from '../http';

export type UploadedDanceStatus =
	| 'pending'
	| 'processing'
	| 'private'
	| 'published'
	| 'rejected';

export interface UploadedDance {
	dance_id: string;
	title: string;
	status: UploadedDanceStatus;
	video_path: string;
	uploaded_at: string;
	difficulty?: Difficulty;
	difficulty_by_users?: boolean;
	attempt_count?: number;
	avg_score?: number;
	like_count?: number;
	view_count?: number;
}

export const getUploadedDances = async (): Promise<UploadedDance[]> => {
	const response = await http.get<UploadedDance[]>('/users/uploaded-dances');
	return response.data ?? [];
};

export const setDanceName = async (
	danceId: string,
	title: string,
	publish: boolean,
	difficulty?: string,
): Promise<void> => {
	const body: { title: string; publish: boolean; difficulty?: string } = {
		title,
		publish,
	};

	if (difficulty) {
		body.difficulty = difficulty;
	}

	await http.post(`/users/dance/${danceId}/name`, body);
};

export const publishDance = async (danceId: string): Promise<void> => {
	await http.post(`/users/dance/${danceId}/publish`);
};

export const unpublishDance = async (danceId: string): Promise<void> => {
	await http.post(`/users/dance/${danceId}/unpublish`);
};

export const deleteDance = async (danceId: string): Promise<void> => {
	await http.delete(`/users/dance/${danceId}`);
};
