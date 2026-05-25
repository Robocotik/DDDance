import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const S3_ORIGIN = 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru';

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: 'build',
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	server: {
		proxy: {
			// В dev-режиме все запросы к S3 идут через этот прокси (same-origin),
			// поэтому браузер не шлёт CORS preflight на selstorage.ru.
			'/s3': {
				target: S3_ORIGIN,
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/s3/, ''),
			},
		},
	},
});
