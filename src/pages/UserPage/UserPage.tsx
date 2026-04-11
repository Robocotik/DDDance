import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

import UserInfo from '../../components/UserInfo/UserInfo';
import {
	selectIsAuthChecked,
	selectIsUserAuthenticated,
	selectUser,
	selectUserLoading,
} from '../../redux/features/user/selectors';
import styles from './UserPage.module.scss';

const UserPage: React.FC = () => {
	const user = useSelector(selectUser);
	const isAuthenticated = useSelector(selectIsUserAuthenticated);
	const isLoading = useSelector(selectUserLoading);
	const isAuthChecked = useSelector(selectIsAuthChecked);

	if (!isAuthChecked || isLoading) {
		return null;
	}

	if (!isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	return (
		<div className={styles.page}>
			<UserInfo user={user!} />
		</div>
	);
};

export default UserPage;
