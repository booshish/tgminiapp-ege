export type Exam = "ЕГЭ" | "ОГЭ";
import type { ExamLevel } from "./exams";
import { isSubjectId, type SubjectId } from "./subjects";
import { taxonomyFilterKeys, type TaxonomyFilters } from "./task-taxonomy";

export type View =
  | "home"
  | "catalog"
  | "tasks"
  | "theory"
  | "trainer"
  | "progress"
  | "profile"
  | "premium"
  | "help"
  | "favorites"
  | "mistakes"
  | "review"
  | "mock";

export type Selection = TaxonomyFilters & {
  taskIndex?: number;
  taskId?: string;
  part?: 1 | 2 | 3;
  topicId?: string;
  prototypeId?: string;
  materialId?: string;
  exam?: Exam;
  subjectId?: SubjectId;
  level?: ExamLevel;
  catalogMode?: "number" | "topic";
  examNumber?: number;
  sessionId?: string;
  bookmarkKind?: "task" | "theory";
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
  premium: "Точка Плюс",
  help: "Помощь и объяснения",
  favorites: "Избранное",
  mistakes: "Мои ошибки",
  review: "Мой тренер · Повторение",
  mock: "Учебный вариант",
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
  const taskId = params.get("task");
  const part = params.get("part");
  const bookmarkKind = params.get("kind");
  return {
    view: Object.hasOwn(viewTitles, view) ? (view as View) : "home",
    taskIndex:
      Number.isInteger(taskIndex) && taskIndex >= 0 && taskIndex < taskCount
        ? taskIndex
        : view === "tasks"
          ? -1
          : 0,
    topicId: params.get("topic") || undefined,
    ...(taskId && /^[a-z0-9-]{1,160}$/.test(taskId) ? { taskId } : {}),
    ...(part === "1" || part === "2" || part === "3" ? { part: Number(part) as 1 | 2 | 3 } : {}),
    ...(view === "favorites" && (bookmarkKind === "task" || bookmarkKind === "theory") ? { bookmarkKind } : {}),
    prototypeId: params.get("prototype") || undefined,
    ...Object.fromEntries(taxonomyFilterKeys.filter(key=>params.has(key)).map(key=>[key,params.get(key)||undefined])),
    materialId: params.get("material") || undefined,
    invalidContext:
      taxonomyFilterKeys.some(key=>params.has(key)&&!/^[a-z0-9-]{1,100}$/.test(params.get(key)??"")) ||
      (exam !== null && exam !== "ОГЭ" && exam !== "ЕГЭ") ||
      (subject !== null && (!isSubjectId(subject) || (exam === "ОГЭ" && subject === "chinese"))) ||
      (subject !== null && subject !== "math" && level !== null) ||
      (taskId !== null && !/^[a-z0-9-]{1,160}$/.test(taskId)) ||
      (part !== null && part !== "1" && part !== "2" && part !== "3") ||
      (part === "3" && !(exam === "ОГЭ" && subject === "russian")) ||
      (level !== null && level !== "base" && level !== "profile") ||
      (exam === "ОГЭ" && level !== null) ||
      (mode !== null && mode !== "number" && mode !== "topic") ||
      (mode === "number" && params.has("topic")) ||
      (mode === "topic" && params.has("number")) ||
      (params.has("number") && params.has("topic")) ||
      (params.has("number") &&
        (!Number.isInteger(examNumber) ||
          examNumber <= 0 ||
          examNumber > 99)) ||
      [params.get("topic"), params.get("prototype")].some(
        (value) => value !== null && !/^[a-z0-9-]{1,100}$/.test(value),
      ),
    exam: exam === "ОГЭ" || exam === "ЕГЭ" ? exam : undefined,
    subjectId: isSubjectId(subject) ? subject : undefined,
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
