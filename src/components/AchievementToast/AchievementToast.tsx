import type { AchievementUnlockedPayload } from '@/hooks/useAttemptReady';
import { useEffect } from 'react';
import styles from './AchievementToast.module.scss';

interface Props {
	payload: AchievementUnlockedPayload;
	onDismiss: () => void;
}

const AUTO_DISMISS_MS = 6000;

const AchievementToast: React.FC<Props> = ({ payload, onDismiss }) => {
	useEffect(() => {
		const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
		return () => clearTimeout(timer);
	}, [onDismiss]);

	return (
		<div className={styles.toast} role="alert">
			<span className={styles.icon}>🏆</span>
			<div className={styles.text}>
				<p className={styles.kicker}>Достижение получено!</p>
				<p className={styles.title}>{payload.title}</p>
				{payload.description && (
					<p className={styles.sub}>{payload.description}</p>
				)}
			</div>
			<button
				className={styles.btnClose}
				onClick={onDismiss}
				aria-label="Закрыть"
			>
				×
			</button>
		</div>
	);
};

export default AchievementToast;
