import { selectUser } from '@/redux/features/user/selectors';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './RegisterCta.module.scss';

// После закрытия попап больше не показывается.
const DISMISS_KEY = 'dddance_register_cta_dismissed';

const isDismissed = (): boolean => {
	try {
		return localStorage.getItem(DISMISS_KEY) === 'true';
	} catch {
		return false;
	}
};

// Ненавязчивый попап-призыв к регистрации в углу экрана. Только для анонимов,
// закрывается крестиком и больше не появляется.
const RegisterCta: React.FC = () => {
	const navigate = useNavigate();
	const user = useSelector(selectUser);
	const [hidden, setHidden] = useState<boolean>(isDismissed);

	if (user || hidden) return null;

	const dismiss = () => {
		try {
			localStorage.setItem(DISMISS_KEY, 'true');
		} catch {
			/* localStorage недоступен — игнор */
		}
		setHidden(true);
	};

	return (
		<div className={styles.popup} role="dialog" aria-label="Регистрация">
			<button
				type="button"
				className={styles.close}
				onClick={dismiss}
				aria-label="Закрыть"
			>
				×
			</button>
			<h3 className={styles.title}>Зарегистрируйтесь для полного доступа</h3>
			<p className={styles.desc}>
				С аккаунтом — история и попытки, лайки, друзья и публикация своих
				танцев в общий доступ.
			</p>
			<button
				type="button"
				className={styles.btn}
				onClick={() => {
					dismiss();
					navigate('/register');
				}}
			>
				Зарегистрироваться
			</button>
		</div>
	);
};

export default RegisterCta;
