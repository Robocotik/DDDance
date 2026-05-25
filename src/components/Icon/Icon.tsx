import React from 'react';

/**
 * Универсальный компонент-обёртка над SVG-иконками.
 *
 * Все иконки лежат в `public/icons/{name}.svg` — добавлять файлы по мере
 * необходимости. Если файла нет, рендерится «битая картинка» —
 * заметно при разработке, безопасно в проде.
 *
 * Дефолтный размер 1em вписывает иконку в текущий текстовый размер.
 * Для крупных декоративных иконок передавайте `size` явно (например, 32).
 */
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
