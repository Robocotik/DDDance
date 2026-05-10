import type { BaseAuthResponse } from '@/api/auth/register';
import React from 'react';
import Paragraph from '../Paragraph/Paragraph';
import UserHistory from '../UserHistory/UserHistory';
import styles from './UserInfo.module.scss';

type UserInfoProps = {
	user: BaseAuthResponse;
};

export const defaultAvatarURL =
	'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/assets/default_avatar.jpg';

const UserInfo: React.FC<UserInfoProps> = ({ user }) => {
	return (
		<div className={styles.container}>
			<div className={styles.avatarWrapper}>
				<img
					src={defaultAvatarURL}
					alt={user.login}
					className={styles.avatar}
				/>
			</div>
			<Paragraph level="1" opacity="100" className={styles.login}>
				{user.login}
			</Paragraph>
			<UserHistory />
		</div>
	);
};

export default UserInfo;
