import React from 'react';
import HomePageTop from '../../components/HomePageTop/HomePageTop';
import InTrends from '../../components/InTrends/InTrends';
import { trendingVideos } from '../../mocks/films';
import styles from './HomePage.module.scss';

const HomePage: React.FC = () => {
	return (
		<div className={styles.page}>
			<HomePageTop />
			<InTrends videos={trendingVideos} />
		</div>
	);
};

export default HomePage;
