import type { FrameScore } from '@/api/users/compare';
import { lineErrorByJoints, pointErrorByJoints } from './limbJoints';
import { POSE_CONNECTIONS } from './poseConnections';

export type SkeletonFrame = {
	f: number;
	t: number;
	lm: [number, number, number][];
};

export type SkeletonData = {
	fps: number;
	width: number;
	height: number;
	num_frames: number;
	frames: SkeletonFrame[];
};

export const VISIBILITY_THRESHOLD = 0.4;

export const errorColor = (e: number): string => {
	if (e <= 0.2) {
		return '#5be0a0';
	}

	if (e <= 0.5) {
		return '#f5c542';
	}

	return '#ff6b6b';
};

export function nearestIndex<T>(
	arr: T[],
	t: number,
	getTime: (item: T) => number,
): number {
	if (arr.length === 0) {
		return -1;
	}

	let lo = 0;
	let hi = arr.length - 1;

	while (lo < hi) {
		const mid = (lo + hi) >> 1;

		if (getTime(arr[mid]) < t) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}

	if (
		lo > 0 &&
		Math.abs(getTime(arr[lo - 1]) - t) < Math.abs(getTime(arr[lo]) - t)
	) {
		return lo - 1;
	}

	return lo;
}

interface DrawOptions {
	canvas: HTMLCanvasElement;
	frame: SkeletonFrame;
	frameScore?: FrameScore;
	baseColor?: string;
	alpha?: number;
	videoWidth?: number;
	videoHeight?: number;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function drawSkeleton({
	canvas,
	frame,
	frameScore,
	baseColor = '#ffffff',
	alpha = 1,
	videoWidth,
	videoHeight,
}: DrawOptions) {
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		return;
	}

	const cw = canvas.width;
	const ch = canvas.height;
	ctx.clearRect(0, 0, cw, ch);

	let rx = 0,
		ry = 0,
		rw = cw,
		rh = ch;

	if (videoWidth && videoHeight && videoWidth > 0 && videoHeight > 0) {
		const va = videoWidth / videoHeight;
		const ca = cw / ch;

		if (va > ca) {
			rw = cw;
			rh = cw / va;
			ry = (ch - rh) / 2;
		} else {
			rh = ch;
			rw = ch * va;
			rx = (cw - rw) / 2;
		}
	}

	const lx = (nx: number) => rx + nx * rw;
	const ly = (ny: number) => ry + ny * rh;

	ctx.globalAlpha = alpha;
	ctx.shadowColor = 'rgba(0,0,0,0.55)';
	ctx.shadowBlur = 6;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	const fallbackErr = frameScore?.error ?? 0;
	const jointErrors = frameScore?.joint_errors;
	const hasErrorData = !!frameScore;

	const baseWidth = Math.max(2, rw / 320);

	for (const [a, b] of POSE_CONNECTIONS) {
		const pa = frame.lm[a];
		const pb = frame.lm[b];

		if (!pa || !pb) {
			continue;
		}

		if (pa[2] < VISIBILITY_THRESHOLD || pb[2] < VISIBILITY_THRESHOLD) {
			continue;
		}

		const e = hasErrorData
			? lineErrorByJoints(a, b, jointErrors, fallbackErr)
			: 0;

		ctx.strokeStyle = hasErrorData ? errorColor(e) : baseColor;
		ctx.lineWidth = baseWidth;
		ctx.beginPath();
		ctx.moveTo(lx(pa[0]), ly(pa[1]));
		ctx.lineTo(lx(pb[0]), ly(pb[1]));
		ctx.stroke();
	}

	const r = Math.max(2.5, rw / 280);
	ctx.shadowBlur = 4;

	for (let i = 0; i < frame.lm.length; i++) {
		const p = frame.lm[i];

		if (!p) {
			continue;
		}

		if (p[2] < VISIBILITY_THRESHOLD) {
			continue;
		}

		const e = hasErrorData
			? pointErrorByJoints(i, jointErrors, fallbackErr)
			: 0;

		ctx.fillStyle = hasErrorData ? errorColor(e) : baseColor;
		ctx.beginPath();
		ctx.arc(lx(p[0]), ly(p[1]), r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.shadowBlur = 0;
	ctx.globalAlpha = 1;
}
