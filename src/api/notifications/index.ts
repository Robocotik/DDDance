import http from '../http';

export type NotificationType =
	| 'dance_approved'
	| 'dance_rejected'
	| 'friend_request'
	| 'friend_accepted'
	| 'friend_declined'
	| 'friend_removed';

export interface AppNotification {
	id: number;
	type: NotificationType;
	dance_id: string;
	reason?: string;
	is_read: boolean;
	created_at: string;
	from_user_id?: string;
	from_login?: string;
	ref_id?: number;
}

export interface NotificationsResponse {
	notifications: AppNotification[];
	unread_count: number;
}

export const getNotifications = async (): Promise<NotificationsResponse> => {
	const response = await http.get<NotificationsResponse>('/notifications');
	return response.data;
};

export const markNotificationRead = async (id: number): Promise<void> => {
	await http.post(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
	await http.post('/notifications/read-all');
};

export const clearAllNotifications = async (): Promise<void> => {
	await http.delete('/notifications');
};

export const claimUploads = async (danceIds: string[]): Promise<void> => {
	if (danceIds.length === 0) return;
	await http.post('/uploads/claim', { dance_ids: danceIds });
};
