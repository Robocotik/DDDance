import type { DuelWithUsers } from '@/api/duels';
import { getPublicDuels } from '@/api/duels';
import { S3_ADDRESS } from '@/consts/urls';
import React, { useEffect, useState } from 'react';
import styles from './PublicDuelsPage.module.scss';

const LIMIT = 20;

const resolveAvatar = (url: string): string => {
	if (!url) {
		return '';
	}

	return url.startsWith('http') ? url : `${S3_ADDRESS}/${url}`;
};

const PublicDuelCard: React.FC<{ duel: DuelWithUsers }> = ({ duel }) => {
	const challengerWon = duel.winner_id === duel.challenger_id;
	const opponentWon = duel.winner_id === duel.opponent_id;

	const completedDate = duel.completed_at
		? new Date(duel.completed_at).toLocaleDateString('ru-RU', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			})
		: '';

	return (
		<div className={styles.card}>
			<div className={styles.topRow}>
				<span className={styles.completedBadge}>Завершена</span>
				{completedDate && <span className={styles.date}>{completedDate}</span>}
			</div>

			<div className={styles.participants}>
				<div className={styles.side}>
					{resolveAvatar(duel.challenger_avatar) ? (
						<img
							className={styles.avatar}
							src={resolveAvatar(duel.challenger_avatar)}
							alt={duel.challenger_login}
						/>
					) : (
						<div className={styles.avatarPlaceholder}>
							{duel.challenger_login?.[0]?.toUpperCase() ?? '?'}
						</div>
					)}
					<span
						className={`${styles.login} ${challengerWon ? styles.loginWinner : ''}`}
					>
						{duel.challenger_login}
						{challengerWon && ' 🏆'}
					</span>
				</div>

				<span className={styles.vs}>vs</span>

				<div className={styles.side}>
					{resolveAvatar(duel.opponent_avatar) ? (
						<img
							className={styles.avatar}
							src={resolveAvatar(duel.opponent_avatar)}
							alt={duel.opponent_login}
						/>
					) : (
						<div className={styles.avatarPlaceholder}>
							{duel.opponent_login?.[0]?.toUpperCase() ?? '?'}
						</div>
					)}
					<span
						className={`${styles.login} ${opponentWon ? styles.loginWinner : ''}`}
					>
						{duel.opponent_login}
						{opponentWon && ' 🏆'}
					</span>
				</div>
			</div>

			{duel.dance_title && (
				<p className={styles.danceTitle}>{duel.dance_title}</p>
			)}

			<div className={styles.scores}>
				<div
					className={`${styles.scoreBlock} ${challengerWon ? styles.scoreBlockWinner : ''}`}
				>
					<span className={styles.scoreLabel}>{duel.challenger_login}</span>
					<span className={styles.scoreValue}>
						{duel.challenger_score != null
							? Math.round(duel.challenger_score)
							: '—'}
					</span>
				</div>
				<div
					className={`${styles.scoreBlock} ${opponentWon ? styles.scoreBlockWinner : ''}`}
				>
					<span className={styles.scoreLabel}>{duel.opponent_login}</span>
					<span className={styles.scoreValue}>
						{duel.opponent_score != null
							? Math.round(duel.opponent_score)
							: '—'}
					</span>
				</div>
			</div>

			{duel.winner_id == null && <p className={styles.winnerLabel}>🤝 Ничья</p>}
		</div>
	);
};

const PublicDuelsPage: React.FC = () => {
	const [duels, setDuels] = useState<DuelWithUsers[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const [offset, setOffset] = useState(0);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(false);
		getPublicDuels(LIMIT, 0)
			.then((res) => {
				if (cancelled) {
					return;
				}

				setDuels(res.duels ?? []);
				setHasMore(res.pagination?.has_more ?? false);
				setOffset(LIMIT);
			})
			.catch(() => {
				if (!cancelled) {
					setError(true);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const handleLoadMore = async () => {
		setLoadingMore(true);

		try {
			const res = await getPublicDuels(LIMIT, offset);
			setDuels((prev) => [...prev, ...(res.duels ?? [])]);
			setHasMore(res.pagination?.has_more ?? false);
			setOffset((o) => o + LIMIT);
		} catch {
		} finally {
			setLoadingMore(false);
		}
	};

	let pageContent: React.ReactNode;

	if (loading) {
		pageContent = (
			<div className={styles.loadingWrapper}>
				<span style={{ color: 'rgba(255,255,255,0.4)' }}>Загрузка...</span>
			</div>
		);
	} else if (error) {
		pageContent = (
			<div className={styles.emptyState}>
				<p className={styles.emptyTitle}>Не удалось загрузить дуэли</p>
				<p className={styles.emptyHint}>Попробуйте обновить страницу</p>
			</div>
		);
	} else if (duels.length === 0) {
		pageContent = (
			<div className={styles.emptyState}>
				<p className={styles.emptyTitle}>Пока ничего нет</p>
				<p className={styles.emptyHint}>
					Здесь появятся дуэли, которые участники отметили как публичные
				</p>
			</div>
		);
	} else {
		pageContent = (
			<>
				<div className={styles.list}>
					{duels.map((d) => (
						<PublicDuelCard key={d.id} duel={d} />
					))}
				</div>

				{hasMore && (
					<div className={styles.loadMoreWrapper}>
						<button
							className={styles.loadMoreBtn}
							onClick={handleLoadMore}
							disabled={loadingMore}
						>
							{loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
						</button>
					</div>
				)}
			</>
		);
	}

	return (
		<div className={styles.page}>
			<div className={styles.inner}>
				<h1 className={styles.pageTitle}>Публичные дуэли</h1>
				<p className={styles.pageSubtitle}>
					Завершённые дуэли, которые участники сделали публичными
				</p>

				{pageContent}
			</div>
		</div>
	);
};

export default PublicDuelsPage;
