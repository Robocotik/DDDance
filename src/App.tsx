import { Route, Routes } from 'react-router-dom';
import Footer from './components/Footer/Footer';
import HomePage from './pages/HomePage/HomePage';

function App() {
	return (
		<>
			<Routes>
				<Route path="/" element={<HomePage />} />
			</Routes>
			<Footer />
		</>
	);
}

export default App;
