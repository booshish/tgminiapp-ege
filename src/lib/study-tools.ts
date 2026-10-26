import type { LearningEvent, AnswerEvent } from "./learning-events";
import type { Task, Exam } from "./tasks";
import type { TheoryTopic } from "./theory";
import { getExamDefinition } from "./exams";

export const studyToolsStorageKey = "tochka-study-tools-v2";
export const legacyStudyToolsStorageKey = "tochka-study-tools-v1";
export type BookmarkKind = "task" | "theory";
export type BookmarkInput = { kind: BookmarkKind; itemId: string; examType: Exam };
export type Bookmark = BookmarkInput & { key: string; createdAt: string };
export type StudyToolsState = { version: 2; bookmarks: Bookmark[] };
export type StudyToolsCatalog = {
  tasks: readonly Task[]; topics: readonly TheoryTopic[];
  resolveTopic?: (id: string) => TheoryTopic | undefined;
};

export const reviewPolicy = {
  minimumIndependentTasks: 6,
  sampleSize: 6,
  advanceCorrect: 5,
  repeatWrong: 3,
  intervalsDays: [1, 3, 7, 14, 30],
} as const;

export function emptyStudyToolsState(): StudyToolsState {
  return { version: 2, bookmarks: [] };
}

export function bookmarkKey(kind: BookmarkKind, itemId: string): string {
  return `${kind}:${itemId}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isAvailableTask(task: Task): boolean {
  if (task.subjectId !== "math") return Boolean(getExamDefinition({examType:task.examType[0],subjectId:task.subjectId,level:task.level})?.available) && task.availability !== "history-only";
  return task.subjectId === "math" && task.availability !== "history-only" &&
    ((task.examType[0] === "ОГЭ" && task.level === null) ||
      (task.examType[0] === "ЕГЭ" && (task.level === "profile" || task.level === "base")));
}

export function resolveBookmark(input: BookmarkInput, catalog: StudyToolsCatalog) {
  if (input.kind === "task") {
    const task = catalog.tasks.find((item) => item.id === input.itemId);
    return task && isAvailableTask(task) && task.examType.includes(input.examType) ? task : undefined;
  }
  const topic = catalog.resolveTopic?.(input.itemId) ?? catalog.topics.find((item) => item.id === input.itemId);
  return topic && topic.examType.includes(input.examType) ? topic : undefined;
}

function validBookmark(value: unknown, catalog: StudyToolsCatalog): Bookmark | null {
  if (!isObject(value) || (value.kind !== "task" && value.kind !== "theory") ||
    typeof value.itemId !== "string" || value.itemId.length > 160 ||
    (value.examType !== "ОГЭ" && value.examType !== "ЕГЭ")) return null;
  const input: BookmarkInput = { kind: value.kind, itemId: value.itemId, examType: value.examType };
  const material = resolveBookmark(input, catalog);
  if (!material) return null;
  input.itemId = material.id;
  const createdAt = typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt))
    ? new Date(value.createdAt).toISOString() : "1970-01-01T00:00:00.000Z";
  return { ...input, key: bookmarkKey(input.kind, input.itemId), createdAt };
}

/** Initial reads are pure: invalid/old data is never automatically overwritten. */
export function parseStudyToolsState(raw: string | null, catalog: StudyToolsCatalog): StudyToolsState {
  if (!raw) return emptyStudyToolsState();
  try {
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || (value.version !== 1 && value.version !== 2)) return emptyStudyToolsState();
    const input = Array.isArray(value.bookmarks) ? value.bookmarks : [];
    const bookmarks = new Map<string, Bookmark>();
    for (const entry of input) {
      const bookmark = validBookmark(entry, catalog);
      if (bookmark && !bookmarks.has(bookmark.key)) bookmarks.set(bookmark.key, bookmark);
    }
    return { version: 2, bookmarks: [...bookmarks.values()] };
  } catch {
    return emptyStudyToolsState();
  }
}

export function canReadStudyToolsState(raw: string | null): boolean {
  if (!raw) return true;
  try {
    const value: unknown = JSON.parse(raw);
    return isObject(value) && (value.version === 1 || value.version === 2) && Array.isArray(value.bookmarks);
  } catch { return false; }
}

export function toggleBookmark(
  state: StudyToolsState, input: BookmarkInput, catalog: StudyToolsCatalog, now = new Date(),
): StudyToolsState {
  const material = resolveBookmark(input, catalog);
  if (!material || !Number.isFinite(now.getTime())) return state;
  const normalized = { ...input, itemId: material.id };
  const key = bookmarkKey(normalized.kind, normalized.itemId);
  const existing = state.bookmarks.some((item) => item.key === key);
  return { version: 2, bookmarks: existing
    ? state.bookmarks.filter((item) => item.key !== key)
    : [...state.bookmarks, { ...normalized, key, createdAt: now.toISOString() }] };
}

function orderedEvents(events: readonly LearningEvent[], bank: readonly Task[]) {
  const available = new Map(bank.filter(isAvailableTask).map((task) => [task.id, task]));
  const seen = new Set<string>();
  return events.filter((event) => {
    const task = available.get(event.taskId);
    if (!task || seen.has(event.id) || !Number.isFinite(Date.parse(event.createdAt)) ||
      event.examType !== task.examType[0] || event.subjectId !== task.subjectId ||
      event.topicId !== task.topicId || event.prototypeId !== task.prototypeId ||
      (event.examVersionId !== undefined && event.examVersionId !== task.examVersionId)) return false;
    seen.add(event.id);
    return true;
  }).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export type Mistake = { task: Task; lastWrongAt: string; corrected: boolean };

/** The Free exception: a manual list of actual mistakes, with no aggregate scores. */
export function getMistakes(events: readonly LearningEvent[], bank: readonly Task[]): Mistake[] {
  const result = new Map<string, Mistake>();
  const byId = new Map(bank.map((task) => [task.id, task]));
  for (const event of orderedEvents(events, bank)) {
    if (event.kind !== "answer_checked") continue;
    const task = byId.get(event.taskId)!;
    if (task.part === 2 || task.answerRule.type === "self") continue;
    if (!event.correct) result.set(task.id, { task, lastWrongAt: event.createdAt, corrected: false });
    else if (result.has(task.id)) result.set(task.id, { ...result.get(task.id)!, corrected: true });
  }
  return [...result.values()].sort((a, b) => Date.parse(b.lastWrongAt) - Date.parse(a.lastWrongAt));
}

/** One first, independent auto-check per variant; viewing/rechecking is not fresh evidence. */
export function independentAnswers(events: readonly LearningEvent[], bank: readonly Task[]): AnswerEvent[] {
  const byId = new Map(bank.map((task) => [task.id, task]));
  const attempted = new Set<string>();
  const solutions = new Set<string>();
  const result: AnswerEvent[] = [];
  for (const event of orderedEvents(events, bank)) {
    if (event.kind === "solution_viewed") { solutions.add(event.taskId); continue; }
    if (event.kind !== "answer_checked" || attempted.has(event.taskId)) continue;
    attempted.add(event.taskId);
    const task = byId.get(event.taskId)!;
    if (task.part === 1 && task.answerRule.type !== "self" && !solutions.has(task.id) && !event.solutionSeenBeforeCheck) {
      result.push(event);
    }
  }
  return result;
}

export function skillKey(task: Task): string {
  return `${task.examVersionId}:${task.subjectId}:${task.topicId}:${task.prototypeId}`;
}

function unseenTask(
  source: Task, bank: readonly Task[], seen: Set<string>, difficulty?: Task["difficulty"], samePrototypeOnly = false,
): Task | undefined {
  return bank.filter((task) => isAvailableTask(task) && task.part === 1 &&
    task.answerRule.type !== "self" && task.examVersionId === source.examVersionId &&
    task.subjectId === source.subjectId && task.topicId === source.topicId &&
    (!samePrototypeOnly || task.prototypeId === source.prototypeId) && !seen.has(task.id) && (!difficulty || task.difficulty === difficulty))
    .sort((a, b) => Number(b.prototypeId === source.prototypeId) - Number(a.prototypeId === source.prototypeId) || a.id.localeCompare(b.id))[0];
}

export type ReviewItem = {
  key: string; task: Task; nextTask?: Task; dueAt: string; intervalDays: number;
  independentCount: number; due: boolean;
};

/** Derived from the canonical learning events, so reloads cannot advance intervals twice. */
export function getReviewItems(
  events: readonly LearningEvent[], bank: readonly Task[], isPremium: boolean, now = new Date(),
): ReviewItem[] {
  if (!isPremium || !Number.isFinite(now.getTime())) return [];
  const byId = new Map(bank.map((task) => [task.id, task]));
  const groups = new Map<string, { task: Task; stage: number; dueAt: string; count: number }>();
  for (const event of independentAnswers(events, bank)) {
    const task = byId.get(event.taskId)!;
    const key = skillKey(task);
    const previous = groups.get(key);
    // A skill becomes a review item after an actual mistake, never a fabricated diagnosis.
    if (!previous && event.correct) continue;
    const stage = event.correct ? Math.min((previous?.stage ?? 0) + 1, reviewPolicy.intervalsDays.length - 1) : 0;
    const intervalDays = reviewPolicy.intervalsDays[stage];
    groups.set(key, { task, stage, count: (previous?.count ?? 0) + 1,
      dueAt: new Date(Date.parse(event.createdAt) + intervalDays * 86400000).toISOString() });
  }
  const seen = new Set(orderedEvents(events, bank).map((event) => event.taskId));
  return [...groups.entries()].map(([key, item]) => ({
    key, task: item.task, nextTask: unseenTask(item.task, bank, seen, undefined, true), dueAt: item.dueAt,
    intervalDays: reviewPolicy.intervalsDays[item.stage], independentCount: item.count,
    due: Date.parse(item.dueAt) <= now.getTime(),
  })).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt) || a.key.localeCompare(b.key));
}

export type DifficultyRecommendation = {
  key: string; kind: "advance" | "foundations"; topicId: string; task: Task; nextTask?: Task;
  theoryTopicId: string; sampleSize: number; correctCount: number;
};

/** Conservative local recommendations, never an exam prediction or a forced selection. */
export function getDifficultyRecommendations(
  events: readonly LearningEvent[], bank: readonly Task[], topics: readonly TheoryTopic[], isPremium: boolean,
): DifficultyRecommendation[] {
  if (!isPremium) return [];
  const byId = new Map(bank.map((task) => [task.id, task]));
  const groups = new Map<string, AnswerEvent[]>();
  for (const answer of independentAnswers(events, bank)) {
    const task = byId.get(answer.taskId)!;
    const key = `${task.examVersionId}:${task.subjectId}:${task.topicId}`;
    groups.set(key, [...(groups.get(key) ?? []), answer]);
  }
  const seen = new Set(orderedEvents(events, bank).map((event) => event.taskId));
  const recommendations: DifficultyRecommendation[] = [];
  for (const [key, answers] of groups) {
    if (answers.length < reviewPolicy.minimumIndependentTasks) continue;
    const sample = answers.slice(-reviewPolicy.sampleSize);
    const correctCount = sample.filter((answer) => answer.correct).length;
    const source = byId.get(sample[sample.length - 1].taskId)!;
    const topic = topics.find((item) => item.id === source.topicId);
    const rank = { foundation: 0, standard: 1, advanced: 2 };
    if (correctCount >= reviewPolicy.advanceCorrect) {
      const higher = bank.filter((task) => isAvailableTask(task) && task.answerRule.type !== "self" && task.topicId === source.topicId &&
        task.examVersionId === source.examVersionId && task.part === 1 && !seen.has(task.id) &&
        rank[task.difficulty] > Math.max(...sample.map((answer) => rank[byId.get(answer.taskId)!.difficulty])))
        .sort((a, b) => rank[a.difficulty] - rank[b.difficulty] || a.id.localeCompare(b.id))[0];
      if (higher) recommendations.push({ key, kind: "advance", topicId: source.topicId, task: source,
        nextTask: higher, theoryTopicId: source.topicId, sampleSize: sample.length, correctCount });
    } else if (sample.length - correctCount >= reviewPolicy.repeatWrong && topic) {
      const prerequisite = topic.prerequisites.find((id) => topics.some((item) => item.id === id));
      recommendations.push({ key, kind: "foundations", topicId: source.topicId, task: source,
        nextTask: unseenTask(source, bank, seen, "foundation") ?? unseenTask(source, bank, seen),
        theoryTopicId: prerequisite ?? topic.id, sampleSize: sample.length, correctCount });
    }
  }
  return recommendations;
}
