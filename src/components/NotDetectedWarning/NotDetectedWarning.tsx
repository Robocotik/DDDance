import React from 'react';
import styles from './NotDetectedWarning.module.scss';

interface NotDetectedWarningProps {
	pct: number;
}

const NotDetectedWarning: React.FC<NotDetectedWarningProps> = ({ pct }) => (
	<div className={styles.banner} role="alert">
		<span className={styles.icon}>⚠️</span>
		<div className={styles.text}>
			<strong>В {Math.round(pct)}% кадров поза не распознана.</strong> Попробуй
			встать ближе к камере и убедись, что тело полностью в кадре.
		</div>
	</div>
);

export default NotDetectedWarning;
