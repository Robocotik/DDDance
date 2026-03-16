import clsx from 'clsx';
import React from 'react';
import styles from './Title.module.scss';

interface TitleProps {
	level?: '1' | '2';
	className?: string;
	children?: React.ReactNode;
	[key: string]: any;
}

const Title: React.FC<TitleProps> = ({
	children,
	level = '2',
	className,
	...rest
}) => {
	return (
		<h1
			className={clsx(styles.title, className, {
				[styles.level1]: level === '1',
				[styles.level2]: level === '2',
			})}
			{...rest}
		>
			{children}
		</h1>
	);
};

export default Title;
