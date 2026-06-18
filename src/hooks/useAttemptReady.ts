import { useEffect, useLayoutEffect, useRef } from 'react';

export interface AttemptReadyPayload {
	attemptId: string;
	danceTitle: string;
	score: number;
}

export interface AchievementUnlockedPayload {
	id: number;
	title: string;
	description: string;
	iconKey: string;
}

type Callback = (payload: AttemptReadyPayload) => void;
type AchievementCallback = (payload: AchievementUnlockedPayload) => void;

export function useAttemptReady(
	userId: string | null | undefined,
	onResult?: Callback,
	onAchievement?: AchievementCallback,
): void {
	const onResultRef = useRef<Callback | undefined>(onResult);
	const onAchievementRef = useRef<AchievementCallback | undefined>(
		onAchievement,
	);

	useLayoutEffect(() => {
		onResultRef.current = onResult;
		onAchievementRef.current = onAchievement;
	});

	useEffect(() => {
		if (!userId) {
			return;
		}

		const base =
			(import.meta.env.VITE_BACKEND_BASE_URL as string | undefined) ??
			'http://localhost:5458/api';

		const url = `${base}/users/me/events`;

		const es = new EventSource(url, { withCredentials: true });

		es.onmessage = (e: MessageEvent<string>) => {
			try {
				const data = JSON.parse(e.data) as {
					type?: string;
					attempt_id?: string;
					dance_title?: string;
					score?: number;
					id?: number;
					title?: string;
					description?: string;
					icon_key?: string;
				};

				if (
					data.type === 'attempt_result' &&
					data.attempt_id &&
					typeof data.score === 'number'
				) {
					onResultRef.current?.({
						attemptId: data.attempt_id,
						danceTitle: data.dance_title ?? '',
						score: data.score,
					});

					return;
				}

				if (
					data.type === 'achievement_unlocked' &&
					typeof data.id === 'number' &&
					data.title
				) {
					onAchievementRef.current?.({
						id: data.id,
						title: data.title,
						description: data.description ?? '',
						iconKey: data.icon_key ?? '',
					});
				}
			} catch {}
		};

		es.onerror = () => undefined;

		return () => {
			es.close();
		};
	}, [userId]);
}
