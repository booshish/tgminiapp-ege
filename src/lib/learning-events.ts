import type { Exam, SubjectId } from "./tasks";
import { checkTaskAnswer, practicePrototypes as prototypes, practiceBank as tasks } from "./tasks";
import type { ExamLevel } from "./exams";
import {
  emptyGameState,
  parseGameState,
  reconcileUnrewardedAttempts,
  type GameState,
} from "./gamification";
import { getTaskXPScoringRule } from "./exam-scores";

type EventContext = {
  id: string;
  taskId: string;
  topicId: string;
  prototypeId: string;
  examType: Exam;
  subjectId: SubjectId;
  createdAt: string;
  level?: ExamLevel | null;
  examNumber?: number | null;
  examVersionId?: string;
  examYear?: number;
  part?: 1 | 2 | 3 | null;
  answerFormat?: "short" | "extended";
};

export type AnswerEvent = EventContext & {
  kind: "answer_checked";
  answer: string;
  correct: boolean;
  solutionSeenBeforeCheck?: boolean;
};

export type SolutionEvent = EventContext & {
  kind: "solution_viewed";
  attemptId?: string;
  /** An unanswered item may be reviewed only after finishing a mock. */
  source?: "completed-mock";
  mockSessionId?: string;
};

export type SelfAssessmentEvent = EventContext & {
  kind: "self_assessed";
  score: number;
  maxScore: number;
};

export type LearningEvent = AnswerEvent | SolutionEvent | SelfAssessmentEvent;

export type ProgressRecord = {
  taskId: string;
  correct: boolean;
  attempts: number;
};

export type LearningState = {
  version: 3;
  exam: Exam;
  lastTaskIndex: number;
  events: LearningEvent[];
  legacyRecords: ProgressRecord[];
  fontScale: "standard" | "large" | "huge";
  theme: "light" | "dark";
  focusMode: boolean;
  breakReminderMinutes: 0 | 90 | 120;
  game: GameState;
};

export const storageKey = "tochka-learning-v2";
export const legacyStorageKey = "tochka-demo-progress-v1";

export const emptyLearningState: LearningState = {
  version: 3,
  exam: "ЕГЭ",
  lastTaskIndex: 0,
  events: [],
  legacyRecords: [],
  fontScale: "standard",
  theme: "light",
  focusMode: false,
  breakReminderMinutes: 120,
  game: emptyGameState(),
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseObject(
  raw: string | null | undefined,
): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

function isId(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= 160
  );
}

/** Date.parse alone silently accepts dates such as 30 February. Check calendar parts too. */
function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= days[month - 1] &&
    Number(hourText) <= 23 &&
    Number(minuteText) <= 59 &&
    Number(secondText) <= 59 &&
    (match[8] === undefined || Number(match[8]) <= 23) &&
    (match[9] === undefined || Number(match[9]) <= 59) &&
    Number.isFinite(Date.parse(value))
  );
}

function parseLegacyRecords(value: unknown): ProgressRecord[] {
  if (!Array.isArray(value)) return [];
  const records = new Map<string, ProgressRecord>();
  for (const record of value) {
    if (
      !isObject(record) ||
      typeof record.taskId !== "string" ||
      !tasks.some((task) => task.id === record.taskId) ||
      typeof record.correct !== "boolean" ||
      typeof record.attempts !== "number" ||
      !Number.isSafeInteger(record.attempts) ||
      record.attempts < 1
    )
      continue;
    const previous = records.get(record.taskId);
    records.set(record.taskId, {
      taskId: record.taskId,
      correct: record.correct || Boolean(previous?.correct),
      attempts: Math.max(record.attempts, previous?.attempts ?? 0),
    });
  }
  return Array.from(records.values());
}

function parseEventContext(
  value: Record<string, unknown>,
): EventContext | null {
  const task = tasks.find((candidate) => candidate.id === value.taskId);
  const hasExamMetadata = "level" in value || "examNumber" in value;
  const hasScoringMetadata =
    "examVersionId" in value ||
    "part" in value ||
    "answerFormat" in value ||
    "examYear" in value;
  if (
    !task ||
    !isId(value.id) ||
    !isIsoDate(value.createdAt) ||
    value.topicId !== task.topicId ||
    value.prototypeId !== task.prototypeId ||
    value.subjectId !== task.subjectId ||
    (value.examType !== "ОГЭ" && value.examType !== "ЕГЭ") ||
    !(
      task.examType.includes(value.examType) ||
      (!hasExamMetadata &&
        !hasScoringMetadata &&
        task.legacyExamTypes?.includes(value.examType))
    ) ||
    (hasExamMetadata &&
      (value.level !== task.level || value.examNumber !== task.examNumber)) ||
    (hasScoringMetadata &&
      (value.examVersionId !== task.examVersionId ||
        value.part !== task.part ||
        value.answerFormat !== (task.answerFormat === "extended" ? "extended" : "short") ||
        (value.examYear !== undefined && value.examYear !== task.examYear)))
  )
    return null;
  return {
    id: value.id,
    taskId: task.id,
    topicId: task.topicId,
    prototypeId: task.prototypeId,
    subjectId: task.subjectId,
    examType: value.examType,
    createdAt: value.createdAt,
    ...(hasExamMetadata
      ? { level: task.level, examNumber: task.examNumber }
      : {}),
    ...(hasScoringMetadata
      ? {
          examVersionId: task.examVersionId,
          part: task.part,
          answerFormat:
            task.answerFormat === "extended" ? ("extended" as const) : ("short" as const),
          ...(value.examYear !== undefined ? { examYear: task.examYear } : {}),
        }
      : {}),
  };
}

function parseEvents(value: unknown): LearningEvent[] {
  if (!Array.isArray(value)) return [];
  const candidates: LearningEvent[] = [];
  for (const event of value) {
    if (!isObject(event)) continue;
    const context = parseEventContext(event);
    if (!context) continue;
    if (event.kind === "answer_checked") {
      if (
        typeof event.answer !== "string" ||
        typeof event.correct !== "boolean"
      )
        continue;
      const task = tasks.find((candidate) => candidate.id === context.taskId)!;
      const result = checkTaskAnswer(event.answer, task.answerRule);
      if (!result.valid || result.correct !== event.correct) continue;
      candidates.push({
        ...context,
        kind: "answer_checked",
        answer: event.answer,
        correct: event.correct,
        ...(event.solutionSeenBeforeCheck === true
          ? { solutionSeenBeforeCheck: true }
          : {}),
      });
    } else if (event.kind === "solution_viewed") {
      const exposedAfterMock = event.source === "completed-mock" &&
        event.attemptId === undefined && isId(event.mockSessionId) &&
        context.part === 1 && context.answerFormat === "short" &&
        typeof context.examVersionId === "string";
      if (!isId(event.attemptId) && !exposedAfterMock) continue;
      candidates.push({
        ...context,
        kind: "solution_viewed",
        ...(exposedAfterMock
          ? { source: "completed-mock" as const, mockSessionId: event.mockSessionId as string }
          : { attemptId: event.attemptId as string }),
      });
    } else if (event.kind === "self_assessed") {
      const task = tasks.find((candidate) => candidate.id === context.taskId)!;
      const rule = getTaskXPScoringRule(task);
      if (
        task.part !== 2 ||
        !rule ||
        rule.part !== 2 ||
        context.examVersionId !== task.examVersionId ||
        context.examYear !== task.examYear ||
        context.examNumber !== task.examNumber ||
        context.level !== task.level ||
        typeof event.score !== "number" ||
        !Number.isInteger(event.score) ||
        event.score < 0 ||
        event.score > rule.maxPrimaryScore ||
        event.maxScore !== rule.maxPrimaryScore
      )
        continue;
      candidates.push({
        ...context,
        kind: "self_assessed",
        score: event.score,
        maxScore: event.maxScore as number,
      });
    } else continue;
  }

  // Resolve links before reserving view IDs: an orphan view cannot hide a valid answer.
  const answers = new Map<string, AnswerEvent>();
  for (const event of candidates) {
    if (event.kind === "answer_checked" && !answers.has(event.id))
      answers.set(event.id, event);
  }
  const accepted = new Set<LearningEvent>(answers.values());
  const ids = new Set(answers.keys());
  for (const event of candidates) {
    if (event.kind !== "self_assessed" || ids.has(event.id)) continue;
    accepted.add(event);
    ids.add(event.id);
  }
  for (const event of candidates) {
    if (event.kind !== "solution_viewed" || ids.has(event.id)) continue;
    if (event.source === "completed-mock" && event.attemptId === undefined) {
      accepted.add(event);
      ids.add(event.id);
      continue;
    }
    const attempt = event.attemptId ? answers.get(event.attemptId) : undefined;
    if (
      attempt !== undefined &&
      attempt.taskId === event.taskId &&
      attempt.examType === event.examType &&
      attempt.level === event.level &&
      attempt.examNumber === event.examNumber &&
      Date.parse(event.createdAt) >= Date.parse(attempt.createdAt)
    ) {
      accepted.add(event);
      ids.add(event.id);
    }
  }
  return candidates.filter((event) => accepted.has(event));
}

/** Keep the existing key; migrate v2 in place without replaying old answers for XP. */
export function parseLearningState(
  raw: string | null,
  legacyRaw?: string | null,
): LearningState {
  const parsed = parseObject(raw);
  const modern = parsed?.version === 2 || parsed?.version === 3 ? parsed : null;
  const legacy = modern
    ? null
    : (parseObject(legacyRaw) ??
      (parsed && "records" in parsed ? parsed : null));
  const source = modern ?? legacy;
  const lastTaskIndex =
    source &&
    typeof source.lastTaskIndex === "number" &&
    Number.isInteger(source.lastTaskIndex) &&
    source.lastTaskIndex >= 0 &&
    source.lastTaskIndex < (modern ? tasks.length : 5)
      ? source.lastTaskIndex
      : 0;
  const events = modern ? parseEvents(modern.events) : [];
  // Early histories lacked part metadata. Restore only a known matching numbered
  // first-part context for the game projection; retain the original learning events.
  // No scoring version is invented, so ambiguous old events cannot mint XP.
  const gameEvents = events.map((event) => {
    if (event.kind !== "answer_checked" || event.part !== undefined ||
        event.answerFormat !== undefined || event.examVersionId !== undefined) return event;
    const task = tasks.find((candidate) => candidate.id === event.taskId);
    if (!task || task.part !== 1 || task.examNumber === null ||
        !task.examType.includes(event.examType)) return event;
    return { ...event, part: 1 as const, answerFormat: "short" as const };
  });
  return {
    version: 3,
    exam: source?.exam === "ОГЭ" ? "ОГЭ" : "ЕГЭ",
    lastTaskIndex,
    events,
    legacyRecords: parseLegacyRecords(
      modern ? modern.legacyRecords : legacy?.records,
    ),
    fontScale: modern?.fontScale === "large" || modern?.fontScale === "huge"
      ? modern.fontScale : "standard",
    // Removed system/comfort options migrate to the original light theme.
    theme: modern?.theme === "dark" ? "dark" : "light",
    focusMode: modern?.focusMode === true,
    breakReminderMinutes: modern?.breakReminderMinutes === 0 || modern?.breakReminderMinutes === 90
      ? modern.breakReminderMinutes : 120,
    game: reconcileUnrewardedAttempts(
      parseGameState(modern?.game, gameEvents),
      gameEvents,
      (event) => {
        const task = tasks.find((candidate) => candidate.id === event.taskId);
        return task ? getTaskXPScoringRule(task) : null;
      },
    ),
  };
}

export type LearningAnalytics = {
  solved: number;
  attempts: number;
  correctAnswers: number;
  accuracy: number | null;
  solutionViews: number;
  topics: {
    topicId: string;
    attempts: number;
    correctAnswers: number;
    accuracy: number;
  }[];
  errors: AnswerEvent[];
  timeline: { date: string; attempts: number; correctAnswers: number }[];
};

/** Legacy counts have no timestamps and therefore never enter the daily timeline or errors. */
export function getAnalytics(state: LearningState): LearningAnalytics {
  const topicMap = new Map(
    prototypes.map((prototype) => [
      prototype.topicId,
      {
        topicId: prototype.topicId,
        attempts: 0,
        correctAnswers: 0,
        accuracy: 0,
      },
    ]),
  );
  const timeline = new Map<
    string,
    { date: string; attempts: number; correctAnswers: number }
  >();
  const solved = new Set<string>();
  const errors: AnswerEvent[] = [];
  let attempts = 0;
  let correctAnswers = 0;
  let solutionViews = 0;

  for (const record of state.legacyRecords) {
    const task = tasks.find((candidate) => candidate.id === record.taskId);
    if (!task) continue;
    attempts += record.attempts;
    const topic = topicMap.get(task.topicId)!;
    topic.attempts += record.attempts;
    if (record.correct) {
      solved.add(record.taskId);
      correctAnswers += 1;
      topic.correctAnswers += 1;
    }
  }

  for (const event of state.events) {
    if (event.kind === "solution_viewed") {
      solutionViews += 1;
      continue;
    }
    // Self-assessment is never an objectively checked answer or a recorded error.
    if (event.kind !== "answer_checked") continue;
    attempts += 1;
    const topic = topicMap.get(event.topicId)!;
    topic.attempts += 1;
    const date = new Date(event.createdAt).toISOString().slice(0, 10);
    const day = timeline.get(date) ?? { date, attempts: 0, correctAnswers: 0 };
    day.attempts += 1;
    if (event.correct) {
      correctAnswers += 1;
      topic.correctAnswers += 1;
      day.correctAnswers += 1;
      solved.add(event.taskId);
    } else errors.push(event);
    timeline.set(date, day);
  }

  return {
    solved: solved.size,
    attempts,
    correctAnswers,
    accuracy:
      attempts > 0 ? Math.round((correctAnswers / attempts) * 100) : null,
    solutionViews,
    topics: Array.from(topicMap.values()).map((topic) => ({
      ...topic,
      accuracy:
        topic.attempts > 0
          ? Math.round((topic.correctAnswers / topic.attempts) * 100)
          : 0,
    })),
    errors: errors.sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    ),
    timeline: Array.from(timeline.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  };
}
