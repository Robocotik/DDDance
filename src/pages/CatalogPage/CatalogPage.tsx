import type { CatalogSort, DanceItem, Difficulty } from '@/api/dances/catalog';
import { getDancesCatalog } from '@/api/dances/catalog';
import Icon from '@/components/Icon/Icon';
import Loading from '@/components/Loading/Loading';
import { S3_ADDRESS } from '@/consts/urls';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CatalogPage.module.scss';

function formatDuration(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

const SORT_OPTIONS: { value: CatalogSort; label: string; icon: string }[] = [
	{ value: 'popular', label: 'Популярное', icon: 'fire' },
	{ value: 'newest', label: 'Новое', icon: 'new-badge' },
	{ value: 'easy', label: 'Лёгкие', icon: 'sprout' },
	{ value: 'medium', label: 'Для продвинутых', icon: 'flame' },
	{ value: 'hard', label: 'Сложные', icon: 'flame-hard' },
];

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	easy: 'Easy',
	medium: 'Medium',
	hard: 'Hard',
};

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
	easy: '#6fff9e',
	medium: '#ffd166',
	hard: '#ff6b6b',
};

interface DanceCardProps {
	dance: DanceItem;
	autoplay: boolean;
}

const DanceCard: React.FC<DanceCardProps> = ({ dance, autoplay }) => {
	const navigate = useNavigate();
	const diff = dance.difficulty;
	const videoRef = useRef<HTMLVideoElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);

	let videoSrc: string | undefined;

	if (dance.url) {
		videoSrc = dance.url.startsWith('http')
			? dance.url
			: S3_ADDRESS + dance.url;
	}

	useEffect(() => {
		const video = videoRef.current;

		if (!autoplay) {
			video?.pause();
			return;
		}

		const wrapper = wrapperRef.current;

		if (!wrapper || !video) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					video.play().catch(() => {});
				} else {
					video.pause();
				}
			},
			{ threshold: 0.25 },
		);

		observer.observe(wrapper);
		return () => observer.disconnect();
	}, [autoplay]);

	const handleMouseEnter = () => {
		if (!autoplay) {
			videoRef.current?.play().catch(() => {});
		}
	};

	const handleMouseLeave = () => {
		if (!autoplay && videoRef.current) {
			videoRef.current.pause();
			videoRef.current.currentTime = 0;
		}
	};

	return (
		<div
			ref={wrapperRef}
			className={styles.card}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onClick={() => navigate(`/lesson/${dance.id}?segment=full`)}
		>
			{videoSrc && (
				<video
					ref={videoRef}
					className={styles.cardVideo}
					src={videoSrc}
					muted
					loop
					playsInline
					preload="none"
					disablePictureInPicture
					disableRemotePlayback
					controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
				/>
			)}
			<div className={styles.cardOverlay} />
			<div className={styles.cardBody}>
				<div className={styles.cardTop}>
					{dance.title && (
						<span className={styles.cardTitle}>{dance.title}</span>
					)}
					{diff && (
						<span
							className={styles.difficultyBadge}
							title={
								dance.difficulty_by_users
									? 'Сложность по оценкам пользователей'
									: 'Сложность по оценке автора'
							}
							style={{
								background: `${DIFFICULTY_COLOR[diff]}22`,
								color: DIFFICULTY_COLOR[diff],
								border: `1px solid ${DIFFICULTY_COLOR[diff]}55`,
							}}
						>
							{DIFFICULTY_LABEL[diff]}
						</span>
					)}
				</div>
				{(dance.attempt_count !== undefined ||
					dance.avg_score !== undefined) && (
					<div className={styles.cardStats}>
						{dance.attempt_count !== undefined && (
							<span className={styles.cardStat}>
								<Icon name="clapper" size="1em" alt="Попыток" />{' '}
								{dance.attempt_count}
							</span>
						)}
						{dance.avg_score !== undefined && (
							<span className={styles.cardStat}>
								<Icon name="star" size="1em" alt="Очков" />{' '}
								{Math.round(dance.avg_score)}%
							</span>
						)}
					</div>
				)}
				{(dance.like_count !== undefined || dance.view_count !== undefined) && (
					<div className={`${styles.cardStats} ${styles.cardStatsCommunity}`}>
						{dance.like_count !== undefined && (
							<span className={styles.cardStat}>
								<Icon name="heart-filled" size="1em" alt="Лайков" />{' '}
								{dance.like_count}
							</span>
						)}
						{dance.view_count !== undefined && (
							<span className={styles.cardStat}>
								<Icon name="eye" size="1em" alt="Просмотров" />{' '}
								{dance.view_count}
							</span>
						)}
					</div>
				)}
				{dance.duration_sec !== undefined && dance.duration_sec > 0 && (
					<div className={styles.cardStats}>
						<span className={styles.cardStat}>
							⏱ {formatDuration(dance.duration_sec)}
						</span>
					</div>
				)}
			</div>
		</div>
	);
};

const PAGE_LIMIT = 10;

const CatalogPage: React.FC = () => {
	const [dances, setDances] = useState<DanceItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [sort, setSort] = useState<CatalogSort>('popular');
	const [autoplay, setAutoplay] = useState(true);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const searchRef = useRef(search);
	useLayoutEffect(() => {
		searchRef.current = search;
	});

	const fetchDances = (
		searchValue: string,
		sortValue: CatalogSort,
		pageNum: number,
		append = false,
	) => {
		if (append) {
			setLoadingMore(true);
		} else {
			setLoading(true);
			setError(null);
		}

		getDancesCatalog({
			search: searchValue || undefined,
			sort: sortValue,
			page: pageNum,
			limit: PAGE_LIMIT,
		})
			.then((data) => {
				setDances((prev) => (append ? [...prev, ...data.dances] : data.dances));
				setHasMore(data.pagination.has_more);
			})
			.catch(() => {
				if (!append) {
					setError('Не удалось загрузить список танцев. Попробуйте позже.');
				}
			})
			.finally(() => {
				setLoading(false);
				setLoadingMore(false);
			});
	};

	useEffect(() => {
		setPage(1);
		fetchDances(searchRef.current, sort, 1, false);
	}, [sort]);

	useEffect(
		() => () => {
			clearTimeout(debounceRef.current ?? undefined);
		},
		[],
	);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearch(value);

		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		debounceRef.current = setTimeout(() => {
			setPage(1);
			fetchDances(value, sort, 1, false);
		}, 400);
	};

	const handleLoadMore = () => {
		const nextPage = page + 1;
		setPage(nextPage);
		fetchDances(search, sort, nextPage, true);
	};

	return (
		<div className={styles.page}>
			<div className={styles.inner}>
				<h1 className={styles.pageTitle}>Все танцы</h1>

				<div className={styles.controls}>
					<input
						className={styles.searchInput}
						type="text"
						placeholder="Поиск по названию..."
						value={search}
						onChange={handleSearchChange}
					/>
					<div className={styles.sortGroup}>
						{SORT_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								className={`${styles.sortBtn} ${sort === opt.value ? styles.sortBtnActive : ''}`}
								onClick={() => setSort(opt.value)}
							>
								{opt.label}
							</button>
						))}
					</div>
					<button
						type="button"
						className={`${styles.sortBtn} ${styles.autoplayBtn} ${autoplay ? styles.sortBtnActive : ''}`}
						onClick={() => setAutoplay((v) => !v)}
						title={
							autoplay
								? 'Видео проигрываются автоматически'
								: 'Видео проигрываются при наведении'
						}
					>
						{autoplay ? '▶ Автовоспроизведение' : '⏸ По наведению'}
					</button>
				</div>

				{loading && (
					<div className={styles.loadingWrapper}>
						<Loading />
					</div>
				)}

				{!loading && error && (
					<div className={styles.grid}>
						<div className={styles.emptyState}>
							<p className={styles.emptyStateTitle}>Что-то пошло не так</p>
							<p className={styles.emptyStateHint}>
								Не удалось загрузить список танцев. Попробуйте позже.
							</p>
						</div>
					</div>
				)}

				{!loading && !error && dances.length === 0 && (
					<div className={styles.grid}>
						<div className={styles.emptyState}>
							<p className={styles.emptyStateTitle}>Танцы не найдены</p>
							<p className={styles.emptyStateHint}>
								{search
									? 'Попробуйте изменить запрос или выбрать другую сортировку'
									: 'Скоро здесь появятся танцы'}
							</p>
						</div>
					</div>
				)}

				{!loading && !error && dances.length > 0 && (
					<>
						<div className={styles.grid}>
							{dances.map((dance) => (
								<DanceCard key={dance.id} dance={dance} autoplay={autoplay} />
							))}
						</div>

						{hasMore && (
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
					</>
				)}
			</div>
		</div>
	);
};

export default CatalogPage;
