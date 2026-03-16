import React from 'react';
import style from './Button.module.scss';

interface ButtonProps {
	onClick?: () => void;
	children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
	return (
		<button className={style.btn} onClick={onClick}>
			{children}
		</button>
	);
};

export default Button;
