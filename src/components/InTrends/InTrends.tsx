import React from 'react';
import Title from '../Title/Title';
import VerticalVideo from '../VerticalVideo/VerticalVideo';
import styles from './InTrends.module.scss';

export interface VideoItem {
	src: string;
	title?: string;
}

interface InTrendsProps {
	videos: VideoItem[];
}

const InTrends: React.FC<InTrendsProps> = ({ videos }) => {
	if (!videos) {
		return <></>;
	}

	return (
		<div className={styles.container}>
			<Title className={styles.title}>Сейчас в тренде</Title>
			<div className={styles.videoContainer}>
				{videos.map((video, index) => (
					<VerticalVideo key={`${video.src}-${index}`} video={video} />
				))}
			</div>
		</div>
	);
};

export default InTrends;
