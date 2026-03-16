import clsx from 'clsx';
import React from 'react';
import styles from './Paragraph.module.scss';

interface ParagraphProps {
	level?: '1' | '2';
	className?: string;
	children?: React.ReactNode;
	[key: string]: any;
}

const Paragraph: React.FC<ParagraphProps> = ({
	children,
	level = '1',
	className,
	...rest
}) => {
	return (
		<p
			className={clsx(styles.Paragraph, className, {
				[styles.level1]: level === '1',
				[styles.level2]: level === '2',
			})}
			{...rest}
		>
			{children}
		</p>
	);
};

export default Paragraph;
