import type { Exam } from "./navigation";

export type ExamLevel = "base" | "profile";
export type SubjectId = "math";
export type ExamSelection = {
  examType: Exam;
  subjectId?: SubjectId;
  level?: ExamLevel | null;
};
export type ExamPart = 1 | 2;
export type ExamNumberDefinition = {
  number: number;
  title: string;
  part: ExamPart;
  answerFormat: "short" | "extended";
  /** No primary score is asserted until the versioned official specification is reviewed. */
  maxPrimaryScore: null;
};
export type ExamDefinition = {
  id: string;
  examType: Exam;
  subjectId: SubjectId;
  level: ExamLevel | null;
  year: number;
  versionId: string;
  available: boolean;
  availabilityNote?: string;
  title: string;
  numbers: ExamNumberDefinition[];
  sources: { title: string; url: string }[];
  verificationStatus: "not-verified-online";
  verificationNote: string;
};

const verificationNote =
  "Предварительная структура 2026 года. Онлайн-сверка ФИПИ недоступна; нумерация, баллы и соответствие структуре 2027 года не подтверждены. Это авторские учебные примеры, а не официальный банк.";
const ogeSource = {
  title: "ФИПИ: демоверсии, спецификации и кодификаторы ОГЭ",
  url: "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory",
};
const egeSource = {
  title: "ФИПИ: демоверсии, спецификации и кодификаторы ЕГЭ",
  url: "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory",
};

function numbers(
  count: number,
  firstPartEnd: number,
  labels: Record<number, string>,
): ExamNumberDefinition[] {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    title: labels[index + 1] ?? `Задание №${index + 1}`,
    part: index < firstPartEnd ? 1 : 2,
    answerFormat: index < firstPartEnd ? "short" : "extended",
    maxPrimaryScore: null,
  }));
}

/** Reference structure of 2026; no claim of a live official review or complete coverage. */
export const examDefinitions: ExamDefinition[] = [
  {
    id: "oge-math",
    examType: "ОГЭ",
    subjectId: "math",
    level: null,
    year: 2026,
    versionId: "oge-math-2026",
    available: true,
    title: "ОГЭ · Математика",
    numbers: numbers(25, 19, {
      1: "Практические задачи",
      2: "Практические задачи",
      3: "Практические задачи",
      4: "Практические задачи",
      5: "Практические задачи",
      6: "Числа и вычисления",
      7: "Числовые неравенства и координатная прямая",
      8: "Алгебраические выражения",
      9: "Уравнения",
      10: "Теория вероятностей",
      11: "Графики функций",
      12: "Вычисления по формулам",
      13: "Неравенства и их системы",
      14: "Прогрессии",
      15: "Треугольники",
      16: "Окружности",
      17: "Четырёхугольники",
      18: "Фигуры на клетчатой бумаге",
      19: "Геометрические утверждения",
      20: "Уравнения и неравенства",
      21: "Текстовые задачи",
      22: "Графики функций",
      23: "Геометрические задачи на вычисление",
      24: "Геометрические задачи на доказательство",
      25: "Геометрические задачи повышенной сложности",
    }),
    sources: [ogeSource],
    verificationStatus: "not-verified-online",
    verificationNote,
  },
  {
    id: "ege-math-base",
    examType: "ЕГЭ",
    subjectId: "math",
    level: "base",
    year: 2026,
    versionId: "ege-math-base-2026",
    available: false,
    availabilityNote:
      "Базовый уровень временно недоступен: сначала проверим структуру и подготовим проверенный контент. Старые локальные события сохраняются.",
    title: "ЕГЭ · Математика · Базовый уровень",
    numbers: numbers(21, 21, {
      5: "Вероятность",
      13: "Числовые вычисления",
      14: "Степени и корни",
      15: "Проценты",
      17: "Уравнения",
    }),
    sources: [egeSource],
    verificationStatus: "not-verified-online",
    verificationNote,
  },
  {
    id: "ege-math-profile",
    examType: "ЕГЭ",
    subjectId: "math",
    level: "profile",
    year: 2026,
    versionId: "ege-math-profile-2026",
    available: true,
    title: "ЕГЭ · Математика · Профильный уровень",
    numbers: numbers(19, 12, {
      1: "Планиметрия",
      2: "Векторы",
      3: "Стереометрия",
      4: "Теория вероятностей",
      5: "Теория вероятностей",
      6: "Уравнения",
      7: "Вычисления и преобразования",
      8: "Производная",
      9: "Прикладные задачи",
      10: "Текстовые задачи",
      11: "Функции и графики",
      12: "Исследование функций",
      13: "Уравнения",
      14: "Стереометрия",
      15: "Неравенства",
      16: "Экономические задачи",
      17: "Планиметрия",
      18: "Задачи с параметрами",
      19: "Теория чисел",
    }),
    sources: [egeSource],
    verificationStatus: "not-verified-online",
    verificationNote,
  },
];

export function getExamDefinition(
  selection: ExamSelection,
): ExamDefinition | undefined {
  if (selection.subjectId !== undefined && selection.subjectId !== "math")
    return undefined;
  const level =
    selection.examType === "ЕГЭ"
      ? selection.level === undefined
        ? "profile"
        : selection.level
      : (selection.level ?? null);
  return examDefinitions.find(
    (definition) =>
      definition.examType === selection.examType && definition.level === level,
  );
}

export function getExamLevelLabel(level: ExamLevel | null | undefined) {
  return level === "base" ? "Базовый уровень" : "Профильный уровень";
}

/** Keep unavailable versions in metadata for history; never offer them as active practice. */
export function getAvailableExamDefinitions(): ExamDefinition[] {
  return examDefinitions.filter((definition) => definition.available);
}
