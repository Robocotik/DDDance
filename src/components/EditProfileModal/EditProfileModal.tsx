import { updateUserProfile } from '@/redux/features/user/actions';
import type { AppDispatch } from '@/redux/store';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import styles from './EditProfileModal.module.scss';

interface EditProfileModalProps {
	currentLogin: string;
	onClose: () => void;
	onSaved?: () => void;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const EditProfileModal: React.FC<EditProfileModalProps> = ({
	currentLogin,
	onClose,
	onSaved,
}) => {
	const dispatch = useDispatch<AppDispatch>();

	const [login, setLogin] = useState(currentLogin);
	const [avatar, setAvatar] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!avatar) {
			setAvatarPreview(null);
			return;
		}
		const url = URL.createObjectURL(avatar);
		setAvatarPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [avatar]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);

	const handlePickFile = (file: File | null) => {
		setError(null);
		if (!file) {
			setAvatar(null);
			return;
		}
		if (!ALLOWED_TYPES.includes(file.type)) {
			setError('Поддерживаются только JPEG, PNG и WebP.');
			return;
		}
		if (file.size > MAX_AVATAR_BYTES) {
			setError('Файл больше 5 МБ.');
			return;
		}
		setAvatar(file);
	};

	const trimmedLogin = login.trim();
	const loginChanged = trimmedLogin !== currentLogin;
	const canSubmit =
		!submitting && (loginChanged || avatar !== null) && trimmedLogin.length >= 6;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit) return;

		setSubmitting(true);
		setError(null);
		try {
			await dispatch(
				updateUserProfile({
					login: loginChanged ? trimmedLogin : undefined,
					avatar: avatar ?? undefined,
				}),
			);
			onSaved?.();
			onClose();
		} catch (err) {
			const isAxiosErr =
				typeof err === 'object' &&
				err !== null &&
				'response' in err &&
				typeof (err as { response?: { status?: number } }).response?.status ===
					'number';
			const status = isAxiosErr
				? (err as { response: { status: number } }).response.status
				: 500;
			if (status === 400) {
				setError('Этот логин занят или не подходит. Попробуй другой.');
			} else if (status === 401) {
				setError('Сессия истекла. Войди заново.');
			} else if (status === 413) {
				setError('Файл слишком большой.');
			} else {
				setError('Не удалось сохранить. Попробуй позже.');
			}
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={styles.overlay} onClick={onClose}>
			<form
				className={styles.modal}
				onClick={(e) => e.stopPropagation()}
				onSubmit={handleSubmit}
			>
				<div className={styles.header}>
					<h2 className={styles.title}>Редактировать профиль</h2>
					<button
						type="button"
						className={styles.close}
						onClick={onClose}
						aria-label="Закрыть"
					>
						×
					</button>
				</div>

				<div className={styles.body}>
					<div className={styles.avatarRow}>
						<div className={styles.avatarPreview}>
							{avatarPreview ? (
								<img src={avatarPreview} alt="" />
							) : (
								<div className={styles.avatarPlaceholder}>Нет файла</div>
							)}
						</div>
						<div className={styles.avatarControls}>
							<button
								type="button"
								className={styles.fileBtn}
								onClick={() => fileInputRef.current?.click()}
							>
								Выбрать файл
							</button>
							{avatar && (
								<button
									type="button"
									className={styles.fileClear}
									onClick={() => handlePickFile(null)}
								>
									Очистить
								</button>
							)}
							<p className={styles.fileHint}>JPEG / PNG / WebP, до 5 МБ</p>
							<input
								ref={fileInputRef}
								type="file"
								accept={ALLOWED_TYPES.join(',')}
								className={styles.fileInput}
								onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
							/>
						</div>
					</div>

					<label className={styles.field}>
						<span className={styles.fieldLabel}>Логин</span>
						<input
							className={styles.input}
							value={login}
							onChange={(e) => setLogin(e.target.value)}
							minLength={6}
							maxLength={15}
							autoComplete="off"
						/>
						<span className={styles.fieldHint}>6–15 символов, латиница/цифры</span>
					</label>

					{error && <p className={styles.error}>{error}</p>}
				</div>

				<div className={styles.footer}>
					<button
						type="button"
						className={styles.btnGhost}
						onClick={onClose}
						disabled={submitting}
					>
						Отмена
					</button>
					<button
						type="submit"
						className={styles.btnPrimary}
						disabled={!canSubmit}
					>
						{submitting ? 'Сохраняем...' : 'Сохранить'}
					</button>
				</div>
			</form>
		</div>
	);
};

export default EditProfileModal;
