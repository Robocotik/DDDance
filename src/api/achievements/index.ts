import http from '../http';

export type Achievement = {
	id: number;
	code: string;
	title: string;
	description: string;
	icon_key: string;
	category: string;
	threshold: number;
};

export type UserAchievement = Achievement & {
	unlocked: boolean;
	unlocked_at?: string;
};

export type AchievementsResponse = UserAchievement[];

export type AchievementsWithMeta = {
	achievements: UserAchievement[];
	unlocked_count: number;
	total_count: number;
	percentile: number;
};

export const getAllAchievements = async (): Promise<Achievement[]> => {
	const response = await http.get<Achievement[]>('/achievements');
	return response.data;
};

export const getUserAchievements = async (
	userId: string,
): Promise<AchievementsWithMeta> => {
	const response = await http.get<AchievementsWithMeta>(
		`/users/${userId}/achievements`,
	);

	return response.data;
};
