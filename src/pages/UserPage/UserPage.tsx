import React from 'react';
import UserInfo from '../../components/UserInfo/UserInfo';
import styles from './UserPage.module.scss';

const UserPage: React.FC = () => {
	return (
		<div className={styles.page}>
			<UserInfo />
		</div>
	);
};

export default UserPage;
