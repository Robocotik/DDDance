import type { ProfileStats } from '@/api/users/profile';
import Icon from '@/components/Icon/Icon';
import React from 'react';
import styles from './ProfileStatsBanner.module.scss';

interface Props {
	stats: ProfileStats;
}

const ProfileStatsBanner: React.FC<Props> = ({ stats }) => (
	<div className={styles.banner}>
		<div className={styles.chip}>
			<Icon name="clapper" size="1em" alt="Попытки" />
			<span className={styles.value}>{stats.attempt_count}</span>
			<span className={styles.label}>попыток</span>
		</div>
		<div className={styles.chip}>
			<Icon name="star" size="1em" alt="Лучший скор" />
			<span className={styles.value}>{Math.round(stats.max_score)}%</span>
			<span className={styles.label}>лучший скор</span>
		</div>
		<div className={styles.chip}>
			<Icon name="medal-gold" size="1em" alt="Победы в дуэлях" />
			<span className={styles.value}>{stats.duel_win_count}</span>
			<span className={styles.label}>дуэлей выиграно</span>
		</div>
		<div className={styles.chip}>
			<Icon name="dancer" size="1em" alt="Танцев" />
			<span className={styles.value}>{stats.unique_dance_count}</span>
			<span className={styles.label}>танцев</span>
		</div>
	</div>
);

export default React.memo(ProfileStatsBanner);
