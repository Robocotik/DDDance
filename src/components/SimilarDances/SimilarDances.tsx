import type { RecommendDance } from '@/api/recommend';
import { resolveS3Url } from '@/consts/urls';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SimilarDances.module.scss';

interface Props {
	dances: RecommendDance[];
}

const SimilarDances: React.FC<Props> = ({ dances }) => {
	const navigate = useNavigate();

	if (dances.length === 0) {
		return null;
	}

	return (
		<div className={styles.root}>
			<h2 className={styles.title}>Похожие танцы</h2>
			<div className={styles.strip}>
				{dances.map((dance) => (
					<div key={dance.id} className={styles.card}>
						<div className={styles.preview}>
							<video
								src={resolveS3Url(dance.url)}
								muted
								loop
								playsInline
								className={styles.video}
								onMouseEnter={(e) =>
									void (e.currentTarget as HTMLVideoElement)
										.play()
										.catch(() => {})
								}
								onMouseLeave={(e) => {
									const v = e.currentTarget as HTMLVideoElement;
									v.pause();
									v.currentTime = 0;
								}}
							/>
						</div>
						<div className={styles.info}>
							<span className={styles.danceTitle}>{dance.title}</span>
							{dance.avg_score > 0 && (
								<span className={styles.score}>
									⭐ {Math.round(dance.avg_score)}
								</span>
							)}
						</div>
						<button
							className={styles.learnBtn}
							onClick={() => navigate(`/lesson/${dance.id}`)}
						>
							Учить
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

export default SimilarDances;
