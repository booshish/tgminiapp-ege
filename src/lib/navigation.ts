export type Exam = "ЕГЭ" | "ОГЭ";
import type { ExamLevel } from "./exams";

export type View =
  | "home"
  | "catalog"
  | "tasks"
  | "theory"
  | "trainer"
  | "progress"
  | "profile"
  | "premium";

export type Selection = {
  taskIndex?: number;
  topicId?: string;
  prototypeId?: string;
  materialId?: string;
  exam?: Exam;
  subjectId?: "math";
  level?: ExamLevel;
  catalogMode?: "number" | "topic";
  examNumber?: number;
  sessionId?: string;
};
export type Route = Omit<Selection, "taskIndex"> & {
  view: View;
  taskIndex: number;
  invalidContext?: boolean;
};

export const viewTitles: Record<View, string> = {
  home: "Главная",
  catalog: "Задания",
  tasks: "Задания",
  theory: "Теория",
  trainer: "Мой тренер",
  progress: "Мои результаты",
  profile: "Мой профиль",
  premium: "Premium",
};

export function parseStudyRoute(hash: string, taskCount: number): Route {
  const [path, query] = hash.replace(/^#\/?/, "").split("?");
  const [view, index] = path.split("/");
  const params = new URLSearchParams(query);
  const taskIndex = Number(index);
  const exam = params.get("exam");
  const level = params.get("level");
  const mode = params.get("mode");
  const examNumber = Number(params.get("number"));
  const sessionId = params.get("session");
  const subject = params.get("subject");
  return {
    view: Object.hasOwn(viewTitles, view) ? (view as View) : "home",
    taskIndex:
      Number.isInteger(taskIndex) && taskIndex >= 0 && taskIndex < taskCount
        ? taskIndex
        : view === "tasks"
          ? -1
          : 0,
    topicId: params.get("topic") || undefined,
    prototypeId: params.get("prototype") || undefined,
    materialId: params.get("material") || undefined,
    invalidContext:
      (exam !== null && exam !== "ОГЭ" && exam !== "ЕГЭ") ||
      (subject !== null && subject !== "math") ||
      (level !== null && level !== "base" && level !== "profile") ||
      (exam === "ОГЭ" && level !== null) ||
      (mode !== null && mode !== "number" && mode !== "topic") ||
      (params.has("number") &&
        (!Number.isInteger(examNumber) ||
          examNumber <= 0 ||
          examNumber > 99)) ||
      [params.get("topic"), params.get("prototype")].some(
        (value) => value !== null && !/^[a-z0-9-]{1,100}$/.test(value),
      ),
    exam: exam === "ОГЭ" || exam === "ЕГЭ" ? exam : undefined,
    subjectId: params.get("subject") === "math" ? "math" : undefined,
    level: level === "base" || level === "profile" ? level : undefined,
    catalogMode: mode === "number" || mode === "topic" ? mode : undefined,
    examNumber:
      Number.isInteger(examNumber) && examNumber > 0 ? examNumber : undefined,
    sessionId:
      sessionId && /^[a-zA-Z0-9-]{1,100}$/.test(sessionId)
        ? sessionId
        : undefined,
  };
}
