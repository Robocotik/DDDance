import type { RootState } from '../../store';

export const selectNotifications = (state: RootState) =>
	state.notifications.items;

export const selectUnreadCount = (state: RootState) =>
	state.notifications.unreadCount;

export const selectNotificationsLoading = (state: RootState) =>
	state.notifications.loading;

export const selectNotificationsLoaded = (state: RootState) =>
	state.notifications.loaded;
