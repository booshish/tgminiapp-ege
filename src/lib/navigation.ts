export type Exam = "ЕГЭ" | "ОГЭ";

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
};
export type Route = {
  view: View;
  taskIndex: number;
  topicId?: string;
  prototypeId?: string;
  materialId?: string;
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
