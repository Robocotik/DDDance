import React from 'react';
import Paragraph from '../Paragraph/Paragraph';
import styles from './Footer.module.scss';

const Footer: React.FC = () => {
	return (
		<footer id="footer" className={styles.footer}>
			<Paragraph level="2" className={styles.text}>
				© Davai Davai Deploy, 2026
			</Paragraph>
		</footer>
	);
};

export default Footer;
