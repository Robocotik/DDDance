import axios from "axios";

const http = axios.create({
  baseURL: "https://your-backend.com", // замените на ваш бэкенд
  headers: {
    "Content-Type": "application/json",
  },
});

// Перехватчик ошибок (опционально)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default http;