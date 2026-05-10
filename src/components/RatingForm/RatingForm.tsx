import { rateDance, type RateResponse } from '@/api/users/compare';
import React, { useState, useRef, useEffect } from 'react';
import styles from './RatingForm.module.scss';

interface RatingValues {
	physical: number;
	speed: number;
	coordination: number;
	repeatability: number;
}

interface RatingFormProps {
    userDanceId: string;
    danceId: string;
    onSubmit: (values: RatingValues, aggregated?: RateResponse) => void;
    onClose?: () => void;
}

const CRITERIA = [
	{ key: 'physical' as const, label: 'Физическая нагрузка', emoji: '', low: 'Легко', high: 'Тяжело' },
	{ key: 'speed' as const, label: 'Скорость', emoji: '', low: 'Медленно', high: 'Быстро' },
	{ key: 'coordination' as const, label: 'Координация', emoji: '', low: 'Просто', high: 'Сложно' },
	{ key: 'repeatability' as const, label: 'Повторяемость', emoji: '', low: 'Легко повторить', high: 'Трудно повторить' },
];

const DOTS = [1, 2, 3, 4, 5];

export const AggregatedResults: React.FC<{ data: RateResponse }> = ({ data }) => {
	const items = [
		{ label: 'Физическая нагрузка', value: data.avg_physical },
		{ label: 'Скорость',  value: data.avg_speed },
		{ label: 'Координация',  value: data.avg_coordination },
		{ label: 'Повторяемость', value: data.avg_repeatability },
	];

	return (
		<div className={styles.aggregated}>
			<h3 className={styles.aggregatedTitle}>
				Оценки других участников
				<span className={styles.totalRatings}>({data.total_ratings} оценок)</span>
			</h3>
			<div className={styles.aggregatedItems}>
				{items.map((item) => {
					const displayValue = item.value / 2;
					const pct = ((displayValue - 1) / 4) * 100;
					return (
						<div key={item.label} className={styles.aggregatedItem}>
							<span className={styles.aggEmoji}></span>
							<span className={styles.aggLabel}>{item.label}</span>
							<div className={styles.aggBar}>
								<div className={styles.aggBarFill} style={{ width: `${pct}%` }} />
							</div>
							<span className={styles.aggValue}>{displayValue.toFixed(1)}</span>
						</div>
					);
				})}
			</div>
			<div className={styles.avgScore}>
				Средний балл: <strong>{(data.avg_score / 2).toFixed(1)}</strong> / 5
			</div>
		</div>
	);
};

export const RatingForm: React.FC<RatingFormProps> = ({ userDanceId, onSubmit, onClose, danceId }) => {
	const [values, setValues] = useState<RatingValues>({
		physical: 3, speed: 3, coordination: 3, repeatability: 3,
	});
	const [submitting, setSubmitting] = useState(false);
	const [aggregated, setAggregated] = useState<RateResponse | null>(null);

	const pendingValuesRef = useRef<RatingValues | null>(null);
	const hasSentRef = useRef(false);
	const aggregatedRef = useRef<RateResponse | null>(null);

	useEffect(() => {
		if (danceId && pendingValuesRef.current && !hasSentRef.current) {
			sendRatingToBackend(pendingValuesRef.current);
		}
	}, [danceId]);

	const handleChange = (key: keyof RatingValues, value: number) => {
		setValues((prev) => ({ ...prev, [key]: value }));
	};

	const sendRatingToBackend = async (ratingValues: RatingValues) => {
		if (hasSentRef.current) return;
		hasSentRef.current = true;

		try {
			const result = await rateDance({
				video_id: danceId,
				physical: ratingValues.physical * 2,
				speed: ratingValues.speed * 2,
				coordination: ratingValues.coordination * 2,
				repeatability: ratingValues.repeatability * 2,
			});
			setAggregated(result);
			aggregatedRef.current = result;
		} catch (err) {
			setSubmitting(false);
			hasSentRef.current = false;
		}
	};

	const handleSubmit = () => {
		setSubmitting(true);
		sendRatingToBackend(values);
	};

	const handleClose = () => {
		setAggregated(null);
		setSubmitting(false);
		hasSentRef.current = false;
		pendingValuesRef.current = null;
		aggregatedRef.current = null;
		onClose?.();
	};

	const handleFinish = () => {
		const result = aggregatedRef.current ?? aggregated;
		setAggregated(null);
		setSubmitting(false);
		hasSentRef.current = false;
		pendingValuesRef.current = null;
		aggregatedRef.current = null;
		onSubmit(values, result ?? undefined);
		onClose?.();
		sessionStorage.setItem(`hasRated_${danceId}`, 'true');
	};

	if (aggregated) {
		return (
			<div className={styles.container}>
				<div className={styles.header}>
					<h2 className={styles.title}>Спасибо за оценку! Это поможет нам стать лучше</h2>
					<p className={styles.subtitle}>Вот что думают остальные</p>
				</div>
				<AggregatedResults data={aggregated} />
				<button className={styles.submitBtn} onClick={handleFinish} style={{ marginTop: '16px' }}>
					Закрыть
				</button>
			</div>
		);
	}

	if (submitting) {
		return (
			<div className={styles.container}>
				<div className={styles.header}>
					<h2 className={styles.title}>Спасибо!</h2>
					<p className={styles.subtitle}>Считаем результаты...</p>
				</div>
				<div className={styles.successState}>
					<p>Загружаем оценки других участников</p>
					{!userDanceId && (
						<p className={styles.hint}>
							Видео ещё обрабатывается — оценка привяжется автоматически
						</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2 className={styles.title}>Как тебе танец?</h2>
				<p className={styles.subtitle}>Оцени по четырём параметрам — это поможет другим</p>
				{onClose && (
					<button
						className={styles.closeBtn}
						onClick={handleClose}
						aria-label="Закрыть"
						type="button"
					>
						✕
					</button>
				)}
			</div>

			<div className={styles.criteria}>
				{CRITERIA.map((criterion) => {
					const value = values[criterion.key];
					return (
						<div key={criterion.key} className={styles.criterionRow}>
							<div className={styles.criterionHeader}>
								<span className={styles.criterionEmoji}>{criterion.emoji}</span>
								<span className={styles.criterionLabel}>{criterion.label}</span>
							</div>
							<div className={styles.sliderWrapper}>
								<span className={styles.anchor}>{criterion.low}</span>
								<div className={styles.sliderTrack}>
									<input
										type="range"
										min={1} max={5} step={1}
										value={value}
										onChange={(e) => handleChange(criterion.key, Number(e.target.value))}
										className={styles.slider}
										disabled={submitting}
									/>
									<div className={styles.dots}>
										{DOTS.map((dot) => (
											<div
												key={dot}
												className={`${styles.dot} ${dot <= value ? styles.dotActive : ''}`}
											/>
										))}
									</div>
								</div>
								<span className={styles.anchor}>{criterion.high}</span>
							</div>
							<div className={styles.valueDisplay}>
								{DOTS.map((dot) => (
									<span
										key={dot}
										className={`${styles.valueDot} ${dot === value ? styles.valueDotActive : ''}`}
									>
										{dot}
									</span>
								))}
							</div>
						</div>
					);
				})}
			</div>

			<button
				className={styles.submitBtn}
				onClick={handleSubmit}
				disabled={submitting}
			>
				Отправить оценку
			</button>
		</div>
	);
};

export default RatingForm;