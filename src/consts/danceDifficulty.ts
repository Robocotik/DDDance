export type Difficulty = 'easy' | 'medium' | 'hard';

export const DANCE_DIFFICULTY: Record<string, Difficulty> = {};

export const getDifficulty = (danceId: string): Difficulty | null =>
	DANCE_DIFFICULTY[danceId] ?? null;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	easy: 'Easy',
	medium: 'Medium',
	hard: 'Hard',
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
	easy: '#6fff9e',
	medium: '#ffd166',
	hard: '#ff6b6b',
};
