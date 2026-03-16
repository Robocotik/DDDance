import React from 'react';
import Paragraph from '../Paragraph/Paragraph';
import styles from './Footer.module.scss';

const Footer: React.FC = () => {
	return (
		<div id="footer" className={styles.footer}>
			<Paragraph className={styles.content}>
				© Davai Davai Deploy, 2026
			</Paragraph>
		</div>
	);
};

export default Footer;
