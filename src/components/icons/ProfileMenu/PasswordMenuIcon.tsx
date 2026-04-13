import type { ComponentProps } from 'react';

export const PasswordMenuIcon = (props: ComponentProps<'svg'>) => {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M10.5 11.5C9.11929 11.5 8 10.3807 8 9C8 7.61929 9.11929 6.5 10.5 6.5C11.8807 6.5 13 7.61929 13 9C13 9.79268 12.6328 10.4996 12.0595 10.9577"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
			<path
				d="M12 11L16.5 15.5M16.5 15.5V13.5M16.5 15.5H14.5"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M10.5 21C15.1944 21 19 17.1944 19 12.5C19 7.80558 15.1944 4 10.5 4C5.80558 4 2 7.80558 2 12.5C2 17.1944 5.80558 21 10.5 21Z"
				stroke="currentColor"
				strokeWidth="1.8"
			/>
		</svg>
	);
};
