import React from 'react';

interface IconProps {
	name: string;
	alt?: string;
	size?: number | string;
	className?: string;
	style?: React.CSSProperties;
}

const Icon: React.FC<IconProps> = ({
	name,
	alt = '',
	size = '1em',
	className,
	style,
}) => (
	<img
		src={`/icons/${name}.svg`}
		alt={alt}
		className={className}
		style={{
			width: size,
			height: size,
			display: 'inline-block',
			verticalAlign: 'middle',
			objectFit: 'contain',
			...style,
		}}
		draggable={false}
	/>
);

export default Icon;
