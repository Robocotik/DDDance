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

	const marqueeStyle = {
		['--marquee-duration' as string]: `${Math.max(
			trends.videos.length * 4,
			16,
		)}s`,
	};

	return (
		<div className={styles.container}>
			<Title className={styles.title}>Возможно вам понравится</Title>

			<div className={styles.marquee} style={marqueeStyle}>
				<div className={styles.track}>
					{[0, 1].map((copyIndex) => (
						<div
							key={copyIndex}
							className={styles.group}
							aria-hidden={copyIndex === 1}
						>
							{trends.videos.map((video) => (
								<div key={`${copyIndex}-${video.id}`} className={styles.item}>
									<VerticalVideo video={video} />
								</div>
							))}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default InTrends;
