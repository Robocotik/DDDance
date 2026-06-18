import http from '../http';

export type ReelItem = {
	dance_id: string;
	title: string;
	uploader_id: string;
	username: string;
	avatar_url: string;
	video_url: string;
	preview_url: string;
	view_count: number;
	like_count: number;
	avg_score: number;
	attempt_count: number;
	user_liked: boolean;
};

export type ReelsFeedResponse = {
	items: ReelItem[];
	total: number;
};

export type BehaviorAction = 'watched_full' | 'skipped_fast' | 'attempted';

export type BehaviorLogEntry = {
	dance_id: string;
	action: BehaviorAction;
	timestamp: number;
};

export type GetReelsFeedParams = {
	limit?: number;
	offset?: number;
	excludeIds?: string[];
	behaviorLog?: BehaviorLogEntry[];
};

export const getReelsFeed = async (
	params: GetReelsFeedParams = {},
): Promise<ReelsFeedResponse> => {
	const query: Record<string, string> = {};

	if (params.limit != null) {
		query.limit = String(params.limit);
	}

	if (params.offset != null) {
		query.offset = String(params.offset);
	}

	if (params.excludeIds && params.excludeIds.length > 0) {
		query.exclude_ids = params.excludeIds.join(',');
	}

	if (params.behaviorLog && params.behaviorLog.length > 0) {
		query.behavior_log = JSON.stringify(params.behaviorLog);
	}

	const response = await http.get<ReelsFeedResponse>('/reels', {
		params: query,
	});

	return response.data;
};

export const markDanceViewed = async (
	danceId: string,
): Promise<{ view_count: number }> => {
	const response = await http.post<{ view_count: number }>(
		`/dances/${danceId}/view`,
	);

	return response.data;
};

export type ReelsAttemptItem = {
	attempt_id: string;
	dance_id: string;
	dance_title: string;
	user_id: string;
	user_login: string;
	user_avatar: string;
	score: number;
	video_key: string;
};

export const getReelsAttempts = async (
	limit = 20,
	offset = 0,
	signal?: AbortSignal,
): Promise<ReelsAttemptItem[]> => {
	const response = await http.get<ReelsAttemptItem[]>('/reels/attempts', {
		params: { limit, offset },
		signal,
	});

	return response.data;
};
