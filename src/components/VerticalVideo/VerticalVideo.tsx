import React from 'react';
import type { VideoItem } from '../InTrends/InTrends';
import styles from './VerticalVideo.module.scss';

interface VerticalVideoProps {
	video: VideoItem;
}

const VerticalVideo: React.FC<VerticalVideoProps> = ({ video }) => {
	return (
		<video className={styles.video} src={video.src} title={video.title}></video>
	);
};

export default VerticalVideo;
