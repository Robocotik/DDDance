import type { BaseAuthResponse } from '@/api/auth/register';
import http from '../http';
import type { FriendshipStatus } from './friends';
import type { UploadedDance } from './uploadedDances';

export type UpdateProfilePayload = {
	login?: string;
	avatar?: File;
};

export interface TelegramLinkCode {
	code: string;
	deep_link: string;
	expires_in: number;
}

// Issues a one-time code to link the current user's Telegram account in the bot.
export const getTelegramLinkCode = async (): Promise<TelegramLinkCode> => {
	const response = await http.post<TelegramLinkCode>('/users/me/telegram-code');
	return response.data;
};

export const updateProfile = async (
	payload: UpdateProfilePayload,
): Promise<BaseAuthResponse> => {
	const formData = new FormData();

	if (typeof payload.login === 'string') {
		formData.append('login', payload.login);
	}

	if (payload.avatar) {
		formData.append('avatar', payload.avatar);
	}

	const response = await http.put<BaseAuthResponse>(
		'/users/profile',
		formData,
		{
			headers: { 'Content-Type': undefined },
		},
	);

	return response.data;
};

export type SavedAttemptItem = {
	dance_id: string;
	user_dance_id: string;
	dance_title: string;
	user_name: string;
	is_private: boolean;
	score: number;
	saved_at: string;
	reference_video_key: string;
	user_animation_key: string;
	user_skeleton_key: string;
	user_video_key?: string;
	has_video: boolean;
};

export type PersonalTopItem = {
	dance_id: string;
	user_dance_id: string;
	dance_title: string;
	user_name: string;
	best_score: number;
	achieved_at: string;
};

export type PublicProfileUser = {
	id: string;
	login: string;
	avatar: string;
	updated_at: string;
};

export type ProfileStats = {
	attempt_count: number;
	max_score: number;
	unique_dance_count: number;
	duel_win_count: number;
	upload_count: number;
};

export type PublicProfileResponse = {
	user: PublicProfileUser;
	saved_attempts: SavedAttemptItem[];
	uploaded_dances?: UploadedDance[];
	personal_top: PersonalTopItem[];
	is_own_profile: boolean;
	friends_count?: number;
	friendship_status?: FriendshipStatus;
	stats?: ProfileStats;
};

export const getPublicProfile = async (
	userId: string,
): Promise<PublicProfileResponse> => {
	const response = await http.get<PublicProfileResponse>(
		`/users/${userId}/profile`,
	);

	return response.data;
};

export const getSavedDances = async (): Promise<SavedAttemptItem[]> => {
	const response = await http.get<SavedAttemptItem[]>('/users/saved-dances');
	return response.data;
};

export type UserAttemptItem = {
	attempt_id: string;
	dance_id: string;
	dance_title: string;
	score: number;
	created_at: string;
	is_saved: boolean;
	is_open: boolean;
	user_name: string;
	rank?: number;
	total_dancers?: number;
};

export const getUserAttempts = async (): Promise<UserAttemptItem[]> => {
	const response = await http.get<UserAttemptItem[]>('/users/attempts');
	return response.data;
};

export const saveAttemptToProfile = async (
	attemptId: string,
	danceId: string,
	options?: {
		includeVideo?: boolean;
		score?: number;
		timingScore?: number;
		amplitudeScore?: number;
		poseScore?: number;
		userName?: string;
		isPrivate?: boolean;
		submitToDuels?: boolean;
	},
): Promise<void> => {
	const body: {
		dance_id: string;
		include_video: boolean;
		score?: number;
		timing_score?: number;
		amplitude_score?: number;
		pose_score?: number;
		user_name?: string;
		is_private?: boolean;
		submit_to_duels?: boolean;
	} = {
		dance_id: danceId,
		include_video: !!options?.includeVideo,
	};

	if (typeof options?.score === 'number' && Number.isFinite(options.score)) {
		body.score = options.score;
	}

	if (
		typeof options?.timingScore === 'number' &&
		Number.isFinite(options.timingScore)
	) {
		body.timing_score = options.timingScore;
	}

	if (
		typeof options?.amplitudeScore === 'number' &&
		Number.isFinite(options.amplitudeScore)
	) {
		body.amplitude_score = options.amplitudeScore;
	}

	if (
		typeof options?.poseScore === 'number' &&
		Number.isFinite(options.poseScore)
	) {
		body.pose_score = options.poseScore;
	}

	if (typeof options?.userName === 'string') {
		body.user_name = options.userName;
	}

	if (typeof options?.isPrivate === 'boolean') {
		body.is_private = options.isPrivate;
	}

	if (options?.submitToDuels) {
		body.submit_to_duels = true;
	}

	await http.post(`/users/dance/${attemptId}/save`, body);
};

export const unsaveAttemptFromProfile = async (
	attemptId: string,
): Promise<void> => {
	await http.delete(`/users/dance/${attemptId}/save`);
};

export type DanceProgressEntry = {
	attempt_id: string;
	score: number;
	created_at: string;
};

export const getDanceProgress = async (
	danceId: string,
	signal?: AbortSignal,
): Promise<DanceProgressEntry[]> => {
	const response = await http.get<DanceProgressEntry[]>(
		`/dances/${danceId}/my-progress`,
		{ signal },
	);

	return response.data;
};

export type ActivityEntry = {
	day: string;
	count: number;
};

export const getUserActivity = async (
	userId: string,
	signal?: AbortSignal,
): Promise<ActivityEntry[]> => {
	const response = await http.get<ActivityEntry[]>(
		`/users/${userId}/activity`,
		{ signal },
	);

	return response.data;
};

export type MostImprovedDance = {
	dance_id: string;
	title: string;
	first_score: number;
	last_score: number;
	delta: number;
};

export const getMostImprovedDance =
	async (): Promise<MostImprovedDance | null> => {
		const response = await http.get<MostImprovedDance | null>(
			'/users/me/most-improved',
		);

		return response.data;
	};

export type CreatorDailyStat = {
	day: string;
	views: number;
	likes: number;
	attempts: number;
};

export type CreatorTopDance = {
	dance_id: string;
	title: string;
	attempts: number;
	likes: number;
};

export type CreatorAnalytics = {
	daily: CreatorDailyStat[];
	top_dances: CreatorTopDance[];
};

export const getCreatorAnalytics = async (
	signal?: AbortSignal,
): Promise<CreatorAnalytics> => {
	const response = await http.get<CreatorAnalytics>('/users/creator-stats', {
		signal,
	});

	return response.data;
};

export type WeakSpots = {
	worst_metric: 'timing' | 'amplitude' | 'pose';
	avg: number;
	suggestion: string;
};

export const getWeakSpots = async (): Promise<WeakSpots | null> => {
	const response = await http.get<WeakSpots | null>('/users/me/weak-spots');
	return response.data;
};
