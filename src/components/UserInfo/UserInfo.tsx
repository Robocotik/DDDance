import type { BaseAuthResponse } from '@/api/auth/register';
import { S3_ADDRESS } from '@/consts/urls';
import React from 'react';
import Paragraph from '../Paragraph/Paragraph';
import UserHistory from '../UserHistory/UserHistory';
import styles from './UserInfo.module.scss';

type UserInfoProps = {
	user: BaseAuthResponse;
};

const DEFAULT_AVATAR =
	'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/avatars/default.jpg';

// eslint-disable-next-line react-refresh/only-export-components
export const avatarUrl = (avatar: string, updatedAt: string): string => {
	if (!avatar) {
		return DEFAULT_AVATAR;
	}

	if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
		return avatar;
	}

	const base = (S3_ADDRESS || '').replace(/\/+$/, '');
	const bust = encodeURIComponent(updatedAt || '');
	return `${base}/${avatar}?u=${bust}`;
};

const UserInfo: React.FC<UserInfoProps> = ({ user }) => {
	return (
		<div className={styles.container}>
			<div className={styles.avatarWrapper}>
				<img
					src={avatarUrl(user.avatar, user.updated_at)}
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
