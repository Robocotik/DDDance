import { fetchHistory } from '@/redux/features/history/actions';
import { fetchLikes } from '@/redux/features/likes/actions';
import {
	selectHistoryError,
	selectHistoryItems,
	selectHistoryLoading,
} from '@/redux/features/history/selectors';
import { selectLikesItems, selectLikesLoading } from '@/redux/features/likes/selectors';
import type { AppDispatch } from '@/redux/store';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import HistoryItemCard from '../HistoryItem/HistoryItem';
import LikedItemCard from '../LikedItem/LikedItem';
import Title from '../Title/Title';
import styles from './UserHistory.module.scss';

const UserHistory: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();

	const historyItems = useSelector(selectHistoryItems) ?? [];
	const historyLoading = useSelector(selectHistoryLoading);
	const historyError = useSelector(selectHistoryError);

	const likedItems = useSelector(selectLikesItems) ?? [];
	const likesLoading = useSelector(selectLikesLoading);

	useEffect(() => {
		dispatch(fetchHistory());
		dispatch(fetchLikes());
	}, [dispatch]);

	return (
		<div className={styles.wrapper}>
			<section className={styles.section}>
				<Title className={styles.title}>Понравившиеся</Title>
				{likesLoading && <p className={styles.message}>Загрузка...</p>}
				{!likesLoading && likedItems.length === 0 && (
					<p className={styles.message}>Нет понравившихся танцев</p>
				)}
				{likedItems.length > 0 && (
					<div className={styles.scrollWrapper}>
						<div className={styles.row}>
							{likedItems.map((item : any) => (
								<div key={item.dance_id} className={styles.cardWrapper}>
									<LikedItemCard item={item} />
								</div>
							))}
						</div>
					</div>
				)}
			</section>

			<section className={styles.section}>
				<Title className={styles.title}>Просмотренные</Title>
				{historyLoading && <p className={styles.message}>Загрузка...</p>}
				{historyError && <p className={styles.error}>{historyError}</p>}
				{!historyLoading && !historyError && historyItems.length === 0 && (
					<p className={styles.message}>История пуста</p>
				)}
				{historyItems.length > 0 && (
					<div className={styles.scrollWrapper}>
						<div className={styles.row}>
							{historyItems.map((item: any) => (
								<div key={item.id} className={styles.cardWrapper}>
									<HistoryItemCard item={item} />
								</div>
							))}
						</div>
					</div>
				)}
			</section>
		</div>
	);
};

export default UserHistory;