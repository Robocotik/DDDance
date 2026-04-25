import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
	Navigate,
	useNavigate,
	useParams,
	useSearchParams,
} from 'react-router-dom';

import arrowIcon from '../../assets/svg/arrow.svg';
import Button from '../../components/Button/Button';
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
	const [playbackSpeed, setPlaybackSpeed] = useState(1);

	useEffect(() => {
		if (id && !lesson) {
			dispatch(lessonActions.uploadLessonByIdAction(id) as any);
		}

		return () => {
			if (id) {
				dispatch(lessonActions.clearLessonAction());
			}
		};
	}, [dispatch, id, lesson]);

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
	const hasFullStep = !!lesson.full_glb_key;
	const totalSteps = lesson.glb_keys.length + (hasFullStep ? 1 : 0);

	const navigateToSegment = (nextSegment: string) => {
		navigate(`/lesson/${id}?segment=${nextSegment}`);
	};

	const renderLessonLayout = (
		glbPath: string | null,
		stepLabel: string,
		currentStepNumber?: number,
		totalSteps?: number,
	) => (
		<div className={styles.page}>
			<div className={styles.lesson}>
				<div className={styles.viewerColumn}>
					<MixamoViewer glbPath={glbPath} timeScale={playbackSpeed} />
				</div>
				<div className={styles.controlsColumn}>
					<div className={styles.stepHeader}>
						<div className={`${styles.stepButtons} ${styles.stepButtonsLeft}`}>
							{currentStepNumber && (
								<button
									className={styles.stepButton}
									onClick={() =>
										navigateToSegment(
											currentStepNumber > 1
												? String(currentStepNumber - 2)
												: 'start',
										)
									}
								>
									<img
										src={arrowIcon}
										alt={
											currentStepNumber > 1
												? 'К предыдущим шагам'
												: 'К началу урока'
										}
										className={styles.arrowLeft}
									/>
								</button>
							)}
						</div>
						<h2 className={styles.stepTitle}>{stepLabel}</h2>
						<div className={`${styles.stepButtons} ${styles.stepButtonsRight}`}>
							{currentStepNumber && totalSteps && (
								<button
									className={styles.stepButton}
									onClick={() =>
										navigateToSegment(
											currentStepNumber < totalSteps
												? String(currentStepNumber)
												: 'finish',
										)
									}
								>
									<img
										src={arrowIcon}
										alt={
											currentStepNumber < totalSteps
												? 'К следующим шагам'
												: 'К завершению урока'
										}
										className={styles.arrowRight}
									/>
								</button>
							)}
						</div>
					</div>
					<div className={styles.speedControl}>
						<label htmlFor="speed-control">
							Скорость: {playbackSpeed.toFixed(1)}x
						</label>
						<input
							id="speed-control"
							type="range"
							min={0.1}
							max={3}
							step={0.1}
							value={playbackSpeed}
							onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
						/>
					</div>
					<Button
						size="s"
						className={styles.finishButton}
						onClick={() => navigateToSegment('finish')}
					>
						Завершить урок
					</Button>
				</div>
			</div>
		</div>
	);

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
			<Navigate
				to={`/lesson/${id}?segment=${lesson.glb_keys.length}`}
				replace
			/>
		);
	}

	if (isNumericSegment) {
		const isRegularStep =
			segmentIndex >= 0 && segmentIndex < lesson.glb_keys.length;

		const isFullStep = hasFullStep && segmentIndex === lesson.glb_keys.length;
		let glbPath: string | null = null;

		if (isRegularStep) {
			glbPath = lesson.glb_keys[segmentIndex];
		} else if (isFullStep) {
			glbPath = lesson.full_glb_key ?? null;
		}

		if (!glbPath) {
			return <Navigate to={`/lesson/${id}?segment=finish`} replace />;
		}

		return renderLessonLayout(
			glbPath,
			`ШАГ ${segmentIndex + 1}`,
			segmentIndex + 1,
			totalSteps,
		);
	}

	return (
		<div className={styles.page}>
			<p className={styles.error}>Некорректный параметр segment</p>
		</div>
	);
};

export default LessonPage;
