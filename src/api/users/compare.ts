import http from '../http';

export type CompareResponse = {
	user_glb_key: string;
	reference_glb_key: string;
	score: number;
	dtw_distance: number;
	dance_id: string;
	user_dance_id: string;
};

export type RatePayload = {
	video_id: string;
	physical: number;
	speed: number;
	coordination: number;
	repeatability: number;
};

export type RateResponse = {
	video_id: string;
	avg_physical: number;
	avg_speed: number;
	avg_coordination: number;
	avg_repeatability: number;
	avg_score: number;
	total_ratings: number;
};

export const compareDance = async (
	videoBlob: Blob,
	referenceDanceId: string,
	options?: { signal?: AbortSignal },
): Promise<CompareResponse> => {
	const formData = new FormData();

	const filename = videoBlob.type?.includes('webm')
		? 'recording.webm'
		: 'recording.mp4';
	const mimeType = videoBlob.type || 'video/mp4';

	const file = new File([videoBlob], filename, { type: mimeType });

	formData.append('dance', file);
	formData.append('reference_dance_id', referenceDanceId);

	const response = await http.post<CompareResponse>(
		'/users/dance/compare-upload',
		formData,
		{
			signal: options?.signal,
			headers: {
				'Content-Type': undefined,
			},
		},
	);
	return response.data;
};

export const rateDance = async (
	payload: RatePayload,
): Promise<RateResponse> => {
	const response = await http.post<RateResponse>('/users/dance/rate', payload);
	return response.data;
};

export const getRating = async (danceId: string): Promise<RateResponse> => {
	const response = await http.get<RateResponse>(
		`/users/dance/rate?dance_id=${danceId}`,
	);
	return response.data;
};
