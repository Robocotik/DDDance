import { hasBannedWords, MAX_TITLE_LENGTH } from '@/helpers/censorTitle';
import React, { useState } from 'react';
import styles from './SaveToProfileDialog.module.scss';

export type SaveOptions = {
	userName: string;
	isPrivate: boolean;
};

interface SaveToProfileDialogProps {
	onClose: () => void;
	onConfirm: (opts: SaveOptions) => void;
	submitting?: boolean;
}

const LockClosedIcon: React.FC = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
		<path d="M12 2a5 5 0 0 0-5 5v2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v2H9V7a3 3 0 0 1 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
	</svg>
);

const LockOpenIcon: React.FC = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
		<path d="M12 2a5 5 0 0 0-5 5h2a3 3 0 0 1 6 0v2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V7a5 5 0 0 0-5-5zm0 11a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
	</svg>
);

const SaveToProfileDialog: React.FC<SaveToProfileDialogProps> = ({
	onClose,
	onConfirm,
	submitting,
}) => {
	const [userName, setUserName] = useState('');
	const [isPrivate, setIsPrivate] = useState(false);
	const [titleError, setTitleError] = useState('');

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setUserName(val);
		if (hasBannedWords(val)) {
			setTitleError('Название содержит недопустимые слова');
		} else {
			setTitleError('');
		}
	};

	const handleSubmit = () => {
		const trimmed = userName.trim();
		if (!trimmed) {
			setTitleError('Введи название танца');
			return;
		}
		if (hasBannedWords(trimmed)) {
			setTitleError('Название содержит недопустимые слова');
			return;
		}
		onConfirm({ userName: trimmed, isPrivate });
	};

	const canSubmit = !submitting && userName.trim().length > 0 && !titleError;

	return (
		<div
			className={styles.overlay}
			onClick={(e) => {
				if (e.target === e.currentTarget && !submitting) onClose();
			}}
		>
			<div className={styles.modal}>
				<div className={styles.header}>
					<h2 className={styles.title}>Добавить в профиль</h2>
					<button
						type="button"
						className={styles.close}
						onClick={onClose}
						disabled={submitting}
						aria-label="Закрыть"
					>
						×
					</button>
				</div>

				<div className={styles.body}>
					<div className={styles.field}>
						<label className={styles.label} htmlFor="dance-title">
							Название
						</label>
						<input
							id="dance-title"
							className={`${styles.input} ${titleError ? styles.inputError : ''}`}
							type="text"
							placeholder="Как назовёшь этот танец?"
							value={userName}
							onChange={handleNameChange}
							maxLength={MAX_TITLE_LENGTH}
							disabled={submitting}
							autoFocus
						/>
						{titleError ? (
							<span className={styles.errorMsg}>{titleError}</span>
						) : (
							<span className={styles.charCount}>
								{userName.length}/{MAX_TITLE_LENGTH}
							</span>
						)}
					</div>

					<div className={styles.field}>
						<span className={styles.label}>Видимость</span>
						<div className={styles.visibilityRow}>
							<button
								type="button"
								className={`${styles.visBtn} ${!isPrivate ? styles.visBtnActive : ''}`}
								onClick={() => setIsPrivate(false)}
								disabled={submitting}
							>
								<LockOpenIcon />
								Публичный
							</button>
							<button
								type="button"
								className={`${styles.visBtn} ${isPrivate ? styles.visBtnActive : ''}`}
								onClick={() => setIsPrivate(true)}
								disabled={submitting}
							>
								<LockClosedIcon />
								Приватный
							</button>
						</div>
						<p className={styles.visDesc}>
							{isPrivate
								? 'Только ты видишь этот танец в своём профиле.'
								: 'Танец виден всем в твоём публичном профиле.'}
						</p>
					</div>

					<button
						type="button"
						className={styles.submitBtn}
						onClick={handleSubmit}
						disabled={!canSubmit}
					>
						{submitting ? 'Сохранение...' : 'Сохранить'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default SaveToProfileDialog;
