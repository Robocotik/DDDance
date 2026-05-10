import type { LoginPayload } from '@/api/auth/login';
import type { BaseAuthResponse, RegisterPayload } from '@/api/auth/register';
import { getAuthErrorMessage } from '@/helpers/getAuthErrorMessage';
import { validateAuthForm } from '@/helpers/validateAuthForm';
import {
	setUser,
	setError as setUserError,
} from '@/redux/features/user/userSlice';
import { useCallback, useState, type FC } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../Button/Button';
import { Input } from '../common/Input/Input';
import { VkIdAuthButton } from '../VkIdAuthButton/VkIdAuthButton';
import styles from './Auth.module.css';

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
	const [login, setLogin] = useState('');
	const [password, setPassword] = useState('');
	const [repeatPassword, setRepeatPassword] = useState('');
	const [isRulesAccepted, setIsRulesAccepted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const redirectClick = isRegistration ? '/login' : '/register';
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
				navigate('/');
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
		(userData: BaseAuthResponse) => {
			dispatch(setUser(userData));
			navigate('/');
		},
		[dispatch, navigate],
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
					{error && <p className={styles.error}>{error}</p>}
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
