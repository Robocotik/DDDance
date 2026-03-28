import React from 'react';
import HomePageTop from '../../components/HomePageTop/HomePageTop';
import VideoUploader from '../../components/VideoUploader/VideoUploader';
import styles from './HomePage.module.scss';

const HomePage: React.FC = () => {
	return (
		<div className={styles.page}>
			<HomePageTop />
			<VideoUploader />
		</div>
	);
};

export default HomePage;
