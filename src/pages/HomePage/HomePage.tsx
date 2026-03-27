import React from 'react';
import HomePageTop from '../../components/HomePageTop/HomePageTop';

import SkeletonViewer from '../../components/SkeletonViewer/SkeletonViewer';
import MixamoViewer from '../../components/SkeletonViewer/MixamoViewer';

import VideoUploader from '../../components/VideoUploader/VideoUploader';
import styles from './HomePage.module.scss';

const HomePage: React.FC = () => {
	return (
		<div className={styles.page}>
			<HomePageTop />

			<VideoUploader />
			 <SkeletonViewer />
			<MixamoViewer />
		</div>
	);
};

export default HomePage;
