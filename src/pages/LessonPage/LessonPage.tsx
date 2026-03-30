import React from 'react';
import { useSelector } from 'react-redux';
import Loading from '../../components/Loading/Loading';
import MixamoViewer from '../../components/SkeletonViewer/MixamoViewer';
import {
	selectResult,
	selectResultError,
	selectResultLoading,
} from '../../redux/features/video/selectors';
import styles from './LessonPage.module.scss';

const LessonPage: React.FC = () => {
	const result = useSelector(selectResult);
	const videoError = useSelector(selectResultError);
	const videoLoading = useSelector(selectResultLoading);

	if (videoLoading) {
		return (
			<div className={styles.page}>
				<Loading />
			</div>
		);
	}

	if (videoError || !result) {
		return (
			<div className={styles.page}>
				<p className={styles.error}>Ошибка: {videoError}</p>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<MixamoViewer result={result} />
		</div>
	);
};

export default LessonPage;
