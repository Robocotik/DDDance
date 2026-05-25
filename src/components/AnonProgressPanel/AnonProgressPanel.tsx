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

// Человекочитаемые подписи статусов модерации.
const STATUS_LABEL: Record<string, string> = {
	processing: 'обрабатывается',
	pending: 'на проверке',
	private: 'готов',
	published: 'опубликован',
	rejected: 'отклонён',
};

// Терминальные статусы — поллинг останавливается.
const TERMINAL = new Set(['private', 'published', 'rejected']);
// На этих статусах танец ещё не готов: открыть в урок не получится,
// и любая новая загрузка перетрёт ссылку в localStorage — предупреждаем.
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

const NOTIFIED_KEY = (danceId: string): string =>
	`anon_notified_${danceId}`;

// Панель для неавторизованного пользователя: быстрый доступ к последнему
// загруженному танцу и последней попытке + статус модерации танца
// (локальное «уведомление» — данные не теряются до регистрации).
const AnonProgressPanel: React.FC = () => {
	const navigate = useNavigate();
	const [dance, setDance] = useState<LastAnonDance | null>(getLastAnonDance);
	const [attempt, setAttempt] = useState<LastAnonAttempt | null>(
		getLastAnonAttempt,
	);
	const [danceStatus, setDanceStatus] = useState<string | null>(null);
	const [notifiedStatus, setNotifiedStatus] = useState<string | null>(null);
	// Готовность последней попытки сравнения. true — compare-результат уже
	// доступен по API (бар на ComparePage уйдёт и откроется разбор).
	const [attemptReady, setAttemptReady] = useState(false);

	useEffect(() => {
		const refresh = (): void => {
			setDance(getLastAnonDance());
			setAttempt(getLastAnonAttempt());
		};
		window.addEventListener(ANON_PROGRESS_EVENT, refresh);

		return () => window.removeEventListener(ANON_PROGRESS_EVENT, refresh);
	}, []);

	// Поллинг статуса модерации последнего танца + квитирование уведомления.
	useEffect(() => {
		if (!dance) {
			setDanceStatus(null);
			setNotifiedStatus(null);
			return;
		}

		// Подхватываем уже виденное уведомление, чтобы на свежем монтировании
		// не показывать баннер по уже квитированному статусу.
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

	// Готовность последней попытки. GET /dance/{id}/result у бэкенда сидит на
	// protectedUserRouter — анону вернёт 401, поэтому опрашивать его нельзя.
	// Вместо этого: при завершении compare-таски startPolling пишет флаг в
	// localStorage; здесь его читаем + параллельно слушаем Redux на случай
	// «таска только что завершилась, и мы хотим обновиться без F5».
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

	// Live-апдейт, когда compare-поллинг кладёт результат в state.upload.
	useEffect(() => {
		if (!attempt || !compareResultUserDanceId) {
			return;
		}

		if (compareResultUserDanceId === attempt.userDanceId) {
			setAttemptReady(true);
			try {
				localStorage.setItem(ATTEMPT_READY_KEY(attempt.userDanceId), '1');
			} catch {
				/* ignore */
			}
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
		TERMINAL_NOTIFICATION[danceStatus] !== undefined;

	const handleDismissNotification = (): void => {
		if (!dance || !danceStatus) {
			return;
		}

		try {
			localStorage.setItem(NOTIFIED_KEY(dance.danceId), danceStatus);
		} catch {
			/* localStorage unavailable — лишний показ переживём */
		}
		setNotifiedStatus(danceStatus);
	};

	const handleOpenDance = (): void => {
		if (!dance || !isReady) {
			return;
		}

		navigate(`/lesson/${dance.danceId}?segment=full`);
	};

	const statusClass =
		danceStatus === 'rejected'
			? styles.statusBad
			: danceStatus === 'published' || danceStatus === 'private'
				? styles.statusGood
				: '';

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
							className={`${styles.chip} ${
								isReady ? '' : styles.chipDisabled
							}`}
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
