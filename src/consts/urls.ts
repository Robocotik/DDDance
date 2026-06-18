export const S3_ADDRESS = import.meta.env.DEV
	? '/s3'
	: 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru';

export const resolveS3Url = (url: string): string =>
	!url || url.startsWith('http')
		? url
		: `${S3_ADDRESS}/${url.replace(/^\/+/, '')}`;

export const TELEGRAM_BOT_URL =
	import.meta.env.VITE_TELEGRAM_BOT_URL || 'https://t.me/DDDanceBot';
