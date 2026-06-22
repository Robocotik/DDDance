import { useEffect, useState } from 'react';
import styles from './RotateHint.module.scss';

const AUTO_HIDE_MS = 5000;

const RotateHint: React.FC = () => {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const hide = () => setVisible(false);
		const timer = setTimeout(hide, AUTO_HIDE_MS);
		window.addEventListener('pointerdown', hide, { once: true });

		return () => {
			clearTimeout(timer);
			window.removeEventListener('pointerdown', hide);
		};
	}, []);

	if (!visible) {
		return null;
	}

	return (
		<div className={styles.hint} aria-hidden="true">
			<svg className={styles.icon} viewBox="0 0 24 24" fill="none">
				<path
					d="M3 12a9 9 0 0 1 15-6.7L21 8"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M21 3v5h-5"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M21 12a9 9 0 0 1-15 6.7L3 16"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M3 21v-5h5"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
			<span className={styles.label}>Покрутите модель</span>
		</div>
	);
};

export default RotateHint;
