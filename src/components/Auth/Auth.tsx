import type { LoginPayload } from '@/api/auth/login';
import type { BaseAuthResponse, RegisterPayload } from '@/api/auth/register';
import { claimUploads } from '@/api/notifications';
import { clearAnonProgress } from '@/helpers/anonProgress';
import { getAuthErrorMessage } from '@/helpers/getAuthErrorMessage';
import { validateAuthForm } from '@/helpers/validateAuthForm';
import {
	clearPendingAnonymousUploads,
	getPendingAnonymousUploads,
} from '@/redux/features/lesson/actions';
import {
	setUser,
	setError as setUserError,
} from '@/redux/features/user/userSlice';
import { useCallback, useState, type FC } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../Button/Button';
import { Input } from '../common/Input/Input';
import { VkIdAuthButton } from '../VkIdAuthButton/VkIdAuthButton';
import styles from './Auth.module.css';

// Закрепить за пользователем dance_id, которые он загружал анонимно.
// Сетевая ошибка не блокирует логин: dance_id остаются в localStorage
// и будут переотправлены при следующей авторизации.
const claimPendingUploads = async (): Promise<void> => {
	// После входа анонимный прогресс в шапке больше не нужен.
	clearAnonProgress();
	const ids = getPendingAnonymousUploads();
	if (ids.length === 0) return;
	try {
		await claimUploads(ids);
		clearPendingAnonymousUploads();
	} catch {
		/* оставляем в localStorage для следующей попытки */
	}
};

type AuthProps = {
	onSubmit: (
		payload: LoginPayload | RegisterPayload,
	) => Promise<BaseAuthResponse>;
	submitText: string;
	titleText: string;
	subTitleText?: string;
	isRegistration?: boolean;
};

export const Auth: FC<AuthProps> = ({
	onSubmit,
	submitText,
	titleText,
	subTitleText,
	isRegistration = false,
}) => {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	// Куда вернуться после успешной авторизации. Используется, чтобы пользователь
	// не «терял» страницу сравнения, если ушёл регистрироваться из неё.
	const returnToParam = searchParams.get('returnTo');
	const safeReturnTo =
		returnToParam && returnToParam.startsWith('/') && !returnToParam.startsWith('//')
			? returnToParam
			: null;

	const [login, setLogin] = useState('');
	const [password, setPassword] = useState('');
	const [repeatPassword, setRepeatPassword] = useState('');
	const [isRulesAccepted, setIsRulesAccepted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const redirectPath = isRegistration ? '/login' : '/register';
	const redirectClick = safeReturnTo
		? `${redirectPath}?returnTo=${encodeURIComponent(safeReturnTo)}`
		: redirectPath;
	const redirectText = isRegistration
		? 'Уже зарегистрированы?'
		: 'У меня нет аккаунта';

	const handleSubmit = useCallback(
		async (e: React.SubmitEvent<HTMLFormElement>) => {
			e.preventDefault();

			const validationResult = validateAuthForm({
				login,
				password,
				repeatPassword,
				isRegistration,
			});

			if (validationResult.hasError) {
				setError(validationResult.message);
				return;
			}

			if (isRegistration && !isRulesAccepted) {
				setError('Необходимо согласиться с правилами платформы');
				return;
			}

			try {
				const userData = await onSubmit({ login, password });
				dispatch(setUser(userData));
				await claimPendingUploads();
				navigate(safeReturnTo ?? '/');
				setError(null);
			} catch (err) {
				const errorMessage = getAuthErrorMessage(err);

				setError(errorMessage);
				dispatch(setUserError(errorMessage));
			}
		},
		[
			onSubmit,
			login,
			password,
			repeatPassword,
			isRegistration,
			isRulesAccepted,
			navigate,
			dispatch,
			safeReturnTo,
		],
	);

	const onChange = useCallback(
		(
			e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>,
			action: (value: React.SetStateAction<string>) => void,
		) => {
			action(e.target.value);

			if (error) {
				setError(null);
			}
		},
		[error],
	);

	const handleVkAuthenticated = useCallback(
		async (userData: BaseAuthResponse) => {
			dispatch(setUser(userData));
			await claimPendingUploads();
			navigate(safeReturnTo ?? '/');
		},
		[dispatch, navigate, safeReturnTo],
	);

	const handleVkError = useCallback(
		(message: string) => {
			setError(message);
			dispatch(setUserError(message));
		},
		[dispatch],
	);

	return (
		<div className={styles.wrapper}>
			<form className={styles.form} onSubmit={handleSubmit}>
				<div className={styles.header}>
					<h2 className={styles.title}>{titleText}</h2>
					{subTitleText && <h3 className={styles.subtitle}>{subTitleText}</h3>}
				</div>
				<div className={styles.inputsWrapper}>
					<Input
						className={styles.input}
						type="text"
						placeholder="Логин"
						value={login}
						onChange={(e) => onChange(e, setLogin)}
					/>
					<Input
						className={styles.input}
						type="password"
						placeholder="Пароль"
						value={password}
						withEye
						onChange={(e) => onChange(e, setPassword)}
					/>
					{isRegistration && (
						<Input
							withEye
							className={styles.input}
							type="password"
							placeholder="Повторите пароль"
							value={repeatPassword}
							onChange={(e) => onChange(e, setRepeatPassword)}
						/>
					)}
					<p className={styles.error} aria-live="polite">{error}</p>
				</div>
				{isRegistration && (
					<label className={styles.rulesConsent}>
						<input
							type="checkbox"
							checked={isRulesAccepted}
							onChange={(event) => {
								setIsRulesAccepted(event.target.checked);

								if (error) {
									setError(null);
								}
							}}
							className={styles.rulesCheckbox}
						/>
						<span>
							Регистрируясь на сайте, вы соглашаетесь с{' '}
							<Link to="/rules" className={styles.rulesLink}>
								правилами
							</Link>
						</span>
					</label>
				)}

				<Button className={styles.submitBtn} type="submit">
					{submitText}
				</Button>
				<VkIdAuthButton
					className={styles.vkidBtn}
					onAuthenticated={handleVkAuthenticated}
					onError={handleVkError}
				/>
				<a href={redirectClick}>{redirectText}</a>
			</form>
		</div>
	);
};
