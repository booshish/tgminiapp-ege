import type { Exam } from "./navigation";
import type { ExamLevel } from "./exams";
import { getPracticeTasks } from "./tasks";

export type CatalogSelection = {
  exam: Exam;
  subjectId: "math";
  level?: ExamLevel;
  mode: "number" | "topic";
  examNumber?: number;
  topicId?: string;
  prototypeId?: string;
};

export type PracticeTaskState = {
  answer: string;
  validationMessage: string;
  attempt: { id: string; correct: boolean } | null;
  solutionVisible: boolean;
  solutionViewed: boolean;
};

export type PracticeSession = {
  id: string;
  selection: CatalogSelection;
  taskIds: string[];
  lastPosition: number;
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
  return {
    exam,
    subjectId: "math",
    level:
      exam === "ЕГЭ"
        ? input.level === "base"
          ? "base"
          : "profile"
        : undefined,
    mode,
    examNumber:
      mode === "number" &&
      typeof input.examNumber === "number" &&
      Number.isInteger(input.examNumber) &&
      input.examNumber > 0 &&
      input.examNumber <= 99
        ? input.examNumber
        : undefined,
    topicId: mode === "topic" ? id(input.topicId) : undefined,
    prototypeId: id(input.prototypeId),
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
  });
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
