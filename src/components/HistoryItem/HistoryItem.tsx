import type { HistoryItem } from '@/api/users/history';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/redux/store';
import {
	deleteHistoryItemThunk,
	renameHistoryItem,
} from '@/redux/features/history/actions';
import styles from './HistoryItem.module.scss';

interface HistoryItemProps {
	item: HistoryItem;
}

const HistoryItemCard: React.FC<HistoryItemProps> = ({ item }) => {
	const navigate = useNavigate();
	const dispatch = useDispatch<AppDispatch>();

	const [isEditing, setIsEditing] = useState(false);
	const [nameValue, setNameValue] = useState(item.name || 'Без названия');

	const handleOpenLesson = () => {
		navigate(`/lesson/${item.dance_id}`);
	};

	const handleRenameSubmit = () => {
		const trimmed = nameValue.trim();
		if (trimmed && trimmed !== item.name) {
			dispatch(renameHistoryItem(item.id, trimmed));
		}
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') handleRenameSubmit();
		if (e.key === 'Escape') {
			setNameValue(item.name || 'Без названия');
			setIsEditing(false);
		}
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		dispatch(deleteHistoryItemThunk(item.id));
	};

	return (
		<div className={styles.card}>
			<div className={styles.info} onClick={handleOpenLesson}>
				{isEditing ? (
					<input
						className={styles.input}
						value={nameValue}
						autoFocus
						onChange={(e) => setNameValue(e.target.value)}
						onBlur={handleRenameSubmit}
						onKeyDown={handleKeyDown}
						onClick={(e) => e.stopPropagation()}
					/>
				) : (
					<span className={styles.name}>{nameValue}</span>
				)}
				<span className={styles.date}>
					{new Date(item.created_at).toLocaleDateString('ru-RU', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					})}
				</span>
			</div>
			<div className={styles.actions}>
				<button
					className={styles.editBtn}
					onClick={(e) => {
						e.stopPropagation();
						setIsEditing(true);
					}}
					title="Переименовать"
				>
					✏️
				</button>
				<button
					className={styles.deleteBtn}
					onClick={handleDelete}
					title="Удалить"
				>
					🗑️
				</button>
			</div>
		</div>
	);
};

export default HistoryItemCard;
