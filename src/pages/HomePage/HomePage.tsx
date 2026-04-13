import InTrends from '@/components/InTrends/InTrends';
import React from 'react';
import HomePageTop from '../../components/HomePageTop/HomePageTop';
import VideoUploader from '../../components/VideoUploader/VideoUploader';
import styles from './HomePage.module.scss';

const HomePage: React.FC = () => {
	return (
		<div className={styles.page}>
			<HomePageTop />
			<InTrends />
			<VideoUploader />
		</div>
	);
};

export default HomePage;
