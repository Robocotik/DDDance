import React from 'react';
import HomePageTop from '../../components/HomePageTop/HomePageTop';

import InTrends from '../../components/InTrends/InTrends';
import SkeletonViewer from '../../components/SkeletonViewer/SkeletonViewer';
import { trendingVideos } from '../../mocks/films';

import styles from './HomePage.module.scss';
import VideoUploader from '../../components/VideoUploader/VideoUploader';

const HomePage: React.FC = () => {
	return (
		<div className={styles.page}>
			<HomePageTop />

			<VideoUploader />
			<SkeletonViewer />
			

		</div>
	);
};

export default HomePage;
