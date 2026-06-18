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
