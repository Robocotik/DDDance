import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
	Navigate,
	useNavigate,
	useParams,
	useSearchParams,
} from 'react-router-dom';

import LessonFinish from '../../components/LessonFinish/LessonFinish';
import LessonStart from '../../components/LessonStart/LessonStart';
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
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	const [searchParams] = useSearchParams();

	const lesson = useSelector(selectLesson);
	const lessonError = useSelector(selectLessonError);
	const lessonLoading = useSelector(selectLessonLoading);
	const segment = searchParams.get('segment');

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

	if (!segment) {
		return <Navigate to={`/lesson/${id}?segment=start`} replace />;
	}

	const isNumericSegment = /^\d+$/.test(segment);
	const segmentIndex = isNumericSegment ? Number(segment) : -1;
	const lastSegmentIndex = lesson.glb_keys.length - 1;

	const navigateToSegment = (nextSegment: string) => {
		navigate(`/lesson/${id}?segment=${nextSegment}`);
	};

	if (segment === 'start') {
		return (
			<div className={styles.page}>
				<LessonStart lesson={lesson} />
			</div>
		);
	}

	if (segment === 'finish') {
		return (
			<div className={styles.page}>
				<LessonFinish lesson={lesson} />
			</div>
		);
	}

	if (segment === 'full') {
		return (
			<div className={styles.page}>
				<MixamoViewer glbPath={lesson.full_glb_key ?? null} />
			</div>
		);
	}

	if (isNumericSegment) {
		const glbPath = lesson.glb_keys[segmentIndex] ?? null;

		if (!glbPath) {
			return <Navigate to={`/lesson/${id}?segment=finish`} replace />;
		}

		const prevSegment = segmentIndex === 0 ? 'start' : String(segmentIndex - 1);
		const nextSegment =
			segmentIndex >= lastSegmentIndex ? 'finish' : String(segmentIndex + 1);

		return (
			<div className={styles.page}>
				<div className={styles.stepNavigation}>
					<button onClick={() => navigateToSegment(prevSegment)}>Назад</button>
					<span>
						Шаг {segmentIndex + 1} из {lesson.glb_keys.length}
					</span>
					<button onClick={() => navigateToSegment(nextSegment)}>Вперед</button>
				</div>
				<MixamoViewer glbPath={glbPath} />
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<p className={styles.error}>Некорректный параметр segment</p>
		</div>
	);
};

export default LessonPage;
