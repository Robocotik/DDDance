import React, { useEffect, useState } from 'react';
import Icon from '../Icon/Icon';
import styles from './Onboarding.module.scss';

const STORAGE_KEY = 'dddance_onboarding_done';

export const hasSeenOnboarding = (): boolean =>
	localStorage.getItem(STORAGE_KEY) === 'true';

export const markOnboardingDone = (): void =>
	localStorage.setItem(STORAGE_KEY, 'true');

// ── Media ─────────────────────────────────────────────────────────────────────
// Drop your GIF / JPG / MP4 files into public/onboarding/ and they'll appear here.

interface SingleMedia {
	kind: 'single';
	src: string;
	alt: string;
}

interface MultiMedia {
	kind: 'multi';
	slides: { src: string; alt: string }[];
}

type StepMedia = SingleMedia | MultiMedia;

interface Step {
	title: string;
	desc: string;
	media: StepMedia;
}

const STEPS: Step[] = [
	{
		title: 'Выбери танец',
		desc: 'Листай каталог и находи треки, которые тебя зажигают — от простых до сложных. Фильтруй по сложности и сортировке.',
		media: {
			kind: 'single',
			src: '/onboarding/step1.gif',
			alt: 'Каталог танцев',
		},
	},
	{
		title: 'Учись по шагам',
		desc: '3D-скелет покажет каждое движение детально. Регулируй скорость, повторяй каждый сегмент и переходи к следующему, когда готов.',
		media: {
			kind: 'multi',
			slides: [
				{ src: '/onboarding/step2-upload.jpg', alt: 'Загрузка видео' },
				{ src: '/onboarding/step2-wait.jpg', alt: 'Обработка видео' },
				{ src: '/onboarding/step2-lesson.gif', alt: 'Интерфейс урока' },
			],
		},
	},
	{
		title: 'Получи оценку',
		desc: 'Сними себя на камеру — AI сравнит твои движения с эталоном и выдаст детальный разбор по тайтингу, амплитуде и технике. Зарегистрируйся, чтобы сохранять историю и попытки, ставить лайки и публиковать свои танцы.',
		media: {
			kind: 'single',
			src: '/onboarding/step3.gif',
			alt: 'Страница сравнения',
		},
	},
];

// ── Sub-carousel for step with multiple images ─────────────────────────────────

const SubCarousel: React.FC<{ slides: { src: string; alt: string }[] }> = ({
	slides,
}) => {
	const [active, setActive] = useState(0);

	useEffect(() => {
		const id = setInterval(
			() => setActive((p) => (p + 1) % slides.length),
			2500,
		);
		return () => clearInterval(id);
	}, [slides.length]);

	return (
		<div className={styles.subCarousel}>
			<div key={active} className={styles.subSlide}>
				<img
					className={styles.mediaImg}
					src={slides[active].src}
					alt={slides[active].alt}
				/>
			</div>
			<div className={styles.subDots}>
				{slides.map((_, i) => (
					<div
						key={i}
						className={`${styles.subDot} ${i === active ? styles.subDotActive : ''}`}
					/>
				))}
			</div>
		</div>
	);
};

// ── Media panel ───────────────────────────────────────────────────────────────

const MediaPanel: React.FC<{ media: StepMedia; stepIndex: number }> = ({
	media,
	stepIndex,
}) => (
	<div className={styles.mediaPanelWrap}>
		<div key={stepIndex} className={styles.mediaSlide}>
			{media.kind === 'single' ? (
				<img className={styles.mediaImg} src={media.src} alt={media.alt} />
			) : (
				<SubCarousel slides={media.slides} />
			)}
		</div>
	</div>
);

// ── Main component ─────────────────────────────────────────────────────────────

interface OnboardingProps {
	onDone: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onDone }) => {
	const [step, setStep] = useState(0);

	const isLast = step === STEPS.length - 1;
	const current = STEPS[step];

	const handleNext = () => {
		if (isLast) {
			onDone();
		} else {
			setStep((p) => p + 1);
		}
	};

	return (
		<div className={styles.overlay}>
			{/* Left: text + navigation */}
			<div className={styles.panel}>
				<div className={styles.logo}>DDDance</div>

				<div className={styles.stepCounter}>
					Шаг {step + 1} из {STEPS.length}
				</div>

				<div key={step} className={styles.stepContent}>
					<h2 className={styles.stepTitle}>{current.title}</h2>
					<p className={styles.stepDesc}>{current.desc}</p>
				</div>

				<div className={styles.dots}>
					{STEPS.map((_, i) => (
						<button
							key={i}
							className={`${styles.dot} ${i === step ? styles.dotActive : ''}`}
							onClick={() => setStep(i)}
							aria-label={`Шаг ${i + 1}`}
						/>
					))}
				</div>

				<div className={styles.actions}>
					<button className={styles.skipBtn} onClick={onDone}>
						Пропустить
					</button>
					<button className={styles.nextBtn} onClick={handleNext}>
						{isLast ? (
							<>
								 Попробовать
							</>
						) : (
							'Далее →'
						)}
					</button>
				</div>
			</div>

			{/* Right: media */}
			<MediaPanel media={current.media} stepIndex={step} />
		</div>
	);
};

export default Onboarding;
