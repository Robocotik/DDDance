import {
	selectIsProcessing,
	selectIsUploading,
	selectModerationFailed,
	selectTaskProgress,
	selectTaskStageName,
	selectTaskStatus,
	selectUploadError,
} from '@/redux/features/upload/selectors';
import { resetUpload } from '@/redux/features/upload/uploadSlice';
import { useDispatch, useSelector } from 'react-redux';
import styles from './ProcessingBanner.module.scss';

const ProcessingBanner: React.FC = () => {
	const dispatch = useDispatch();
	const isUploading = useSelector(selectIsUploading);
	const isProcessing = useSelector(selectIsProcessing);
	const status = useSelector(selectTaskStatus);
	const progress = useSelector(selectTaskProgress);
	const stageName = useSelector(selectTaskStageName);
	const error = useSelector(selectUploadError);
	const moderationFailed = useSelector(selectModerationFailed);

	const showError = status === 'failed' && !moderationFailed && !!error;
	const visible =
		isUploading ||
		(isProcessing && status !== 'done' && status !== 'failed') ||
		showError;

	if (!visible) {
		return null;
	}

	if (showError) {
		return (
			<div className={`${styles.banner} ${styles.bannerError}`} role="alert">
				<div className={styles.header}>
					<span className={styles.errorLabel}>{error}</span>
					<button
						type="button"
						className={styles.close}
						onClick={() => dispatch(resetUpload())}
						aria-label="Закрыть"
					>
						×
					</button>
				</div>
			</div>
		);
	}

	if (isUploading && !isProcessing) {
		return (
			<div className={styles.banner} role="status" aria-live="polite">
				<div className={styles.header}>
					<span className={styles.label}>Загрузка видео…</span>
				</div>
				<div className={styles.track}>
					<div className={styles.fillIndeterminate} />
				</div>
				<span className={styles.hint}>
					Не закрывайте страницу до завершения
				</span>
			</div>
		);
	}

	const displayProgress = Math.max(5, progress);
	const label = stageName || 'Проверка видео';

	return (
		<div className={styles.banner} role="status" aria-live="polite">
			<div className={styles.header}>
				<span className={styles.label}>{label}</span>
				<span className={styles.percent}>{displayProgress}%</span>
			</div>
			<div className={styles.track}>
				<div className={styles.fill} style={{ width: `${displayProgress}%` }} />
			</div>
			<span className={styles.hint}>Не закрывайте страницу до завершения</span>
		</div>
	);
};

export default ProcessingBanner;
