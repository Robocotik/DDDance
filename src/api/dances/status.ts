import http from '../http';

export interface DanceModerationStatus {
	dance_id: string;
	status: string;
	moderation_reason: string;
}

export const getDanceModerationStatus = async (
	danceId: string,
): Promise<DanceModerationStatus> => {
	const res = await http.get<DanceModerationStatus>(
		`/dances/${danceId}/status`,
	);

	return res.data;
};
