// Имя для карточки танца в истории/лайках/попытках. Логика:
//   1) если пользователь явно ввёл свою метку (item.name не пуст и не дефолт) —
//      показываем её.
//   2) иначе — оригинальное название танца (item.dance_title из таблицы dances).
//   3) если и его нет — «Танец», чтобы карточка не была безымянной.
//
// 'Без названия' приходит из DB-дефолта search_history.name — это плейсхолдер,
// а не настоящая метка, поэтому трактуем его как «не задано».

const PLACEHOLDER_NAMES = new Set(['', 'Без названия']);

export interface DanceLabelInput {
	name?: string | null;
	dance_title?: string | null;
}

export const resolveDanceLabel = (item: DanceLabelInput): string => {
	const name = (item.name ?? '').trim();

	if (name && !PLACEHOLDER_NAMES.has(name)) {
		return name;
	}

	const title = (item.dance_title ?? '').trim();

	return title || 'Танец';
};
