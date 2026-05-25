import http from '../http';

export interface Friend {
	user_id: string;
	login: string;
	avatar: string;
	friended_at: string;
}

export interface FriendshipStatus {
	status: 'none' | 'pending' | 'accepted';
	is_sender: boolean;
	friendship_id?: number;
}

export const sendFriendRequest = async (userId: string): Promise<void> => {
	await http.post(`/users/${userId}/friend-request`);
};

export const respondFriendRequest = async (
	friendshipId: number,
	accept: boolean,
): Promise<void> => {
	await http.post(`/users/friend-requests/${friendshipId}/respond`, { accept });
};

export const getFriends = async (): Promise<Friend[]> => {
	const response = await http.get<Friend[]>('/users/friends');
	return response.data;
};

export const getFriendsByUserId = async (userId: string): Promise<Friend[]> => {
	const response = await http.get<Friend[]>(`/users/${userId}/friends`);
	return response.data;
};

export const removeFriend = async (friendId: string): Promise<void> => {
	await http.delete(`/users/friends/${friendId}`);
};
