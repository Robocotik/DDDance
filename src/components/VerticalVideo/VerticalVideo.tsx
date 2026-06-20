import {
	DIFFICULTY_COLOR,
	DIFFICULTY_LABEL,
	getDifficulty,
} from '@/consts/danceDifficulty';
import { resolveS3Url } from '@/consts/urls';
import type { VideoItem } from '@/redux/features/trends/actions';
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon/Icon';
import styles from './VerticalVideo.module.scss';

interface VerticalVideoProps {
	video: VideoItem;
}

const VerticalVideo: React.FC<VerticalVideoProps> = ({ video }) => {
	const navigate = useNavigate();
	const videoRef = useRef<HTMLVideoElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const difficulty = getDifficulty(video.id);
	const hasOverlay =
		difficulty !== null ||
		video.view_count !== undefined ||
		video.attempt_count !== undefined ||
		video.like_count !== undefined;

	useEffect(() => {
		const el = videoRef.current;
		const wrapper = wrapperRef.current;

		if (!el || !wrapper) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						el.muted = true;
						// eslint-disable-next-line sonarjs/no-nested-functions
						el.play().catch(() => {});
					} else {
						el.pause();
					}
				});
			},
			{ threshold: 0.25 },
		);

		observer.observe(wrapper);

		return () => {
			observer.disconnect();
			el.pause();
		};
	}, []);

	return (
		<div
			ref={wrapperRef}
			className={styles.wrapper}
			onClick={() => navigate(`/lesson/${video.id}?segment=full`)}
		>
			<video
				ref={videoRef}
				className={styles.video}
				src={resolveS3Url(video.url)}
				muted
				loop
				playsInline
				preload="none"
				disablePictureInPicture
				disableRemotePlayback
				controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
			/>
			{hasOverlay && (
				<div className={styles.overlay}>
					{difficulty && (
						<span
							className={styles.badge}
							style={{
								background: `${DIFFICULTY_COLOR[difficulty]}33`,
								color: DIFFICULTY_COLOR[difficulty],
								border: `1px solid ${DIFFICULTY_COLOR[difficulty]}55`,
							}}
						>
							{DIFFICULTY_LABEL[difficulty]}
						</span>
					)}
					{(video.view_count !== undefined ||
						video.attempt_count !== undefined ||
						video.like_count !== undefined) && (
						<div className={styles.stats}>
							{video.like_count !== undefined && (
								<span className={styles.stat}>
									<Icon name="heart-filled" size="2em" alt="Лайков" />{' '}
									{video.like_count}
								</span>
							)}
							{video.view_count !== undefined && (
								<span className={styles.stat}>
									<Icon name="eye" size="2em" alt="Просмотров" />{' '}
									{video.view_count}
								</span>
							)}
							{video.attempt_count !== undefined && (
								<span className={styles.stat}>
									<Icon name="star" size="2em" alt="Прошли через ML" />{' '}
									{video.attempt_count}
								</span>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default VerticalVideo;
