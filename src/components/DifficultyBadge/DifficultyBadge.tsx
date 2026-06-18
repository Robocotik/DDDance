import React from 'react';

import {
	DIFFICULTY_COLOR,
	DIFFICULTY_LABEL,
	type Difficulty,
} from '../../consts/danceDifficulty';

import styles from './DifficultyBadge.module.scss';

interface DifficultyBadgeProps {
	difficulty: Difficulty;
	byUsers?: boolean;
}

const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({
	difficulty,
	byUsers,
}) => (
	<span
		className={styles.badge}
		title={
			byUsers
				? 'Сложность по оценкам пользователей'
				: 'Сложность по оценке автора'
		}
		style={{
			background: `${DIFFICULTY_COLOR[difficulty]}22`,
			color: DIFFICULTY_COLOR[difficulty],
			border: `1px solid ${DIFFICULTY_COLOR[difficulty]}55`,
		}}
	>
		{DIFFICULTY_LABEL[difficulty]}
	</span>
);

export default DifficultyBadge;
