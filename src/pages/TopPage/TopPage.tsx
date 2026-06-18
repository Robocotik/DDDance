import { getTopDancers, getTopDances, type TopDancerEntry } from '@/api/top';
import Loading from '@/components/Loading/Loading';
import VerticalVideo from '@/components/VerticalVideo/VerticalVideo';
import { S3_ADDRESS } from '@/consts/urls';
import type { TrendVideos } from '@/redux/features/trends/actions';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TopPage.module.scss';

type TabKey = 'dancers' | 'dances';

const MEDAL_COLORS: Record<number, string> = {
	0: '#FFD700',
	1: '#C0C0C0',
	2: '#CD7F32',
};

const MEDAL_LABELS: Record<number, string> = {
	0: '🥇',
	1: '🥈',
	2: '🥉',
};

function buildAvatarUrl(avatar: string): string {
	if (!avatar) {
		return '';
	}

	if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
		return avatar;
	}

	const base = (S3_ADDRESS || '').replace(/\/+$/, '');
	return `${base}/${avatar}`;
}

interface DancerRowProps {
	entry: TopDancerEntry;
	rank: number;
}

const DancerRow: React.FC<DancerRowProps> = ({ entry, rank }) => {
	const navigate = useNavigate();
	const isMedal = rank < 3;
	const medalColor = isMedal ? MEDAL_COLORS[rank] : undefined;

	return (
		<div
			className={`${styles.dancerRow} ${isMedal ? styles.dancerRowMedal : ''}`}
			style={medalColor ? { borderColor: `${medalColor}55` } : undefined}
			onClick={() => navigate(`/profile/${entry.user_id}`)}
		>
			<span
				className={styles.rank}
				style={medalColor ? { color: medalColor } : undefined}
			>
				{isMedal ? MEDAL_LABELS[rank] : `${rank + 1}`}
			</span>

			<img
				className={styles.avatar}
				src={buildAvatarUrl(entry.avatar)}
				alt={entry.username}
			/>

			<span className={styles.username}>{entry.username}</span>

			<div className={styles.dancerStats}>
				<span className={styles.avgScore}>
					{Math.round(entry.avg_score)}
					<span className={styles.scoreUnit}>/100</span>
				</span>
				<span className={styles.attemptCount}>
					{entry.attempt_count} попыток
				</span>
			</div>
		</div>
	);
};

const TopPage: React.FC = () => {
	const [activeTab, setActiveTab] = useState<TabKey>('dancers');

	const [dancers, setDancers] = useState<TopDancerEntry[]>([]);
	const [dancersLoading, setDancersLoading] = useState(true);
	const [dancersError, setDancersError] = useState(false);

	const [dances, setDances] = useState<TrendVideos | null>(null);
	const [dancesLoading, setDancesLoading] = useState(false);
	const [dancesError, setDancesError] = useState(false);
	const dancesLoadedRef = React.useRef(false);

	useEffect(() => {
		setDancersLoading(true);
		setDancersError(false);
		getTopDancers()
			.then(setDancers)
			.catch(() => setDancersError(true))
			.finally(() => setDancersLoading(false));
	}, []);

	useEffect(() => {
		if (activeTab !== 'dances' || dancesLoadedRef.current) {
			return;
		}

		dancesLoadedRef.current = true;
		setDancesLoading(true);
		setDancesError(false);
		getTopDances()
			.then(setDances)
			.catch(() => setDancesError(true))
			.finally(() => setDancesLoading(false));
	}, [activeTab]);

	return (
		<div className={styles.page}>
			<div className={styles.inner}>
				<h1 className={styles.pageTitle}>Топ</h1>

				<div className={styles.tabs}>
					<button
						className={`${styles.tabBtn} ${activeTab === 'dancers' ? styles.tabBtnActive : ''}`}
						onClick={() => setActiveTab('dancers')}
					>
						Топ танцоров
					</button>
					<button
						className={`${styles.tabBtn} ${activeTab === 'dances' ? styles.tabBtnActive : ''}`}
						onClick={() => setActiveTab('dances')}
					>
						Топ танцев
					</button>
				</div>

				{activeTab === 'dancers' && (
					<>
						{dancersLoading && (
							<div className={styles.loadingWrapper}>
								<Loading />
							</div>
						)}
						{!dancersLoading && dancersError && (
							<div className={styles.emptyState}>
								<p className={styles.emptyTitle}>Не удалось загрузить данные</p>
								<p className={styles.emptyHint}>Попробуйте позже</p>
							</div>
						)}
						{!dancersLoading && !dancersError && dancers.length === 0 && (
							<div className={styles.emptyState}>
								<p className={styles.emptyTitle}>Пока нет данных</p>
								<p className={styles.emptyHint}>
									Нужно минимум 3 попытки, чтобы попасть в топ
								</p>
							</div>
						)}
						{!dancersLoading && !dancersError && dancers.length > 0 && (
							<div className={styles.dancerList}>
								{dancers.map((entry, idx) => (
									<DancerRow key={entry.user_id} entry={entry} rank={idx} />
								))}
							</div>
						)}
					</>
				)}

				{activeTab === 'dances' && (
					<>
						{dancesLoading && (
							<div className={styles.loadingWrapper}>
								<Loading />
							</div>
						)}
						{!dancesLoading && dancesError && (
							<div className={styles.emptyState}>
								<p className={styles.emptyTitle}>Не удалось загрузить данные</p>
								<p className={styles.emptyHint}>Попробуйте позже</p>
							</div>
						)}
						{!dancesLoading &&
							!dancesError &&
							dances &&
							dances.videos.length === 0 && (
								<div className={styles.emptyState}>
									<p className={styles.emptyTitle}>Пока нет танцев</p>
								</div>
							)}
						{!dancesLoading &&
							!dancesError &&
							dances &&
							dances.videos.length > 0 && (
								<div className={styles.dancesGrid}>
									{dances.videos.map((video) => (
										<div key={video.id} className={styles.danceCard}>
											<VerticalVideo video={video} />
										</div>
									))}
								</div>
							)}
					</>
				)}
			</div>
		</div>
	);
};

export default TopPage;
