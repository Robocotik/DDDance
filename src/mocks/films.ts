/* eslint-disable sonarjs/no-duplicate-string */

import type { BaseAuthResponse } from '@/api/auth/register';
import type { TrendVideos } from '@/redux/features/trends/actions';

export const trendingVideos = [
	{
		src: '#',
		title: 'Фильм 1',
	},
	{
		src: '#',
		title: 'Фильм 2',
	},
	{
		src: '#',
		title: 'Фильм 3',
	},
	{
		src: '#',
		title: 'Фильм 4',
	},
	{
		src: '#',
		title: 'Фильм 5',
	},
	{
		src: '#',
		title: 'Фильм 6',
	},
	{
		src: '#',
		title: 'Фильм 7',
	},
	{
		src: '#',
		title: 'Фильм 8',
	},
	{
		src: '#',
		title: 'Фильм 9',
	},
	{
		src: '#',
		title: 'Фильм 10',
	},
	{
		src: '#',
		title: 'Фильм 11',
	},
	{
		src: '#',
		title: 'Фильм 12',
	},
];

export const baseAuthResponseMock: BaseAuthResponse = {
	avatar: 'https://example.com/avatar.png',
	created_at: '2026-04-11T10:30:00.000Z',
	has_2fa: true,
	id: 'user_123456',
	is_foreign: false,
	login: 'test_user',
	updated_at: '2026-04-11T12:00:00.000Z',
	version: 1,
};

export const trendsMock: TrendVideos = {
	count: 8,
	videos: [
		{
			id: '14ede021-44be-4c3e-9bf9-66fc7cf75dfc',
			url: 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/results/14ede021-44be-4c3e-9bf9-66fc7cf75dfc/video.mp4',
		},
		{
			id: '14ede021-44be-4c3e-9bf9-66fc7cf75dfc',
			url: 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/results/14ede021-44be-4c3e-9bf9-66fc7cf75dfc/video.mp4',
		},
		{
			id: '14ede021-44be-4c3e-9bf9-66fc7cf75dfc',
			url: 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/results/14ede021-44be-4c3e-9bf9-66fc7cf75dfc/video.mp4',
		},
		{
			id: '14ede021-44be-4c3e-9bf9-66fc7cf75dfc',
			url: 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/results/14ede021-44be-4c3e-9bf9-66fc7cf75dfc/video.mp4',
		},
		{
			id: '14ede021-44be-4c3e-9bf9-66fc7cf75dfc',
			url: 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/results/14ede021-44be-4c3e-9bf9-66fc7cf75dfc/video.mp4',
		},
		{
			id: '14ede021-44be-4c3e-9bf9-66fc7cf75dfc',
			url: 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/results/14ede021-44be-4c3e-9bf9-66fc7cf75dfc/video.mp4',
		},
		{
			id: '14ede021-44be-4c3e-9bf9-66fc7cf75dfc',
			url: 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/results/14ede021-44be-4c3e-9bf9-66fc7cf75dfc/video.mp4',
		},
		{
			id: '14ede021-44be-4c3e-9bf9-66fc7cf75dfc',
			url: 'https://99906fd4-fe10-44d1-80b4-83c6117045ce.selstorage.ru/results/14ede021-44be-4c3e-9bf9-66fc7cf75dfc/video.mp4',
		},
	],
};
