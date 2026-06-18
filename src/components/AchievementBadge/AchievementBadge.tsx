import type { UserAchievement } from '@/api/achievements';
import React from 'react';
import styles from './AchievementBadge.module.scss';

const CODE_ICON: Record<string, string> = {
	first_blood: '🩸',
	crowd_pleaser: '🎉',
	fan_favorite: '💖',
	half_score: '⭐',
	almost_perfect: '🌟',
	perfectionist: '💎',
	first_upload: '📤',
	choreographer: '💃',
	dance_library: '📚',
	just_try: '🎯',
	persistent: '🔥',
	grinder: '⚡',
	first_duel: '⚔️',
	duel_winner: '🏆',
	duel_champion: '👑',
	night_dancer: '🌙',
	speed_learner: '🚀',
	variety_dancer: '🎭',
	social_butterfly: '🦋',
	top_dancer: '🥇',
};

const CATEGORY_ICON: Record<string, string> = {
	likes: '❤️',
	score: '⭐',
	upload: '📤',
	attempt: '🎯',
	duel: '⚔️',
	duel_win: '🏆',
	special: '✨',
};

function resolveIcon(achievement: UserAchievement): string {
	return (
		CODE_ICON[achievement.code] ??
		CODE_ICON[achievement.icon_key] ??
		CATEGORY_ICON[achievement.category] ??
		'🏅'
	);
}

interface AchievementBadgeProps {
	achievement: UserAchievement;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ achievement }) => {
	const icon = resolveIcon(achievement);

	const unlockedDate = achievement.unlocked_at
		? new Date(achievement.unlocked_at).toLocaleDateString('ru-RU', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			})
		: null;

	return (
		<div
			className={`${styles.card} ${achievement.unlocked ? styles.unlocked : styles.locked}`}
			title={achievement.unlocked ? achievement.title : 'Заблокировано'}
		>
			<div className={styles.iconWrap}>
				<span className={styles.icon}>{icon}</span>
				{!achievement.unlocked && (
					<span className={styles.lockOverlay}>🔒</span>
				)}
			</div>

			<div className={styles.body}>
				<span className={styles.title}>{achievement.title}</span>
				<span className={styles.description}>{achievement.description}</span>
				{achievement.unlocked && unlockedDate ? (
					<span className={styles.date}>{unlockedDate}</span>
				) : (
					!achievement.unlocked && (
						<span className={styles.lockedLabel}>Не получено</span>
					)
				)}
			</div>
		</div>
	);
};

export default AchievementBadge;
