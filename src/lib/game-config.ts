/** Product proposals, intentionally independent from subscription and exam scoring. */
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
    { id: "start", label: "Старт", minXP: 0, color: "#59665B", background: "#EDF0EB" },
    { id: "spark", label: "Искра", minXP: 5, color: "#A24F50", background: "#F8ECEB" },
    { id: "motion", label: "Разгон", minXP: 10, color: "#A16029", background: "#FAEDDF" },
    { id: "rhythm", label: "Ритм", minXP: 15, color: "#836C1C", background: "#F8F2D8" },
    { id: "growth", label: "Рост", minXP: 20, color: "#52785B", background: "#EAF1E7" },
    { id: "focus", label: "Фокус", minXP: 30, color: "#77558E", background: "#F1EAF6" },
    { id: "flow", label: "Поток", minXP: 50, color: "#466E98", background: "#E8EFF7" },
    { id: "inspiration", label: "Вдохновение", minXP: 80, color: "#9B537C", background: "#F8EAF1" },
    { id: "gold", label: "Золото", minXP: 110, color: "#8B7028", background: "#F8F0D5" },
    { id: "rainbow", label: "Радуга", minXP: 150, color: "#52785B", background: "#EAF1E7" },
  ],
} as const;

export type GameRank = (typeof gameConfig.ranks)[number];

export function getGameRank(xp: number): GameRank {
  const safeXP = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  return [...gameConfig.ranks].reverse().find((rank) => safeXP >= rank.minXP)!;
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
