import {
  defaultCatalogSelection,
  emptyTaskState,
  normalizeCatalogSelection,
  practiceTasks,
  type CatalogSelection,
  type PracticeSession,
  type PracticeTaskState,
} from "./practice";
import { checkTaskAnswer, tasks } from "./tasks";
import { getTaskXPScoringRule } from "./exam-scores";

export const practiceStorageKey = "tochka-practice-v1";
export const catalogScrollStorageKey = "tochka-catalog-scroll-v1";

export type StoredPractice = {
  version: 2;
  catalog: CatalogSelection;
  sessions: Record<string, PracticeSession>;
  activeId: string | null;
  /** One authoritative draft/checked-state map across number/topic sessions. */
  taskStates: Record<string, PracticeTaskState>;
};

export function isReadablePracticeStorage(raw: string | null): boolean {
  if (raw === null) return true;
  if (!raw || raw.length > 8_000_000) return false;
  try {
    const input = object(JSON.parse(raw));
    return Boolean(input && (input.version === 1 || input.version === 2)
      && object(input.catalog) && object(input.sessions)
      && (input.activeId === null || typeof input.activeId === "string")
      && (input.version === 1 || object(input.taskStates)));
  } catch { return false; }
}

/** Session.states is a screen projection; only taskStates is persisted. */
export function serializeStoredPractice(value: StoredPractice): string {
  return JSON.stringify({ ...value, sessions: Object.fromEntries(Object.entries(value.sessions)
    .map(([id, session]) => [id, { ...session, states: undefined }])) });
}

export type StoredScrollSnapshot = {
  version: 1;
  key: string;
  windowTop: number;
  windowLeft: number;
  entries: { locator: string; top: number; left: number }[];
};

/** Positions are bounded, finite values. Locators are data, never CSS/JavaScript. */
export function parseStoredScroll(raw: string | null): StoredScrollSnapshot | null {
  if (!raw || raw.length > 100_000) return null;
  try {
    const input = object(JSON.parse(raw));
    const position = (value: unknown): value is number =>
      typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10_000_000;
    if (
      !input || input.version !== 1 || typeof input.key !== "string" || input.key.length > 250 ||
      !position(input.windowTop) || !position(input.windowLeft) || !Array.isArray(input.entries)
    ) return null;
    const entries: StoredScrollSnapshot["entries"] = [];
    for (const value of input.entries.slice(0, 100)) {
      const entry = object(value);
      if (!entry || typeof entry.locator !== "string" || entry.locator.length > 250 ||
        !/^(?:id:[a-zA-Z][\w-]*|parent:\d{1,3}|child:\d{1,4}(?:\/\d{1,4})*)$/.test(entry.locator) ||
        !position(entry.top) || !position(entry.left)) continue;
      entries.push({ locator: entry.locator, top: entry.top, left: entry.left });
    }
    return { version: 1, key: input.key, windowTop: input.windowTop, windowLeft: input.windowLeft, entries };
  } catch {
    return null;
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function selection(value: unknown): CatalogSelection | null {
  const input = object(value);
  if (
    !input ||
    (input.exam !== "ОГЭ" && input.exam !== "ЕГЭ") ||
    input.subjectId !== "math" ||
    (input.mode !== "number" && input.mode !== "topic") ||
    (input.exam === "ЕГЭ" && input.level !== "profile" && input.level !== "base") ||
    (input.exam === "ОГЭ" && input.level !== undefined)
  )
    return null;
  return normalizeCatalogSelection(input);
}

function taskState(value: unknown, taskId: string): PracticeTaskState | null {
  const input = object(value);
  const task = tasks.find((candidate) => candidate.id === taskId);
  if (!input || !task || typeof input.answer !== "string" || input.answer.length > 1024)
    return null;
  const restored = { ...emptyTaskState(), answer: input.answer };
  if (task.part === 2) {
    // The confirmed grade belongs to the game ledger. Only restore this screen's draft.
    if (typeof input.selfSolutionVisible === "boolean")
      restored.selfSolutionVisible = input.selfSolutionVisible;
    if (typeof input.selfWork === "string" && input.selfWork.length <= 20_000)
      restored.selfWork = input.selfWork;
    const maximum = getTaskXPScoringRule(task)?.maxPrimaryScore;
    if (
      maximum !== undefined &&
      typeof input.selfDraftScore === "number" &&
      Number.isInteger(input.selfDraftScore) &&
      input.selfDraftScore >= 0 && input.selfDraftScore <= maximum
    )
      restored.selfDraftScore = input.selfDraftScore;
    return restored;
  }
  // Editing a wrong answer clears its current verdict, but cannot undo viewing the solution.
  if (input.attempt === null) restored.solutionViewed = input.solutionViewed === true;
  const attempt = object(input.attempt);
  if (
    attempt &&
    typeof attempt.id === "string" &&
    /^[a-zA-Z0-9-]{1,120}$/.test(attempt.id) &&
    typeof attempt.correct === "boolean"
  ) {
    // A changed task or damaged record must not resurrect a contradictory verdict.
    const checked = checkTaskAnswer(input.answer, task.answerRule);
    if (checked.valid && checked.correct === attempt.correct) {
      restored.attempt = { id: attempt.id, correct: attempt.correct };
      restored.solutionViewed = input.solutionViewed === true;
      restored.solutionVisible = restored.solutionViewed && input.solutionVisible === true;
    }
  }
  return restored;
}

/** Corrupt/unknown schemas start safely; stored content is never executed. */
export function parseStoredPractice(raw: string | null): StoredPractice {
  const empty: StoredPractice = {
    version: 2,
    catalog: defaultCatalogSelection(),
    sessions: {},
    activeId: null,
    taskStates: {},
  };
  if (!raw || raw.length > 8_000_000) return empty;
  try {
    const input = object(JSON.parse(raw));
    if (!input || (input.version !== 1 && input.version !== 2)) return empty;
    const catalog = selection(input.catalog) ?? empty.catalog;
    const records = object(input.sessions);
    const sessions: Record<string, PracticeSession> = {};
    const taskStates: Record<string, PracticeTaskState> = {};
    const entries = Object.entries(records ?? {}).slice(-1000);
    // v1 has no per-draft timestamps: the active session wins, then stored insertion order.
    const legacyStates: { id: string; states: Record<string, unknown> | null }[] = [];
    for (const [id, value] of entries) {
      if (!/^[a-zA-Z0-9-]{1,100}$/.test(id) || ["constructor", "prototype", "__proto__"].includes(id)) continue;
      const record = object(value);
      const selected = selection(record?.selection);
      if (!record || !selected || record.id !== id || !Array.isArray(record.taskIds)) continue;
      const availableIds = practiceTasks(selected).map((task) => task.id);
      const available = new Set(availableIds);
      const savedIds = record.taskIds.filter((taskId): taskId is string =>
        typeof taskId === "string" && available.has(taskId),
      );
      // Content updates can fill a formerly empty number. Keep saved order and append new variants.
      const taskIds = record.invalidContext === true
        ? []
        : [...new Set([...savedIds, ...availableIds])];
      if (input.version === 1) legacyStates.push({ id, states: object(record.states) });
      const previousPosition = typeof record.lastPosition === "number" && Number.isInteger(record.lastPosition)
        ? record.lastPosition
        : 0;
      const previousTaskId = typeof record.lastTaskId === "string" ? record.lastTaskId : record.taskIds[previousPosition];
      const restoredPosition = typeof previousTaskId === "string"
        ? taskIds.indexOf(previousTaskId)
        : -1;
      sessions[id] = {
        id,
        selection: selected,
        taskIds,
        states: {},
        lastPosition: restoredPosition >= 0
          ? restoredPosition
          : Math.max(0, Math.min(previousPosition, taskIds.length - 1)),
        ...(record.invalidContext === true ? { invalidContext: true } : {}),
        visitOrder: typeof record.visitOrder === "number" && Number.isSafeInteger(record.visitOrder) && record.visitOrder >= 0 ? record.visitOrder : entries.findIndex(([entryId]) => entryId === id) + 1,
      };
      sessions[id].lastTaskId = taskIds[sessions[id].lastPosition];
    }
    if (input.version === 1) {
      legacyStates.sort((a, b) => Number(a.id === input.activeId) - Number(b.id === input.activeId));
      for (const source of legacyStates) for (const [taskId, value] of Object.entries(source.states ?? {})) {
        if (["constructor", "prototype", "__proto__"].includes(taskId)) continue;
        const parsed = taskState(value, taskId);
        if (!parsed) continue;
        const previous = taskStates[taskId];
        taskStates[taskId] = { ...parsed, solutionViewed: Boolean(parsed.solutionViewed || previous?.solutionViewed) };
      }
      if (typeof input.activeId === "string" && sessions[input.activeId]) sessions[input.activeId].visitOrder = entries.length + 1;
    } else {
      for (const [taskId, value] of Object.entries(object(input.taskStates) ?? {})) {
        if (["constructor", "prototype", "__proto__"].includes(taskId)) continue;
        const parsed = taskState(value, taskId);
        if (parsed) taskStates[taskId] = parsed;
      }
    }
    return {
      version: 2,
      catalog,
      sessions,
      taskStates,
      activeId: typeof input.activeId === "string" && Object.hasOwn(sessions, input.activeId)
        ? input.activeId
        : null,
    };
  } catch {
    return empty;
  }
}
