import {
	clearAllNotifications,
	getNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	type AppNotification,
} from '@/api/notifications';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch } from '../../store';

export interface NotificationsState {
	items: AppNotification[];
	unreadCount: number;
	loading: boolean;
	loaded: boolean;
	error: string | null;
}

const initialState: NotificationsState = {
	items: [],
	unreadCount: 0,
	loading: false,
	loaded: false,
	error: null,
};

const slice = createSlice({
	name: 'notifications',
	initialState,
	reducers: {
		fetchStart: (state) => {
			state.loading = true;
			state.error = null;
		},
		fetchSuccess: (
			state,
			action: PayloadAction<{ items: AppNotification[]; unreadCount: number }>,
		) => {
			state.loading = false;
			state.loaded = true;
			state.items = action.payload.items;
			state.unreadCount = action.payload.unreadCount;
		},
		fetchError: (state, action: PayloadAction<string>) => {
			state.loading = false;
			state.error = action.payload;
		},
		markRead: (state, action: PayloadAction<number>) => {
			const n = state.items.find((x) => x.id === action.payload);
			if (n && !n.is_read) {
				n.is_read = true;
				state.unreadCount = Math.max(0, state.unreadCount - 1);
			}
		},
		markAllRead: (state) => {
			state.items.forEach((n) => {
				n.is_read = true;
			});
			state.unreadCount = 0;
		},
		// Локально удаляем все уведомления — для optimistic UI clearAll.
		clearAll: (state) => {
			state.items = [];
			state.unreadCount = 0;
			state.loaded = true;
		},
		clear: () => initialState,
	},
});

export const {
	fetchStart,
	fetchSuccess,
	fetchError,
	markRead,
	markAllRead,
	clearAll,
	clear,
} = slice.actions;

export default slice.reducer;

export const fetchNotifications = () => async (dispatch: AppDispatch) => {
	dispatch(fetchStart());
	try {
		const data = await getNotifications();
		dispatch(
			fetchSuccess({
				items: data.notifications,
				unreadCount: data.unread_count,
			}),
		);
	} catch (err: any) {
		dispatch(fetchError(err?.message ?? 'Не удалось загрузить уведомления'));
	}
};

export const markNotificationAsRead =
	(id: number) => async (dispatch: AppDispatch) => {
		// Оптимистичное обновление: чтобы счётчик мгновенно реагировал.
		// Если запрос упадёт — следующее открытие колокольчика всё равно
		// перезагрузит состояние с бэкенда.
		dispatch(markRead(id));
		try {
			await markNotificationRead(id);
		} catch {
			/* ignore */
		}
	};

export const markAllNotificationsAsRead = () => async (dispatch: AppDispatch) => {
	dispatch(markAllRead());
	try {
		await markAllNotificationsRead();
	} catch {
		/* ignore */
	}
};

export const clearAllNotificationsThunk =
	() => async (dispatch: AppDispatch) => {
		dispatch(clearAll());
		try {
			await clearAllNotifications();
		} catch {
			// Если упадёт — перезагрузим список, чтобы привести state в соответствие с БД.
			dispatch(fetchNotifications());
		}
	};
