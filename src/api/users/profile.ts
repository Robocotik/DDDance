import type { BaseAuthResponse } from '@/api/auth/register';
import type { FriendshipStatus } from './friends';
import http from '../http';

export type UpdateProfilePayload = {
	login?: string;
	avatar?: File;
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

	const response = await http.put<BaseAuthResponse>('/users/profile', formData, {
		headers: { 'Content-Type': undefined },
	});
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
	best_score: number;
	achieved_at: string;
};

export type PublicProfileUser = {
	id: string;
	login: string;
	avatar: string;
	updated_at: string;
};

export type PublicProfileResponse = {
	user: PublicProfileUser;
	saved_attempts: SavedAttemptItem[];
	personal_top: PersonalTopItem[];
	is_own_profile: boolean;
	friends_count?: number;
	friendship_status?: FriendshipStatus;
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
		userName?: string;
		isPrivate?: boolean;
	},
): Promise<void> => {
	// score прокидываем, чтобы бэк мог записать attempt задним числом,
	// если юзер делал compare анонимно и зарегистрировался уже после.
	const body: {
		dance_id: string;
		include_video: boolean;
		score?: number;
		user_name?: string;
		is_private?: boolean;
	} = {
		dance_id: danceId,
		include_video: !!options?.includeVideo,
	};
	if (typeof options?.score === 'number' && Number.isFinite(options.score)) {
		body.score = options.score;
	}
	if (typeof options?.userName === 'string') {
		body.user_name = options.userName;
	}
	if (typeof options?.isPrivate === 'boolean') {
		body.is_private = options.isPrivate;
	}
	await http.post(`/users/dance/${attemptId}/save`, body);
};

export const unsaveAttemptFromProfile = async (
	attemptId: string,
): Promise<void> => {
	await http.delete(`/users/dance/${attemptId}/save`);
};
