import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Routes, useLocation } from 'react-router-dom';
import AchievementToast from './components/AchievementToast/AchievementToast';
import DanceAssistant from './components/DanceAssistant/DanceAssistant';
import Footer from './components/Footer/Footer';
import Header from './components/Header/Header';
import Onboarding, {
	hasSeenOnboarding,
	markOnboardingDone,
} from './components/Onboarding/Onboarding';
import ProcessingBanner from './components/ProcessingBanner/ProcessingBanner';
import ProcessingDonePopup from './components/ProcessingDonePopup/ProcessingDonePopup';
import {
	useAttemptReady,
	type AchievementUnlockedPayload,
} from './hooks/useAttemptReady';
import { AuthPage } from './pages/AuthPage/AuthPage';
import CatalogPage from './pages/CatalogPage/CatalogPage';
import DuelsPage from './pages/DuelsPage/DuelsPage';
import FeedPage from './pages/FeedPage/FeedPage';
import HomePage from './pages/HomePage/HomePage';
import PublicDuelsPage from './pages/PublicDuelsPage/PublicDuelsPage';
import ReelsPage from './pages/ReelsPage/ReelsPage';
import { RegisterPage } from './pages/RegisterPage/RegisterPage';
import RulesPage from './pages/RulesPage/RulesPage';
import TopPage from './pages/TopPage/TopPage';
import UserPage from './pages/UserPage/UserPage';
import { incrementUnlocked } from './redux/features/achievements/achievementsSlice';
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

const LessonPage = lazy(() => import('./pages/LessonPage/LessonPage'));
const ComparePage = lazy(() => import('./pages/ComparePage/ComparePage'));

const ONBOARDING_DELAY_MS = 3000;

function App() {
	const dispatch = useDispatch<AppDispatch>();
	const { pathname } = useLocation();
	const isAuthRoute = pathname === '/login' || pathname === '/register';
	const isLessonRoute = pathname.startsWith('/lesson');
	const isReelsRoute = pathname.startsWith('/reels');
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [achievementToast, setAchievementToast] =
		useState<AchievementUnlockedPayload | null>(null);

	const isAuthChecked = useSelector(selectIsAuthChecked);
	const user = useSelector(selectUser);
	const isUploading = useSelector(selectIsUploading);
	const isProcessing = useSelector(selectIsProcessing);

	const handleAchievement = useCallback(
		(payload: AchievementUnlockedPayload) => {
			setAchievementToast(payload);
			dispatch(incrementUnlocked());
		},
		[dispatch],
	);

	useAttemptReady(user?.id, undefined, handleAchievement);

	useEffect(() => {
		dispatch(checkAuthStatus());
		dispatch(resumeInFlightTask());
	}, [dispatch]);

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
					<Route path="/profile/:id" element={<UserPage />} />
					<Route path="/dances" element={<CatalogPage />} />
					<Route path="/duels" element={<DuelsPage />} />
					<Route path="/feed" element={<FeedPage />} />
					<Route path="/community/duels" element={<PublicDuelsPage />} />
					<Route path="/top" element={<TopPage />} />
					<Route path="/reels" element={<ReelsPage />} />
					<Route
						path="/lesson/:id"
						element={
							<Suspense fallback={<div>Загрузка...</div>}>
								<LessonPage />
							</Suspense>
						}
					/>
					<Route
						path="/lesson"
						element={
							<Suspense fallback={<div>Загрузка...</div>}>
								<LessonPage />
							</Suspense>
						}
					/>
					<Route
						path="/compare/:userDanceId"
						element={
							<Suspense fallback={<div>Загрузка...</div>}>
								<ComparePage />
							</Suspense>
						}
					/>
				</Routes>
			</main>

			{!isAuthRoute && !isLessonRoute && !isReelsRoute && <Footer />}

			{achievementToast && (
				<AchievementToast
					payload={achievementToast}
					onDismiss={() => setAchievementToast(null)}
				/>
			)}
			<ProcessingBanner />
			<ProcessingDonePopup />
			{!isAuthRoute && !isLessonRoute && !isReelsRoute && <DanceAssistant />}
		</div>
	);
}

export default App;
