import React from 'react';
import HomePageTop from '../../components/HomePageTop/HomePageTop';
import styles from './HomePage.module.scss';
import VideoUploader from '../../components/VideoUploader/VideoUploader';

const HomePage: React.FC = () => {
	return (
		<div className={styles.page}>
			<HomePageTop />
			<VideoUploader />
		</div>
	);
};

export default HomePage;
