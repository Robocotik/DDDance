import type { AppDispatch } from '@/redux/store';
import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import trendActions from '../../redux/features/trends/actions';
import {
	selectTrends,
	selectTrendsError,
	selectTrendsLoading,
} from '../../redux/features/trends/selectors';
import Title from '../Title/Title';
import VerticalVideo from '../VerticalVideo/VerticalVideo';
import styles from './InTrends.module.scss';

const SKELETON_COUNT = 5;
const AUTO_SCROLL_SPEED = 0.6;
const RESUME_DELAY = 2000;
const DRAG_THRESHOLD = 6;

const MIN_FOR_LOOP = 4;

const InTrends: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const trackRef = useRef<HTMLDivElement>(null);
	const isDragging = useRef(false);
	const hasDragged = useRef(false);
	const isUserInteracting = useRef(false);
	const startX = useRef(0);
	const scrollLeft = useRef(0);
	const rafRef = useRef<number>(0);
	const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const trends = useSelector(selectTrends);
	const isLoading = useSelector(selectTrendsLoading);
	const error = useSelector(selectTrendsError);

	useEffect(() => {
		dispatch(trendActions.getTrendVideosAction());
		return () => {
			dispatch(trendActions.clearTrendsAction());
		};
	}, [dispatch]);

	useEffect(() => {
		const animate = () => {
			const track = trackRef.current;
			if (track && !isUserInteracting.current) {
				track.scrollLeft += AUTO_SCROLL_SPEED;
				const half = track.scrollWidth / 2;
				if (track.scrollLeft >= half) {
					track.scrollLeft -= half;
				}
			}
			rafRef.current = requestAnimationFrame(animate);
		};

		rafRef.current = requestAnimationFrame(animate);
		return () => {
			cancelAnimationFrame(rafRef.current);
			if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
		};
	}, []);

	const pauseInteraction = () => {
		isUserInteracting.current = true;
		if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
	};

	const scheduleResume = () => {
		if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
		resumeTimerRef.current = setTimeout(() => {
			isUserInteracting.current = false;
		}, RESUME_DELAY);
	};

	const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!trackRef.current) return;
		isDragging.current = true;
		hasDragged.current = false;
		pauseInteraction();
		startX.current = e.pageX - trackRef.current.getBoundingClientRect().left;
		scrollLeft.current = trackRef.current.scrollLeft;
		trackRef.current.style.cursor = 'grabbing';
	};

	const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging.current || !trackRef.current) return;
		e.preventDefault();
		const x = e.pageX - trackRef.current.getBoundingClientRect().left;
		const delta = x - startX.current;
		if (Math.abs(delta) > DRAG_THRESHOLD) hasDragged.current = true;
		trackRef.current.scrollLeft = scrollLeft.current - delta * 1.2;
	};

	const onMouseUp = () => {
		if (!isDragging.current) return;
		isDragging.current = false;
		if (trackRef.current) trackRef.current.style.cursor = '';
		scheduleResume();
	};

	const onClickCapture = (e: React.MouseEvent) => {
		if (hasDragged.current) {
			e.stopPropagation();
			hasDragged.current = false;
		}
	};

	const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		if (!trackRef.current) return;
		hasDragged.current = false;
		pauseInteraction();
		startX.current = e.touches[0].pageX - trackRef.current.getBoundingClientRect().left;
		scrollLeft.current = trackRef.current.scrollLeft;
	};

	const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		if (!trackRef.current) return;
		const x = e.touches[0].pageX - trackRef.current.getBoundingClientRect().left;
		const delta = x - startX.current;
		if (Math.abs(delta) > DRAG_THRESHOLD) hasDragged.current = true;
		trackRef.current.scrollLeft = scrollLeft.current - delta;
	};

	const onTouchEnd = () => {
		scheduleResume();
	};

	if (isLoading) {
		return (
			<div className={styles.container}>
				<Title className={styles.title}>Возможно вам понравится</Title>
				<div className={styles.track}>
					{Array.from({ length: SKELETON_COUNT }).map((_, i) => (
						<div key={i} className={`${styles.item} ${styles.skeleton}`} />
					))}
				</div>
			</div>
		);
	}

	if (error || !trends || !trends.videos?.length) {
		return null;
	}

	return (
		<div className={styles.container}>
			<Title className={styles.title}>Возможно вам понравится</Title>

			<div
				ref={trackRef}
				className={styles.track}
				onMouseDown={onMouseDown}
				onMouseMove={onMouseMove}
				onMouseUp={onMouseUp}
				onMouseLeave={onMouseUp}
				onClickCapture={onClickCapture}
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
			>
				{(trends.videos.length >= MIN_FOR_LOOP
					? [...trends.videos, ...trends.videos]
					: trends.videos
				).map((video, idx) => (
					<div key={`${video.id}-${idx}`} className={styles.item}>
						<VerticalVideo video={video} />
					</div>
				))}
			</div>
		</div>
	);
};

export default InTrends;
