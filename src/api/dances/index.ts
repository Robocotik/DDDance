import { isAxiosError } from 'axios';

import http from '../http';

export type TimelineFrame = {
	frame_idx: number;
	timestamp_ms: number;
	hit: boolean;
	reason: 'timing' | 'amplitude' | 'pose' | null;
	timing_score: number;
	amplitude_score: number;
	pose_score: number;
};

export type Timeline = {
	fps: number;
	hit_threshold: number;
	total_user_frames: number;
	frames: TimelineFrame[];
};

export type Keyframes = {
	fps: number;
	num_frames: number;
	keyframes: { frame_idx: number; timestamp_ms: number }[];
};

export const getTimeline = async (
	danceId: string,
	userDanceId: string,
): Promise<Timeline | null> => {
	try {
		const response = await http.get<Timeline>(
			`/dances/${danceId}/users/${userDanceId}/timeline`,
		);

		return response.data;
	} catch (error: unknown) {
		if (isAxiosError(error) && error.response?.status === 404) {
			return null;
		}

		throw error;
	}
};

export const getKeyframes = async (danceId: string): Promise<Keyframes | null> => {
	try {
		const response = await http.get<Keyframes>(`/dances/${danceId}/keyframes`);

		return response.data;
	} catch (error: unknown) {
		if (isAxiosError(error) && error.response?.status === 404) {
			return null;
		}

		throw error;
	}
};

export type LeaderboardEntry = {
	rank: number;
	login: string;
	score: number;
	is_me: boolean;
	user_id: string;
	avatar?: string;
};

export type LeaderboardResponse = {
	top: LeaderboardEntry[];
	user_entry?: LeaderboardEntry;
};

export const getLeaderboard = async (
	danceId: string,
): Promise<LeaderboardResponse> => {
	const response = await http.get<LeaderboardResponse>(
		`/dances/${danceId}/leaderboard`,
	);
	return response.data;
};

export type DanceStats = {
	attempt_count: number;
	avg_score: number;
	top_score: number;
	top_user: string;
	view_count: number;
};

export const getDanceStats = async (danceId: string): Promise<DanceStats> => {
	const response = await http.get<DanceStats>(`/dances/${danceId}/stats`);
	return response.data;
};

/**
 * Идемпотентно засчитывает просмотр урока. Дедуп — на бэке по
 * (dance_id, viewer_id). viewer_id для авторизованных = user.id,
 * для анонимов — UUID из cookie `DDDanceDeviceID` (бэк ставит сам).
 * `withCredentials: true` важен, чтобы cookie долетела до сервера.
 */
export const recordDanceView = async (danceId: string): Promise<void> => {
	await http.post(`/dances/${danceId}/view`, undefined, { withCredentials: true });
};
