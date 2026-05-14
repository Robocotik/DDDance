import React, { useEffect, useState } from 'react';
import CameraRecorder from '../CameraRecorder/CameraRecorder';
import VideoEditor from '../VideoEditor/VideoEditor';
import styles from './CheckYourself.module.scss';

type Screen = 'choice' | 'camera' | 'editor';

interface CheckYourselfProps {
	referenceVideoUrl: string | null;
	referenceDanceId: string;
	onClose: () => void;
	onSubmit: (blob: Blob, startTime: number, endTime: number) => void;
	submitting?: boolean;
}

const CheckYourself: React.FC<CheckYourselfProps> = ({
	referenceVideoUrl,
	onClose,
	onSubmit,
	submitting = false,
}) => {
	const [screen, setScreen] = useState<Screen>('choice');
	const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

	useEffect(() => {
		if (submitting) {
			onClose();
		}
	}, [submitting, onClose]);

	const handleRecordingDone = (blob: Blob) => {
		setVideoBlob(blob);
		setScreen('editor');
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setVideoBlob(file);
		setScreen('editor');
	};

	const handleVideoSubmit = (
		blob: Blob,
		startTime: number,
		endTime: number,
	) => {
		onSubmit(blob, startTime, endTime);
	};

	return (
		<div
			className={styles.overlay}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className={styles.modal}>
				<button className={styles.closeBtn} onClick={onClose}>
					✕
				</button>

				{screen === 'choice' && (
					<div className={styles.choice}>
						<h2 className={styles.title}>Проверить себя</h2>
						<p className={styles.subtitle}>Выбери способ записи</p>
						<div className={styles.options}>
							<label className={styles.optionCard}>
								<input
									type="file"
									accept="video/*"
									className={styles.hiddenInput}
									onChange={handleFileChange}
								/>
								<span className={styles.optionIcon}>📁</span>
								<span className={styles.optionLabel}>Загрузить видео</span>
								<span className={styles.optionHint}>
									mp4, mov, avi и другие
								</span>
							</label>

							<button
								className={styles.optionCard}
								onClick={() => setScreen('camera')}
							>
								<span className={styles.optionIcon}>🎥</span>
								<span className={styles.optionLabel}>Записать с камеры</span>
								<span className={styles.optionHint}>Синхронно с эталоном</span>
							</button>
						</div>
					</div>
				)}

				{screen === 'camera' && (
					<CameraRecorder
						referenceVideoUrl={referenceVideoUrl}
						onDone={handleRecordingDone}
						onBack={() => setScreen('choice')}
					/>
				)}

				{screen === 'editor' && videoBlob && (
					<VideoEditor
						videoBlob={videoBlob}
						onBack={() => setScreen('choice')}
						onSubmit={handleVideoSubmit}
						submitting={submitting}
					/>
				)}
			</div>
		</div>
	);
};

export default CheckYourself;
