import type {
	UploadedDance,
	UploadedDanceStatus,
} from '@/api/users/uploadedDances';
import DifficultyBadge from '@/components/DifficultyBadge/DifficultyBadge';
import { S3_ADDRESS } from '@/consts/urls';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UploadedDanceCard.module.scss';

const STATUS_LABEL: Record<UploadedDanceStatus, string> = {
	processing: 'Обрабатывается',
	pending: 'На модерации',
	private: 'Приватный',
	published: 'Публичный',
	rejected: 'Отклонён',
};

const READY_STATUSES = new Set<UploadedDanceStatus>(['private', 'published']);

interface UploadedDanceCardProps {
	dance: UploadedDance;
	onEdit: (dance: UploadedDance) => void;
	onToggleVisibility: (dance: UploadedDance) => void;
	onDelete: (dance: UploadedDance) => void;
}

const UploadedDanceCard: React.FC<UploadedDanceCardProps> = ({
	dance,
	onEdit,
	onToggleVisibility,
	onDelete,
}) => {
	const navigate = useNavigate();
	const isReady = READY_STATUSES.has(dance.status);
	const statusLabel = STATUS_LABEL[dance.status] ?? dance.status;

	const videoSrc = `${(S3_ADDRESS || '').replace(/\/+$/, '')}/results/${dance.dance_id}/video.mp4`;

	const handleOpen = (): void => {
		// На неготовых статусах урок всё равно покажет понятный экран
		// (обрабатывается / на модерации / отклонён) — поэтому переход
		// разрешён всегда, дальнейшее решит LessonPage.
		navigate(`/lesson/${dance.dance_id}?segment=full`);
	};

	const stop = (e: React.MouseEvent): void => e.stopPropagation();

	const statusClass =
		dance.status === 'published'
			? styles.statusPublished
			: dance.status === 'private'
				? styles.statusPrivate
				: dance.status === 'rejected'
					? styles.statusRejected
					: dance.status === 'pending'
						? styles.statusPending
						: styles.statusProcessing;

	return (
		<div
			className={styles.card}
			onClick={handleOpen}
			role="button"
			tabIndex={0}
			title={isReady ? 'Открыть танец' : `Танец: ${statusLabel.toLowerCase()}`}
		>
			{isReady ? (
				<video
					className={styles.video}
					src={videoSrc}
					autoPlay
					muted
					loop
					playsInline
					preload="metadata"
					disablePictureInPicture
					disableRemotePlayback
				/>
			) : (
				<div className={styles.placeholder}>
					<span className={styles.placeholderIcon}>🎬</span>
				</div>
			)}

			<div className={styles.actions} onClick={stop}>
				<button
					type="button"
					className={styles.actionBtn}
					onClick={(e) => {
						stop(e);
						onEdit(dance);
					}}
					title="Изменить название и сложность"
					aria-label="Изменить"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M12 20h9" />
						<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
					</svg>
				</button>

				{isReady && (
					<button
						type="button"
						className={`${styles.actionBtn} ${
							dance.status === 'published'
								? styles.actionBtnPublished
								: ''
						}`}
						onClick={(e) => {
							stop(e);
							onToggleVisibility(dance);
						}}
						title={
							dance.status === 'published'
								? 'Сделать приватным'
								: 'Опубликовать'
						}
						aria-label={
							dance.status === 'published'
								? 'Сделать приватным'
								: 'Опубликовать'
						}
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
							{dance.status === 'published' ? (
								<path d="M7 11V7a5 5 0 0 1 9.9-1" />
							) : (
								<path d="M7 11V7a5 5 0 0 1 10 0v4" />
							)}
						</svg>
					</button>
				)}

				<button
					type="button"
					className={`${styles.actionBtn} ${styles.deleteBtn}`}
					onClick={(e) => {
						stop(e);
						onDelete(dance);
					}}
					title="Удалить танец"
					aria-label="Удалить"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
						<path d="M10 11v6" />
						<path d="M14 11v6" />
						<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
					</svg>
				</button>
			</div>

			<div className={styles.info}>
				<div className={styles.titleRow}>
					<span className={styles.name}>{dance.title || 'Без названия'}</span>
					{isReady && dance.difficulty && (
						<DifficultyBadge
							difficulty={dance.difficulty}
							byUsers={dance.difficulty_by_users}
						/>
					)}
				</div>
				<div className={styles.meta}>
					<span className={`${styles.statusBadge} ${statusClass}`}>
						{statusLabel}
					</span>
					{!!dance.attempt_count && dance.attempt_count > 0 && (
						<span className={styles.stats}>
							{dance.attempt_count} поп. · {Math.round(dance.avg_score ?? 0)}
						</span>
					)}
				</div>
			</div>
		</div>
	);
};

export default UploadedDanceCard;
