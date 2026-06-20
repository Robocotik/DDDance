import type { TrendingItem } from '@/api/dances/trending';
import { getTrendingWeek } from '@/api/dances/trending';
import { resolveS3Url } from '@/consts/urls';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon/Icon';
import Title from '../Title/Title';
import styles from './TrendingWeek.module.scss';

const RANK_ICONS = [
	'medal-gold',
	'medal-silver',
	'medal-bronze',
	'rank-4',
	'rank-5',
];

interface TrendCardProps {
	item: TrendingItem;
	rank: number;
}

const TrendCard: React.FC<TrendCardProps> = ({ item, rank }) => {
	const navigate = useNavigate();
	const videoRef = useRef<HTMLVideoElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = videoRef.current;
		const wrapper = wrapperRef.current;

		if (!el || !wrapper) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						el.muted = true;
						// eslint-disable-next-line sonarjs/no-nested-functions
						el.play().catch(() => {});
					} else {
						el.pause();
					}
				});
			},
			{ threshold: 0.25 },
		);

		observer.observe(wrapper);

		return () => {
			observer.disconnect();
			el.pause();
		};
	}, []);

	const hasStats =
		item.like_count !== undefined ||
		item.view_count !== undefined ||
		item.attempt_count !== undefined;

	return (
		<div
			ref={wrapperRef}
			className={styles.card}
			onClick={() => navigate(`/lesson/${item.id}?segment=full`)}
		>
			<video
				ref={videoRef}
				className={styles.cardVideo}
				src={resolveS3Url(item.url)}
				muted
				loop
				playsInline
				preload="none"
				disablePictureInPicture
				disableRemotePlayback
				controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
			/>
			<span className={styles.rank}>
				{RANK_ICONS[rank] ? (
					<Icon name={RANK_ICONS[rank]} size="1em" alt={`Место ${rank + 1}`} />
				) : (
					`${rank + 1}`
				)}
			</span>
			{(item.title || hasStats) && (
				<div className={styles.cardOverlay}>
					{item.title && <span className={styles.cardTitle}>{item.title}</span>}
					{hasStats && (
						<div className={styles.cardStats}>
							{item.like_count !== undefined && (
								<span className={styles.cardStat}>
									<Icon name="heart-filled" size="2em" alt="Лайков" />{' '}
									{item.like_count}
								</span>
							)}
							{item.view_count !== undefined && (
								<span className={styles.cardStat}>
									<Icon name="eye" size="2em" alt="Просмотров" />{' '}
									{item.view_count}
								</span>
							)}
							{item.attempt_count !== undefined && (
								<span className={styles.cardStat}>
									<Icon name="star" size="2em" alt="Попыток" />{' '}
									{item.attempt_count}
								</span>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

const TrendingWeek: React.FC = () => {
	const [items, setItems] = useState<TrendingItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getTrendingWeek()
			.then((data) => setItems(data.videos))
			.catch(() => setItems([]))
			.finally(() => setLoading(false));
	}, []);

	if (loading || items.length === 0) {
		return null;
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<Title className={styles.title}>Популярное на этой неделе</Title>
				<span className={styles.badge}>
					<Icon name="fire" size="1em" alt="" /> Trending
				</span>
			</div>
			<div className={styles.grid}>
				{items.slice(0, 5).map((item, i) => (
					<TrendCard key={item.id} item={item} rank={i} />
				))}
			</div>
		</div>
	);
};

export default TrendingWeek;
