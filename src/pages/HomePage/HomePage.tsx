import InTrends from '@/components/InTrends/InTrends';
import RegisterCta from '@/components/RegisterCta/RegisterCta';
import TrendingWeek from '@/components/TrendingWeek/TrendingWeek';
import React from 'react';
import HomePageTop from '../../components/HomePageTop/HomePageTop';
import VideoUploader from '../../components/VideoUploader/VideoUploader';
import styles from './HomePage.module.scss';

const HomePage: React.FC = () => {
	return (
		<div className={styles.page}>
			<HomePageTop />
			<RegisterCta />
			<TrendingWeek />
			<InTrends />
			<VideoUploader />
		</div>
	);
};

export default HomePage;
