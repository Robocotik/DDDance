import React from 'react';
import { Link } from 'react-router-dom';

import { S3_ADDRESS } from '../../consts/urls';
import type { DanceAuthor } from '../../redux/features/lesson/actions';

import styles from './LessonAuthor.module.scss';

const DEFAULT_AVATAR =
	'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/assets/default_avatar.jpg';

const resolveAvatar = (avatar: string): string => {
	if (!avatar) {
		return DEFAULT_AVATAR;
	}

	if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
		return avatar;
	}

	const base = S3_ADDRESS.replace(/\/+$/, '');

	return `${base}/${avatar.replace(/^\/+/, '')}`;
};

interface LessonAuthorProps {
	author: DanceAuthor;
	className?: string;
}

const LessonAuthor: React.FC<LessonAuthorProps> = ({ author, className }) => (
	<Link
		to={`/profile/${author.id}`}
		className={`${styles.author}${className ? ` ${className}` : ''}`}
	>
		<img
			src={resolveAvatar(author.avatar)}
			alt={author.login}
			className={styles.avatar}
		/>
		<span className={styles.meta}>
			<span className={styles.label}>Автор</span>
			<span className={styles.login}>{author.login}</span>
		</span>
	</Link>
);

export default LessonAuthor;
