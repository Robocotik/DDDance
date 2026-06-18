import { getDanceModerationStatus } from '@/api/dances/status';
import {
	ANON_PROGRESS_EVENT,
	getLastAnonAttempt,
	getLastAnonDance,
	type LastAnonAttempt,
	type LastAnonDance,
} from '@/helpers/anonProgress';
import { selectUploadState } from '@/redux/features/upload/selectors';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './AnonProgressPanel.module.scss';

const ATTEMPT_READY_KEY = (userDanceId: string): string =>
	`anon_attempt_ready_${userDanceId}`;

const STATUS_LABEL: Record<string, string> = {
	processing: 'обрабатывается',
	pending: 'на проверке',
	private: 'готов',
	published: 'опубликован',
	rejected: 'отклонён',
};

const TERMINAL = new Set(['private', 'published', 'rejected']);
const NON_READY = new Set(['processing', 'pending']);
const POLL_MS = 20000;

const TERMINAL_NOTIFICATION: Record<
	string,
	{ title: string; tone: 'good' | 'bad' }
> = {
	private: {
		title: 'Твой танец прошёл модерацию — можно открывать',
		tone: 'good',
	},
	published: {
		title: 'Твой танец прошёл модерацию и опубликован',
		tone: 'good',
	},
	rejected: {
		title:
			'Твой танец не прошёл модерацию. Загрузи другой — этот всё равно недоступен',
		tone: 'bad',
	},
};

const NOTIFIED_KEY = (danceId: string): string => `anon_notified_${danceId}`;

const AnonProgressPanel: React.FC = () => {
	const navigate = useNavigate();
	const [dance, setDance] = useState<LastAnonDance | null>(getLastAnonDance);
	const [attempt, setAttempt] = useState<LastAnonAttempt | null>(
		getLastAnonAttempt,
	);

	const [danceStatus, setDanceStatus] = useState<string | null>(null);
	const [notifiedStatus, setNotifiedStatus] = useState<string | null>(null);
	const [attemptReady, setAttemptReady] = useState(false);

	useEffect(() => {
		const refresh = (): void => {
			setDance(getLastAnonDance());
			setAttempt(getLastAnonAttempt());
		};

		window.addEventListener(ANON_PROGRESS_EVENT, refresh);

		return () => window.removeEventListener(ANON_PROGRESS_EVENT, refresh);
	}, []);

	useEffect(() => {
		if (!dance) {
			setDanceStatus(null);
			setNotifiedStatus(null);
			return;
		}

		try {
			setNotifiedStatus(localStorage.getItem(NOTIFIED_KEY(dance.danceId)));
		} catch {
			setNotifiedStatus(null);
		}

		let timer: ReturnType<typeof setTimeout> | null = null;
		let cancelled = false;

		const poll = async (): Promise<void> => {
			try {
				const res = await getDanceModerationStatus(dance.danceId);

				if (cancelled) {
					return;
				}

				setDanceStatus(res.status);

				if (!TERMINAL.has(res.status)) {
					timer = setTimeout(poll, POLL_MS);
				}
			} catch {
				if (!cancelled) {
					timer = setTimeout(poll, POLL_MS);
				}
			}
		};

		poll();

		return () => {
			cancelled = true;

			if (timer) {
				clearTimeout(timer);
			}
		};
	}, [dance]);

	const uploadState = useSelector(selectUploadState);
	const compareResultUserDanceId =
		uploadState.compareResult?.user_dance_id ?? null;

	useEffect(() => {
		if (!attempt) {
			setAttemptReady(false);
			return;
		}

		try {
			const flag = localStorage.getItem(ATTEMPT_READY_KEY(attempt.userDanceId));
			setAttemptReady(flag === '1');
		} catch {
			setAttemptReady(false);
		}
	}, [attempt]);

	useEffect(() => {
		if (!attempt || !compareResultUserDanceId) {
			return;
		}

		if (compareResultUserDanceId === attempt.userDanceId) {
			setAttemptReady(true);

			try {
				localStorage.setItem(ATTEMPT_READY_KEY(attempt.userDanceId), '1');
			} catch {}
		}
	}, [attempt, compareResultUserDanceId]);

	if (!dance && !attempt) {
		return null;
	}

	const isReady = danceStatus !== null && !NON_READY.has(danceStatus);
	const shouldShowNotification =
		dance !== null &&
		danceStatus !== null &&
		TERMINAL.has(danceStatus) &&
		notifiedStatus !== danceStatus &&
		// eslint-disable-next-line sonarjs/different-types-comparison
		TERMINAL_NOTIFICATION[danceStatus] !== undefined;

	const handleDismissNotification = (): void => {
		if (!dance || !danceStatus) {
			return;
		}

		try {
			localStorage.setItem(NOTIFIED_KEY(dance.danceId), danceStatus);
		} catch {}

		setNotifiedStatus(danceStatus);
	};

	const handleOpenDance = (): void => {
		if (!dance || !isReady) {
			return;
		}

		navigate(`/lesson/${dance.danceId}?segment=full`);
	};

	let statusClass = '';

	if (danceStatus === 'rejected') {
		statusClass = styles.statusBad;
	} else if (danceStatus === 'published' || danceStatus === 'private') {
		statusClass = styles.statusGood;
	}

	const notification =
		shouldShowNotification && danceStatus
			? TERMINAL_NOTIFICATION[danceStatus]
			: null;

	return (
		<div className={styles.panel}>
			{notification && (
				<div
					className={`${styles.notification} ${
						notification.tone === 'good'
							? styles.notificationGood
							: styles.notificationBad
					}`}
					role="status"
				>
					<span className={styles.notificationText}>{notification.title}</span>
					<button
						type="button"
						className={styles.notificationDismiss}
						onClick={handleDismissNotification}
						aria-label="Закрыть"
					>
						✕
					</button>
				</div>
			)}

			<div className={styles.chips}>
				{dance && (
					<div className={styles.danceBlock}>
						<button
							type="button"
							className={`${styles.chip} ${isReady ? '' : styles.chipDisabled}`}
							title={
								isReady
									? 'Открыть последний загруженный танец'
									: 'Танец ещё не готов'
							}
							onClick={handleOpenDance}
							disabled={!isReady}
						>
							Последний танец
							{danceStatus && (
								<span className={`${styles.status} ${statusClass}`}>
									{STATUS_LABEL[danceStatus] ?? danceStatus}
								</span>
							)}
						</button>
						{NON_READY.has(danceStatus ?? '') && (
							<span className={styles.warning}>
								Если загрузишь новый — этот пропадёт
							</span>
						)}
					</div>
				)}

				{attempt && (
					<button
						type="button"
						className={`${styles.chip} ${
							attemptReady ? '' : styles.chipDisabled
						}`}
						title={
							attemptReady
								? 'Открыть последнюю попытку сравнения'
								: 'Сравнение ещё готовится'
						}
						onClick={() => {
							if (attemptReady) {
								navigate(`/compare/${attempt.userDanceId}`);
							}
						}}
						disabled={!attemptReady}
					>
						Последняя попытка
						<span
							className={`${styles.status} ${
								attemptReady ? styles.statusGood : ''
							}`}
						>
							{attemptReady ? 'готов' : 'обрабатывается'}
						</span>
					</button>
				)}
			</div>
		</div>
	);
};

export default AnonProgressPanel;
