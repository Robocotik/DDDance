import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Routes, useLocation } from 'react-router-dom';
import Footer from './components/Footer/Footer';
import Header from './components/Header/Header';
import Onboarding, {
	hasSeenOnboarding,
	markOnboardingDone,
} from './components/Onboarding/Onboarding';
import ProcessingBanner from './components/ProcessingBanner/ProcessingBanner';
import ProcessingDonePopup from './components/ProcessingDonePopup/ProcessingDonePopup';
import { AuthPage } from './pages/AuthPage/AuthPage';
import CatalogPage from './pages/CatalogPage/CatalogPage';
import ComparePage from './pages/ComparePage/ComparePage';
import HomePage from './pages/HomePage/HomePage';
import LessonPage from './pages/LessonPage/LessonPage';
import { RegisterPage } from './pages/RegisterPage/RegisterPage';
import RulesPage from './pages/RulesPage/RulesPage';
import UserPage from './pages/UserPage/UserPage';
import { resumeInFlightTask } from './redux/features/upload/actions';
import {
	selectIsProcessing,
	selectIsUploading,
} from './redux/features/upload/selectors';
import { checkAuthStatus } from './redux/features/user/actions';
import {
	selectIsAuthChecked,
	selectUser,
} from './redux/features/user/selectors';
import type { AppDispatch } from './redux/store';

// Сколько ждём после подтверждения «пользователь анонимный», прежде чем
// показать онбординг. За это время авторизованный юзер успевает увидеть
// контент, а на анонима онбординг всплывает после короткой паузы.
const ONBOARDING_DELAY_MS = 3000;

function App() {
	const dispatch = useDispatch<AppDispatch>();
	const { pathname } = useLocation();
	const isAuthRoute = pathname === '/login' || pathname === '/register';
	const isLessonRoute = pathname.startsWith('/lesson');
	const [showOnboarding, setShowOnboarding] = useState(false);
	const isAuthChecked = useSelector(selectIsAuthChecked);
	const user = useSelector(selectUser);
	const isUploading = useSelector(selectIsUploading);
	const isProcessing = useSelector(selectIsProcessing);

	useEffect(() => {
		dispatch(checkAuthStatus());
		// Если до F5 шла загрузка/сравнение видео — поднимаем поллинг и
		// прогресс-бар восстановится; по готовности сработает попап.
		dispatch(resumeInFlightTask());
	}, [dispatch]);

	// Гард против случайной перезагрузки во время активной загрузки/сравнения.
	// Для анона это критично: localStorage-резюм работает, но если браузер
	// инкогнито или хранилище очищено — танец/попытка могут потеряться.
	// beforeunload показывает нативный confirm; кастомный текст современные
	// браузеры не показывают, но сам диалог появляется при returnValue.
	useEffect(() => {
		if (!isUploading && !isProcessing) {
			return;
		}

		const handler = (e: BeforeUnloadEvent): void => {
			e.preventDefault();
			e.returnValue =
				'Видео ещё обрабатывается. Если закрыть страницу, прогресс может потеряться (особенно без аккаунта).';
		};

		window.addEventListener('beforeunload', handler);

		return () => window.removeEventListener('beforeunload', handler);
	}, [isUploading, isProcessing]);

	// Онбординг — только для гостей и только после подтверждённой проверки
	// авторизации, плюс пауза, чтобы не дёргать пользователя сразу на входе.
	useEffect(() => {
		if (!isAuthChecked || user || hasSeenOnboarding()) {
			return;
		}

		const timer = setTimeout(
			() => setShowOnboarding(true),
			ONBOARDING_DELAY_MS,
		);

		return () => clearTimeout(timer);
	}, [isAuthChecked, user]);

	const handleOnboardingDone = () => {
		markOnboardingDone();
		setShowOnboarding(false);
	};

	return (
		<div id="app">
			{showOnboarding && !isAuthRoute && (
				<Onboarding onDone={handleOnboardingDone} />
			)}
			{!isAuthRoute && <Header />}

			<main id="main">
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/login" element={<AuthPage />} />
					<Route path="/register" element={<RegisterPage />} />
					<Route path="/rules" element={<RulesPage />} />
					<Route path="/lesson/:id" element={<LessonPage />} />
					<Route path="/lesson" element={<LessonPage />} />
					<Route path="/profile/:id" element={<UserPage />} />
					<Route path="/compare/:userDanceId" element={<ComparePage />} />
					<Route path="/dances" element={<CatalogPage />} />
				</Routes>
			</main>

			{!isAuthRoute && !isLessonRoute && <Footer />}

			<ProcessingBanner />
			<ProcessingDonePopup />
		</div>
	);
}

export default App;
