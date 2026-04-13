import type { AppDispatch } from '@/redux/store';
import React, { useEffect } from 'react';
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

const InTrends: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();

	const trends = useSelector(selectTrends);
	const isLoading = useSelector(selectTrendsLoading);
	const error = useSelector(selectTrendsError);

	useEffect(() => {
		dispatch(trendActions.getTrendVideosAction());

		return () => {
			dispatch(trendActions.clearTrendsAction());
		};
	}, [dispatch]);

	if (isLoading) {
		return null;
	}

	if (error || !trends || !trends.videos.length) {
		return null;
	}

	return (
		<div className={styles.container}>
			<Title className={styles.title}>Возможно вам понравится</Title>
			<div className={styles.videoContainer}>
				{trends.videos.map((video) => (
					<VerticalVideo key={video.id} video={video} />
				))}
			</div>
		</div>
	);
};

export default InTrends;
