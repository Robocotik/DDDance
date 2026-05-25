import React, { useEffect, useState } from 'react';
import Hamster from '../Hamster/Hamster';
import Paragraph from '../Paragraph/Paragraph';
import styles from './Loading.module.scss';

const messages = [
	'Готовим магию',
	'Ещё момент',
	'Почти готово',
	'Финальные штрихи',
	'Секундочку…',
	'Вот-вот',
	'Мы на финишной прямой',
	'Сейчас все будет',
	'Честно-честно',
];

interface LoadingProps {
	subtitle?: string;
	hint?: string;
}

const Loading: React.FC<LoadingProps> = ({ subtitle, hint }) => {
	const [messageIndex, setMessageIndex] = useState(0);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setMessageIndex((prev) => (prev + 1) % messages.length);
		}, 4000);

		return () => window.clearInterval(interval);
	}, []);

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<Hamster />

				<div className={styles.captionWrapper}>
					<Paragraph key={messages[messageIndex]} className={styles.caption}>
						{messages[messageIndex]}
					</Paragraph>
				</div>
				{subtitle && <p className={styles.subtitle}>{subtitle}</p>}
				{hint && <p className={styles.hint}>{hint}</p>}
			</div>
		</div>
	);
};

export default Loading;
