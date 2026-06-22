import { recommendDances, type RecommendDance } from '@/api/recommend';
import { getWeakSpots, type WeakSpots } from '@/api/users/profile';
import { resolveS3Url } from '@/consts/urls';
import {
	selectIsProcessing,
	selectIsUploading,
	selectModerationFailed,
	selectTaskStatus,
	selectUploadError,
} from '@/redux/features/upload/selectors';
import type { RootState } from '@/redux/store';
import React, { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './DanceAssistant.module.scss';

type UserMessage = { role: 'user'; text: string };
type BotMessage = { role: 'bot'; reasoning: string; dances: RecommendDance[] };
type Message = UserMessage | BotMessage;

const HINTS = [
	'Простой для начинающих',
	'Что-то необычное',
	'Популярное сейчас',
] as const;

const DanceAssistant: React.FC = () => {
	const navigate = useNavigate();
	const user = useSelector((s: RootState) => s.user.user);
	const historyItems = useSelector((s: RootState) => s.history.items);

	const isUploading = useSelector(selectIsUploading);
	const isProcessing = useSelector(selectIsProcessing);
	const taskStatus = useSelector(selectTaskStatus);
	const uploadError = useSelector(selectUploadError);
	const moderationFailed = useSelector(selectModerationFailed);
	const showUploadError =
		taskStatus === 'failed' && !moderationFailed && !!uploadError;

	const bannerVisible =
		isUploading ||
		(isProcessing && taskStatus !== 'done' && taskStatus !== 'failed') ||
		showUploadError;

	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [query, setQuery] = useState('');
	const [loading, setLoading] = useState(false);
	const [weakSpots, setWeakSpots] = useState<WeakSpots | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	const sendQuery = async (text: string) => {
		const trimmed = text.trim();

		if (!trimmed || loading) {
			return;
		}

		setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
		setQuery('');
		setLoading(true);

		const history = historyItems.slice(0, 10).map((a) => a.dance_id);

		try {
			const resp = await recommendDances(trimmed, {
				user_id: user?.id,
				history: history.length > 0 ? history : undefined,
			});

			const picked = resp.dances.slice(0, 1);
			setMessages((prev) => [
				...prev,
				{
					role: 'bot',
					reasoning:
						picked.length > 0 ? 'Нашёл для тебя танец:' : resp.reasoning,
					dances: picked,
				},
			]);
		} catch {
			setMessages((prev) => [
				...prev,
				{
					role: 'bot',
					reasoning: 'Не удалось получить рекомендации. Попробуй позже.',
					dances: [],
				},
			]);
		} finally {
			setLoading(false);
			setTimeout(scrollToBottom, 50);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		void sendQuery(query);
	};

	const handleOpen = () => {
		setIsOpen(true);
		setTimeout(() => inputRef.current?.focus(), 100);

		if (user && weakSpots === null) {
			getWeakSpots()
				.then((ws) => setWeakSpots(ws))
				.catch(() => {});
		}
	};

	const handleClose = () => setIsOpen(false);

	return (
		<>
			{!isOpen && (
				<button
					className={`${styles.fab} ${bannerVisible ? styles.lifted : ''}`}
					onClick={handleOpen}
					aria-label="Помощник по танцам"
				>
					💬
				</button>
			)}
			{isOpen && (
				<div
					className={`${styles.drawer} ${bannerVisible ? styles.lifted : ''}`}
				>
					<div className={styles.drawerHeader}>
						<span className={styles.drawerTitle}>Подбор танца</span>
						<button
							className={styles.drawerClose}
							onClick={handleClose}
							aria-label="Закрыть"
						>
							×
						</button>
					</div>

					<div className={styles.messages}>
						{messages.length === 0 && (
							<div className={styles.empty}>
								{weakSpots && (
									<div className={styles.weakSpotsHint}>
										<span className={styles.weakSpotsText}>
											На основе твоих результатов: {weakSpots.suggestion}
										</span>
									</div>
								)}
								<p className={styles.emptyText}>
									Опиши что хочешь потанцевать — подберу варианты
								</p>
								<div className={styles.hints}>
									{HINTS.map((hint) => (
										<button
											key={hint}
											className={styles.hintBtn}
											onClick={() => void sendQuery(hint)}
											disabled={loading}
										>
											{hint}
										</button>
									))}
								</div>
							</div>
						)}
						{messages.map((msg, i) =>
							msg.role === 'user' ? (
								<div key={i} className={styles.msgUser}>
									<span className={styles.msgText}>{msg.text}</span>
								</div>
							) : (
								<div key={i} className={styles.msgBot}>
									{msg.reasoning && (
										<span className={styles.reasoning}>{msg.reasoning}</span>
									)}
									{msg.dances.length > 0 && (
										<div className={styles.danceCards}>
											{msg.dances.map((dance) => (
												<DanceCard
													key={dance.id}
													dance={dance}
													onWatch={() => navigate(`/lesson/${dance.id}`)}
												/>
											))}
										</div>
									)}
								</div>
							),
						)}
						{loading && (
							<div className={styles.msgBot}>
								<span className={styles.reasoning}>Подбираю...</span>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>

					{messages.length > 0 && (
						<div className={styles.hintsRow}>
							{HINTS.map((hint) => (
								<button
									key={hint}
									className={styles.hintBtnSmall}
									onClick={() => void sendQuery(hint)}
									disabled={loading}
								>
									{hint}
								</button>
							))}
						</div>
					)}

					<form className={styles.inputArea} onSubmit={handleSubmit}>
						<input
							ref={inputRef}
							className={styles.input}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Напиши что ищешь..."
							disabled={loading}
						/>
						<button
							className={styles.sendBtn}
							type="submit"
							disabled={!query.trim() || loading}
							aria-label="Отправить"
						>
							➤
						</button>
					</form>
				</div>
			)}
		</>
	);
};

interface DanceCardProps {
	dance: RecommendDance;
	onWatch: () => void;
}

const DanceCard: React.FC<DanceCardProps> = ({ dance, onWatch }) => (
	<div className={styles.danceCard}>
		<video
			className={styles.danceVideo}
			src={resolveS3Url(dance.url)}
			muted
			playsInline
			preload="none"
			onMouseEnter={(e) => {
				void e.currentTarget.play().catch(() => {});
			}}
			onMouseLeave={(e) => {
				e.currentTarget.pause();
				e.currentTarget.currentTime = 0;
			}}
		/>
		<div className={styles.danceInfo}>
			<span className={styles.danceTitle}>{dance.title || 'Без названия'}</span>
			{dance.avg_score > 0 && (
				<span className={styles.danceScore}>
					★ {dance.avg_score.toFixed(0)}
				</span>
			)}
		</div>
		<button className={styles.watchBtn} onClick={onWatch}>
			Смотреть
		</button>
	</div>
);

export default DanceAssistant;
