import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes, useLocation } from 'react-router-dom';
import Footer from './components/Footer/Footer';
import Header from './components/Header/Header';
import { AuthPage } from './pages/AuthPage/AuthPage';
import HomePage from './pages/HomePage/HomePage';
import LessonPage from './pages/LessonPage/LessonPage';
import { RegisterPage } from './pages/RegisterPage/RegisterPage';
import UserPage from './pages/UserPage/UserPage';
import { checkAuthStatus } from './redux/features/user/actions';
import type { AppDispatch } from './redux/store';

function App() {
	const dispatch = useDispatch<AppDispatch>();
	const { pathname } = useLocation();
	const isAuthRoute = pathname === '/login' || pathname === '/register';

	useEffect(() => {
		dispatch(checkAuthStatus());
	}, [dispatch]);

	return (
		<div id="app">
			{!isAuthRoute && <Header />}

			<main id="main">
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/login" element={<AuthPage />} />
					<Route path="/register" element={<RegisterPage />} />
					<Route path="/lesson/:id" element={<LessonPage />} />
					<Route path="/profile/:id" element={<UserPage />} />
				</Routes>
			</main>

			{!isAuthRoute && <Footer />}
		</div>
	);
}

export default App;
