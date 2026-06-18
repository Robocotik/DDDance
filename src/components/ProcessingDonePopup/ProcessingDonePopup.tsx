import { setDanceName } from '@/api/users/uploadedDances';
import type { Difficulty } from '@/consts/danceDifficulty';
import { hasBannedWords, MAX_TITLE_LENGTH } from '@/helpers/censorTitle';
import { moderationReasonLabel } from '@/helpers/moderationReason';
import {
	selectModerationFailed,
	selectModerationReason,
	selectResultReady,
	selectTaskDanceId,
	selectTaskType,
	selectUploadDanceResult,
} from '@/redux/features/upload/selectors';
import { resultAcknowledged } from '@/redux/features/upload/uploadSlice';
import { selectUser } from '@/redux/features/user/selectors';
import type { AppDispatch } from '@/redux/store';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './ProcessingDonePopup.module.scss';

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
	{ value: 'easy', label: 'Лёгкий' },
	{ value: 'medium', label: 'Средний' },
	{ value: 'hard', label: 'Сложный' },
];

const ProcessingDonePopup: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const navigate = useNavigate();

	const resultReady = useSelector(selectResultReady);
	const moderationFailed = useSelector(selectModerationFailed);
	const moderationReason = useSelector(selectModerationReason);
	const taskType = useSelector(selectTaskType);
	const uploadResult = useSelector(selectUploadDanceResult);
	const taskDanceId = useSelector(selectTaskDanceId);
	const user = useSelector(selectUser);

	const [title, setTitle] = useState('');
	const [titleError, setTitleError] = useState('');
	const [difficulty, setDifficulty] = useState<Difficulty>('medium');
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (resultReady && taskType === 'compare') {
			dispatch(resultAcknowledged());
		}
	}, [resultReady, taskType, dispatch]);

	if (!resultReady && !moderationFailed) {
		return null;
	}

	const handleDismiss = () => {
		dispatch(resultAcknowledged());
	};

	if (moderationFailed) {
		const reasonLabel = moderationReasonLabel(moderationReason ?? undefined);
		return (
			<div className={styles.overlay}>
				<div className={styles.card} role="dialog" aria-modal="true">
					<p className={styles.title}>Видео не прошло модерацию</p>
					{reasonLabel && (
						<p className={styles.subtitle}>Причина: {reasonLabel}.</p>
					)}
					<p className={styles.subtitle}>
						Убедитесь, что в кадре один человек без запрещённого контента, и
						загрузите другое видео.
					</p>
					<div className={styles.actions}>
						<button
							className={styles.btnPrimary}
							onClick={() => {
								handleDismiss();
								navigate('/');
								setTimeout(() => {
									document
										.getElementById('video-uploader')
										?.scrollIntoView({ behavior: 'smooth' });
								}, 150);
							}}
						>
							Загрузить другое видео
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (taskType === 'compare') {
		return null;
	}

	const danceId = uploadResult?.dance_id ?? taskDanceId;

	if (!user) {
		return (
			<div className={styles.overlay}>
				<div className={styles.card} role="dialog" aria-modal="true">
					<p className={styles.title}>Танец обработан!</p>
					<p className={styles.subtitle}>
						Зарегистрируйтесь, чтобы дать танцу название и опубликовать его в
						общий доступ. Сейчас можно открыть разбор.
					</p>
					<div className={styles.actions}>
						<button
							className={styles.btnPrimary}
							onClick={() => {
								dispatch(resultAcknowledged());
								navigate('/register');
							}}
						>
							Зарегистрироваться
						</button>
						<button
							className={styles.btnSecondary}
							onClick={() => {
								dispatch(resultAcknowledged());

								if (danceId) {
									navigate(`/lesson/${danceId}`);
								}
							}}
						>
							Открыть танец
						</button>
					</div>
				</div>
			</div>
		);
	}

	const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setTitle(val);

		if (hasBannedWords(val)) {
			setTitleError('Название содержит недопустимые слова');
		} else {
			setTitleError('');
		}
	};

	const handleSave = async (publish: boolean) => {
		const trimmed = title.trim();

		if (!trimmed) {
			setTitleError('Введи название танца');
			return;
		}

		if (hasBannedWords(trimmed)) {
			setTitleError('Название содержит недопустимые слова');
			return;
		}

		if (!danceId) {
			return;
		}

		setSaving(true);

		try {
			await setDanceName(danceId, trimmed, publish, difficulty);
		} catch {
		} finally {
			setSaving(false);
		}

		dispatch(resultAcknowledged());
		navigate(`/lesson/${danceId}`);
	};

	const canSave = title.trim().length > 0 && !titleError && !saving;

	return (
		<div className={styles.overlay}>
			<div className={styles.card} role="dialog" aria-modal="true">
				<p className={styles.title}>Танец обработан!</p>
				<p className={styles.subtitle}>
					По умолчанию танец доступен только вам. Дайте ему название и выберите
					видимость.
				</p>

				<div className={styles.nameField}>
					<input
						className={`${styles.nameInput} ${titleError ? styles.nameInputError : ''}`}
						type="text"
						placeholder="Название танца"
						value={title}
						onChange={handleTitleChange}
						maxLength={MAX_TITLE_LENGTH}
						autoFocus
						disabled={saving}
					/>
					{titleError ? (
						<span className={styles.nameError}>{titleError}</span>
					) : (
						<span className={styles.nameCount}>
							{title.length}/{MAX_TITLE_LENGTH}
						</span>
					)}
				</div>

				<div className={styles.difficultyField}>
					<span className={styles.difficultyTitle}>Сложность танца</span>
					<div className={styles.difficultyOptions}>
						{DIFFICULTY_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type="button"
								className={`${styles.difficultyBtn} ${
									difficulty === opt.value ? styles.difficultyBtnActive : ''
								}`}
								onClick={() => setDifficulty(opt.value)}
								disabled={saving}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				<div className={styles.actions}>
					<button
						className={styles.btnPrimary}
						onClick={() => handleSave(true)}
						disabled={!canSave}
					>
						Опубликовать
					</button>
					<button
						className={styles.btnSecondary}
						onClick={() => handleSave(false)}
						disabled={!canSave}
					>
						Сохранить как приватный
					</button>
				</div>

				<button
					className={styles.skipBtn}
					onClick={() => {
						dispatch(resultAcknowledged());

						if (danceId) {
							navigate(`/lesson/${danceId}`);
						}
					}}
				>
					Пропустить, открыть танец
				</button>
			</div>
		</div>
	);
};

export default ProcessingDonePopup;
