import React from 'react';
import PencilIcon from '../../assets/svg/pencil.svg';
import Paragraph from '../Paragraph/Paragraph';
import styles from './UserInfo.module.scss';

const UserInfo: React.FC = () => {
	return (
		<div className={styles.container}>
			<div className={styles.avatarWrapper}>
				<img src={'#'} alt="User avatar" className={styles.avatar} />
				<img src={PencilIcon} alt="Edit" className={styles.editIcon} />
			</div>
			<Paragraph className={styles.login}>Login</Paragraph>
		</div>
	);
};

export default UserInfo;
