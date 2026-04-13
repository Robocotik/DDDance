import type { BaseAuthResponse } from '@/api/auth/register';
import { logoutUser } from '@/redux/features/user/actions';
import type { AppDispatch } from '@/redux/store';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogoutMenuIcon } from '../icons/ProfileMenu/LogoutMenuIcon';
import { PasswordMenuIcon } from '../icons/ProfileMenu/PasswordMenuIcon';
import { SecurityMenuIcon } from '../icons/ProfileMenu/SecurityMenuIcon';
import { UserMenuIcon } from '../icons/ProfileMenu/UserMenuIcon';
import { defaultAvatarURL } from '../UserInfo/UserInfo';
import styles from './AvatarMenu.module.scss';

type AvatarMenuProps = {
	user: BaseAuthResponse;
};

export const AvatarMenu = ({ user }: AvatarMenuProps) => {
	const dispatch = useDispatch<AppDispatch>();
	const navigate = useNavigate();

	const logoutHandler = useCallback(async () => {
		await dispatch(logoutUser());
		navigate('/');
	}, [dispatch, navigate]);

	return (
		<div className={styles.avatarMenuWrapper}>
			<img src={defaultAvatarURL} alt={user.login} className={styles.avatar} />
			<div className={styles.avatarMenu}>
				<button
					type="button"
					className={styles.menuItem}
					onClick={() => navigate(`/profile/${user.id}`)}
				>
					<UserMenuIcon className={styles.menuIcon} />
					<span>Обновить аватар</span>
				</button>
				<button type="button" className={styles.menuItem}>
					<PasswordMenuIcon className={styles.menuIcon} />
					<span>Сменить пароль</span>
				</button>
				<button type="button" className={styles.menuItem}>
					<SecurityMenuIcon className={styles.menuIcon} />
					<span>Двухфакторная защита</span>
				</button>
				<button
					type="button"
					className={styles.menuItem}
					onClick={logoutHandler}
				>
					<LogoutMenuIcon className={styles.menuIcon} />
					<span>Выход из профиля</span>
				</button>
			</div>
		</div>
	);
};
