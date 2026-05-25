import type { HistoryItem } from '@/api/users/history';
import { S3_ADDRESS } from '@/consts/urls';
import {
	selectHistoryItems,
	selectHistoryLoading,
} from '@/redux/features/history/selectors';
import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon/Icon';
import Title from '../Title/Title';
import styles from './BestAttempts.module.scss';

const MEDAL_ICONS = ['medal-gold', 'medal-silver', 'medal-bronze'];
const MEDAL_STYLES = [styles.cardGold, styles.cardSilver, styles.cardBronze];

const scoreColor = (score: number): string => {
	if (score >= 75) return '#6fff9e';
	if (score >= 50) return '#ffd166';
	return '#ff6b6b';
};

interface AttemptCardProps {
	item: HistoryItem;
	rank: number;
}

const AttemptCard: React.FC<AttemptCardProps> = ({ item, rank }) => {
	const navigate = useNavigate();
	const videoSrc = `${(S3_ADDRESS || '').replace(/\/+$/, '')}/results/${item.dance_id}/video.mp4`;
	const score = item.score ?? 0;

	return (
		<div
			className={`${styles.card} ${MEDAL_STYLES[rank] ?? ''}`}
			onClick={() => navigate(`/lesson/${item.dance_id}?segment=full`)}
		>
			<span className={styles.medal}>
				{MEDAL_ICONS[rank] && (
					<Icon name={MEDAL_ICONS[rank]} size="1em" alt={`Место ${rank + 1}`} />
				)}
			</span>

			<video
				className={styles.thumb}
				src={videoSrc}
				muted
				loop
				autoPlay
				playsInline
				preload="metadata"
				disablePictureInPicture
				disableRemotePlayback
			/>

			<div className={styles.info}>
				<span className={styles.name}>{item.name || 'Танец'}</span>
				<span className={styles.date}>
					{new Date(item.created_at).toLocaleDateString('ru-RU', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					})}
				</span>
			</div>

			<div className={styles.scoreBlock}>
				<span
					className={styles.scoreValue}
					style={{ color: scoreColor(score) }}
				>
					{Math.round(score)}
				</span>
				<span className={styles.scoreLabel}>/ 100</span>
			</div>
		</div>
	);
};

const BestAttempts: React.FC = () => {
	const items = useSelector(selectHistoryItems) ?? [];
	const loading = useSelector(selectHistoryLoading);

	const itemsWithScore = items.filter((i) => i.score != null && i.score > 0);
	const top3 = [...itemsWithScore]
		.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
		.slice(0, 3);

	if (loading) return null;

	return (
		<section className={styles.section}>
			<Title className={styles.title}>Лучшая попытка</Title>
			{top3.length === 0 ? (
				<p className={styles.empty}>
					Пройди хотя бы один танец до конца, чтобы увидеть свой топ
				</p>
			) : (
				<div className={styles.list}>
					{top3.map((item, i) => (
						<AttemptCard key={item.id} item={item} rank={i} />
					))}
				</div>
			)}
		</section>
	);
};

export default BestAttempts;
