import axios from 'axios';

const http = axios.create({
	baseURL: 'http://localhost:5458/api',
	headers: {
		'Content-Type': 'application/json',
	},
});

http.interceptors.response.use(
	(response) => response,
	(error) => {
		return Promise.reject(error);
	},
);

export default http;
