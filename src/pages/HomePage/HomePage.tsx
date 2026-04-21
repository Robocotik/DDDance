import InTrends from '@/components/InTrends/InTrends';
import React from 'react';
import HomePageTop from '../../components/HomePageTop/HomePageTop';
import VideoUploader from '../../components/VideoUploader/VideoUploader';
import styles from './HomePage.module.scss';
import { useDispatch } from 'react-redux';
import lessonActions from '../../redux/features/lesson/actions';
import { useEffect } from 'react';

const HomePage: React.FC = () => {
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(lessonActions.clearLessonAction() as any);
	}, [dispatch]);
	return (
		<div className={styles.page}>
			<HomePageTop />
			<InTrends />
			<VideoUploader />
		</div>
	);
};

export default HomePage;
