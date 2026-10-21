import type { Exam } from "./navigation";
import type { ExamLevel } from "./exams";
import { getExamDefinition } from "./exams";
import { getPracticeTasks } from "./tasks";

export type CatalogSelection = {
  exam: Exam;
  subjectId: "math";
  level?: ExamLevel;
  mode: "number" | "topic";
  examNumber?: number;
  topicId?: string;
  prototypeId?: string;
  part?: 1 | 2;
};

export type PracticeTaskState = {
  answer: string;
  validationMessage: string;
  attempt: { id: string; correct: boolean } | null;
  solutionVisible: boolean;
  solutionViewed: boolean;
  /** Extended-response drafts never represent an automatically checked result. */
  selfSolutionVisible?: boolean;
  selfDraftScore?: number;
  selfWork?: string;
};

export type PracticeSession = {
  id: string;
  selection: CatalogSelection;
  taskIds: string[];
  lastPosition: number;
  /** Stable identity survives reordering of the task bank. */
  lastTaskId?: string;
  /** Monotonic local visit order; not a wall-clock timestamp. */
  visitOrder?: number;
  states: Record<string, PracticeTaskState>;
  invalidContext?: boolean;
};

export function emptyTaskState(): PracticeTaskState {
  return {
    answer: "",
    validationMessage: "",
    attempt: null,
    solutionVisible: false,
    solutionViewed: false,
  };
}

export function defaultCatalogSelection(exam: Exam = "ЕГЭ"): CatalogSelection {
  return {
    exam,
    subjectId: "math",
    level: exam === "ЕГЭ" ? "profile" : undefined,
    mode: "number",
  };
}

export function normalizeCatalogSelection(
  value: unknown,
  fallbackExam: Exam = "ЕГЭ",
): CatalogSelection {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const exam =
    input.exam === "ОГЭ" || input.exam === "ЕГЭ" ? input.exam : fallbackExam;
  const mode = input.mode === "topic" ? "topic" : "number";
  const id = (candidate: unknown) =>
    typeof candidate === "string" && /^[a-z0-9-]{1,100}$/.test(candidate)
      ? candidate
      : undefined;
  const level = exam === "ЕГЭ" ? input.level === "base" ? "base" : "profile" : undefined;
  const examNumber = mode === "number" && typeof input.examNumber === "number" && Number.isInteger(input.examNumber)
    && input.examNumber > 0 && input.examNumber <= 99 ? input.examNumber : undefined;
  const part = examNumber ? getExamDefinition({ examType: exam, level })?.numbers.find((entry) => entry.number === examNumber)?.part
    : input.part === 1 || input.part === 2 ? input.part : undefined;
  return {
    exam,
    subjectId: "math",
    level,
    mode,
    examNumber,
    topicId: mode === "topic" ? id(input.topicId) : undefined,
    prototypeId: id(input.prototypeId),
    ...(part ? { part } : {}),
  };
}

/** Selecting a card does not alter list geometry or its scroll identity. */
export function catalogListKey(selection: CatalogSelection): string {
  return [
    selection.exam,
    selection.subjectId,
    selection.level ?? "",
    selection.mode,
    selection.prototypeId ?? "",
  ].join(":");
}

export function practiceTasks(selection: CatalogSelection) {
  return getPracticeTasks({
    examType: selection.exam,
    subjectId: selection.subjectId,
    level: selection.level,
    examNumber: selection.mode === "number" ? selection.examNumber : undefined,
    topicId: selection.mode === "topic" ? selection.topicId : undefined,
    prototypeId: selection.prototypeId,
  }).filter((task) => !selection.part || task.part === selection.part);
}

/** Number parts come from the current exam definition, never from a global index. */
export function practiceContextKey(selection: CatalogSelection): string {
  const definition = getExamDefinition({ examType: selection.exam, subjectId: selection.subjectId, level: selection.level });
  const part = selection.part ?? (selection.mode === "number" && selection.examNumber
    ? definition?.numbers.find((entry) => entry.number === selection.examNumber)?.part : undefined);
  return JSON.stringify([selection.exam, selection.subjectId, selection.level ?? null, part ?? null,
    selection.mode, selection.mode === "number" ? selection.examNumber ?? null : selection.topicId ?? null,
    selection.prototypeId ?? null]);
}

export function getSessionTaskId(session: PracticeSession): string | undefined {
  if (session.lastTaskId && session.taskIds.includes(session.lastTaskId)) return session.lastTaskId;
  return session.taskIds[Math.max(0, Math.min(session.lastPosition, session.taskIds.length - 1))];
}

export function findRecentPracticeSession(
  sessions: Record<string, PracticeSession>, selection: CatalogSelection, exactContext = false, preferredId?: string | null,
): PracticeSession | undefined {
  const matches = Object.values(sessions).filter((candidate) => !candidate.invalidContext && getSessionTaskId(candidate)
    && candidate.selection.exam === selection.exam && candidate.selection.subjectId === selection.subjectId
    && candidate.selection.level === selection.level
    && (!exactContext || practiceContextKey(candidate.selection) === practiceContextKey(selection)));
  const preferred = matches.find((candidate) => candidate.id === preferredId);
  if (preferred) return preferred;
  return matches.map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => (b.candidate.visitOrder ?? 0) - (a.candidate.visitOrder ?? 0) || b.index - a.index)[0]?.candidate;
}

export function rememberPracticePosition(session: PracticeSession, taskId: string, visitOrder: number): PracticeSession {
  const position = session.taskIds.indexOf(taskId);
  return position < 0 ? session : { ...session, lastTaskId: taskId, lastPosition: position, visitOrder };
}

export function createPracticeSession(
  id: string,
  selection: CatalogSelection,
  initialTaskId?: string,
): PracticeSession {
  const taskIds = practiceTasks(selection).map((task) => task.id);
  const index = initialTaskId ? taskIds.indexOf(initialTaskId) : 0;
  return {
    id,
    selection: { ...selection },
    taskIds,
    lastPosition: Math.max(0, index),
    states: {},
  };
}

export function updateSessionTask(
  session: PracticeSession,
  taskId: string,
  state: PracticeTaskState,
): PracticeSession {
  if (!session.taskIds.includes(taskId)) return session;
  return { ...session, states: { ...session.states, [taskId]: state } };
}
