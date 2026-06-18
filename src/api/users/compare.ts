import http from '../http';

export type SegmentFeedback =
	| 'on_time'
	| 'early'
	| 'late'
	| 'low_amplitude'
	| 'not_performed';

export type SegmentDiagnostic = {
	segment_id: number;
	label: string;
	timing: number;
	amplitude: number;
	pose_accuracy: number;
	score: number;
	feedback?: SegmentFeedback;
	orig_start_frame: number;
	orig_end_frame: number;
	user_start_frame: number;
	user_end_frame: number;
	orig_start_ms: number;
	orig_end_ms: number;
	user_start_ms: number;
	user_end_ms: number;
};

export type CompareTip = {
	type: 'warn' | 'info';
	text: string;
};

export type FrameScore = {
	frame: number;
	time_sec: number;
	error: number;
	joint_errors?: number[];
};

export type FrameLabel = {
	frame_idx: number;
	timestamp_ms: number;
	hit: boolean;
	reason: string;
	timing_score: number;
	amplitude_score: number;
	pose_score: number;
	joint_errors?: number[];
};

export type CompareResponse = {
	user_glb_key: string;
	reference_glb_key: string;
	score: number;
	dtw_distance: number;
	dance_id: string;
	user_dance_id: string;
	timeline_s3?: string;
	segments?: SegmentDiagnostic[];
	tips?: CompareTip[];
	dance_stats?: {
		attempt_count: number;
		best_score: number;
	};
	frame_scores?: FrameScore[];
	frame_labels?: FrameLabel[];
	user_video_key?: string;
	user_skeleton_key?: string;
	reference_skeleton_key?: string;
	owner?: {
		user_id: string;
		login: string;
	};
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
	options?: {
		signal?: AbortSignal;
		startSec?: number;
		endSec?: number;
	},
): Promise<CompareResponse> => {
	const formData = new FormData();

	const filename = videoBlob.type?.includes('webm')
		? 'recording.webm'
		: 'recording.mp4';

	const mimeType = videoBlob.type || 'video/mp4';

	const file = new File([videoBlob], filename, { type: mimeType });

	formData.append('dance', file);
	formData.append('reference_dance_id', referenceDanceId);

	if (
		options?.startSec !== undefined &&
		options?.endSec !== undefined &&
		options.endSec > options.startSec
	) {
		formData.append('start_sec', String(options.startSec));
		formData.append('end_sec', String(options.endSec));
	}

	const response = await http.post<CompareResponse>(
		'/users/dance/compare-upload',
		formData,
		{
			signal: options?.signal,
			headers: {
				'Content-Type': undefined,
			},
			timeout: 300_000,
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

export const getCompareResult = async (
	userDanceId: string,
): Promise<CompareResponse> => {
	const response = await http.get<CompareResponse>(
		`/users/dance/${userDanceId}/result`,
	);

	return response.data;
};

export type EnqueueResult = {
	task_id: string;
	dance_id?: string;
	user_dance_id?: string;
	reference_dance_id?: string;
	status: 'queued';
};

export type TaskStatus = 'queued' | 'processing' | 'done' | 'failed';

export type TaskStatusResponse = {
	status: TaskStatus;
	stage: string;
	stage_label: string;
	progress: number;
	result?: CompareResponse | LoadDanceResult;
	error?: string;
	moderation_failed?: boolean;
	moderation_reason?: string;
};

export type LoadDanceResult = {
	dance_id: string;
	full_glb_key: string;
	glb_keys: string[];
	segments_key: string;
	num_frames: number;
	num_segments: number;
	num_segments_rendered: number;
	duration_sec: number;
	video_path: string;
};

export const getTaskStatus = async (
	taskId: string,
	type: 'upload' | 'compare',
	params: {
		dance_id?: string;
		user_dance_id?: string;
		video_key?: string;
	},
): Promise<TaskStatusResponse> => {
	const query = new URLSearchParams({ type });

	if (params.dance_id) {
		query.set('dance_id', params.dance_id);
	}

	if (params.user_dance_id) {
		query.set('user_dance_id', params.user_dance_id);
	}

	if (params.video_key) {
		query.set('video_key', params.video_key);
	}

	const response = await http.get<TaskStatusResponse>(
		`/users/task/${taskId}/status?${query.toString()}`,
	);

	return response.data;
};
