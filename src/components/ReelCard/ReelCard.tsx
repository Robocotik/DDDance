import { getSimilarDances } from '@/api/recommend';
import type { ReelItem } from '@/api/reels';
import DuelChallenge from '@/components/DuelChallenge/DuelChallenge';
import MixamoViewer from '@/components/SkeletonViewer/MixamoViewer';
import { S3_ADDRESS } from '@/consts/urls';
import { toggleLikeThunk } from '@/redux/features/likes/actions';
import { selectIsLiked } from '@/redux/features/likes/selectors';
import {
	selectIsUserAuthenticated,
	selectUser,
} from '@/redux/features/user/selectors';
import type { AppDispatch } from '@/redux/store';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import LeaderboardModal from './LeaderboardModal';
import styles from './ReelCard.module.scss';

interface ReelCardProps {
	item: ReelItem;
	similar?: ReelItem[];
	isVisible: boolean;
	onVisible: () => void;
	onWatchedFull?: () => void;
	onAttempt?: () => void;
}

const resolveUrl = (path: string): string => {
	if (!path) {
		return '';
	}

	if (path.startsWith('http://') || path.startsWith('https://')) {
		return path;
	}

	return S3_ADDRESS + '/' + path;
};

const ReelCard: React.FC<ReelCardProps> = ({
	item,
	similar = [],
	isVisible,
	onVisible: _onVisible,
	onWatchedFull,
	onAttempt,
}) => {
	const navigate = useNavigate();
	const dispatch = useDispatch<AppDispatch>();
	const videoRef = useRef<HTMLVideoElement>(null);

	const [isLandscape, setIsLandscape] = useState(false);
	const [fetchedSimilar, setFetchedSimilar] = useState<
		{ id: string; title: string; videoUrl: string; posterUrl?: string }[] | null
	>(null);

	const [showLeaderboard, setShowLeaderboard] = useState(false);
	const [showModel, setShowModel] = useState(false);
	const [showDuelChallenge, setShowDuelChallenge] = useState(false);
	const [likeCount, setLikeCount] = useState(item.like_count);
	const [likedLocal, setLikedLocal] = useState(item.user_liked);
	const [isMuted, setIsMuted] = useState(
		() => localStorage.getItem('reels_muted') !== 'false',
	);

	const isAuthenticated = useSelector(selectIsUserAuthenticated);
	const currentUser = useSelector(selectUser);
	const isLikedSelector = useMemo(
		() => selectIsLiked(item.dance_id),
		[item.dance_id],
	);

	const isLikedFromStore = useSelector(isLikedSelector);

	useEffect(() => {
		setLikedLocal(isLikedFromStore);
	}, [isLikedFromStore]);

	useEffect(() => {
		if (isVisible) {
			videoRef.current?.play().catch(() => {});
		} else {
			videoRef.current?.pause();
		}
	}, [isVisible]);

	useEffect(() => {
		if (videoRef.current) {
			videoRef.current.muted = isMuted;
		}
	}, [isMuted]);

	useEffect(() => {
		const v = videoRef.current;

		if (!v || !onWatchedFull) {
			return;
		}

		v.addEventListener('ended', onWatchedFull);
		return () => v.removeEventListener('ended', onWatchedFull);
	}, [onWatchedFull]);

	const handleMetadata = () => {
		const v = videoRef.current;

		if (!v) {
			return;
		}

		setIsLandscape(v.videoWidth > v.videoHeight);
	};

	const handleLike = () => {
		if (!isAuthenticated) {
			return;
		}

		const next = !likedLocal;
		setLikedLocal(next);
		setLikeCount((c) => c + (next ? 1 : -1));
		dispatch(toggleLikeThunk(item.dance_id, likedLocal));
	};

	const handleMute = () => {
		const next = !isMuted;
		setIsMuted(next);
		localStorage.setItem('reels_muted', String(next));
	};

	useEffect(() => {
		if (!isVisible || fetchedSimilar) {
			return;
		}

		let cancelled = false;
		getSimilarDances(item.dance_id)
			.then((list) => {
				if (!cancelled && list.length > 0) {
					setFetchedSimilar(
						list.map((d) => ({ id: d.id, title: d.title, videoUrl: d.url })),
					);
				}
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [isVisible, item.dance_id, fetchedSimilar]);

	const similarGrid =
		fetchedSimilar ??
		similar.map((s) => ({
			id: s.dance_id,
			title: s.title,
			videoUrl: s.video_url,
			posterUrl: s.preview_url,
		}));

	const glbUrl = `results/${item.dance_id}/full_animation.glb`;

	return (
		<>
			<aside className={styles.sidePanel}>
				<div className={styles.sideAuthor}>
					{item.avatar_url ? (
						<img
							className={styles.sideAuthorAvatar}
							src={resolveUrl(item.avatar_url)}
							alt={item.username}
						/>
					) : (
						<div className={styles.sideAuthorPlaceholder} />
					)}
					<span className={styles.sideUsername}>{item.username}</span>
				</div>
				<h3 className={styles.sideTitle}>{item.title}</h3>
				<div className={styles.sideMeta}>
					<span className={styles.sideMetaItem}>
						⭐ {item.avg_score.toFixed(1)}
					</span>
					<span className={styles.sideMetaItem}>
						👥 {item.attempt_count} попыток
					</span>
					<span className={styles.sideMetaItem}>👁 {item.view_count}</span>
				</div>
				<div className={styles.sideButtons}>
					<button
						className={styles.sidePrimaryBtn}
						onClick={() => {
							onAttempt?.();
							navigate(`/lesson/${item.dance_id}`);
						}}
					>
						Пройти урок
					</button>
					<button
						className={styles.sideSecondaryBtn}
						onClick={() => setShowLeaderboard(true)}
					>
						Таблица лидеров
					</button>
				</div>
			</aside>

			<div
				className={`${styles.container} ${isLandscape ? styles.containerLandscape : ''}`}
			>
				<video
					ref={videoRef}
					className={`${styles.video} ${isLandscape ? styles.landscape : ''}`}
					src={resolveUrl(item.video_url)}
					muted
					loop
					playsInline
					preload="none"
					onLoadedMetadata={handleMetadata}
				/>

				<div className={styles.overlay} />

				<div className={styles.info}>
					<div className={styles.avatarRow}>
						{item.avatar_url ? (
							<img
								className={styles.avatar}
								src={resolveUrl(item.avatar_url)}
								alt={item.username}
							/>
						) : (
							<div className={styles.avatarPlaceholder} />
						)}
						<span className={styles.username}>{item.username}</span>
					</div>
					<p className={styles.title}>{item.title}</p>
					<span className={styles.meta}>⭐ {item.avg_score.toFixed(1)}</span>
					<span className={styles.meta}>👥 {item.attempt_count} попыток</span>
				</div>

				<div className={styles.actions}>
					<button className={styles.actionBtn} onClick={handleMute}>
						<span className={styles.actionIcon}>{isMuted ? '🔇' : '🔊'}</span>
						<span className={styles.actionLabel}>
							{isMuted ? 'Звук' : 'Тихо'}
						</span>
					</button>

					{isAuthenticated && (
						<button
							className={`${styles.actionBtn} ${likedLocal ? styles.liked : ''}`}
							onClick={handleLike}
						>
							<span className={styles.actionIcon}>❤️</span>
							<span className={styles.actionCount}>{likeCount}</span>
						</button>
					)}

					<div className={styles.actionBtn}>
						<span className={styles.actionIcon}>👁</span>
						<span className={styles.actionCount}>{item.view_count}</span>
					</div>

					<button
						className={styles.actionBtn}
						onClick={() => setShowLeaderboard(true)}
					>
						<span className={styles.actionIcon}>🏆</span>
						<span className={styles.actionLabel}>Лидеры</span>
					</button>

					<button
						className={styles.actionBtn}
						onClick={() => {
							onAttempt?.();
							navigate(`/lesson/${item.dance_id}`);
						}}
					>
						<span className={styles.actionIcon}>🕹</span>
						<span className={styles.actionLabel}>Пройти</span>
					</button>

					<button
						className={styles.actionBtn}
						onClick={() => setShowModel(true)}
					>
						<span className={styles.actionIcon}>🤖</span>
						<span className={styles.actionLabel}>Модель</span>
					</button>

					{isAuthenticated && currentUser?.id !== item.uploader_id && (
						<button
							className={styles.actionBtn}
							onClick={() => setShowDuelChallenge(true)}
						>
							<span className={styles.actionIcon}>⚔️</span>
							<span className={styles.actionLabel}>Дуэль</span>
						</button>
					)}
				</div>

				{showLeaderboard && (
					<LeaderboardModal
						danceId={item.dance_id}
						isOpen={showLeaderboard}
						onClose={() => setShowLeaderboard(false)}
					/>
				)}

				{showModel && (
					<div className={styles.modelOverlay}>
						<button
							className={styles.modelClose}
							onClick={() => setShowModel(false)}
							aria-label="Вернуться к ленте"
						>
							<span aria-hidden="true">←</span> Назад
						</button>
						<div className={styles.modelViewer}>
							<MixamoViewer glbPath={glbUrl} autoPlay />
						</div>
					</div>
				)}

				{showDuelChallenge && (
					<DuelChallenge
						opponentId={item.uploader_id}
						opponentLogin={item.username}
						preselectedDanceId={item.dance_id}
						preselectedDanceTitle={item.title}
						onClose={() => setShowDuelChallenge(false)}
					/>
				)}
			</div>

			{similarGrid.length > 0 && (
				<aside className={styles.similarPanel}>
					<span className={styles.similarTitle}>Похожие</span>
					<div className={styles.similarGrid}>
						{similarGrid.map((s) => (
							<button
								key={s.id}
								className={styles.similarCell}
								onClick={() => navigate(`/lesson/${s.id}`)}
							>
								<video
									className={styles.similarVideo}
									src={resolveUrl(s.videoUrl)}
									poster={s.posterUrl ? resolveUrl(s.posterUrl) : undefined}
									muted
									loop
									playsInline
									preload="none"
									onMouseEnter={(e) =>
										void e.currentTarget.play().catch(() => {})
									}
									onMouseLeave={(e) => {
										e.currentTarget.pause();
										e.currentTarget.currentTime = 0;
									}}
								/>
								<span className={styles.similarCellTitle}>{s.title}</span>
							</button>
						))}
					</div>
				</aside>
			)}
		</>
	);
};

export default ReelCard;
