import {
	deleteHistoryItem,
	getHistory,
	updateHistoryItem,
} from '../../../api/users/history';
import type { AppDispatch } from '../../store';
import {
	removeItem,
	setHistoryError,
	setHistoryItems,
	setHistoryLoading,
	updateItem,
} from './historySlice';

export const fetchHistory = () => async (dispatch: AppDispatch) => {
	dispatch(setHistoryLoading(true));
	try {
		const data = await getHistory();
		dispatch(setHistoryItems(data));
	} catch {
		dispatch(setHistoryError('Не удалось загрузить историю'));
	}
};

export const renameHistoryItem =
	(id: string, name: string) => async (dispatch: AppDispatch) => {
		try {
			const updated = await updateHistoryItem(id, { name });
			dispatch(updateItem(updated));
		} catch {
			dispatch(setHistoryError('Не удалось переименовать запись'));
		}
	};

export const deleteHistoryItemThunk =
	(id: string) => async (dispatch: AppDispatch) => {
		try {
			await deleteHistoryItem(id);
			dispatch(removeItem(id));
		} catch {
			dispatch(setHistoryError('Не удалось удалить запись'));
		}
	};
