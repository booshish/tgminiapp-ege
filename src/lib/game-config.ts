/** Game presentation is independent from subscription and exam scoring. */
export const gameConfig = {
  version: 1,
  dailyVisualMaxXP: 150,
  levelStepXP: 100,
  levelsStatus: "proposed",
  streak: {
    status: "proposed",
    resetOverallOnWrong: true,
    resetSubjectOnWrong: true,
    countOnlyFirstCorrectTaskCheck: true,
  },
  ranks: [
    // Stable internal IDs are retained for compatibility; there are no visible rank names.
    { id: "start", minXP: 0, color: "#D0D4D0" },
    { id: "spark", minXP: 5, color: "#B1B4B7" },
    { id: "motion", minXP: 10, color: "#A9A5B5" },
    { id: "growth", minXP: 20, color: "#B8A6D3" },
    { id: "focus", minXP: 30, color: "#A087D0" },
    { id: "flow", minXP: 50, color: "#8663CE" },
    { id: "inspiration", minXP: 80, color: "#7545D8" },
    { id: "gold", minXP: 110, color: "#6728E0" },
    { id: "rainbow", minXP: 150, color: "#5719E6" },
  ],
  streakFlames: [
    { minStreak: 0, color: "#AEB3AE", size: 18 },
    { minStreak: 1, color: "#B5A09F", size: 19 },
    { minStreak: 5, color: "#C28D85", size: 21 },
    { minStreak: 10, color: "#D47962", size: 23 },
    { minStreak: 20, color: "#E35C45", size: 26 },
    { minStreak: 30, color: "#EF4438", size: 29 },
    { minStreak: 40, color: "#F12F2F", size: 32 },
    { minStreak: 50, color: "#FF2929", size: 34 },
  ],
} as const;

export type GameRank = (typeof gameConfig.ranks)[number];

export function getGameRank(xp: number): GameRank {
  const safeXP = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  return [...gameConfig.ranks].reverse().find((rank) => safeXP >= rank.minXP)!;
}

/** Fire depends only on the corresponding streak, never on XP or subscription. */
export function getStreakFlame(streak: number) {
  const safeStreak = Number.isSafeInteger(streak) ? Math.max(0, streak) : 0;
  return [...gameConfig.streakFlames]
    .reverse()
    .find((flame) => safeStreak >= flame.minStreak)!;
}

/** Working proposal: one level per 100 XP, with level 1 at zero. */
export function getGameLevel(totalXP: number) {
  const safeXP = Number.isSafeInteger(totalXP) ? Math.max(0, totalXP) : 0;
  return {
    number: Math.floor(safeXP / gameConfig.levelStepXP) + 1,
    xpIntoLevel: safeXP % gameConfig.levelStepXP,
    nextLevelAtXP: (Math.floor(safeXP / gameConfig.levelStepXP) + 1) * gameConfig.levelStepXP,
    stepXP: gameConfig.levelStepXP,
  };
}
