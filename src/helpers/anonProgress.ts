const LAST_DANCE_KEY = 'dddance_last_dance';
const LAST_ATTEMPT_KEY = 'dddance_last_attempt';

export const ANON_PROGRESS_EVENT = 'dddance:anonprogress';

export interface LastAnonDance {
	danceId: string;
	savedAt: number;
}

export interface LastAnonAttempt {
	userDanceId: string;
	referenceDanceId: string;
	savedAt: number;
}

const readJSON = <T>(key: string): T | null => {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
};

const writeJSON = (key: string, value: unknown): void => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		window.dispatchEvent(new Event(ANON_PROGRESS_EVENT));
	} catch {}
};

const remove = (key: string): void => {
	try {
		localStorage.removeItem(key);
	} catch {}
};

export const saveLastAnonDance = (danceId: string): void =>
	writeJSON(LAST_DANCE_KEY, { danceId, savedAt: Date.now() });

export const getLastAnonDance = (): LastAnonDance | null =>
	readJSON<LastAnonDance>(LAST_DANCE_KEY);

export const saveLastAnonAttempt = (
	userDanceId: string,
	referenceDanceId: string,
): void =>
	writeJSON(LAST_ATTEMPT_KEY, {
		userDanceId,
		referenceDanceId,
		savedAt: Date.now(),
	});

export const getLastAnonAttempt = (): LastAnonAttempt | null =>
	readJSON<LastAnonAttempt>(LAST_ATTEMPT_KEY);

export const clearAnonProgress = (): void => {
	remove(LAST_DANCE_KEY);
	remove(LAST_ATTEMPT_KEY);
	window.dispatchEvent(new Event(ANON_PROGRESS_EVENT));
};
