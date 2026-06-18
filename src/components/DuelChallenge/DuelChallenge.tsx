import { getDancesCatalog, type DanceItem } from '@/api/dances/catalog';
import type { DuelMode, DuelWithUsers } from '@/api/duels';
import { createDuelThunk } from '@/redux/features/duels/duelsSlice';
import type { AppDispatch } from '@/redux/store';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import styles from './DuelChallenge.module.scss';

interface DuelChallengeProps {
	opponentId: string;
	opponentLogin: string;
	onClose: () => void;
	onCreated?: (duel: DuelWithUsers) => void;
	preselectedDanceId?: string;
	preselectedDanceTitle?: string;
}

const DuelChallenge: React.FC<DuelChallengeProps> = ({
	opponentId,
	opponentLogin,
	onClose,
	onCreated,
	preselectedDanceId,
	preselectedDanceTitle,
}) => {
	const dispatch = useDispatch<AppDispatch>();

	const [mode, setMode] = useState<DuelMode>(
		preselectedDanceId ? 'single_dance' : 'random_dance',
	);

	const [danceSearch, setDanceSearch] = useState('');
	const [searchResults, setSearchResults] = useState<DanceItem[]>([]);
	const [selectedDance, setSelectedDance] = useState<DanceItem | null>(
		preselectedDanceId
			? { id: preselectedDanceId, url: '', title: preselectedDanceTitle }
			: null,
	);

	const [searchLoading, setSearchLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const searchAbortRef = useRef<AbortController | null>(null);
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			searchAbortRef.current?.abort();
			clearTimeout(closeTimerRef.current ?? undefined);
		},
		[],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);

	const searchDances = useCallback(async (query: string) => {
		if (!query.trim()) {
			setSearchResults([]);
			return;
		}

		searchAbortRef.current?.abort();
		const controller = new AbortController();
		searchAbortRef.current = controller;

		setSearchLoading(true);

		try {
			const data = await getDancesCatalog({
				search: query,
				limit: 6,
				signal: controller.signal,
			});

			setSearchResults(data.dances ?? []);
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				return;
			}

			if (err instanceof Error && err.name === 'CanceledError') {
				return;
			}

			setSearchResults([]);
		} finally {
			setSearchLoading(false);
		}
	}, []);

	useEffect(() => {
		if (mode !== 'single_dance') {
			setSearchResults([]);
			return;
		}

		if (searchTimerRef.current) {
			clearTimeout(searchTimerRef.current);
		}

		searchTimerRef.current = setTimeout(() => {
			void searchDances(danceSearch);
		}, 300);

		return () => {
			if (searchTimerRef.current) {
				clearTimeout(searchTimerRef.current);
			}
		};
	}, [danceSearch, mode, searchDances]);

	const canSubmit =
		!submitting &&
		(mode === 'random_dance' ||
			(mode === 'single_dance' && selectedDance !== null));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!canSubmit) {
			return;
		}

		setSubmitting(true);
		setError(null);
		const result = await dispatch(
			createDuelThunk({
				opponent_id: opponentId,
				mode,
				dance_id: mode === 'single_dance' ? selectedDance?.id : undefined,
			}),
		);

		if (result === 'exists') {
			setError('Вызов этому игроку на этот танец уже отправлен.');
			setSubmitting(false);
		} else if (result) {
			setSuccess(true);
			onCreated?.(result);
			closeTimerRef.current = setTimeout(onClose, 1500);
		} else {
			setError('Не удалось отправить вызов. Попробуй позже.');
			setSubmitting(false);
		}
	};

	const handleSelectDance = (dance: DanceItem) => {
		setSelectedDance(dance);
		setSearchResults([]);
	};

	const handleClearDance = () => {
		setSelectedDance(null);
		setDanceSearch('');
	};

	const handleSwitchMode = (next: DuelMode) => {
		setMode(next);
		setSelectedDance(null);
		setDanceSearch('');
		setSearchResults([]);
	};

	return (
		<div className={styles.overlay} onClick={onClose}>
			<form
				className={styles.modal}
				onClick={(e) => e.stopPropagation()}
				onSubmit={handleSubmit}
			>
				<div className={styles.header}>
					<h2 className={styles.title}>Бросить вызов</h2>
					<button
						type="button"
						className={styles.close}
						onClick={onClose}
						aria-label="Закрыть"
					>
						×
					</button>
				</div>

				<div className={styles.body}>
					<p className={styles.opponent}>
						Вызов для <strong>{opponentLogin}</strong>
					</p>

					{!preselectedDanceId && (
						<div className={styles.modeGroup}>
							<p className={styles.label}>Режим</p>
							<div className={styles.modeTabs}>
								<button
									type="button"
									className={`${styles.modeTab} ${mode === 'random_dance' ? styles.modeTabActive : ''}`}
									onClick={() => handleSwitchMode('random_dance')}
								>
									Случайный танец
								</button>
								<button
									type="button"
									className={`${styles.modeTab} ${mode === 'single_dance' ? styles.modeTabActive : ''}`}
									onClick={() => handleSwitchMode('single_dance')}
								>
									Выбрать танец
								</button>
							</div>
						</div>
					)}

					{mode === 'single_dance' && (
						<div className={styles.danceSearchGroup}>
							<p className={styles.label}>Танец</p>
							{selectedDance ? (
								<div className={styles.selectedDance}>
									<span className={styles.selectedDanceTitle}>
										{selectedDance.title ?? 'Без названия'}
									</span>
									<button
										type="button"
										className={styles.clearDance}
										onClick={handleClearDance}
									>
										×
									</button>
								</div>
							) : (
								<>
									<input
										className={styles.searchInput}
										value={danceSearch}
										onChange={(e) => setDanceSearch(e.target.value)}
										placeholder="Поиск танца..."
										autoFocus
									/>
									{searchLoading && (
										<p className={styles.searchHint}>Поиск...</p>
									)}
									{!searchLoading && searchResults.length > 0 && (
										<ul className={styles.searchResults}>
											{searchResults.map((dance) => (
												<li
													key={dance.id}
													className={styles.searchResultItem}
													onClick={() => handleSelectDance(dance)}
												>
													{dance.title ?? 'Без названия'}
												</li>
											))}
										</ul>
									)}
									{!searchLoading &&
										danceSearch.trim() &&
										searchResults.length === 0 && (
											<p className={styles.searchHint}>Ничего не найдено</p>
										)}
								</>
							)}
						</div>
					)}

					{mode === 'random_dance' && (
						<p className={styles.hint}>
							Платформа выберет случайный опубликованный танец для обоих
							участников
						</p>
					)}

					{error && <p className={styles.error}>{error}</p>}
					{success && <p className={styles.successMsg}>Вызов отправлен!</p>}
				</div>

				<div className={styles.footer}>
					<button
						type="button"
						className={styles.btnGhost}
						onClick={onClose}
						disabled={submitting}
					>
						Отмена
					</button>
					<button
						type="submit"
						className={styles.btnPrimary}
						disabled={!canSubmit}
					>
						{submitting ? 'Отправляем...' : 'Бросить вызов'}
					</button>
				</div>
			</form>
		</div>
	);
};

export default DuelChallenge;
