import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useParams } from 'react-router-dom';

import Loading from '../../components/Loading/Loading';
import MixamoViewer from '../../components/SkeletonViewer/MixamoViewer';

import lessonActions from '../../redux/features/lesson/actions';
import {
	selectLesson,
	selectLessonError,
	selectLessonLoading,
} from '../../redux/features/lesson/selectors';

import styles from './LessonPage.module.scss';

const LessonPage: React.FC = () => {
	const dispatch = useDispatch();
	const { id } = useParams<{ id: string }>();

	const lesson = useSelector(selectLesson);
	const lessonError = useSelector(selectLessonError);
	const lessonLoading = useSelector(selectLessonLoading);

	useEffect(() => {
		if (id && !lesson) {
			dispatch(lessonActions.uploadLessonByIdAction(id) as any);
		}

		return () => {
			if (id) {
				dispatch(lessonActions.clearLessonAction());
			}
		};
	}, [dispatch, id]);

	if (lessonLoading) {
		return (
			<div className={styles.page}>
				<Loading />
			</div>
		);
	}

	if (lessonError) {
		return (
			<div className={styles.page}>
				<p className={styles.error}>Ошибка: {lessonError}</p>
			</div>
		);
	}

	if (!id) {
		return <Navigate to={`/lesson/${lesson?.dance_id}`} replace />;
	}

	if (!lesson) {
		return null;
	}

	return (
		<div className={styles.page}>
			<MixamoViewer result={lesson} />
		</div>
	);
};

export default LessonPage;
