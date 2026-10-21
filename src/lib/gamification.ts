import { gameConfig, getGameLevel, getGameRank } from "./game-config";
import type { XPScoringRule } from "./scoring-types";

export type { XPScoringRule } from "./scoring-types";
/** Compatibility name for previously stored, officially reviewed rule snapshots. */
export type VerifiedXPScoringRule = XPScoringRule;

type GameContext = {
  id: string;
  taskId: string;
  subjectId: string;
  createdAt: string;
  examType?: string;
  examNumber?: number | null;
  level?: string | null;
  examVersionId?: string;
  examYear?: number;
  part?: 1 | 2 | null;
  answerFormat?: "short" | "extended";
};
export type GameAttempt = GameContext & {
  kind: "answer_checked";
  correct: boolean;
  solutionSeenBeforeCheck?: boolean;
};
export type GameSelfAssessment = GameContext & {
  kind: "self_assessed";
  score: number;
  maxScore: number;
};
export type GameLearningEvent = GameAttempt | GameSelfAssessment | {
  kind: "solution_viewed";
  id: string;
  taskId: string;
  subjectId: string;
  createdAt: string;
  attemptId?: string;
};

type XPEventContext = {
  id: string;
  attemptId: string;
  taskId: string;
  subjectId: string;
  /** Signed change to the one actual balance, not two separate subject/global awards. */
  xp: number;
  createdAt: string;
  /** Corrections to self-assessment stay on the original positive credit's local day. */
  localDay: string;
  timezoneOffsetMinutes: number;
  scoring: XPScoringRule;
};
export type AutomaticXPEvent = XPEventContext & { kind: "automatic" };
export type SelfAssessmentXPEvent = XPEventContext & {
  kind: "self_assessment";
  score: number;
  previousScore: number;
};
export type XPEvent = AutomaticXPEvent | SelfAssessmentXPEvent;
export type GameCheck = {
  attemptId: string;
  taskId: string;
  subjectId: string;
  correct: boolean;
  createdAt: string;
};
export type GameState = { version: 2; xpEvents: XPEvent[]; checks: GameCheck[] };
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
type DayOptions = { timezoneOffsetMinutes?: number };

// Kept for source compatibility; the actual ledger is stored atomically inside LearningState.
export const gameStorageKey = "tochka-game-v1";
export function emptyGameState(): GameState {
  return { version: 2, xpEvents: [], checks: [] };
}
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}
function isDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
function integer(value: unknown, minimum = 0, maximum = 100): value is number {
  return typeof value === "number" && Number.isSafeInteger(value)
    && value >= minimum && value <= maximum;
}
function validRule(value: unknown): value is XPScoringRule {
  if (!isObject(value)) return false;
  return (value.status === "verified" || value.status === "project-config")
    && isId(value.ruleId) && isId(value.examVersionId) && isId(value.subjectId)
    && isId(value.examType) && integer(value.examYear, 2000, 2200)
    && integer(value.examNumber, 1, 100) && (value.level === null || isId(value.level))
    && ((value.part === 1 && value.answerFormat === "short")
      || (value.part === 2 && value.answerFormat === "extended"))
    && integer(value.maxPrimaryScore, 1, 100)
    && typeof value.sourceUrl === "string"
    && /^https:\/\/(?:[^/]+\.)?fipi\.ru\//.test(value.sourceUrl)
    && (value.status !== "verified" || isDate(value.verifiedAt));
}
function ruleMatchesContext(rule: XPScoringRule, context: GameContext) {
  // Old events have the versioned ID but no separate year field.
  const year = context.examYear ?? Number(context.examVersionId?.match(/-(\d{4})$/)?.[1]);
  return validRule(rule) && rule.examType === context.examType
    && rule.examNumber === context.examNumber && rule.level === (context.level ?? null)
    && rule.examVersionId === context.examVersionId && rule.subjectId === context.subjectId
    && rule.examYear === year && rule.part === context.part
    && rule.answerFormat === context.answerFormat
    && (rule.status !== "verified" || Date.parse(rule.verifiedAt!) <= Date.parse(context.createdAt));
}

export function localDayKey(date: Date, timezoneOffsetMinutes = date.getTimezoneOffset()) {
  if (!Number.isFinite(date.getTime()) || !Number.isInteger(timezoneOffsetMinutes)
    || Math.abs(timezoneOffsetMinutes) > 14 * 60) return "";
  return new Date(date.getTime() - timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
}
function validContext(context: GameContext) {
  return isId(context.id) && isId(context.taskId) && isId(context.subjectId)
    && isDate(context.createdAt);
}
function validAttempt(attempt: GameAttempt) {
  return attempt.kind === "answer_checked" && validContext(attempt)
    && typeof attempt.correct === "boolean";
}
function automaticContext(attempt: GameAttempt) {
  return validAttempt(attempt) && attempt.part === 1 && attempt.answerFormat === "short";
}
function contributesToStreak(
  attempt: GameAttempt,
  priorEvents: readonly GameLearningEvent[],
  checks: readonly GameCheck[],
) {
  if (!automaticContext(attempt)) return false;
  // A task contributes only its first automatic check, whether right or wrong.
  // Rechecking an old task must not erase a newer series. XP is a separate policy:
  // a later independent correction may still earn its one unique-task award.
  if (checks.some((check) => check.taskId === attempt.taskId)
    || priorEvents.some((event) => event.taskId === attempt.taskId
      && event.kind === "answer_checked")) return false;
  if (!attempt.correct) return true;
  return attempt.solutionSeenBeforeCheck !== true
    && !priorEvents.some((event) => event.taskId === attempt.taskId
      && event.kind === "solution_viewed");
}
function validSelfAssessment(assessment: GameSelfAssessment) {
  return assessment.kind === "self_assessed" && validContext(assessment)
    && assessment.part === 2 && assessment.answerFormat === "extended"
    && integer(assessment.maxScore, 1, 100) && integer(assessment.score, 0, assessment.maxScore);
}
function dayFor(context: GameContext, options?: DayOptions) {
  const date = new Date(context.createdAt);
  const timezoneOffsetMinutes = options?.timezoneOffsetMinutes ?? date.getTimezoneOffset();
  const localDay = localDayKey(date, timezoneOffsetMinutes);
  return localDay ? { localDay, timezoneOffsetMinutes } : null;
}
export function getAttemptXPAward(game: GameState, attemptId: string): number {
  return game.xpEvents.find((event) => event.kind === "automatic" && event.attemptId === attemptId)?.xp ?? 0;
}
export function getSelfAssessment(
  game: GameState,
  taskId: string,
): (SelfAssessmentXPEvent & { maxScore: number }) | null {
  const saved = [...game.xpEvents].reverse().find((event): event is SelfAssessmentXPEvent =>
    event.kind === "self_assessment" && event.taskId === taskId);
  return saved ? { ...saved, maxScore: saved.scoring.maxPrimaryScore } : null;
}
function selfCreditDay(game: GameState, taskId: string, currentDay: { localDay: string; timezoneOffsetMinutes: number }) {
  const firstPositive = game.xpEvents.find((event) =>
    event.kind === "self_assessment" && event.taskId === taskId && event.score > 0);
  return firstPositive
    ? { localDay: firstPositive.localDay, timezoneOffsetMinutes: firstPositive.timezoneOffsetMinutes }
    : currentDay;
}

/** Called only for an actual new automatic check. Subscription never changes the policy. */
export function recordGameAttempt(
  game: GameState,
  attempt: GameAttempt,
  priorEvents: readonly GameLearningEvent[],
  rule: XPScoringRule | null,
  options?: DayOptions,
): GameState {
  if (!validAttempt(attempt) || game.checks.some((check) => check.attemptId === attempt.id)
    || priorEvents.some((event) => event.id === attempt.id)) return game;
  const previousAnswers = priorEvents.filter((event): event is GameAttempt =>
    event.kind === "answer_checked" && event.taskId === attempt.taskId);
  const alreadyCorrect = previousAnswers.some((event) => event.correct)
    || game.checks.some((check) => check.taskId === attempt.taskId && check.correct);
  const contributesCheck = contributesToStreak(attempt, priorEvents, game.checks);
  const checks = contributesCheck ? [...game.checks, {
    attemptId: attempt.id,
    taskId: attempt.taskId,
    subjectId: attempt.subjectId,
    correct: attempt.correct,
    createdAt: attempt.createdAt,
  }] : game.checks;
  const viewedSolution = priorEvents.some((event) =>
    event.kind === "solution_viewed" && event.taskId === attempt.taskId);
  if (!attempt.correct || attempt.solutionSeenBeforeCheck === true || alreadyCorrect || viewedSolution || !rule
    || !ruleMatchesContext(rule, attempt) || rule.part !== 1
    || game.xpEvents.some((event) => event.taskId === attempt.taskId)) {
    return checks === game.checks ? game : { ...game, checks };
  }
  const day = dayFor(attempt, options);
  if (!day) return checks === game.checks ? game : { ...game, checks };
  return {
    version: 2,
    checks,
    xpEvents: [...game.xpEvents, {
      kind: "automatic",
      id: `xp:${attempt.id}`,
      attemptId: attempt.id,
      taskId: attempt.taskId,
      subjectId: attempt.subjectId,
      xp: rule.maxPrimaryScore,
      createdAt: attempt.createdAt,
      ...day,
      scoring: { ...rule },
    }],
  };
}

/**
 * Repair the former empty scoring registry and rebuild interrupted self-assessment chains
 * from validated confirmations. Known snapshots preserve original amounts and local days.
 * No new check or confirmation is invented during repair.
 */
export function reconcileUnrewardedAttempts(
  previous: GameState,
  learningEvents: readonly GameLearningEvent[],
  resolveRule: (event: GameAttempt | GameSelfAssessment) => XPScoringRule | null,
): GameState {
  let repaired: GameState = {
    version: 2,
    checks: [],
    xpEvents: previous.xpEvents.filter((event) => event.kind === "automatic"),
  };
  const earlier: GameLearningEvent[] = [];
  for (const event of learningEvents) {
    if (event.kind === "answer_checked") {
      repaired = recordGameAttempt(repaired, event, earlier, resolveRule(event));
    } else if (event.kind === "self_assessed") {
      const stored = previous.xpEvents.find((award): award is SelfAssessmentXPEvent =>
        award.kind === "self_assessment" && award.attemptId === event.id);
      repaired = recordSelfAssessment(repaired, event, earlier,
        stored?.scoring ?? resolveRule(event),
        stored ? { timezoneOffsetMinutes: stored.timezoneOffsetMinutes } : undefined);
    }
    earlier.push(event);
  }
  const order = new Map(learningEvents.map((event, index) => [event.id, index]));
  return {
    ...repaired,
    xpEvents: [...repaired.xpEvents].sort((a, b) =>
      (order.get(a.attemptId) ?? Infinity) - (order.get(b.attemptId) ?? Infinity)),
  };
}

/** A self-assessment changes the saved score, rather than awarding that whole score again. */
export function recordSelfAssessment(
  game: GameState,
  assessment: GameSelfAssessment,
  priorEvents: readonly GameLearningEvent[],
  rule: XPScoringRule | null,
  options?: DayOptions,
): GameState {
  if (!validSelfAssessment(assessment) || !rule || rule.part !== 2
    || !ruleMatchesContext(rule, assessment) || rule.maxPrimaryScore !== assessment.maxScore
    || game.xpEvents.some((event) => event.attemptId === assessment.id)
    || priorEvents.some((event) => event.id === assessment.id)) return game;
  const previous = getSelfAssessment(game, assessment.taskId);
  if (previous?.score === assessment.score) return game;
  // Never create a new full award when an independently damaged ledger lost its history.
  if (!previous && priorEvents.some((event) =>
    event.kind === "self_assessed" && event.taskId === assessment.taskId)) return game;
  const day = dayFor(assessment, options);
  if (!day) return game;
  const previousScore = previous?.score ?? 0;
  return {
    ...game,
    xpEvents: [...game.xpEvents, {
      kind: "self_assessment",
      id: `xp:${assessment.id}`,
      attemptId: assessment.id,
      taskId: assessment.taskId,
      subjectId: assessment.subjectId,
      xp: assessment.score - previousScore,
      score: assessment.score,
      previousScore,
      createdAt: assessment.createdAt,
      ...selfCreditDay(game, assessment.taskId, day),
      scoring: { ...rule },
    }],
  };
}

function parseRule(value: unknown, legacy: boolean): XPScoringRule | null {
  if (!isObject(value)) return null;
  const candidate = legacy && value.examYear === undefined
    ? { ...value, examYear: Number(String(value.examVersionId).match(/-(\d{4})$/)?.[1]) }
    : value;
  return validRule(candidate) ? candidate : null;
}

/** The linked learning journal validates every amount and every self-assessment revision. */
export function parseGameState(value: unknown, learningEvents: readonly GameLearningEvent[]): GameState {
  let candidate = value;
  if (typeof candidate === "string") {
    try { candidate = JSON.parse(candidate); } catch { return emptyGameState(); }
  }
  if (!isObject(candidate) || (candidate.version !== 1 && candidate.version !== 2)) return emptyGameState();
  const legacy = candidate.version === 1;
  const events = new Map<string, GameLearningEvent>();
  const order = new Map<string, number>();
  learningEvents.forEach((event, index) => {
    if (!events.has(event.id) && isDate(event.createdAt)) {
      events.set(event.id, event);
      order.set(event.id, index);
    }
  });
  const checks: GameCheck[] = [];
  const acceptedChecks = new Set<string>();
  const candidateChecks = Array.isArray(candidate.checks) ? candidate.checks : [];
  const earlierChecks: GameLearningEvent[] = [];
  for (const event of events.values()) {
    if (event.kind === "answer_checked") {
      const stored = candidateChecks.find((entry) => isObject(entry)
        && entry.attemptId === event.id && entry.taskId === event.taskId
        && entry.subjectId === event.subjectId && entry.correct === event.correct
        && entry.createdAt === event.createdAt);
      if (stored && !acceptedChecks.has(event.id)
        && contributesToStreak(event, earlierChecks, checks)) {
        acceptedChecks.add(event.id);
        checks.push({ attemptId: event.id, taskId: event.taskId, subjectId: event.subjectId,
          correct: event.correct, createdAt: event.createdAt });
      }
    }
    earlierChecks.push(event);
  }
  const game: GameState = { version: 2, checks, xpEvents: [] };
  const entries = (Array.isArray(candidate.xpEvents) ? candidate.xpEvents : [])
    .filter(isObject).sort((left, right) =>
      (order.get(String(left.attemptId)) ?? Infinity) - (order.get(String(right.attemptId)) ?? Infinity));
  const acceptedAwards = new Set<string>();
  for (const entry of entries) {
    if (!isId(entry.attemptId) || acceptedAwards.has(entry.attemptId)) continue;
    const event = events.get(entry.attemptId);
    if (!event || event.kind === "solution_viewed" || !validContext(event)) continue;
    const rule = parseRule(entry.scoring, legacy);
    if (!rule || !ruleMatchesContext(rule, event) || entry.id !== `xp:${event.id}`
      || entry.taskId !== event.taskId || entry.subjectId !== event.subjectId
      || entry.createdAt !== event.createdAt || typeof entry.timezoneOffsetMinutes !== "number"
      || typeof entry.localDay !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.localDay)
      || !integer(entry.timezoneOffsetMinutes, -14 * 60, 14 * 60)) continue;
    const index = order.get(event.id)!;
    const earlier = learningEvents.slice(0, index);
    const kind = legacy && entry.kind === undefined ? "automatic" : entry.kind;
    if (kind === "automatic" && event.kind === "answer_checked") {
      if (!automaticContext(event) || !event.correct || event.solutionSeenBeforeCheck === true || rule.part !== 1
        || entry.xp !== rule.maxPrimaryScore
        || game.xpEvents.some((award) => award.taskId === event.taskId)
        || earlier.some((previous) => previous.taskId === event.taskId
          && (previous.kind === "solution_viewed"
            || (previous.kind === "answer_checked" && previous.correct)))
        || entry.localDay !== localDayKey(new Date(event.createdAt), entry.timezoneOffsetMinutes)) continue;
      game.xpEvents.push({ kind: "automatic", id: `xp:${event.id}`, attemptId: event.id,
        taskId: event.taskId, subjectId: event.subjectId, xp: rule.maxPrimaryScore,
        createdAt: event.createdAt, localDay: entry.localDay,
        timezoneOffsetMinutes: entry.timezoneOffsetMinutes, scoring: { ...rule } });
    } else if (kind === "self_assessment" && event.kind === "self_assessed") {
      if (!validSelfAssessment(event) || rule.part !== 2 || rule.maxPrimaryScore !== event.maxScore) continue;
      const previous = getSelfAssessment(game, event.taskId);
      const priorScore = previous?.score ?? 0;
      if (entry.score !== event.score || entry.previousScore !== priorScore
        || entry.xp !== event.score - priorScore
        || (!previous && earlier.some((past) => past.kind === "self_assessed" && past.taskId === event.taskId))) continue;
      const currentDay = dayFor(event, { timezoneOffsetMinutes: entry.timezoneOffsetMinutes });
      if (!currentDay) continue;
      const day = selfCreditDay(game, event.taskId, currentDay);
      if (entry.localDay !== day.localDay || entry.timezoneOffsetMinutes !== day.timezoneOffsetMinutes) continue;
      game.xpEvents.push({ kind: "self_assessment", id: `xp:${event.id}`, attemptId: event.id,
        taskId: event.taskId, subjectId: event.subjectId, xp: event.score - priorScore,
        score: event.score, previousScore: priorScore, createdAt: event.createdAt,
        ...day, scoring: { ...rule } });
    } else continue;
    acceptedAwards.add(event.id);
  }
  return game;
}

export function getGameSummary(game: GameState, now = new Date()): GameSummary {
  const today = localDayKey(now);
  const subjectIds = new Set(["math", ...game.checks.map((event) => event.subjectId), ...game.xpEvents.map((event) => event.subjectId)]);
  let winStreak = 0;
  const subjectStreaks: Record<string, number> = {};
  const checkedTasks = new Set<string>();
  for (const check of game.checks) {
    // Older journals can contain repeated wrong checks. The projection must be
    // correct even before hydration normalizes that journal in place.
    if (checkedTasks.has(check.taskId)) continue;
    if (check.correct) {
      winStreak++;
      subjectStreaks[check.subjectId] = (subjectStreaks[check.subjectId] ?? 0) + 1;
    } else if (!check.correct) {
      if (gameConfig.streak.resetOverallOnWrong) winStreak = 0;
      if (gameConfig.streak.resetSubjectOnWrong) subjectStreaks[check.subjectId] = 0;
    }
    checkedTasks.add(check.taskId);
  }
  const subjects = [...subjectIds].map((subjectId) => {
    const awards = game.xpEvents.filter((event) => event.subjectId === subjectId);
    const totalXP = Math.max(0, awards.reduce((sum, event) => sum + event.xp, 0));
    const todayXP = Math.max(0, awards.filter((event) => event.localDay === today).reduce((sum, event) => sum + event.xp, 0));
    return { subjectId, totalXP, todayXP,
      dailyScaleValue: Math.min(todayXP, gameConfig.dailyVisualMaxXP),
      level: getGameLevel(totalXP), rank: getGameRank(todayXP), winStreak: subjectStreaks[subjectId] ?? 0 };
  });
  const totalXP = subjects.reduce((sum, subject) => sum + subject.totalXP, 0);
  const todayXP = subjects.reduce((sum, subject) => sum + subject.todayXP, 0);
  return { totalXP, todayXP, dailyScaleValue: Math.min(todayXP, gameConfig.dailyVisualMaxXP),
    level: getGameLevel(totalXP), rank: getGameRank(todayXP), winStreak, subjects };
}
