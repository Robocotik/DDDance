import { EyeOff } from '@/components/icons/EyeOff/EyeOff';
import { EyeShow } from '@/components/icons/EyeShow/EyeShow';
import clsx from 'clsx';
import { type ComponentProps, type FC, useCallback, useState } from 'react';
import styles from './Input.module.css';

type InputProps = ComponentProps<'input'> & { withEye?: boolean };

const isShownPassword = (inputType: string) => inputType === 'text';

export const Input: FC<InputProps> = (props) => {
	const { placeholder, type, className, withEye = false, ...rest } = props;
	const currentType = type || 'text';
	const [inputType, setInputType] = useState(currentType);

	const eyeClickHandler = useCallback(() => {
		if (inputType === 'password') {
			setInputType('text');
		} else {
			setInputType('password');
		}
	}, [inputType]);

	return (
		<div className={styles.inputWrapper}>
			<input
				className={clsx(styles.input, className)}
				type={inputType}
				placeholder={placeholder}
				{...rest}
			/>
			{withEye && (
				<button type="button" className={styles.eye} onClick={eyeClickHandler}>
					{isShownPassword(inputType) ? (
						<EyeShow className={styles.eyeIcon} />
					) : (
						<EyeOff className={styles.eyeIcon} />
					)}
				</button>
			)}
		</div>
	);
};
