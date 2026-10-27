import type { ExamDefinition } from "./exams";
import { checkTaskAnswer, type Task } from "./tasks";
import { getPublicationDecision } from "./content-publication";
import { getTaskView } from "./task-placement";

export const mockExamStorageKey = "tochka-mock-exams-v1";
export const mockDurationMinutes = 235;
export const mockDurationNote = "Проекты 2027: ОГЭ и ЕГЭ профиль — 235 минут, ЕГЭ база — 180 минут. Неполный комплект или неподтверждённые критерии не выдаются за полный экзаменационный вариант.";

/** Project settings, not a claim that the unavailable 2027 specifications were read. */
export function getMockDurationMinutes(definition: ExamDefinition) {
  return definition.durationMinutes??(definition.examType === "ЕГЭ" && definition.level === "base" ? 180 : mockDurationMinutes);
}

export type MockVariant = {
  id: string;
  number: number;
  title: string;
  taskIds: string[];
  maxPrimaryScore: number;
  durationMinutes: number;
};

export type MockResult = {
  taskId: string;
  valid: boolean;
  correct: boolean;
  primaryScore: number;
  message?: string;
  /** Stable request identifier; not a second XP journal. */
  requestId: string | null;
};
export type MockSession = {
  id: string;
  examVersionId: string;
  /** Optional for pre-catalogue attempts; saved taskIds remain the source of truth. */
  variantId?: string;
  variantNumber?: number;
  durationMinutes?: number;
  /** Only named attempts opt in; historical rational-format attempts retain their rules. */
  answerFormatVersion?: 1;
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
  /** Additive migration: legacy attempts have no skipped tasks. */
  skippedTaskIds?: string[];
};
export type MockState = { version: 1; activeId: string | null; sessions: MockSession[] };
export const emptyMockState = (): MockState => ({ version: 1, activeId: null, sessions: [] });

function usableTask(task: Task, definition: ExamDefinition, historicalAttempt = false) {
  const number = definition.numbers.find((entry) => entry.number === task.examNumber);
  return Boolean(number && (historicalAttempt || task.availability !== "history-only") && task.examVersionId === definition.versionId &&
    task.examType[0] === definition.examType && task.subjectId === definition.subjectId &&
    task.level === definition.level && task.part === number.part && task.solution.length > 0 &&
    task.prompt.trim() && task.scoring.maxPrimaryScore === number.maxPrimaryScore &&
    number.maxPrimaryScore !== null && number.maxPrimaryScore > 0 &&
    (number.part === 1 ? task.answerRule.type === "number" || (historicalAttempt && task.answerRule.type === "set") : task.answerRule.type === "self"));
}

export function getMockCoverage(definition: ExamDefinition, bank: Task[]) {
  if(definition.year===2027)bank=bank.map(getTaskView);
  // New selections require a current publication decision. Parsing earlier
  // sessions intentionally retains structural validation so a withdrawn task
  // does not erase a student's existing answers, scores or timer history.
  const available = bank.filter((task) => usableTask(task, definition) &&
    (definition.year!==2027||task.part!==2||task.placementReview?.criteriaCompatible===true) &&
    task.publication?.id === task.id && getPublicationDecision(task.publication).allowed);
  const missingNumbers = definition.numbers.filter((number) => !available.some((task) => task.examNumber === number.number)).map((number) => number.number);
  const groups = new Set(available.filter((task) => task.examNumber === 1 && task.sharedConditionId).map((task) => task.sharedConditionId!));
  const completeGroups = definition.examType === "ОГЭ"
    ? [...groups].filter((groupId) => [1, 2, 3, 4, 5].every((number) => available.some((task) => task.examNumber === number && task.sharedConditionId === groupId)))
    : [];
  const missingSharedCondition = definition.examType === "ОГЭ" && completeGroups.length === 0;
  return { available, missingNumbers, completeGroups, missingSharedCondition, canStart: definition.available && missingNumbers.length === 0 && !missingSharedCondition };
}

/** Five fixed learning variants when every number has enough distinct author tasks.
 * Sorting by stable ID makes the catalogue independent of array order. Attempts
 * snapshot task IDs, so later content additions never change an existing attempt.
 */
export function getMockVariants(definition: ExamDefinition, bank: Task[]): MockVariant[] {
  const coverage = getMockCoverage(definition, bank);
  if (!coverage.canStart) return [];
  const byId = (a: Task, b: Task) => a.id.localeCompare(b.id, "en", { numeric: true });
  const diverseChoices = (choices: Task[]) => {
    const families = new Map<string, Task[]>();
    for (const task of choices.sort(byId)) {
      const family = families.get(task.prototypeId) ?? [];
      family.push(task);
      families.set(task.prototypeId, family);
    }
    const groups = [...families.entries()].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })).map(([, family]) => family);
    const interleaved: Task[] = [];
    for (let index = 0; interleaved.length < choices.length; index += 1) {
      for (const family of groups) if (family[index]) interleaved.push(family[index]);
    }
    return interleaved;
  };
  const groups = [...coverage.completeGroups].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const choicesByNumber = definition.numbers.map((number) => diverseChoices(coverage.available
    .filter((task) => task.examNumber === number.number)));
  const independentCounts = choicesByNumber.map((choices, index) =>
    definition.examType === "ОГЭ" && definition.numbers[index].number <= 5 ? groups.length : choices.length);
  const count = Math.min(5, ...independentCounts);
  return Array.from({ length: count }, (_, index) => {
    const taskIds = definition.numbers.map((number, position) => {
      const choices = choicesByNumber[position];
      return (definition.examType === "ОГЭ" && number.number <= 5
        ? choices.find((task) => task.sharedConditionId === groups[index])!
        : choices[index]).id;
    });
    return {
      id: `${definition.versionId}-study-v1-${index + 1}`,
      number: index + 1,
      title: `Вариант №${index + 1}`,
      taskIds,
      maxPrimaryScore: definition.numbers.reduce((sum, number) => sum + (number.maxPrimaryScore ?? 0), 0),
      durationMinutes: getMockDurationMinutes(definition),
    };
  });
}

export function getUnfinishedMockSession(state: MockState, definition: ExamDefinition): MockSession | null {
  const candidates = state.sessions.filter((session) => session.examVersionId === definition.versionId && session.finishedAt === null);
  return candidates.find((session) => session.id === state.activeId)
    ?? [...candidates].sort((a, b) => b.startedAt - a.startedAt)[0]
    ?? null;
}

export function getMockTaskStatus(session: MockSession, taskId: string): "unanswered" | "answered" | "skipped" {
  if (!session.taskIds.includes(taskId)) return "unanswered";
  if (session.skippedTaskIds?.includes(taskId)) return "skipped";
  return session.answers[taskId]?.trim() ? "answered" : "unanswered";
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
  variantNumber?: number,
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
  let taskIds = definition.numbers.map((number) => {
    const choices = coverage.available.filter((task) => task.examNumber === number.number &&
      (definition.examType !== "ОГЭ" || number.number > 5 || task.sharedConditionId === group));
    return chooseLeastUsed(choices, (task) => task.id, recentIds, (seed + number.number * 7919) >>> 0).id;
  });
  const variant = variantNumber === undefined ? undefined : getMockVariants(definition, bank).find((entry) => entry.number === variantNumber);
  if (variantNumber !== undefined && !variant) throw new Error("Unknown learning variant");
  if (variant) taskIds = [...variant.taskIds];
  const durationMinutes = getMockDurationMinutes(definition);
  const deadline = now + durationMinutes * 60_000;
  if (!Number.isSafeInteger(deadline)) throw new Error("Invalid session deadline");
  return { id, examVersionId: definition.versionId, taskIds, startedAt: now,
    ...(variant ? { variantId: variant.id, variantNumber: variant.number, answerFormatVersion: 1 as const } : {}),
    durationMinutes,
    deadline, finishedAt: null, finishReason: null,
    position: 0, answers: {}, results: {}, selfScores: {}, revealedTaskIds: [], publishedTaskIds: [], skippedTaskIds: [] };
}

/** Start is explicit; restoring a state never creates an attempt. A new attempt
 * preserves every older attempt and its deadline, answers and history. */
export function startMockAttempt(
  state: MockState,
  definition: ExamDefinition,
  bank: Task[],
  id: string,
  now = Date.now(),
  variantNumber?: number,
  replace = false,
): MockState {
  const unfinished = getUnfinishedMockSession(state, definition);
  if (unfinished && !replace) return { ...state, activeId: unfinished.id };
  if (state.sessions.some((session) => session.id === id)) throw new Error("Duplicate mock session identity");
  const session = createMockSession(id, definition, bank, state.sessions, now, variantNumber);
  return { ...state, sessions: [...state.sessions, session], activeId: session.id };
}

export function remainingMockMilliseconds(session: MockSession, now: number) {
  return session.finishedAt === null ? Math.max(0, session.deadline - now) : 0;
}
export function elapsedMockMilliseconds(session: MockSession, now: number) {
  return Math.max(0, Math.min(session.finishedAt ?? now, session.deadline) - session.startedAt);
}
export function updateMockAnswer(session: MockSession, taskId: string, answer: string, now = Date.now()): MockSession {
  if (session.finishedAt !== null || !validTime(now) || now < session.startedAt || now >= session.deadline || !session.taskIds.includes(taskId) || answer.length > 20_000) return session;
  return { ...session, answers: { ...session.answers, [taskId]: answer }, skippedTaskIds: (session.skippedTaskIds ?? []).filter((id) => id !== taskId) };
}

export function skipMockTask(session: MockSession, taskId: string, now = Date.now()): MockSession {
  if (session.finishedAt !== null || !validTime(now) || now < session.startedAt || now >= session.deadline || !session.taskIds.includes(taskId)) return session;
  return { ...session, skippedTaskIds: [...new Set([...(session.skippedTaskIds ?? []), taskId])] };
}
export function selectMockPosition(session: MockSession, position: number): MockSession {
  if (!Number.isInteger(position) || position < 0 || position >= session.taskIds.length) return session;
  return { ...session, position };
}

/** Exam entry format is deliberately narrower than the practice rational parser.
 * Digit sequences compare as strings and never pass through numeric normalization.
 */
export function checkMockAnswer(input: string, task: Task, strict = true) {
  if (strict && task.part === 1 && task.examEntryFormat === "digit-sequence") {
    const answer = typeof input === "string" ? input.trim() : "";
    if (task.answerRule.type !== "number" || answer.length > 128 || !/^\d+$/.test(answer)) {
      return { valid: false, correct: false, message: "Запишите последовательность цифр без пробелов, знаков, дробной части и разделителей." };
    }
    return { valid: true, correct: answer === task.answerRule.value };
  }
  if (strict && task.part === 1 && (task.answerRule.type !== "number" ||
      typeof input !== "string" || !/^[+-]?\d+(?:[,.]\d+)?$/.test(input.trim().replaceAll("−", "-")))) {
    return { valid: false, correct: false, message: "Запишите целое число или конечную десятичную дробь, без единиц измерения. Обыкновенная дробь и список значений в этом формате не принимаются." };
  }
  return checkTaskAnswer(input, task.answerRule);
}

export function finishMockSession(session: MockSession, bank: Task[], now = Date.now()): MockSession {
  if(session.examVersionId.endsWith("2027-draft"))bank=bank.map(getTaskView);
  if (session.finishedAt !== null) return session;
  if (!validTime(now) || now < session.startedAt) throw new Error("Invalid finish time");
  const results: MockSession["results"] = {};
  for (const taskId of session.taskIds) {
    const task = bank.find((entry) => entry.id === taskId);
    if (!task || task.part !== 1) continue;
    const checked = checkMockAnswer(session.answers[taskId] ?? "", task, session.answerFormatVersion === 1);
    results[taskId] = { taskId, valid: checked.valid, correct: checked.correct,
      primaryScore: checked.valid && checked.correct ? task.scoring.maxPrimaryScore ?? 0 : 0,
      ...(checked.message ? { message: checked.message } : {}),
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
  if(session.examVersionId.endsWith("2027-draft"))bank=bank.map(getTaskView);
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
    const definition = definitions.find((entry) => entry.versionId === value.examVersionId);
    const sessionBank=definition?.year===2027?bank.map(getTaskView):bank;
    // Legacy v1 attempts all used 235 minutes, including historical base attempts.
    const durationMinutes = value.durationMinutes === undefined ? mockDurationMinutes : value.durationMinutes;
    if (typeof durationMinutes !== "number" || !definition || ![mockDurationMinutes, getMockDurationMinutes(definition)].includes(durationMinutes)) throw new Error("Invalid mock duration");
    if (!definition || !Array.isArray(value.taskIds) || value.taskIds.length !== definition.numbers.length || !validTime(value.startedAt) || !validTime(value.deadline) || value.deadline !== value.startedAt + durationMinutes * 60_000) throw new Error("Invalid mock metadata");
    if ((value.variantNumber !== undefined || value.variantId !== undefined) &&
        (typeof value.variantNumber !== "number" || !Number.isInteger(value.variantNumber) || value.variantNumber < 1 || value.variantNumber > 100 || value.variantId !== `${definition.versionId}-study-v1-${value.variantNumber}`)) throw new Error("Invalid mock variant identity");
    if (value.answerFormatVersion !== undefined && value.answerFormatVersion !== 1) throw new Error("Unsupported mock answer format");
    const taskIds = value.taskIds as unknown[];
    if (new Set(taskIds).size !== taskIds.length || !taskIds.every((id, index) => typeof id === "string" && sessionBank.some((task) => task.id === id && usableTask(task, definition, true) && task.examNumber === definition.numbers[index].number))) throw new Error("Unavailable mock content");
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
    if (value.skippedTaskIds !== undefined && !Array.isArray(value.skippedTaskIds)) throw new Error("Invalid skipped task list");
    const skippedTaskIds = [...new Set((value.skippedTaskIds ?? []).filter((id): id is string => typeof id === "string" && taskIds.includes(id)))];
    const revealedTaskIds = [...new Set(value.revealedTaskIds.filter((id): id is string => typeof id === "string" && taskIds.includes(id)))];
    const publishedTaskIds = [...new Set(value.publishedTaskIds.filter((id): id is string => typeof id === "string" && taskIds.includes(id)))];
    let session: MockSession = { id: value.id, examVersionId: definition.versionId, taskIds: taskIds as string[], startedAt: value.startedAt, deadline: value.deadline,
      ...(value.variantNumber !== undefined ? { variantNumber: value.variantNumber as number, variantId: value.variantId as string } : {}),
      ...(value.answerFormatVersion === 1 ? { answerFormatVersion: 1 as const } : {}),
      durationMinutes,
      finishedAt: null, finishReason: null, position: typeof value.position === "number" && Number.isInteger(value.position) && value.position >= 0 && value.position < taskIds.length ? value.position : 0,
      answers, results: {}, selfScores: {}, revealedTaskIds: [], publishedTaskIds: [], skippedTaskIds };
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
