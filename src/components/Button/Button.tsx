import clsx from 'clsx';
import React from 'react';
import styles from './Button.module.scss';

interface ButtonProps {
	size?: 'l' | 'm' | 's';
	onClick?: () => void;
	children?: React.ReactNode;
	className?: string;
	[key: string]: any;
}

const Button: React.FC<ButtonProps> = ({
	children,
	onClick,
	size = 'l',
	className,
	...rest
}) => {
	return (
		<button
			className={clsx(styles.btn, className, styles[`size${size}`])}
			onClick={onClick}
			{...rest}
		>
			{children}
		</button>
	);
};

export default Button;
