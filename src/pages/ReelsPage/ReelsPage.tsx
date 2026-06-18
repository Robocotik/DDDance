import { getReelsAttempts, type ReelsAttemptItem } from '@/api/reels';
import AttemptReelCard from '@/components/AttemptReelCard/AttemptReelCard';
import ReelCard from '@/components/ReelCard/ReelCard';
import ReelsOnboarding from '@/components/ReelsOnboarding/ReelsOnboarding';
import {
	fetchMoreReelsThunk,
	fetchReelsFeedThunk,
	logBehavior,
	markViewedThunk,
	setCurrentIndex,
} from '@/redux/features/reels/reelsSlice';
import type { AppDispatch, RootState } from '@/redux/store';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './ReelsPage.module.scss';

const SKIPPED_FAST_THRESHOLD_MS = 2000;

type TabKey = 'dances' | 'attempts';

const ReelsPage: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const items = useSelector((s: RootState) => s.reels.items);
	const loading = useSelector((s: RootState) => s.reels.loading);
	const hasMore = useSelector((s: RootState) => s.reels.hasMore);

	const [activeTab, setActiveTab] = useState<TabKey>('dances');
	const [visibleIndex, setVisibleIndex] = useState(0);
	const [showOnboarding, setShowOnboarding] = useState(
		() => !localStorage.getItem('reels_onboarding_shown'),
	);

	const [attempts, setAttempts] = useState<ReelsAttemptItem[]>([]);
	const [attemptsLoading, setAttemptsLoading] = useState(false);
	const [attemptsLoaded, setAttemptsLoaded] = useState(false);
	const [visibleAttemptIndex, setVisibleAttemptIndex] = useState(0);

	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
	const attemptRefs = useRef<(HTMLDivElement | null)[]>([]);
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const loadMoreRef = useRef({ hasMore, loading });
	const visibleSinceRef = useRef<Map<number, number>>(new Map());

	useEffect(() => {
		loadMoreRef.current = { hasMore, loading };
	}, [hasMore, loading]);

	useEffect(() => {
		dispatch(fetchReelsFeedThunk());
	}, [dispatch]);

	useEffect(() => {
		if (activeTab !== 'attempts' || attemptsLoaded) {
			return;
		}

		const controller = new AbortController();
		setAttemptsLoading(true);
		getReelsAttempts(20, 0, controller.signal)
			.then((data) => {
				if (!controller.signal.aborted) {
					setAttempts(data ?? []);
					setAttemptsLoaded(true);
				}
			})
			.catch(() => {
				if (!controller.signal.aborted) {
					setAttempts([]);
					setAttemptsLoaded(true);
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setAttemptsLoading(false);
				}
			});

		return () => controller.abort();
	}, [activeTab, attemptsLoaded]);

	useEffect(() => {
		if (activeTab !== 'dances') {
			return;
		}

		const observers: IntersectionObserver[] = [];

		items.forEach((item, i) => {
			const el = itemRefs.current[i];

			if (!el) {
				return;
			}

			const obs = new IntersectionObserver(
				([entry]) => {
					if (entry.isIntersecting) {
						setVisibleIndex(i);
						dispatch(setCurrentIndex(i));
						dispatch(markViewedThunk(item.dance_id));
						visibleSinceRef.current.set(i, Date.now());
					} else {
						const since = visibleSinceRef.current.get(i);

						if (since !== undefined) {
							const elapsed = Date.now() - since;

							if (elapsed < SKIPPED_FAST_THRESHOLD_MS) {
								dispatch(
									logBehavior({
										dance_id: item.dance_id,
										action: 'skipped_fast',
										timestamp: Date.now(),
									}),
								);
							}

							visibleSinceRef.current.delete(i);
						}
					}
				},
				{ threshold: 0.6 },
			);

			obs.observe(el);
			observers.push(obs);
		});

		return () => observers.forEach((o) => o.disconnect());
	}, [items, dispatch, activeTab]);

	useEffect(() => {
		if (activeTab !== 'attempts') {
			return;
		}

		const observers: IntersectionObserver[] = [];

		attempts.forEach((_item, i) => {
			const el = attemptRefs.current[i];

			if (!el) {
				return;
			}

			const obs = new IntersectionObserver(
				([entry]) => {
					if (entry.isIntersecting) {
						setVisibleAttemptIndex(i);
					}
				},
				{ threshold: 0.6 },
			);

			obs.observe(el);
			observers.push(obs);
		});

		return () => observers.forEach((o) => o.disconnect());
	}, [attempts, activeTab]);

	const observeSentinel = useCallback(() => {
		const el = sentinelRef.current;

		if (!el) {
			return () => {};
		}

		const obs = new IntersectionObserver(
			([entry]) => {
				if (
					entry.isIntersecting &&
					loadMoreRef.current.hasMore &&
					!loadMoreRef.current.loading
				) {
					dispatch(fetchMoreReelsThunk());
				}
			},
			{ threshold: 0.1 },
		);

		obs.observe(el);
		return () => obs.disconnect();
	}, [dispatch]);

	useEffect(() => {
		if (activeTab === 'dances') {
			return observeSentinel();
		}

		return undefined;
	}, [items.length, observeSentinel, activeTab]);

	const handleOnboardingDismiss = () => {
		localStorage.setItem('reels_onboarding_shown', 'true');
		setShowOnboarding(false);
	};

	return (
		<div className={styles.outer}>
			{}
			<div className={styles.tabBar}>
				<button
					className={`${styles.tabBtn} ${activeTab === 'dances' ? styles.tabBtnActive : ''}`}
					onClick={() => setActiveTab('dances')}
				>
					Танцы
				</button>
				<button
					className={`${styles.tabBtn} ${activeTab === 'attempts' ? styles.tabBtnActive : ''}`}
					onClick={() => setActiveTab('attempts')}
				>
					Попытки
				</button>
			</div>

			{}
			<div
				className={styles.scroll}
				style={{ display: activeTab === 'dances' ? undefined : 'none' }}
			>
				{items.map((item, i) => (
					<div
						key={item.dance_id}
						ref={(el) => {
							itemRefs.current[i] = el;
						}}
						className={styles.snap}
					>
						<ReelCard
							item={item}
							similar={[...items.slice(i + 1), ...items.slice(0, i)].slice(
								0,
								4,
							)}
							isVisible={activeTab === 'dances' && i === visibleIndex}
							onVisible={() => {}}
							onWatchedFull={() => {
								dispatch(
									logBehavior({
										dance_id: item.dance_id,
										action: 'watched_full',
										timestamp: Date.now(),
									}),
								);
							}}
							onAttempt={() => {
								dispatch(
									logBehavior({
										dance_id: item.dance_id,
										action: 'attempted',
										timestamp: Date.now(),
									}),
								);
							}}
						/>
					</div>
				))}

				{loading && hasMore && (
					<div className={styles.spinnerWrap}>
						<div className={styles.spinner} />
					</div>
				)}

				<div ref={sentinelRef} className={styles.sentinel} />
			</div>

			{}
			<div
				className={styles.scroll}
				style={{ display: activeTab === 'attempts' ? undefined : 'none' }}
			>
				{attemptsLoading && (
					<div className={`${styles.snap} ${styles.spinnerWrap}`}>
						<div className={styles.spinner} />
					</div>
				)}

				{!attemptsLoading && attempts.length === 0 && attemptsLoaded && (
					<div className={`${styles.snap} ${styles.emptyWrap}`}>
						<p className={styles.emptyText}>Пока нет публичных попыток</p>
					</div>
				)}

				{attempts.map((item, i) => (
					<div
						key={item.attempt_id}
						ref={(el) => {
							attemptRefs.current[i] = el;
						}}
						className={styles.snap}
					>
						<AttemptReelCard
							item={item}
							isVisible={activeTab === 'attempts' && i === visibleAttemptIndex}
						/>
					</div>
				))}
			</div>

			{showOnboarding && activeTab === 'dances' && (
				<ReelsOnboarding onDismiss={handleOnboardingDismiss} />
			)}
		</div>
	);
};

export default ReelsPage;
