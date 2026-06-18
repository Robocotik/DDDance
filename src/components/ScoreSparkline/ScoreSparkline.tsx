import React from 'react';
import styles from './ScoreSparkline.module.scss';

export interface SparklinePoint {
	score: number;
	created_at: string;
}

interface Props {
	data: SparklinePoint[];
}

const W = 140;
const H = 36;
const PAD = 5;

const pluralAttempts = (n: number): string => {
	const last100 = n % 100;

	if (last100 >= 11 && last100 <= 14) {
		return 'попыток';
	}

	const last10 = n % 10;

	if (last10 === 1) {
		return 'попытка';
	}

	if (last10 >= 2 && last10 <= 4) {
		return 'попытки';
	}

	return 'попыток';
};

const ScoreSparkline: React.FC<Props> = ({ data }) => {
	if (data.length === 0) {
		return null;
	}

	const innerW = W - PAD * 2;
	const innerH = H - PAD * 2;

	const toX = (i: number) =>
		data.length === 1 ? W / 2 : PAD + (i / (data.length - 1)) * innerW;

	const toY = (score: number) => PAD + innerH * (1 - score / 100);

	const last = data[data.length - 1];
	const lastX = toX(data.length - 1);
	const lastY = toY(last.score);

	if (data.length === 1) {
		return (
			<div className={styles.wrap}>
				<svg
					viewBox={`0 0 ${W} ${H}`}
					width={W}
					height={H}
					aria-hidden="true"
					className={styles.svg}
				>
					<circle cx={lastX} cy={lastY} r={4} fill="#ff5a8a" />
				</svg>
				<span className={styles.count}>
					{data.length} {pluralAttempts(data.length)}
				</span>
			</div>
		);
	}

	const first = data[0];
	const improved = last.score > first.score;
	const lineColor = improved ? '#5be0a0' : '#a97fff';

	const polylinePoints = data
		.map((d, i) => `${toX(i).toFixed(1)},${toY(d.score).toFixed(1)}`)
		.join(' ');

	return (
		<div className={styles.wrap}>
			<svg
				viewBox={`0 0 ${W} ${H}`}
				width={W}
				height={H}
				aria-hidden="true"
				className={styles.svg}
			>
				<polyline
					points={polylinePoints}
					fill="none"
					stroke={lineColor}
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				{data.slice(0, -1).map((d, i) => (
					<circle
						key={i}
						cx={toX(i)}
						cy={toY(d.score)}
						r={2}
						fill={lineColor}
						opacity={0.45}
					/>
				))}
				<circle cx={lastX} cy={lastY} r={4} fill="#ff5a8a" />
			</svg>
			<span className={styles.count}>
				{data.length} {pluralAttempts(data.length)}
			</span>
		</div>
	);
};

export default React.memo(ScoreSparkline);
