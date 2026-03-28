import React from 'react';
import MixamoViewer from '../../components/SkeletonViewer/MixamoViewer';
import styles from './LessonPage.module.scss';
import Loading from '../../components/Loading/Loading'

const LessonPage: React.FC = () => {
	return (
		<div className={styles.page}>
            <Loading />
			<MixamoViewer />
		</div>
	);
};

export default LessonPage;
