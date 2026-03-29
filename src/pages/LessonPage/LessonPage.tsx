import React, { useEffect, useState } from 'react';
// import { useSelector } from 'react-redux';
import Loading from '../../components/Loading/Loading';
import MixamoViewer from '../../components/SkeletonViewer/MixamoViewer';
import styles from './LessonPage.module.scss';
// import {
// 	selectVideo,
// 	selectVideoError,
// 	selectVideoLoading,
// } from '../../redux/features/video/selectors';

const LessonPage: React.FC = () => {
	// const video = useSelector(selectVideo);
	// const videoError = useSelector(selectVideoError);
	// const videoLoading = useSelector(selectVideoLoading);

	const videoError = undefined;
	const [videoLoading, setVideoLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => {
			setVideoLoading(false);
		}, 5000);

		return () => clearTimeout(timer); // очистка таймера при размонтировании
	}, []);

	if (videoLoading) {
		return (
			<div className={styles.page}>
				<Loading />
			</div>
		);
	}

	// if (videoError) {
	// 	return (
	// 		<div className={styles.page}>
	// 			<p className={styles.error}>Ошибка: {videoError}</p>
	// 		</div>
	// 	);
	// }

	return (
		<div className={styles.page}>
			<MixamoViewer />
		</div>
	);
};

export default LessonPage;
