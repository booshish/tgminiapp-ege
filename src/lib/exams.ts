import type { Exam } from "./navigation";

export type ExamLevel = "base" | "profile";
export type SubjectId = "math";
export type ExamSelection = {
  examType: Exam;
  subjectId?: SubjectId;
  level?: ExamLevel | null;
};
export type ExamNumberDefinition = { number: number; title: string };
export type ExamDefinition = {
  id: string;
  examType: Exam;
  subjectId: SubjectId;
  level: ExamLevel | null;
  year: number;
  title: string;
  numbers: ExamNumberDefinition[];
  sources: { title: string; url: string }[];
  verificationStatus: "not-verified-online";
  verificationNote: string;
};

const verificationNote =
  "Справочная структура 2026 года. Актуальная онлайн-сверка ФИПИ недоступна; соответствие структуре 2027 года не подтверждено. Это авторские учебные примеры, а не полный официальный банк.";
const ogeSource = {
  title: "ФИПИ: демоверсии, спецификации и кодификаторы ОГЭ",
  url: "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory",
};
const egeSource = {
  title: "ФИПИ: демоверсии, спецификации и кодификаторы ЕГЭ",
  url: "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory",
};

function numbers(count: number, labels: Record<number, string>) {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    title: labels[index + 1] ?? `Задание №${index + 1}`,
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
    title: "ОГЭ · Математика",
    numbers: numbers(25, {
      6: "Числовые вычисления",
      8: "Вычисления и преобразования",
      9: "Уравнения",
      10: "Вероятность",
      15: "Треугольники",
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
    title: "ЕГЭ · Математика · Базовый уровень",
    numbers: numbers(21, {
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
    title: "ЕГЭ · Математика · Профильный уровень",
    numbers: numbers(19, {
      1: "Планиметрия",
      4: "Простая вероятность",
      6: "Простейшие уравнения",
      7: "Вычисления и преобразования",
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
