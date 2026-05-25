import http from '../http';

export interface DanceModerationStatus {
	dance_id: string;
	status: string;
	moderation_reason: string;
}

// Публичный эндпоинт: позволяет анонимному пользователю отследить судьбу
// своей загрузки (processing / pending / private / published / rejected).
export const getDanceModerationStatus = async (
	danceId: string,
): Promise<DanceModerationStatus> => {
	const res = await http.get<DanceModerationStatus>(
		`/dances/${danceId}/status`,
	);
	return res.data;
};
