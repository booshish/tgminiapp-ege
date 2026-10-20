import type { Exam, SubjectId } from "./tasks";
import { checkTaskAnswer, prototypes, tasks } from "./tasks";

type EventContext = {
  id: string;
  taskId: string;
  topicId: string;
  prototypeId: string;
  examType: Exam;
  subjectId: SubjectId;
  createdAt: string;
};

export type AnswerEvent = EventContext & {
  kind: "answer_checked";
  answer: string;
  correct: boolean;
};

export type SolutionEvent = EventContext & {
  kind: "solution_viewed";
  attemptId: string;
};

export type LearningEvent = AnswerEvent | SolutionEvent;

export type ProgressRecord = {
  taskId: string;
  correct: boolean;
  attempts: number;
};

export type LearningState = {
  version: 2;
  exam: Exam;
  lastTaskIndex: number;
  events: LearningEvent[];
  legacyRecords: ProgressRecord[];
  fontScale: "standard" | "large";
};

export const storageKey = "tochka-learning-v2";
export const legacyStorageKey = "tochka-demo-progress-v1";

export const emptyLearningState: LearningState = {
  version: 2,
  exam: "ЕГЭ",
  lastTaskIndex: 0,
  events: [],
  legacyRecords: [],
  fontScale: "standard",
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
  if (
    !task ||
    !isId(value.id) ||
    !isIsoDate(value.createdAt) ||
    value.topicId !== task.topicId ||
    value.prototypeId !== task.prototypeId ||
    value.subjectId !== "math" ||
    (value.examType !== "ОГЭ" && value.examType !== "ЕГЭ") ||
    !task.examType.includes(value.examType)
  )
    return null;
  return {
    id: value.id,
    taskId: task.id,
    topicId: task.topicId,
    prototypeId: task.prototypeId,
    subjectId: "math",
    examType: value.examType,
    createdAt: value.createdAt,
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
      });
    } else if (event.kind === "solution_viewed") {
      if (!isId(event.attemptId)) continue;
      candidates.push({
        ...context,
        kind: "solution_viewed",
        attemptId: event.attemptId,
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
    if (event.kind !== "solution_viewed" || ids.has(event.id)) continue;
    const attempt = answers.get(event.attemptId);
    if (
      attempt !== undefined &&
      attempt.taskId === event.taskId &&
      attempt.examType === event.examType &&
      Date.parse(event.createdAt) >= Date.parse(attempt.createdAt)
    ) {
      accepted.add(event);
      ids.add(event.id);
    }
  }
  return candidates.filter((event) => accepted.has(event));
}

/** Migrate only when v2 is absent; a deliberate reset must not resurrect the old key. */
export function parseLearningState(
  raw: string | null,
  legacyRaw?: string | null,
): LearningState {
  const parsed = parseObject(raw);
  const modern = parsed?.version === 2 ? parsed : null;
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
  return {
    version: 2,
    exam: source?.exam === "ОГЭ" ? "ОГЭ" : "ЕГЭ",
    lastTaskIndex,
    events: modern ? parseEvents(modern.events) : [],
    legacyRecords: parseLegacyRecords(
      modern ? modern.legacyRecords : legacy?.records,
    ),
    fontScale: modern?.fontScale === "large" ? "large" : "standard",
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
