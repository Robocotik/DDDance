export const LM_TO_JOINTS: Record<number, number[]> = {
	11: [0, 2, 4],
	12: [1, 3, 5],
	13: [0, 2],
	14: [1, 3],
	15: [2],
	16: [3],
	23: [0, 4, 6],
	24: [1, 5, 7],
	25: [4, 6],
	26: [5, 7],
	27: [6],
	28: [7],
};

export function lineErrorByJoints(
	a: number,
	b: number,
	jointErrors: number[] | undefined,
	fallback: number,
): number {
	if (!jointErrors || jointErrors.length === 0) {
		return fallback;
	}

	const joints = new Set<number>();

	for (const j of LM_TO_JOINTS[a] || []) {
		joints.add(j);
	}

	for (const j of LM_TO_JOINTS[b] || []) {
		joints.add(j);
	}

	if (joints.size === 0) {
		return fallback;
	}

	let max = 0;

	for (const j of joints) {
		const e = jointErrors[j] ?? 0;

		if (e > max) {
			max = e;
		}
	}

	return max;
}

export function pointErrorByJoints(
	lm: number,
	jointErrors: number[] | undefined,
	fallback: number,
): number {
	if (!jointErrors || jointErrors.length === 0) {
		return fallback;
	}

	const joints = LM_TO_JOINTS[lm];

	if (!joints) {
		return fallback;
	}

	let max = 0;

	for (const j of joints) {
		const e = jointErrors[j] ?? 0;

		if (e > max) {
			max = e;
		}
	}

	return max;
}
