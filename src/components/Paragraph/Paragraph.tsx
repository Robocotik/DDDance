import clsx from 'clsx';
import React from 'react';
import styles from './Paragraph.module.scss';

interface ParagraphProps {
	level?: '1' | '2';
	opacity?: '80' | '100';
	className?: string;
	children?: React.ReactNode;
	[key: string]: any;
}

const Paragraph: React.FC<ParagraphProps> = ({
	children,
	level = '1',
	opacity = '80',
	className,
	...rest
}) => {
	return (
		<p
			className={clsx(styles.paragraph, className, {
				[styles.level1]: level === '1',
				[styles.level2]: level === '2',
				[styles.opacity80]: opacity === '80',
			})}
			{...rest}
		>
			{children}
		</p>
	);
};

export default Paragraph;
