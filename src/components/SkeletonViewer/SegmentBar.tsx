import React from 'react';

type Segment = {
	index: number;
	label: string;
	start_frame: number;
	end_frame: number;
	start_ms: number;
	end_ms: number;
	duration_ms: number;
	duration_sec: number;
	num_frames: number;
};

type SegmentBarProps = {
	segments: Segment[];
	currentFrame: number;
	totalFrames: number;
	onSegmentClick: (startFrame: number) => void;
};

const COLORS = [
	'#7c6af7',
	'#4a9eff',
	'#36d399',
	'#f59e42',
	'#f06292',
	'#26c6da',
	'#aed651',
	'#ff7043',
];

export const SegmentBar: React.FC<SegmentBarProps> = ({
	segments,
	currentFrame,
	totalFrames,
	onSegmentClick,
}) => {
	if (!segments.length || !totalFrames) {
		return null;
	}

	return (
		<div
			style={{
				marginTop: 12,
				padding: '8px 0',
				borderTop: '1px solid var(--color-border-tertiary)',
			}}
		>
			<div
				style={{
					fontSize: 11,
					color: 'var(--color-text-tertiary)',
					marginBottom: 6,
					textTransform: 'uppercase',
					letterSpacing: '0.05em',
				}}
			>
				Сегменты
			</div>

			<div
				style={{
					position: 'relative',
					height: 8,
					background: 'var(--color-background-tertiary)',
					borderRadius: 4,
					marginBottom: 10,
					overflow: 'hidden',
				}}
			>
				{segments.map((seg, i) => {
					const left = (seg.start_frame / totalFrames) * 100;
					const width = ((seg.end_frame - seg.start_frame) / totalFrames) * 100;
					const isActive =
						currentFrame >= seg.start_frame && currentFrame <= seg.end_frame;

					return (
						<div
							key={seg.index}
							onClick={() => onSegmentClick(seg.start_frame)}
							style={{
								position: 'absolute',
								left: `${left}%`,
								width: `calc(${width}% - 2px)`,
								height: '100%',
								background: COLORS[i % COLORS.length],
								opacity: isActive ? 1 : 0.45,
								cursor: 'pointer',
								borderRadius: 2,
								transition: 'opacity 0.15s',
							}}
						/>
					);
				})}
				<div
					style={{
						position: 'absolute',
						left: `${(currentFrame / totalFrames) * 100}%`,
						top: -2,
						width: 2,
						height: 12,
						background: '#fff',
						borderRadius: 1,
						pointerEvents: 'none',
						boxShadow: '0 0 3px rgba(0,0,0,0.5)',
					}}
				/>
			</div>

			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
				{segments.map((seg, i) => {
					const isActive =
						currentFrame >= seg.start_frame && currentFrame <= seg.end_frame;

					return (
						<button
							key={seg.index}
							onClick={() => onSegmentClick(seg.start_frame)}
							style={{
								padding: '3px 10px',
								borderRadius: 12,
								border: 'none',
								background: isActive
									? COLORS[i % COLORS.length]
									: 'var(--color-background-secondary)',
								color: isActive ? '#fff' : 'var(--color-text-secondary)',
								fontSize: 12,
								cursor: 'pointer',
								transition: 'all 0.15s',
								fontWeight: isActive ? 500 : 400,
								outline: isActive
									? `2px solid ${COLORS[i % COLORS.length]}`
									: 'none',
								outlineOffset: 1,
							}}
						>
							{seg.label} · {seg.duration_sec.toFixed(1)}s
						</button>
					);
				})}
			</div>
		</div>
	);
};
