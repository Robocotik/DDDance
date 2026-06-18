import { getLeaderboard, type LeaderboardEntry } from '@/api/dances';
import { S3_ADDRESS } from '@/consts/urls';
import React, { useEffect, useRef, useState } from 'react';
import styles from './LeaderboardModal.module.scss';

interface LeaderboardModalProps {
	danceId: string;
	isOpen: boolean;
	onClose: () => void;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const resolveAvatar = (avatar: string | undefined): string => {
	if (!avatar) {
		return '';
	}

	if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
		return avatar;
	}

	return `${S3_ADDRESS}/${avatar}`;
};

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
	danceId,
	isOpen,
	onClose,
}) => {
	const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [visible, setVisible] = useState(false);

	const touchStartY = useRef<number>(0);
	const sheetRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen) {
			setVisible(true);
			setLoading(true);
			setEntries([]);
			getLeaderboard(danceId)
				.then((res) => setEntries(res.top.slice(0, 10)))
				.catch(() => {})
				.finally(() => setLoading(false));
		} else {
			setVisible(false);
		}
	}, [isOpen, danceId]);

	if (!isOpen) {
		return null;
	}

	const handleTouchStart = (e: React.TouchEvent) => {
		touchStartY.current = e.touches[0].clientY;
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		const delta = e.changedTouches[0].clientY - touchStartY.current;

		if (delta > 80) {
			onClose();
		}
	};

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div className={styles.backdrop} onClick={handleBackdropClick}>
			<div
				ref={sheetRef}
				className={`${styles.sheet} ${visible ? styles.open : ''}`}
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
			>
				<div className={styles.header}>
					<span className={styles.title}>Лидеры</span>
					<button className={styles.closeBtn} onClick={onClose}>
						✕
					</button>
				</div>

				<div className={styles.dragHandle} />

				{loading && (
					<div className={styles.spinner}>
						<div className={styles.spinnerCircle} />
					</div>
				)}

				{!loading && entries.length === 0 && (
					<p className={styles.empty}>Попыток пока нет</p>
				)}

				{!loading && entries.length > 0 && (
					<ul className={styles.list}>
						{entries.map((entry) => (
							<li key={entry.user_id} className={styles.row}>
								<span className={styles.rank}>
									{MEDALS[entry.rank] ?? `#${entry.rank}`}
								</span>
								{entry.avatar ? (
									<img
										className={styles.avatar}
										src={resolveAvatar(entry.avatar)}
										alt={entry.login}
									/>
								) : (
									<div className={styles.avatarPlaceholder} />
								)}
								<span className={styles.login}>{entry.login}</span>
								<span className={styles.score}>{entry.score.toFixed(1)}</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};

export default LeaderboardModal;
