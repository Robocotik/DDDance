import type { VideoItem } from '@/redux/features/trends/actions';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './VerticalVideo.module.scss';

interface VerticalVideoProps {
	video: VideoItem;
}

const VerticalVideo: React.FC<VerticalVideoProps> = ({ video }) => {
	const navigate = useNavigate();

	const handleClick = () => {
		navigate(`/lesson/${video.id}`);
	};

	return (
		<video
			className={styles.video}
			src={video.url}
			onClick={handleClick}
			autoPlay
			muted
			loop
			playsInline
			preload="metadata"
		/>
	);
};

export default VerticalVideo;
