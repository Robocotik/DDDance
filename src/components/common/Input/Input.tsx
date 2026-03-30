import clsx from 'clsx';
import { type ComponentProps, type FC, useCallback, useState } from 'react';
import styles from './Input.module.css';

type InputProps = ComponentProps<'input'> & { withEye?: boolean };

export const Input: FC<InputProps> = (props) => {
	const { placeholder, type, className, withEye = false, ...rest } = props;
	const [inputType, setInputType] = useState(type || 'text');

	const eyeClickHandler = useCallback(() => {
		if (inputType === 'password') {
			setInputType(type || 'text');
		} else {
			setInputType('password');
		}
	}, [inputType, type]);

	return (
		<div>
			<input
				className={clsx(styles.input, className)}
				type={inputType}
				{...rest}
			/>
			{withEye && (
				<button type="button" className={styles.eye} onClick={eyeClickHandler}>
					👁️
				</button>
			)}
		</div>
	);
};
