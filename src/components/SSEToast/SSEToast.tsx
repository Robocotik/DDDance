import type { AttemptReadyPayload } from '@/hooks/useAttemptReady';
import { useNavigate } from 'react-router-dom';
import styles from './SSEToast.module.scss';

interface Props {
	payload: AttemptReadyPayload;
	onDismiss: () => void;
}

const SSEToast: React.FC<Props> = ({ payload, onDismiss }) => {
	const navigate = useNavigate();

	const handleView = () => {
		onDismiss();
		navigate(`/compare/${payload.attemptId}`);
	};

	return (
		<div className={styles.toast} role="alert">
			<div className={styles.content}>
				<span className={styles.icon}>✅</span>
				<div className={styles.text}>
					<p className={styles.title}>Результат готов!</p>
					<p className={styles.sub}>
						{payload.danceTitle
							? `${payload.danceTitle}: ${Math.round(payload.score)}/100`
							: `Счёт: ${Math.round(payload.score)}/100`}
					</p>
				</div>
			</div>
			<div className={styles.actions}>
				<button className={styles.btnView} onClick={handleView}>
					Посмотреть
				</button>
				<button
					className={styles.btnClose}
					onClick={onDismiss}
					aria-label="Закрыть"
				>
					×
				</button>
			</div>
		</div>
	);
};

export default SSEToast;
