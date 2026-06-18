import {
	getDuelHistory,
	getDuelStats,
	type DuelStats,
	type DuelStatus,
	type DuelWithUsers,
} from '@/api/duels';
import DuelCard from '@/components/DuelCard/DuelCard';
import DuelStatsBanner from '@/components/DuelStatsBanner/DuelStatsBanner';
import Loading from '@/components/Loading/Loading';
import {
	selectIsAuthChecked,
	selectUser,
} from '@/redux/features/user/selectors';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import styles from './DuelsPage.module.scss';

const ACTIVE_STATUSES: DuelStatus[] = [
	'pending',
	'active',
	'challenger_done',
	'opponent_done',
];

const HISTORY_STATUSES: DuelStatus[] = ['completed', 'expired', 'declined'];

type TabKey = 'active' | 'history';

const PAGE_LIMIT = 20;

const DuelsPage: React.FC = () => {
	const isAuthChecked = useSelector(selectIsAuthChecked);
	const user = useSelector(selectUser);

	const [duels, setDuels] = useState<DuelWithUsers[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const offsetRef = useRef(0);
	const [duelStats, setDuelStats] = useState<DuelStats | null>(null);

	const [activeTab, setActiveTab] = useState<TabKey>('active');

	const fetchDuels = async (offset: number, append: boolean) => {
		if (append) {
			setLoadingMore(true);
		} else {
			setLoading(true);
			setError(null);
		}

		try {
			const data = await getDuelHistory(PAGE_LIMIT, offset);
			setDuels((prev) => (append ? [...prev, ...data.duels] : data.duels));

			setHasMore(data.pagination.has_more);
			offsetRef.current = offset + data.duels.length;
		} catch {
			if (!append) {
				setError('Не удалось загрузить дуэли. Попробуйте позже.');
			}
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	};

	const refreshDuels = async () => {
		try {
			const data = await getDuelHistory(PAGE_LIMIT, 0);
			setDuels(data.duels);
			setHasMore(data.pagination.has_more);
			offsetRef.current = data.duels.length;
		} catch {}
	};

	useEffect(() => {
		if (!user) {
			return;
		}

		offsetRef.current = 0;
		void fetchDuels(0, false);
		getDuelStats()
			.then(setDuelStats)
			.catch(() => setDuelStats(null));
	}, [user]);

	if (isAuthChecked && !user) {
		return <Navigate to="/login" replace />;
	}

	const activeDuels = duels.filter((d) => ACTIVE_STATUSES.includes(d.status));

	const historyDuels = duels.filter((d) => HISTORY_STATUSES.includes(d.status));

	const shownDuels = activeTab === 'active' ? activeDuels : historyDuels;

	const handleLoadMore = () => {
		void fetchDuels(offsetRef.current, true);
	};

	return (
		<div className={styles.page}>
			<div className={styles.inner}>
				<h1 className={styles.pageTitle}>Дуэли</h1>

				{duelStats && <DuelStatsBanner stats={duelStats} />}

				<div className={styles.tabs}>
					<button
						className={`${styles.tabBtn} ${activeTab === 'active' ? styles.tabBtnActive : ''}`}
						onClick={() => setActiveTab('active')}
					>
						Активные
						{activeDuels.length > 0 && (
							<span className={styles.tabBadge}>{activeDuels.length}</span>
						)}
					</button>
					<button
						className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
						onClick={() => setActiveTab('history')}
					>
						История
					</button>
				</div>

				{loading && (
					<div className={styles.loadingWrapper}>
						<Loading />
					</div>
				)}

				{!loading && error && (
					<div className={styles.emptyState}>
						<p className={styles.emptyTitle}>Что-то пошло не так</p>
						<p className={styles.emptyHint}>{error}</p>
					</div>
				)}

				{!loading && !error && shownDuels.length === 0 && (
					<div className={styles.emptyState}>
						<p className={styles.emptyTitle}>
							{activeTab === 'active' ? 'Нет активных дуэлей' : 'История пуста'}
						</p>
						<p className={styles.emptyHint}>
							{activeTab === 'active'
								? 'Бросьте вызов другому танцору на странице его профиля'
								: 'Завершённые дуэли появятся здесь'}
						</p>
					</div>
				)}

				{!loading && !error && shownDuels.length > 0 && (
					<div className={styles.list}>
						{shownDuels.map((duel) => (
							<DuelCard
								key={duel.id}
								duel={duel}
								onChanged={() => void refreshDuels()}
							/>
						))}
					</div>
				)}

				{!loading && hasMore && (
					<div className={styles.loadMoreWrapper}>
						<button
							className={styles.loadMoreBtn}
							onClick={handleLoadMore}
							disabled={loadingMore}
						>
							{loadingMore ? 'Загружаем...' : 'Показать ещё'}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default DuelsPage;
