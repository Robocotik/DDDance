import { fetchHistory } from '@/redux/features/history/actions';
import {
	selectHistoryError,
	selectHistoryItems,
	selectHistoryLoading,
} from '@/redux/features/history/selectors';
import type { AppDispatch } from '@/redux/store';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import HistoryItemCard from '../HistoryItem/HistoryItem';
import Title from '../Title/Title';
import styles from './UserHistory.module.scss';

const UserHistory: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const items = useSelector(selectHistoryItems) ?? [];
	const loading = useSelector(selectHistoryLoading);
	const error = useSelector(selectHistoryError);

	useEffect(() => {
		dispatch(fetchHistory());
	}, [dispatch]);

	return (
		<div className={styles.container}>
			<Title className={styles.title}>История просмотров</Title>
			{loading && <p className={styles.message}>Загрузка...</p>}
			{error && <p className={styles.error}>{error}</p>}
			{!loading && !error && items.length === 0 && (
				<p className={styles.message}>История пуста</p>
			)}
			{items.length > 0 && (
				<ul className={styles.list}>
					{items.map((item?: any) => (
						<li key={item.id}>
							<HistoryItemCard item={item} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default UserHistory;
