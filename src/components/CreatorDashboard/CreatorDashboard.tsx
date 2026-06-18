import type { CreatorAnalytics } from '@/api/users/profile';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreatorDashboard.module.scss';

interface Props {
	data: CreatorAnalytics;
}

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const formatDayLabel = (dateStr: string): string => {
	const d = new Date(dateStr);
	return DAY_LABELS[d.getDay()];
};

const BAR_W = 28;
const BAR_H = 80;
const GAP = 8;

const CreatorDashboard: React.FC<Props> = ({ data }) => {
	const navigate = useNavigate();
	const { daily, top_dances } = data;

	const maxViews = Math.max(...daily.map((d) => d.views), 1);
	const totalViews = daily.reduce((s, d) => s + d.views, 0);
	const totalLikes = daily.reduce((s, d) => s + d.likes, 0);
	const totalAttempts = daily.reduce((s, d) => s + d.attempts, 0);

	const svgW = daily.length * (BAR_W + GAP) - GAP;

	return (
		<div className={styles.wrap}>
			<div className={styles.summary}>
				<div className={styles.summaryItem}>
					<span className={styles.summaryValue}>{totalViews}</span>
					<span className={styles.summaryLabel}>просмотров</span>
				</div>
				<div className={styles.summarySep} />
				<div className={styles.summaryItem}>
					<span className={styles.summaryValue}>{totalLikes}</span>
					<span className={styles.summaryLabel}>лайков</span>
				</div>
				<div className={styles.summarySep} />
				<div className={styles.summaryItem}>
					<span className={styles.summaryValue}>{totalAttempts}</span>
					<span className={styles.summaryLabel}>попыток</span>
				</div>
				<div className={styles.summaryPeriod}>за 7 дней</div>
			</div>

			<div className={styles.section}>
				<p className={styles.sectionTitle}>Просмотры по дням</p>
				<svg
					width={svgW}
					height={BAR_H + 24}
					className={styles.chart}
					overflow="visible"
				>
					{daily.map((d, i) => {
						const barH =
							maxViews === 0 ? 2 : Math.max(2, (d.views / maxViews) * BAR_H);

						const x = i * (BAR_W + GAP);
						const y = BAR_H - barH;
						return (
							<g key={d.day}>
								<rect
									x={x}
									y={y}
									width={BAR_W}
									height={barH}
									rx={4}
									className={styles.bar}
								>
									<title>{`${d.day}: ${d.views} просм.`}</title>
								</rect>
								<text
									x={x + BAR_W / 2}
									y={BAR_H + 18}
									textAnchor="middle"
									className={styles.barLabel}
								>
									{formatDayLabel(d.day)}
								</text>
							</g>
						);
					})}
				</svg>
			</div>

			{top_dances.length > 0 && (
				<div className={styles.section}>
					<p className={styles.sectionTitle}>Топ танцев по попыткам</p>
					<div className={styles.topList}>
						{top_dances.map((dance, i) => {
							const maxAtt = Math.max(...top_dances.map((t) => t.attempts), 1);
							const pct = (dance.attempts / maxAtt) * 100;
							return (
								<div
									key={dance.dance_id}
									className={styles.topItem}
									onClick={() => navigate(`/lesson/${dance.dance_id}`)}
									role="link"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											navigate(`/lesson/${dance.dance_id}`);
										}
									}}
								>
									<span className={styles.topRank}>#{i + 1}</span>
									<div className={styles.topInfo}>
										<span className={styles.topTitle}>
											{dance.title || 'Без названия'}
										</span>
										<div className={styles.topBar}>
											<div
												className={styles.topBarFill}
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>
									<span className={styles.topCount}>{dance.attempts}</span>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};

export default CreatorDashboard;
