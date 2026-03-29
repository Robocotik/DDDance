import { Route, Routes } from 'react-router-dom';
import Footer from './components/Footer/Footer';
import Header from './components/Header/Header';
import HomePage from './pages/HomePage/HomePage';
import LessonPage from './pages/LessonPage/LessonPage';
import UserPage from './pages/UserPage/UserPage';

function App() {
	return (
		<div id="app">
			<Header />

			<main id="main">
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/lesson" element={<LessonPage />} />
					<Route path="/profile" element={<UserPage />} />
				</Routes>
			</main>

			<Footer />
		</div>
	);
}

export default App;
