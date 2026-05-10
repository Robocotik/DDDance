import type { RateResponse } from '@/api/users/compare';
import { getRating } from '@/api/users/compare';
import CompareViewer from '@/components/CompareViewer/CompareViewer';
import Loading from '@/components/Loading/Loading';
import {
	AggregatedResults,
	RatingForm,
} from '@/components/RatingForm/RatingForm';
import { resetUpload } from '@/redux/features/upload/uploadSlice';
import { selectIsUserAuthenticated } from '@/redux/features/user/selectors';
import type { AppDispatch } from '@/redux/store';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './ComparePage.module.scss';

interface CompareResult {
	user_glb_key: string;
	reference_glb_key: string;
	score: number;
	dtw_distance: number;
	dance_id: string;
	user_dance_id: string;
}

const scoreColor = (score: number) => {
	if (score >= 75) return '#6fff9e';
	if (score >= 50) return '#ffd166';
	return '#ff6b6b';
};

const scoreLabel = (score: number) => {
	if (score >= 75) return 'Отлично!';
	if (score >= 50) return 'Неплохо';
	return 'Продолжай тренироваться';
};

interface RatingSectionProps {
	isAuthenticated: boolean;
	hasRated: boolean;
	ratingData: RateResponse | null;
	ratingLoading: boolean;
	userDanceId: string;
	danceId: string;
	onRated: (data: RateResponse) => void;
	onHasRatedChange: () => void;
}

const RatingSection: React.FC<RatingSectionProps> = ({
	isAuthenticated,
	hasRated,
	ratingData,
	ratingLoading,
	userDanceId,
	danceId,
	onRated,
	onHasRatedChange,
}) => {
	const navigate = useNavigate();
	const [showForm, setShowForm] = useState(false);

	const statsBlock = ratingLoading ? (
		<div className={styles.ratingLoading}>
			<Loading />
		</div>
	) : ratingData ? (
		<AggregatedResults data={ratingData} />
	) : null;

	if (!isAuthenticated) {
		return (
			<div className={styles.ratingSection}>
				<h2 className={styles.sectionTitle}>Оценки участников</h2>
				{statsBlock}
				<div className={styles.prompt}>
					<p className={styles.promptText}>Войдите, чтобы оценить этот танец</p>
					<button
						className={styles.actionBtn}
						onClick={() => navigate('/login')}
					>
						Войти и оценить
					</button>
				</div>
			</div>
		);
	}

	if (!hasRated) {
		return (
			<div className={styles.ratingSection}>
				<h2 className={styles.sectionTitle}>Оценки участников</h2>
				{statsBlock}
				{showForm ? (
					<div className={styles.inlineForm}>
						<RatingForm
							userDanceId={userDanceId}
							danceId={danceId}
							onSubmit={(_, aggregated) => {
								if (aggregated) onRated(aggregated);
								sessionStorage.setItem(`hasRated_${userDanceId}`, 'true');
								onHasRatedChange();
								setShowForm(false);
							}}
							onClose={() => setShowForm(false)}
						/>
					</div>
				) : (
					<div className={styles.prompt}>
						<p className={styles.promptText}>
							Хотите оценить сложность танца или изменить оценку?
						</p>
						<button
							className={styles.actionBtn}
							onClick={() => setShowForm(true)}
						>
							Оценить танец
						</button>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className={styles.ratingSection}>
			<h2 className={styles.sectionTitle}>Оценки участников</h2>
			{statsBlock}
			{!ratingLoading && !ratingData && (
				<p className={styles.noRatings}>Оценок пока нет</p>
			)}
		</div>
	);
};

const ComparePage: React.FC = () => {
	const { userDanceId } = useParams<{ userDanceId: string }>();
	const navigate = useNavigate();
	const dispatch = useDispatch<AppDispatch>();
	const isAuthenticated = useSelector(selectIsUserAuthenticated);

	const [result, setResult] = useState<CompareResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [ratingData, setRatingData] = useState<RateResponse | null>(null);
	const [ratingLoading, setRatingLoading] = useState(false);

	const [hasRated, setHasRated] = useState(
		() =>
			!!result?.dance_id &&
			sessionStorage.getItem(`hasRated_${result.dance_id}`) === 'true',
	);

	const [ratingRefreshKey, setRatingRefreshKey] = useState(0);

	useEffect(() => {
		if (result?.dance_id) {
			setHasRated(
				sessionStorage.getItem(`hasRated_${result.dance_id}`) === 'true',
			);
		} else {
			setHasRated(false);
		}
	}, [result?.dance_id]);

	useEffect(() => {
		if (!userDanceId) return;

		const stored = sessionStorage.getItem(`compare_result_${userDanceId}`);
		if (stored) {
			try {
				setResult(JSON.parse(stored));
				setLoading(false);
				return;
			} catch {
				setError('Результат не найден. Вернитесь и попробуйте снова.');
				setLoading(false);
			}
		} else {
			setError('Результат не найден. Вернитесь и попробуйте снова.');
			setLoading(false);
		}
	}, [userDanceId]);

	const fetchRating = useCallback(() => {
		if (!result?.dance_id) return;

		setRatingLoading(true);
		getRating(result.dance_id)
			.then(setRatingData)
			.catch(() => setRatingData(null))
			.finally(() => setRatingLoading(false));
	}, [result?.dance_id]);

	useEffect(() => {
		fetchRating();
	}, [fetchRating, ratingRefreshKey]);

	useEffect(() => {
		return () => {
			dispatch(resetUpload());
		};
	}, [dispatch]);

	if (loading) {
		return (
			<div className={styles.page}>
				<Loading />
			</div>
		);
	}

	if (error || !result) {
		return (
			<div className={styles.page}>
				<div className={styles.errorBlock}>
					<p className={styles.errorText}>{error ?? 'Что-то пошло не так'}</p>
					<button className={styles.backBtn} onClick={() => navigate(-1)}>
						← Назад
					</button>
				</div>
			</div>
		);
	}

	const score = Math.round(result.score);

	const handleBackToLesson = () => {
		dispatch(resetUpload());
		navigate(`/lesson/${result.dance_id}?segment=start`);
	};

	return (
		<div className={styles.page}>
			<div className={styles.inner}>
				<div className={styles.header}>
					<button className={styles.backBtn} onClick={handleBackToLesson}>
						Назад к уроку
					</button>
					<h1 className={styles.title}>Результат сравнения</h1>
				</div>

				<div className={styles.scoreRow}>
					<div
						className={styles.scoreCard}
						style={{ borderColor: scoreColor(score) }}
					>
						<span className={styles.scoreLabel}>Твой результат</span>
						<span
							className={styles.scoreValue}
							style={{ color: scoreColor(score) }}
						>
							{score}
							<span className={styles.scoreMax}>/100</span>
						</span>
						<span className={styles.scoreVerdict}>{scoreLabel(score)}</span>
					</div>

					<RatingSection
						isAuthenticated={isAuthenticated}
						hasRated={hasRated}
						ratingData={ratingData}
						ratingLoading={ratingLoading}
						userDanceId={userDanceId ?? ''}
						danceId={result.dance_id}
						onRated={setRatingData}
						onHasRatedChange={() => {
							setHasRated(true);
							setRatingRefreshKey((prev) => prev + 1);
						}}
					/>
				</div>

				<div className={styles.viewerSection}>
					<h2 className={styles.sectionTitle}>Сравнение движений</h2>
					<div className={styles.viewerWrapper}>
						<CompareViewer
							userGlbKey={result.user_glb_key}
							referenceGlbKey={result.reference_glb_key}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ComparePage;
