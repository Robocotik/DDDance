import { Route, Routes } from 'react-router-dom';
import Footer from './components/Footer/Footer';
import Header from './components/Header/Header';
import HomePage from './pages/HomePage/HomePage';
import LessonPage from './pages/LessonPage/LessonPage';

function App() {
	return (
		<>
			<Header />
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/lesson" element={<LessonPage />} />
			</Routes>
			<Footer />
		</>
	);
}

export default App;
