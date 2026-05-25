import http from '../http';

const path = '/users/history';

export type HistoryItem = {
	id: string;
	dance_id: string;
	user_id: string;
	// name — пользовательская метка (в БД дефолт 'Без названия' при создании).
	// dance_title — оригинальный title танца. UI показывает dance_title, когда
	// пользователь свою метку ещё не задал.
	name: string;
	dance_title?: string;
	source_url: string;
	created_at: string;
	score?: number | null;
};

export const getHistory = async (): Promise<HistoryItem[]> => {
	const response = await http.get<HistoryItem[]>(path);
	return response.data;
};

export const updateHistoryItem = async (
	id: string,
	payload: { name: string },
): Promise<HistoryItem> => {
	const response = await http.put<HistoryItem>(`${path}/${id}`, payload);
	return response.data;
};

export const deleteHistoryItem = async (id: string): Promise<void> => {
	await http.delete(`${path}/${id}`);
};
