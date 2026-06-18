import React, { useEffect } from 'react';
import styles from './ReelsOnboarding.module.scss';

interface ReelsOnboardingProps {
	onDismiss: () => void;
}

const ReelsOnboarding: React.FC<ReelsOnboardingProps> = ({ onDismiss }) => {
	useEffect(() => {
		const timer = setTimeout(onDismiss, 5000);
		return () => clearTimeout(timer);
	}, [onDismiss]);

	return (
		<div className={styles.overlay} onClick={onDismiss}>
			<div className={styles.hint}>
				<p className={styles.text}>Нажми чтобы включить / выключить звук</p>
				<span className={styles.arrow}>→</span>
			</div>
		</div>
	);
};

export default ReelsOnboarding;
