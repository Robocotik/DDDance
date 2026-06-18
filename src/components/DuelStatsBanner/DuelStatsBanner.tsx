import type { DuelStats } from '@/api/duels';
import React from 'react';
import styles from './DuelStatsBanner.module.scss';

interface Props {
	stats: DuelStats;
}

const DuelStatsBanner: React.FC<Props> = ({ stats }) => {
	if (stats.total === 0) {
		return <p className={styles.empty}>Ещё не участвовал в дуэлях</p>;
	}

	return (
		<div className={styles.banner}>
			<div className={styles.chip}>
				<span className={styles.chipValue}>{stats.total}</span>
				<span className={styles.chipLabel}>Всего дуэлей</span>
			</div>
			<div className={styles.chip}>
				<span className={styles.chipValue}>{Math.round(stats.win_rate)}%</span>
				<span className={styles.chipLabel}>Победы</span>
			</div>
			<div className={styles.chip}>
				<span className={styles.chipValue}>{stats.wins}</span>
				<span className={styles.chipLabel}>Побед</span>
			</div>
			<div className={styles.chip}>
				<span className={styles.chipValue}>{stats.avg_score.toFixed(1)}</span>
				<span className={styles.chipLabel}>Ср. счёт</span>
			</div>
		</div>
	);
};

export default React.memo(DuelStatsBanner);
