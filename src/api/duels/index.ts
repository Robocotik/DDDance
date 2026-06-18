import http from '../http';

export type DuelMode = 'single_dance' | 'random_dance';

export type DuelStatus =
	| 'pending'
	| 'active'
	| 'challenger_done'
	| 'opponent_done'
	| 'completed'
	| 'expired'
	| 'declined';

export interface Duel {
	id: string;
	mode: DuelMode;
	challenger_id: string;
	opponent_id: string;
	dance_id?: string;
	status: DuelStatus;
	challenger_attempt_id?: string;
	opponent_attempt_id?: string;
	challenger_score?: number;
	opponent_score?: number;
	winner_id?: string;
	expires_at: string;
	created_at: string;
	completed_at?: string;
	is_public?: boolean;
}

export interface DuelWithUsers extends Duel {
	challenger_login: string;
	challenger_avatar: string;
	opponent_login: string;
	opponent_avatar: string;
	dance_title?: string;
	invite_token?: string;
}

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	has_more: boolean;
}

export interface DuelHistoryResponse {
	duels: DuelWithUsers[];
	pagination: PaginationMeta;
}

export interface CreateDuelRequest {
	opponent_id: string;
	mode: DuelMode;
	dance_id?: string;
}

export const createDuel = async (
	req: CreateDuelRequest,
): Promise<DuelWithUsers> => {
	const response = await http.post<DuelWithUsers>('/duels', req);
	return response.data;
};

export const acceptDuel = async (duelId: string): Promise<DuelWithUsers> => {
	const response = await http.post<DuelWithUsers>(`/duels/${duelId}/accept`);
	return response.data;
};

export const declineDuel = async (duelId: string): Promise<void> => {
	await http.post(`/duels/${duelId}/decline`);
};

export const getDuelHistory = async (
	limit = 20,
	offset = 0,
): Promise<DuelHistoryResponse> => {
	const response = await http.get<DuelHistoryResponse>('/duels', {
		params: { limit, offset },
	});

	return { ...response.data, duels: response.data.duels ?? [] };
};

export const getDuelById = async (duelId: string): Promise<DuelWithUsers> => {
	const response = await http.get<DuelWithUsers>(`/duels/${duelId}`);
	return response.data;
};

export interface ActiveDuelForDance {
	duel_id: string;
	opponent_login: string;
}

export const getActiveDuelsForDance = async (
	danceId: string,
	signal?: AbortSignal,
): Promise<ActiveDuelForDance[]> => {
	const response = await http.get<ActiveDuelForDance[]>('/duels/active', {
		params: { dance_id: danceId },
		signal,
	});

	return response.data ?? [];
};

export const submitAttemptToDuels = async (
	attemptId: string,
	danceId: string,
): Promise<void> => {
	await http.post('/duels/submit', {
		attempt_id: attemptId,
		dance_id: danceId,
	});
};

export interface DuelStats {
	total: number;
	wins: number;
	avg_score: number;
	win_rate: number;
}

export const getDuelStats = async (): Promise<DuelStats> => {
	const response = await http.get<DuelStats>('/duels/stats');
	return response.data;
};

export const getPublicDuels = async (
	limit = 20,
	offset = 0,
): Promise<DuelHistoryResponse> => {
	const response = await http.get<DuelHistoryResponse>('/duels/public', {
		params: { limit, offset },
	});

	return response.data;
};
