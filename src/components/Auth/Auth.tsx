import type { LoginPayload } from '@/api/auth/login';
import type { BaseAuthResponse } from '@/api/auth/register';
import { useCallback, useState, type FC } from 'react';
import Button from '../Button/Button';
import { Input } from '../common/Input/Input';
import styles from './Auth.module.css';

type AuthProps = {
	onSubmit: (payload: LoginPayload) => Promise<BaseAuthResponse>;
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
	const [login, setLogin] = useState('');
	const [password, setPassword] = useState('');
	const [repeatPassword, setRepeatPassword] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = useCallback(
		(e: React.SubmitEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (isRegistration && password !== repeatPassword) {
				setError('Пароли не совпадают');
				return;
			}
			onSubmit({ login, password });
		},
		[onSubmit, login, password],
	);

	return (
		<div className={styles.wrapper}>
			<form className={styles.form} onSubmit={handleSubmit}>
				<div className={styles.header}>
					<h2 className={styles.title}>{titleText}</h2>
					{subTitleText && <h3 className={styles.subtitle}>{subTitleText}</h3>}
				</div>

				<Input
					className={styles.input}
					type="text"
					placeholder="Логин"
					value={login}
					onChange={(e) => setLogin(e.target.value)}
				/>
				<Input
					className={styles.input}
					type="password"
					placeholder="Пароль"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				{isRegistration && (
					<Input
						withEye
						className={styles.input}
						type="password"
						placeholder="Повторите пароль"
						value={repeatPassword}
						onChange={(e) => setRepeatPassword(e.target.value)}
					/>
				)}
				{error && <p className={styles.error}>{error}</p>}
				<Button className={styles.submitBtn} type="submit">
					{submitText}
				</Button>
			</form>
		</div>
	);
};
