import type { ComponentProps } from 'react';

export const SecurityMenuIcon = (props: ComponentProps<'svg'>) => {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M7 10V7.5C7 4.46243 9.46243 2 12.5 2C15.5376 2 18 4.46243 18 7.5V10"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
			<rect
				x="4"
				y="10"
				width="17"
				height="12"
				rx="2"
				stroke="currentColor"
				strokeWidth="1.8"
			/>
			<path
				d="M12.5 14V18"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	);
};
