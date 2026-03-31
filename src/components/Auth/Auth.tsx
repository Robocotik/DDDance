import type { LoginPayload } from '@/api/auth/login';
import type { BaseAuthResponse, RegisterPayload } from '@/api/auth/register';
import { validateAuthForm } from '@/helpers/validateAuthForm';
import {
	setUser,
	setError as setUserError,
} from '@/redux/features/user/userSlice';
import { useCallback, useState, type FC } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Button from '../Button/Button';
import { Input } from '../common/Input/Input';
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
	const [error, setError] = useState<string | null>(null);

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

			try {
				const userData = await onSubmit({ login, password });
				dispatch(setUser(userData));
				navigate('/');
				setError(null);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Ошибка при входе';
				setError(errorMessage);
				dispatch(setUserError(errorMessage));
			}
		},
		[onSubmit, login, password, repeatPassword, isRegistration, dispatch],
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

				<Button className={styles.submitBtn} type="submit">
					{submitText}
				</Button>
			</form>
		</div>
	);
};
