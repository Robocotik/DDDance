import clsx from 'clsx';
import React from 'react';
import styles from './Button.module.scss';

interface ButtonProps {
	onClick?: () => void;
	children?: React.ReactNode;
	className?: string;
	[key: string]: any;
}

const Button: React.FC<ButtonProps> = ({
	children,
	onClick,
	className,
	...rest
}) => {
	return (
		<button className={clsx(styles.btn, className)} onClick={onClick} {...rest}>
			{children}
		</button>
	);
};

export default Button;
