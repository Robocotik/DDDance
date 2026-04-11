import { loginUser } from '@/api/auth/login';
import { Auth } from '@/components/Auth/Auth';
import React, { useMemo, useState } from 'react';
import styles from './AuthPage.module.css';

type BubbleConfig = {
	id: number;
	x: number;
	y: number;
	size: number;
};

const bubbles: BubbleConfig[] = [
	{ id: 1, x: 4, y: 7, size: 140 },
	{ id: 2, x: 15, y: 30, size: 120 },
	{ id: 3, x: 25, y: 33, size: 210 },
	{ id: 4, x: 33, y: 12, size: 95 },
	{ id: 5, x: 42, y: 26, size: 170 },
	{ id: 6, x: 53, y: 8, size: 130 },
	{ id: 7, x: 62, y: 35, size: 90 },
	{ id: 8, x: 74, y: 24, size: 185 },
	{ id: 9, x: 90, y: 11, size: 175 },
	{ id: 10, x: 9, y: 56, size: 200 },
	{ id: 11, x: 22, y: 79, size: 145 },
	{ id: 12, x: 35, y: 63, size: 105 },
	{ id: 13, x: 47, y: 84, size: 210 },
	{ id: 14, x: 63, y: 67, size: 250 },
	{ id: 15, x: 78, y: 83, size: 125 },
	{ id: 16, x: 93, y: 60, size: 185 },
	{ id: 17, x: 6, y: 94, size: 95 },
	{ id: 18, x: 31, y: 96, size: 160 },
	{ id: 19, x: 56, y: 96, size: 145 },
	{ id: 20, x: 73, y: 97, size: 100 },
	{ id: 21, x: 86, y: 90, size: 115 },
	{ id: 22, x: 95, y: 90, size: 185 },
];

export const AuthPage: React.FC = () => {
	const [mouse, setMouse] = useState({ x: -9999, y: -9999 });

	const raisedBubbleIds = useMemo(() => {
		if (mouse.x < 0 || mouse.y < 0) {
			return new Set<number>();
		}

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const active = new Set<number>();

		for (const bubble of bubbles) {
			const centerX = (bubble.x / 100) * viewportWidth;
			const centerY = (bubble.y / 100) * viewportHeight;
			const distance = Math.hypot(mouse.x - centerX, mouse.y - centerY);
			const triggerDistance = bubble.size * 0.6 + 80;

			if (distance <= triggerDistance) {
				active.add(bubble.id);
			}
		}

		return active;
	}, [mouse.x, mouse.y]);

	return (
		<div
			className={styles.page}
			onMouseMove={(event) => setMouse({ x: event.clientX, y: event.clientY })}
			onMouseLeave={() => setMouse({ x: -9999, y: -9999 })}
		>
			<div className={styles.bubblesLayer} aria-hidden="true">
				{bubbles.map((bubble) => (
					<img
						key={bubble.id}
						src="/bubble.svg"
						alt=""
						className={`${styles.bubble} ${raisedBubbleIds.has(bubble.id) ? styles.raised : ''}`}
						style={{
							left: `${bubble.x}%`,
							top: `${bubble.y}%`,
							width: `${bubble.size}px`,
							height: `${bubble.size}px`,
						}}
					/>
				))}
			</div>

			<div className={styles.authLayer}>
				<Auth
					subTitleText="Получите доступ ко всем возможностям"
					titleText="Войти в аккаунт"
					submitText="Войти"
					onSubmit={loginUser}
				/>
			</div>
		</div>
	);
};
