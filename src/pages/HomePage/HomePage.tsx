import React from 'react';
import HomePageTop from '../../components/HomePageTop/HomePageTop';
import InTrends from '../../components/InTrends/InTrends';
import SkeletonViewer from '../../components/SkeletonViewer/SkeletonViewer';
import { trendingVideos } from '../../mocks/films';
import styles from './HomePage.module.scss';

const HomePage: React.FC = () => {
	return (
		<div className={styles.page}>
			<HomePageTop />
			<SkeletonViewer />
			<InTrends videos={trendingVideos} />
		</div>
	);
};

export default HomePage;
