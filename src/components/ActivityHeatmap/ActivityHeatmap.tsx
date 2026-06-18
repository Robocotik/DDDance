import { getUserActivity, type ActivityEntry } from '@/api/users/profile';
import React, { useEffect, useState } from 'react';
import styles from './ActivityHeatmap.module.scss';

interface Props {
	userId: string;
}

const WEEKS = 52;
const DAYS_PER_WEEK = 7;
const TOTAL_DAYS = WEEKS * DAYS_PER_WEEK;

const MONTH_NAMES_RU = [
	'янв',
	'фев',
	'мар',
	'апр',
	'май',
	'июн',
	'июл',
	'авг',
	'сен',
	'окт',
	'ноя',
	'дек',
];

const toDateStr = (d: Date): string =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const buildGrid = (
	data: ActivityEntry[],
): { date: string; count: number }[] => {
	const countMap: Record<string, number> = {};

	for (const e of data) {
		countMap[e.day] = e.count;
	}

	const today = new Date();
	const cells: { date: string; count: number }[] = [];

	for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(today.getDate() - i);
		const dateStr = toDateStr(d);
		cells.push({ date: dateStr, count: countMap[dateStr] ?? 0 });
	}

	return cells;
};

const levelClass = (count: number, s: typeof styles): string => {
	if (count === 0) {
		return s.level0;
	}

	if (count <= 2) {
		return s.level1;
	}

	if (count <= 5) {
		return s.level2;
	}

	return s.level3;
};

const formatDate = (dateStr: string): string => {
	const [y, m, d] = dateStr.split('-');
	return `${d} ${MONTH_NAMES_RU[parseInt(m, 10) - 1]} ${y}`;
};

const pluralizeAttempts = (n: number): string =>
	n === 1 ? 'попытка' : 'попыток';

const ActivityHeatmap: React.FC<Props> = ({ userId }) => {
	const [data, setData] = useState<ActivityEntry[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		getUserActivity(userId, controller.signal)
			.then((data) => {
				if (!controller.signal.aborted) {
					setData(data);
				}
			})
			.catch(() => {
				if (!controller.signal.aborted) {
					setData([]);
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setLoading(false);
				}
			});

		return () => controller.abort();
	}, [userId]);

	if (loading || data.length === 0) {
		return null;
	}

	const cells = buildGrid(data);
	const totalAttempts = data.reduce((sum, e) => sum + e.count, 0);

	return (
		<div className={styles.wrap}>
			<div className={styles.header}>
				<span className={styles.title}>Активность</span>
				<span className={styles.total}>{totalAttempts} попыток за год</span>
			</div>
			<div className={styles.grid}>
				{cells.map((cell) => (
					<div
						key={cell.date}
						className={`${styles.cell} ${levelClass(cell.count, styles)}`}
						title={
							cell.count > 0
								? `${formatDate(cell.date)}: ${cell.count} ${pluralizeAttempts(cell.count)}`
								: formatDate(cell.date)
						}
					/>
				))}
			</div>
			<div className={styles.legend}>
				<span className={styles.legendLabel}>меньше</span>
				<div className={`${styles.legendCell} ${styles.level0}`} />
				<div className={`${styles.legendCell} ${styles.level1}`} />
				<div className={`${styles.legendCell} ${styles.level2}`} />
				<div className={`${styles.legendCell} ${styles.level3}`} />
				<span className={styles.legendLabel}>больше</span>
			</div>
		</div>
	);
};

export default React.memo(ActivityHeatmap);
