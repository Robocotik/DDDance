const REASON_LABELS: Record<string, string> = {
	no_person: 'в кадре не обнаружен человек',
	multiple_persons: 'в кадре несколько людей',
	animal: 'в кадре животное',
	nsfw: 'в видео обнаружен неподобающий контент',
	other: 'не удалось проверить видео',
};

export const moderationReasonLabel = (reason?: string): string => {
	if (!reason) {
		return '';
	}

	return REASON_LABELS[reason] ?? reason;
};

export const formatModerationRejection = (reason?: string): string => {
	const label = moderationReasonLabel(reason);

	return label
		? `Видео не прошло модерацию: ${label}`
		: 'Видео не прошло модерацию';
};
