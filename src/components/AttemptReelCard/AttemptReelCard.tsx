import type { ReelsAttemptItem } from '@/api/reels';
import { S3_ADDRESS } from '@/consts/urls';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AttemptReelCard.module.scss';

interface Props {
	item: ReelsAttemptItem;
	isVisible: boolean;
}

const resolveUrl = (path: string): string => {
	if (!path) {
		return '';
	}

	if (path.startsWith('http://') || path.startsWith('https://')) {
		return path;
	}

	return `${S3_ADDRESS}/${path}`;
};

const AttemptReelCard: React.FC<Props> = ({ item, isVisible }) => {
	const navigate = useNavigate();
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isMuted, setIsMuted] = useState(
		() => localStorage.getItem('reels_muted') !== 'false',
	);

	const [isLandscape, setIsLandscape] = useState(false);

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

	const handleMute = () => {
		const next = !isMuted;
		setIsMuted(next);
		localStorage.setItem('reels_muted', String(next));
	};

	return (
		<>
			<aside className={styles.sidePanel}>
				<div className={styles.sideAuthor}>
					{item.user_avatar ? (
						<img
							className={styles.sideAuthorAvatar}
							src={resolveUrl(item.user_avatar)}
							alt={item.user_login}
						/>
					) : (
						<div className={styles.sideAuthorPlaceholder} />
					)}
					<span className={styles.sideUsername}>{item.user_login}</span>
				</div>
				<h3 className={styles.sideTitle}>{item.dance_title}</h3>
				<div className={styles.sideMeta}>
					<span className={styles.sideMetaItem}>
						⭐ {Math.round(item.score)}
					</span>
				</div>
				<div className={styles.sideButtons}>
					<button
						className={styles.sidePrimaryBtn}
						onClick={() => navigate(`/lesson/${item.dance_id}`)}
					>
						Повторить танец
					</button>
				</div>
			</aside>

			<div
				className={`${styles.container} ${isLandscape ? styles.containerLandscape : ''}`}
			>
				<video
					ref={videoRef}
					className={`${styles.video} ${isLandscape ? styles.landscape : ''}`}
					src={resolveUrl(item.video_key)}
					muted
					loop
					playsInline
					preload="none"
					onLoadedMetadata={() => {
						const v = videoRef.current;

						if (v) {
							setIsLandscape(v.videoWidth > v.videoHeight);
						}
					}}
				/>

				<div className={styles.overlay} />

				<div className={styles.info}>
					<div className={styles.avatarRow}>
						{item.user_avatar ? (
							<img
								className={styles.avatar}
								src={resolveUrl(item.user_avatar)}
								alt={item.user_login}
							/>
						) : (
							<div className={styles.avatarPlaceholder} />
						)}
						<span className={styles.username}>{item.user_login}</span>
					</div>
					<p className={styles.title}>{item.dance_title}</p>
					<span className={styles.score}>⭐ {Math.round(item.score)}</span>
				</div>

				<div className={styles.actions}>
					<button className={styles.actionBtn} onClick={handleMute}>
						<span className={styles.actionIcon}>{isMuted ? '🔇' : '🔊'}</span>
						<span className={styles.actionLabel}>
							{isMuted ? 'Звук' : 'Тихо'}
						</span>
					</button>

					<button
						className={styles.actionBtn}
						onClick={() => navigate(`/lesson/${item.dance_id}`)}
					>
						<span className={styles.actionIcon}>🔁</span>
						<span className={styles.actionLabel}>Повторить</span>
					</button>
				</div>
			</div>
		</>
	);
};

export default AttemptReelCard;
