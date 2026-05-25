// Маппинг 33 mediapipe-landmarks → индексы суставов из JOINT_TRIPLETS в compare.py.
// Каждый сустав «затрагивает» несколько ключевых точек:
//   0 = L_hip-shoulder-elbow,   1 = R_hip-shoulder-elbow
//   2 = L_shoulder-elbow-wrist, 3 = R_shoulder-elbow-wrist
//   4 = L_shoulder-hip-knee,    5 = R_shoulder-hip-knee
//   6 = L_hip-knee-ankle,       7 = R_hip-knee-ankle
// Чтобы покрасить линию между двумя landmarks по error, берём max
// от joint_errors всех суставов, в которых участвует хотя бы один конец.
// Для landmark'ов, не покрытых JOINT_TRIPLETS (лицо, кисти, стопы),
// используем общий frame.error как fallback.

export const LM_TO_JOINTS: Record<number, number[]> = {
	11: [0, 2, 4], // L_shoulder
	12: [1, 3, 5], // R_shoulder
	13: [0, 2], // L_elbow
	14: [1, 3], // R_elbow
	15: [2], // L_wrist
	16: [3], // R_wrist
	23: [0, 4, 6], // L_hip
	24: [1, 5, 7], // R_hip
	25: [4, 6], // L_knee
	26: [5, 7], // R_knee
	27: [6], // L_ankle
	28: [7], // R_ankle
};

export function lineErrorByJoints(
	a: number,
	b: number,
	jointErrors: number[] | undefined,
	fallback: number,
): number {
	if (!jointErrors || jointErrors.length === 0) return fallback;
	const joints = new Set<number>();
	for (const j of LM_TO_JOINTS[a] || []) joints.add(j);
	for (const j of LM_TO_JOINTS[b] || []) joints.add(j);
	if (joints.size === 0) return fallback;
	let max = 0;
	for (const j of joints) {
		const e = jointErrors[j] ?? 0;
		if (e > max) max = e;
	}
	return max;
}

export function pointErrorByJoints(
	lm: number,
	jointErrors: number[] | undefined,
	fallback: number,
): number {
	if (!jointErrors || jointErrors.length === 0) return fallback;
	const joints = LM_TO_JOINTS[lm];
	if (!joints) return fallback;
	let max = 0;
	for (const j of joints) {
		const e = jointErrors[j] ?? 0;
		if (e > max) max = e;
	}
	return max;
}
