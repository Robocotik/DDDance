// В development режиме используем Vite-прокси /s3 → selstorage.ru,
// чтобы обойти CORS-ограничения S3 при работе с localhost:5173.
// В production — прямой URL S3 (Selectel сконфигурирован под dddance.ru).
export const S3_ADDRESS = import.meta.env.DEV
	? '/s3'
	: 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru';
