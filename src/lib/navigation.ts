export type Exam = "ЕГЭ" | "ОГЭ";

export type View =
  "home" | "catalog" | "tasks" | "theory" | "trainer" | "progress" | "profile";

export type Route = { view: View; taskIndex: number };

export const viewTitles: Record<View, string> = {
  home: "Главная",
  catalog: "Каталог",
  tasks: "Практика",
  theory: "Теория",
  trainer: "Персональный тренер",
  progress: "Мой прогресс",
  profile: "Профиль",
};
