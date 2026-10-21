import type { ExamDefinition } from "./exams";
import { checkTaskAnswer, type Task } from "./tasks";
import { getPublicationDecision } from "./content-publication";

export const mockExamStorageKey = "tochka-mock-exams-v1";
export const mockDurationMinutes = 235;
export const mockDurationNote = "235 минут — учебная настройка. Длительность и структура официального экзамена требуют сверки с ФИПИ соответствующего года.";

export type MockResult = {
  taskId: string;
  valid: boolean;
  correct: boolean;
  primaryScore: number;
  /** Stable request identifier; not a second XP journal. */
  requestId: string | null;
};
export type MockSession = {
  id: string;
  examVersionId: string;
  taskIds: string[];
  startedAt: number;
  deadline: number;
  finishedAt: number | null;
  finishReason: "manual" | "timeout" | null;
  position: number;
  answers: Record<string, string>;
  results: Record<string, MockResult>;
  selfScores: Record<string, number>;
  revealedTaskIds: string[];
  publishedTaskIds: string[];
};
export type MockState = { version: 1; activeId: string | null; sessions: MockSession[] };
export const emptyMockState = (): MockState => ({ version: 1, activeId: null, sessions: [] });

function usableTask(task: Task, definition: ExamDefinition) {
  const number = definition.numbers.find((entry) => entry.number === task.examNumber);
  return Boolean(number && task.examVersionId === definition.versionId &&
    task.examType[0] === definition.examType && task.subjectId === definition.subjectId &&
    task.level === definition.level && task.part === number.part && task.solution.length > 0 &&
    task.prompt.trim() && task.scoring.maxPrimaryScore === number.maxPrimaryScore &&
    number.maxPrimaryScore !== null && number.maxPrimaryScore > 0 &&
    (number.part === 1 ? task.answerRule.type !== "self" : task.answerRule.type === "self"));
}

export function getMockCoverage(definition: ExamDefinition, bank: Task[]) {
  // New selections require a current publication decision. Parsing earlier
  // sessions intentionally retains structural validation so a withdrawn task
  // does not erase a student's existing answers, scores or timer history.
  const available = bank.filter((task) => usableTask(task, definition) &&
    task.publication?.id === task.id && getPublicationDecision(task.publication).allowed);
  const missingNumbers = definition.numbers.filter((number) => !available.some((task) => task.examNumber === number.number)).map((number) => number.number);
  const groups = new Set(available.filter((task) => task.examNumber === 1 && task.sharedConditionId).map((task) => task.sharedConditionId!));
  const completeGroups = definition.examType === "ОГЭ"
    ? [...groups].filter((groupId) => [1, 2, 3, 4, 5].every((number) => available.some((task) => task.examNumber === number && task.sharedConditionId === groupId)))
    : [];
  const missingSharedCondition = definition.examType === "ОГЭ" && completeGroups.length === 0;
  return { available, missingNumbers, completeGroups, missingSharedCondition, canStart: definition.available && missingNumbers.length === 0 && !missingSharedCondition };
}

function seedNumber(seed: string) {
  let value = 2166136261;
  for (const character of seed) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}
function chooseLeastUsed<T>(items: T[], key: (value: T) => string, recentIds: string[], seed: number): T {
  const count = (item: T) => recentIds.filter((id) => id === key(item)).length;
  const minimum = Math.min(...items.map(count));
  const candidates = items.filter((item) => count(item) === minimum);
  return candidates[seed % candidates.length];
}

/** One original task per supported number; OGE 1–5 always share one condition. */
export function createMockSession(
  id: string,
  definition: ExamDefinition,
  bank: Task[],
  previousSessions: MockSession[] = [],
  now = Date.now(),
): MockSession {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id) || !Number.isSafeInteger(now) || now < 0) throw new Error("Invalid session identity");
  const coverage = getMockCoverage(definition, bank);
  if (!coverage.canStart) throw new Error("Not enough content for the complete learning variant");
  const previous = previousSessions.filter((session) => session.examVersionId === definition.versionId).slice(-8);
  const recentIds = previous.flatMap((session) => session.taskIds);
  const seed = seedNumber(id);
  const group = coverage.completeGroups.length
    ? chooseLeastUsed(coverage.completeGroups, (value) => value, previous.map((session) => bank.find((task) => task.id === session.taskIds[0])?.sharedConditionId ?? ""), seed)
    : null;
  const taskIds = definition.numbers.map((number) => {
    const choices = coverage.available.filter((task) => task.examNumber === number.number &&
      (definition.examType !== "ОГЭ" || number.number > 5 || task.sharedConditionId === group));
    return chooseLeastUsed(choices, (task) => task.id, recentIds, (seed + number.number * 7919) >>> 0).id;
  });
  return { id, examVersionId: definition.versionId, taskIds, startedAt: now,
    deadline: now + mockDurationMinutes * 60_000, finishedAt: null, finishReason: null,
    position: 0, answers: {}, results: {}, selfScores: {}, revealedTaskIds: [], publishedTaskIds: [] };
}

export function remainingMockMilliseconds(session: MockSession, now: number) {
  return session.finishedAt === null ? Math.max(0, session.deadline - now) : 0;
}
export function elapsedMockMilliseconds(session: MockSession, now: number) {
  return Math.max(0, Math.min(session.finishedAt ?? now, session.deadline) - session.startedAt);
}
export function updateMockAnswer(session: MockSession, taskId: string, answer: string, now = Date.now()): MockSession {
  if (session.finishedAt !== null || now >= session.deadline || !session.taskIds.includes(taskId) || answer.length > 20_000) return session;
  return { ...session, answers: { ...session.answers, [taskId]: answer } };
}
export function selectMockPosition(session: MockSession, position: number): MockSession {
  if (!Number.isInteger(position) || position < 0 || position >= session.taskIds.length) return session;
  return { ...session, position };
}

export function finishMockSession(session: MockSession, bank: Task[], now = Date.now()): MockSession {
  if (session.finishedAt !== null) return session;
  const results: MockSession["results"] = {};
  for (const taskId of session.taskIds) {
    const task = bank.find((entry) => entry.id === taskId);
    if (!task || task.part !== 1) continue;
    const checked = checkTaskAnswer(session.answers[taskId] ?? "", task.answerRule);
    results[taskId] = { taskId, valid: checked.valid, correct: checked.correct,
      primaryScore: checked.valid && checked.correct ? task.scoring.maxPrimaryScore ?? 0 : 0,
      requestId: checked.valid ? `${session.id}-answer-${task.examNumber}` : null };
  }
  return { ...session, finishedAt: Math.max(session.startedAt, Math.min(now, session.deadline)), finishReason: now >= session.deadline ? "timeout" : "manual", results };
}

export function setMockSelfScore(session: MockSession, task: Task, score: number): MockSession {
  const maximum = task.scoring.maxPrimaryScore;
  if (session.finishedAt === null || task.part !== 2 || !session.taskIds.includes(task.id) ||
      !session.revealedTaskIds.includes(task.id) || maximum === null || !Number.isInteger(score) || score < 0 || score > maximum) return session;
  return { ...session, selfScores: { ...session.selfScores, [task.id]: score } };
}
export function mockScoreSummary(session: MockSession, bank: Task[]) {
  const automatic = Object.values(session.results).reduce((sum, result) => sum + result.primaryScore, 0);
  const self = Object.values(session.selfScores).reduce((sum, score) => sum + score, 0);
  const pendingSelf = session.taskIds.filter((id) => bank.find((task) => task.id === id)?.part === 2 && session.selfScores[id] === undefined).length;
  const maximum = session.taskIds.reduce((sum, id) => sum + (bank.find((task) => task.id === id)?.scoring.maxPrimaryScore ?? 0), 0);
  return { automatic, self, total: automatic + self, maximum, pendingSelf };
}

function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function validTime(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }

/** Reject unknown schemas without overwriting their data; the hook retains the raw store. */
export function parseMockState(raw: string | null, bank: Task[], definitions: ExamDefinition[]): MockState {
  if (!raw) return emptyMockState();
  const input: unknown = JSON.parse(raw);
  if (!isObject(input) || input.version !== 1 || !Array.isArray(input.sessions)) throw new Error("Unsupported mock schema");
  const sessions: MockSession[] = [];
  for (const value of input.sessions) {
    if (!isObject(value) || typeof value.id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(value.id) || sessions.some((entry) => entry.id === value.id)) throw new Error("Invalid mock session");
    const definition = definitions.find((entry) => entry.versionId === value.examVersionId && entry.available);
    if (!definition || !Array.isArray(value.taskIds) || value.taskIds.length !== definition.numbers.length || !validTime(value.startedAt) || !validTime(value.deadline) || value.deadline !== value.startedAt + mockDurationMinutes * 60_000) throw new Error("Invalid mock metadata");
    const taskIds = value.taskIds as unknown[];
    if (new Set(taskIds).size !== taskIds.length || !taskIds.every((id, index) => typeof id === "string" && bank.some((task) => task.id === id && usableTask(task, definition) && task.examNumber === definition.numbers[index].number))) throw new Error("Unavailable mock content");
    if (definition.examType === "ОГЭ") {
      const groups = new Set(taskIds.slice(0, 5).map((id) => bank.find((task) => task.id === id)?.sharedConditionId));
      if (groups.size !== 1 || groups.has(undefined)) throw new Error("Mixed shared conditions");
    }
    if (!isObject(value.answers) || !isObject(value.selfScores) || !Array.isArray(value.revealedTaskIds) || !Array.isArray(value.publishedTaskIds)) throw new Error("Invalid mock answers");
    const answers: Record<string, string> = {};
    for (const id of taskIds as string[]) {
      if (value.answers[id] === undefined) continue;
      if (typeof value.answers[id] !== "string" || value.answers[id].length > 20_000) throw new Error("Invalid mock answer text");
      answers[id] = value.answers[id];
    }
    const revealedTaskIds = [...new Set(value.revealedTaskIds.filter((id): id is string => typeof id === "string" && taskIds.includes(id)))];
    const publishedTaskIds = [...new Set(value.publishedTaskIds.filter((id): id is string => typeof id === "string" && taskIds.includes(id)))];
    let session: MockSession = { id: value.id, examVersionId: definition.versionId, taskIds: taskIds as string[], startedAt: value.startedAt, deadline: value.deadline,
      finishedAt: null, finishReason: null, position: typeof value.position === "number" && Number.isInteger(value.position) && value.position >= 0 && value.position < taskIds.length ? value.position : 0,
      answers, results: {}, selfScores: {}, revealedTaskIds: [], publishedTaskIds: [] };
    if (value.finishedAt !== null) {
      if (!validTime(value.finishedAt) || value.finishedAt < session.startedAt || value.finishedAt > session.deadline) throw new Error("Invalid finish time");
      session = finishMockSession(session, bank, value.finishedAt);
      session = { ...session, revealedTaskIds, publishedTaskIds };
      for (const taskId of session.taskIds) {
        const task = bank.find((entry) => entry.id === taskId)!;
        if (value.selfScores[taskId] !== undefined) {
          const score = value.selfScores[taskId];
          if (typeof score !== "number" || setMockSelfScore(session, task, score) === session) throw new Error("Invalid saved self score");
          session = setMockSelfScore(session, task, score);
        }
      }
    }
    sessions.push(session);
  }
  const activeId = typeof input.activeId === "string" && sessions.some((session) => session.id === input.activeId) ? input.activeId : null;
  return { version: 1, activeId, sessions };
}

/** Alias and cleanup adapter used by the existing Profile data-reset action. */
export const mockStorageKey = mockExamStorageKey;
export function clearMockStorage(storage?: Pick<Storage, "removeItem"> | null): boolean {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
    if (!target) return false;
    target.removeItem(mockExamStorageKey);
    return true;
  } catch { return false; }
}
