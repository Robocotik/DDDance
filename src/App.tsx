import { Route, Routes, useLocation } from 'react-router-dom';
import Footer from './components/Footer/Footer';
import Header from './components/Header/Header';
import { AuthPage } from './pages/AuthPage/AuthPage';
import HomePage from './pages/HomePage/HomePage';
import LessonPage from './pages/LessonPage/LessonPage';
import { RegisterPage } from './pages/RegisterPage/RegisterPage';

function App() {
	const { pathname } = useLocation();
	const isAuthRoute = pathname === '/login' || pathname === '/register';

	return (
		<div id="app">
			{!isAuthRoute && <Header />}

			<main id="main">
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/login" element={<AuthPage />} />
					<Route path="/register" element={<RegisterPage />} />
					<Route path="/lesson" element={<LessonPage />} />
				</Routes>
			</main>

			{!isAuthRoute && <Footer />}
		</div>
	);
}

export default App;
