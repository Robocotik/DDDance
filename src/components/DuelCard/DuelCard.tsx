import type { DuelStatus, DuelWithUsers } from '@/api/duels';
import { avatarUrl } from '@/components/UserInfo/UserInfo';
import {
	acceptDuelThunk,
	declineDuelThunk,
} from '@/redux/features/duels/duelsSlice';
import type { AppDispatch, RootState } from '@/redux/store';
import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './DuelCard.module.scss';

const STATUS_LABEL: Record<DuelStatus, string> = {
	pending: 'Ожидает ответа',
	active: 'Активная',
	challenger_done: 'Ждём соперника',
	opponent_done: 'Ждём соперника',
	completed: 'Завершена',
	expired: 'Истекла',
	declined: 'Отклонена',
};

const STATUS_MOD: Record<DuelStatus, string> = {
	pending: styles.statusPending,
	active: styles.statusActive,
	challenger_done: styles.statusActive,
	opponent_done: styles.statusActive,
	completed: styles.statusCompleted,
	expired: styles.statusEnded,
	declined: styles.statusEnded,
};

interface DuelCardProps {
	duel: DuelWithUsers;
	onChanged?: () => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
const DuelCard: React.FC<DuelCardProps> = ({ duel, onChanged }) => {
	const navigate = useNavigate();
	const dispatch = useDispatch<AppDispatch>();
	const currentUser = useSelector((s: RootState) => s.user.user);

	const [busy, setBusy] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const inFlightRef = useRef(false);

	const isChallenger = currentUser?.id === duel.challenger_id;
	const isOpponent = currentUser?.id === duel.opponent_id;

	const opponentLogin = isChallenger
		? duel.opponent_login
		: duel.challenger_login;

	const opponentAvatar = isChallenger
		? duel.opponent_avatar
		: duel.challenger_avatar;

	const opponentId = isChallenger ? duel.opponent_id : duel.challenger_id;

	const myScore = isChallenger ? duel.challenger_score : duel.opponent_score;
	const theirScore = isChallenger ? duel.opponent_score : duel.challenger_score;

	const iWon =
		duel.status === 'completed' && currentUser?.id === duel.winner_id;

	const theyWon =
		duel.status === 'completed' &&
		duel.winner_id != null &&
		currentUser?.id !== duel.winner_id;

	const myAttemptDone = isChallenger
		? duel.challenger_attempt_id != null
		: duel.opponent_attempt_id != null;

	const theirAttemptDone = isChallenger
		? duel.opponent_attempt_id != null
		: duel.challenger_attempt_id != null;

	const showAttemptStatus =
		duel.status === 'active' ||
		duel.status === 'challenger_done' ||
		duel.status === 'opponent_done';

	const showPendingActions = isOpponent && duel.status === 'pending';

	const showDanceBtn =
		(duel.status === 'active' ||
			(duel.status === 'challenger_done' && isOpponent) ||
			(duel.status === 'opponent_done' && isChallenger)) &&
		!myAttemptDone &&
		duel.dance_id != null;

	const handleAccept = async () => {
		if (inFlightRef.current) {
			return;
		}

		if (new Date(duel.expires_at).getTime() < Date.now()) {
			setActionError('Вызов уже истёк.');
			return;
		}

		inFlightRef.current = true;
		setBusy(true);
		setActionError(null);
		const result = await dispatch(acceptDuelThunk(duel.id));

		if (result === null) {
			setActionError('Вызов уже неактуален — принят, отклонён или истёк.');
		}

		inFlightRef.current = false;
		setBusy(false);
		onChanged?.();
	};

	const handleDecline = async () => {
		if (inFlightRef.current) {
			return;
		}

		if (new Date(duel.expires_at).getTime() < Date.now()) {
			setActionError('Вызов уже истёк.');
			return;
		}

		inFlightRef.current = true;
		setBusy(true);
		setActionError(null);
		const result = await dispatch(declineDuelThunk(duel.id));

		if (!result) {
			setActionError('Вызов уже неактуален — принят, отклонён или истёк.');
		}

		inFlightRef.current = false;
		setBusy(false);
		onChanged?.();
	};

	const handleDance = () => {
		if (duel.dance_id) {
			navigate(`/lesson/${duel.dance_id}`);
		}
	};

	const handleOpponentClick = () => {
		if (opponentId) {
			navigate(`/profile/${opponentId}`);
		}
	};

	const createdDate = new Date(duel.created_at).toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});

	const expiresDate = new Date(duel.expires_at).toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});

	return (
		<div className={styles.card}>
			<div className={styles.topRow}>
				<span className={`${styles.statusBadge} ${STATUS_MOD[duel.status]}`}>
					{STATUS_LABEL[duel.status]}
				</span>
				<span className={styles.date}>{createdDate}</span>
			</div>

			<div className={styles.participants}>
				<div className={styles.user}>
					{currentUser?.avatar ? (
						<img
							className={styles.avatar}
							src={avatarUrl(currentUser.avatar, '')}
							alt={currentUser.login}
						/>
					) : (
						<div className={styles.avatarPlaceholder}>
							{currentUser?.login?.[0]?.toUpperCase() ?? '?'}
						</div>
					)}
					<span className={styles.login}>Я</span>
					{showAttemptStatus && (
						<span
							className={`${styles.attemptStatus} ${myAttemptDone ? styles.attemptDone : styles.attemptWaiting}`}
						>
							{myAttemptDone ? '✓ станцевал(а)' : 'твой ход'}
						</span>
					)}
				</div>

				<span className={styles.vs}>vs</span>

				<div className={styles.user}>
					<button
						type="button"
						className={styles.avatarBtn}
						onClick={handleOpponentClick}
						disabled={!opponentId}
						aria-label={`Профиль ${opponentLogin ?? 'соперника'}`}
					>
						{opponentAvatar ? (
							<img
								className={styles.avatar}
								src={avatarUrl(opponentAvatar, '')}
								alt={opponentLogin}
							/>
						) : (
							<div className={styles.avatarPlaceholder}>
								{opponentLogin?.[0]?.toUpperCase() ?? '?'}
							</div>
						)}
					</button>
					<span className={styles.login}>{opponentLogin}</span>
					{showAttemptStatus && (
						<span
							className={`${styles.attemptStatus} ${theirAttemptDone ? styles.attemptDone : styles.attemptWaiting}`}
						>
							{theirAttemptDone ? '✓ станцевал(а)' : 'ещё не танцевал(а)'}
						</span>
					)}
				</div>
			</div>

			{duel.dance_title && (
				<p className={styles.danceTitle}>{duel.dance_title}</p>
			)}

			{duel.status === 'completed' && (
				<div className={styles.scores}>
					<div className={`${styles.scoreBlock} ${iWon ? styles.winner : ''}`}>
						<span className={styles.scoreLabel}>Мой счёт</span>
						<span className={styles.scoreValue}>
							{myScore != null ? Math.round(myScore) : '—'}
						</span>
					</div>
					<div
						className={`${styles.scoreBlock} ${theyWon ? styles.winner : ''}`}
					>
						<span className={styles.scoreLabel}>Счёт соперника</span>
						<span className={styles.scoreValue}>
							{theirScore != null ? Math.round(theirScore) : '—'}
						</span>
					</div>
				</div>
			)}

			{duel.status === 'completed' && (
				<p className={styles.result}>
					{/* eslint-disable-next-line sonarjs/no-nested-conditional */}
					{iWon ? '🏆 Победа!' : theyWon ? '😔 Поражение' : '🤝 Ничья'}
				</p>
			)}

			{(duel.status === 'pending' || duel.status === 'active') && (
				<p className={styles.expiresHint}>Истекает: {expiresDate}</p>
			)}

			{(showPendingActions || showDanceBtn) && (
				<div className={styles.actions}>
					{showPendingActions && (
						<>
							<button
								className={styles.btnAccept}
								onClick={handleAccept}
								disabled={busy}
							>
								Принять
							</button>
							<button
								className={styles.btnDecline}
								onClick={handleDecline}
								disabled={busy}
							>
								Отклонить
							</button>
						</>
					)}
					{showDanceBtn && (
						<button className={styles.btnDance} onClick={handleDance}>
							Танцевать
						</button>
					)}
				</div>
			)}

			{actionError && <p className={styles.actionError}>{actionError}</p>}
		</div>
	);
};

export default DuelCard;
