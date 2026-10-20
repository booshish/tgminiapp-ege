import { gameConfig, getGameLevel, getGameRank } from "./game-config";

/** Deliberately generic subject IDs: future subjects need no changes to the XP engine. */
export type GameAttempt = {
  kind: "answer_checked";
  id: string;
  taskId: string;
  subjectId: string;
  createdAt: string;
  correct: boolean;
  examType?: string;
  examNumber?: number | null;
  level?: string | null;
  examVersionId?: string;
  part?: 1 | 2 | null;
  answerFormat?: "short" | "extended";
};
export type GameLearningEvent = GameAttempt | {
  kind: "solution_viewed";
  id: string;
  taskId: string;
  subjectId: string;
  createdAt: string;
  attemptId: string;
};

/** No production rule is verified until the actual official document has been checked. */
export type VerifiedXPScoringRule = {
  status: "verified";
  ruleId: string;
  examVersionId: string;
  subjectId: string;
  examType: string;
  examNumber: number;
  level: string | null;
  part: 1;
  answerFormat: "short";
  maxPrimaryScore: number;
  sourceUrl: string;
  verifiedAt: string;
};
export type XPEvent = {
  id: string;
  attemptId: string;
  taskId: string;
  subjectId: string;
  xp: number;
  createdAt: string;
  localDay: string;
  timezoneOffsetMinutes: number;
  scoring: VerifiedXPScoringRule;
};
export type GameCheck = {
  attemptId: string;
  taskId: string;
  subjectId: string;
  correct: boolean;
  createdAt: string;
};
export type GameState = {
  version: 1;
  xpEvents: XPEvent[];
  checks: GameCheck[];
};
export type GameLevel = ReturnType<typeof getGameLevel>;
export type SubjectGameSummary = {
  subjectId: string;
  totalXP: number;
  todayXP: number;
  dailyScaleValue: number;
  level: GameLevel;
  rank: ReturnType<typeof getGameRank>;
  winStreak: number;
};
export type GameSummary = Omit<SubjectGameSummary, "subjectId"> & {
  subjects: SubjectGameSummary[];
};

export const gameStorageKey = "tochka-game-v1";
export function emptyGameState(): GameState {
  return { version: 1, xpEvents: [], checks: [] };
}
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}
function isDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  // Only canonical UTC timestamps, as emitted by Date.toISOString().
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function validRule(value: unknown): value is VerifiedXPScoringRule {
  if (!isObject(value)) return false;
  return value.status === "verified" && isId(value.ruleId) && isId(value.examVersionId) && isId(value.subjectId)
    && isId(value.examType) && isPositiveInteger(value.examNumber)
    && (value.level === null || isId(value.level))
    && value.part === 1 && value.answerFormat === "short"
    && isPositiveInteger(value.maxPrimaryScore)
    && value.maxPrimaryScore <= 100
    && typeof value.sourceUrl === "string" && /^https:\/\/(?:[^/]+\.)?fipi\.ru\//.test(value.sourceUrl)
    && isDate(value.verifiedAt);
}
function ruleMatchesAttempt(rule: VerifiedXPScoringRule, attempt: GameAttempt) {
  return validRule(rule) && rule.examType === attempt.examType
    && rule.examNumber === attempt.examNumber && rule.level === (attempt.level ?? null)
    && rule.examVersionId === attempt.examVersionId && rule.subjectId === attempt.subjectId
    && attempt.part === 1 && attempt.answerFormat === "short"
    && Date.parse(rule.verifiedAt) <= Date.parse(attempt.createdAt);
}

/** Capture the local day at the time of earning; changing zones cannot rewrite history. */
export function localDayKey(date: Date, timezoneOffsetMinutes = date.getTimezoneOffset()) {
  if (!Number.isFinite(date.getTime()) || !Number.isInteger(timezoneOffsetMinutes)
    || Math.abs(timezoneOffsetMinutes) > 14 * 60) return "";
  return new Date(date.getTime() - timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
}
function validAttempt(attempt: GameAttempt) {
  return attempt.kind === "answer_checked" && isId(attempt.id) && isId(attempt.taskId)
    && isId(attempt.subjectId) && typeof attempt.correct === "boolean" && isDate(attempt.createdAt);
}

/**
 * Call only when a NEW, objectively checked answer is recorded, never while hydrating.
 * No subscription input exists: Free and Premium have precisely the same policy.
 * priorEvents is the history BEFORE the new answer. Legacy history earns no retroactive XP.
 */
export function recordGameAttempt(
  game: GameState,
  attempt: GameAttempt,
  priorEvents: readonly GameLearningEvent[],
  rule: VerifiedXPScoringRule | null,
  options?: { timezoneOffsetMinutes?: number },
): GameState {
  if (!validAttempt(attempt)
    || game.checks.some((check) => check.attemptId === attempt.id)
    || priorEvents.some((event) => event.id === attempt.id)) return game;

  const previousChecks = priorEvents.filter((event): event is GameAttempt =>
    event.kind === "answer_checked" && event.taskId === attempt.taskId);
  const isFirstTaskCheck = !game.checks.some((check) => check.taskId === attempt.taskId)
    && previousChecks.length === 0;
  const checks = isFirstTaskCheck ? [...game.checks, {
    attemptId: attempt.id,
    taskId: attempt.taskId,
    subjectId: attempt.subjectId,
    correct: attempt.correct,
    createdAt: attempt.createdAt,
  }] : game.checks;
  const independentlyCorrect = attempt.correct
    && !previousChecks.some((event) => event.correct)
    && !priorEvents.some((event) => event.kind === "solution_viewed" && event.taskId === attempt.taskId);
  if (!independentlyCorrect || !rule || !ruleMatchesAttempt(rule, attempt)
    || game.xpEvents.some((event) => event.taskId === attempt.taskId)) {
    return checks === game.checks ? game : { ...game, checks };
  }
  const date = new Date(attempt.createdAt);
  const timezoneOffsetMinutes = options?.timezoneOffsetMinutes ?? date.getTimezoneOffset();
  const localDay = localDayKey(date, timezoneOffsetMinutes);
  if (!localDay) return checks === game.checks ? game : { ...game, checks };
  return {
    version: 1,
    checks,
    xpEvents: [...game.xpEvents, {
      id: `xp:${attempt.id}`,
      attemptId: attempt.id,
      taskId: attempt.taskId,
      subjectId: attempt.subjectId,
      xp: rule.maxPrimaryScore,
      createdAt: attempt.createdAt,
      localDay,
      timezoneOffsetMinutes,
      scoring: { ...rule },
    }],
  };
}

/**
 * Safely read a versioned ledger. Existing learning events are its source of truth.
 * Broken entries are dropped, not regenerated; an unknown schema never creates XP.
 * Previously awarded amounts survive later score/rank configuration changes.
 * Browser storage is editable by its owner and is not a security boundary.
 */
export function parseGameState(value: unknown, learningEvents: readonly GameLearningEvent[]): GameState {
  let candidate = value;
  if (typeof value === "string") {
    try { candidate = JSON.parse(value); } catch { return emptyGameState(); }
  }
  if (!isObject(candidate) || candidate.version !== 1) return emptyGameState();
  const answers = new Map<string, GameAttempt>();
  for (const event of learningEvents) {
    if (event.kind === "answer_checked" && validAttempt(event) && !answers.has(event.id)) answers.set(event.id, event);
  }
  const checks: GameCheck[] = [];
  const checkedTasks = new Set<string>();
  if (Array.isArray(candidate.checks)) for (const entry of candidate.checks) {
    if (!isObject(entry) || !isId(entry.attemptId)) continue;
    const answer = answers.get(entry.attemptId);
    if (!answer || checkedTasks.has(answer.taskId) || entry.taskId !== answer.taskId
      || entry.subjectId !== answer.subjectId || entry.correct !== answer.correct
      || entry.createdAt !== answer.createdAt) continue;
    // A later repeat cannot become the first checked task in the streak ledger.
    const first = learningEvents.find((event) => event.kind === "answer_checked" && event.taskId === answer.taskId);
    if (first?.id !== answer.id) continue;
    checkedTasks.add(answer.taskId);
    checks.push({ attemptId: answer.id, taskId: answer.taskId, subjectId: answer.subjectId,
      correct: answer.correct, createdAt: answer.createdAt });
  }
  const xpEvents: XPEvent[] = [];
  const rewardedTasks = new Set<string>();
  if (Array.isArray(candidate.xpEvents)) for (const entry of candidate.xpEvents) {
    if (!isObject(entry) || !isId(entry.attemptId)) continue;
    const answer = answers.get(entry.attemptId);
    if (!answer || !answer.correct || rewardedTasks.has(answer.taskId)
      || entry.id !== `xp:${answer.id}` || entry.taskId !== answer.taskId
      || entry.subjectId !== answer.subjectId || entry.createdAt !== answer.createdAt
      || !validRule(entry.scoring) || !ruleMatchesAttempt(entry.scoring, answer)
      || entry.xp !== entry.scoring.maxPrimaryScore
      || typeof entry.timezoneOffsetMinutes !== "number"
      || typeof entry.localDay !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.localDay)
      || entry.localDay !== localDayKey(new Date(answer.createdAt), entry.timezoneOffsetMinutes)) continue;
    const answerIndex = learningEvents.findIndex((event) => event.id === answer.id);
    const earlier = learningEvents.slice(0, answerIndex);
    if (earlier.some((event) => event.taskId === answer.taskId &&
      (event.kind === "solution_viewed" || (event.kind === "answer_checked" && event.correct)))) continue;
    rewardedTasks.add(answer.taskId);
    xpEvents.push({ id: `xp:${answer.id}`, attemptId: answer.id, taskId: answer.taskId,
      subjectId: answer.subjectId, xp: entry.xp as number, createdAt: answer.createdAt,
      localDay: entry.localDay as string, timezoneOffsetMinutes: entry.timezoneOffsetMinutes,
      scoring: { ...entry.scoring } });
  }
  const answerOrder = new Map(learningEvents.map((event, index) => [event.id, index]));
  checks.sort((a, b) => answerOrder.get(a.attemptId)! - answerOrder.get(b.attemptId)!);
  xpEvents.sort((a, b) => answerOrder.get(a.attemptId)! - answerOrder.get(b.attemptId)!);
  return { version: 1, checks, xpEvents };
}

export function getGameSummary(game: GameState, now = new Date()): GameSummary {
  const today = localDayKey(now);
  const subjectIds = new Set(["math", ...game.checks.map((event) => event.subjectId), ...game.xpEvents.map((event) => event.subjectId)]);
  let winStreak = 0;
  const subjectStreaks: Record<string, number> = {};
  for (const check of game.checks) {
    if (check.correct) {
      winStreak++;
      subjectStreaks[check.subjectId] = (subjectStreaks[check.subjectId] ?? 0) + 1;
    } else {
      if (gameConfig.streak.resetOverallOnWrong) winStreak = 0;
      if (gameConfig.streak.resetSubjectOnWrong) subjectStreaks[check.subjectId] = 0;
    }
  }
  const subjects = [...subjectIds].map((subjectId) => {
    const totalXP = game.xpEvents.filter((event) => event.subjectId === subjectId).reduce((sum, event) => sum + event.xp, 0);
    const todayXP = game.xpEvents.filter((event) => event.subjectId === subjectId && event.localDay === today).reduce((sum, event) => sum + event.xp, 0);
    return { subjectId, totalXP, todayXP, dailyScaleValue: Math.min(todayXP, gameConfig.dailyVisualMaxXP),
      level: getGameLevel(totalXP), rank: getGameRank(todayXP), winStreak: subjectStreaks[subjectId] ?? 0 };
  });
  const totalXP = subjects.reduce((sum, subject) => sum + subject.totalXP, 0);
  const todayXP = subjects.reduce((sum, subject) => sum + subject.todayXP, 0);
  return { totalXP, todayXP, dailyScaleValue: Math.min(todayXP, gameConfig.dailyVisualMaxXP),
    level: getGameLevel(totalXP), rank: getGameRank(todayXP), winStreak, subjects };
}
