import React from 'react';
import { useSelector } from 'react-redux';
import MixamoViewer from '../../components/SkeletonViewer/MixamoViewer';
import Loading from '../../components/Loading/Loading';
import styles from './LessonPage.module.scss';
import {
	selectVideo,
	selectVideoError,
	selectVideoLoading,
} from '../../redux/features/video/selectors';

const LessonPage: React.FC = () => {
	const video = useSelector(selectVideo);
	const videoError = useSelector(selectVideoError);
	const videoLoading = useSelector(selectVideoLoading);

	if (videoLoading) {
		return (
			<div className={styles.page}>
				<Loading />
			</div>
		);
	}

	if (videoError) {
		return (
			<div className={styles.page}>
				<p className={styles.error}>Ошибка: {videoError}</p>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<MixamoViewer />
		</div>
	);
};

export default LessonPage;