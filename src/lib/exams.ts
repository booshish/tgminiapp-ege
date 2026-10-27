import type { Exam } from "./navigation";
import { getExamNumberXPScoringRule } from "./exam-scores";
import { subjectExamDefinitions } from "./subject-models";
import type { SubjectId } from "./subjects";
export type { SubjectId } from "./subjects";

export type ExamLevel = "base" | "profile";
export type ExamSelection = {
  examType: Exam;
  subjectId?: SubjectId;
  level?: ExamLevel | null;
};
export type ExamPart = 1 | 2 | 3;
export type ExamNumberDefinition = {
  /** Official alternatives / oral numbering; number remains a stable internal slot. */
  officialLabels?: string[];
  section?: string;
  responseKind?: "numeric" | "word" | "selection" | "matching" | "sequence" | "essay" | "written" | "oral";
  generation?: { status: "editorial-review-required" | "resource-required" | "algorithm-ready"; subtypes: string[]; blockers: string[] };
  /** Explicit import contract, set only after reviewing the numbered source plan. */
  practiceAnswerFormat?: "number" | "text" | "extended";
  answerRuleTypes?: ("number" | "choices" | "text" | "self")[];
  evaluation?: { mode: "automatic" | "expert" | "experiment"; ordering?: "ordered" | "unordered"; note: string; criteriaUrl: string; criteriaPdfPage?: number; criteriaSection?: string };
  requiredResources?: string[];
  number: number;
  title: string;
  part: ExamPart;
  answerFormat: "short" | "extended";
  maxPrimaryScore: number | null;
  scoringStatus: "project-config" | "verified" | "not-configured";
  pendingReason?: string;
  sourceReference?: { url: string; pdfPage: number };
};
export type ExamDefinition = {
  sourceReview?: { scope: "numbered-specification"; canonicalArchiveVerified: false; criteriaComplete: false; reviewedAt: string; limitations: string[] };
  sessions?: { name: string; minutes: number }[];
  offeredTaskCount?: number;
  durationMinutes?: number;
  maxPrimaryScore?: number;
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
  verificationStatus: "not-verified-online" | "draft-source-reviewed";
  verificationNote: string;
};

const verificationNote =
  "Предварительная структура 2026 года. Балльная сетка задана в настройках проекта; онлайн-сверка ФИПИ недоступна. Соответствие структуре 2027 года не подтверждено. Это авторские учебные примеры, а не официальный банк.";
const ogeSource = {
  title: "ФИПИ: демоверсии, спецификации и кодификаторы ОГЭ",
  url: "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory",
};
const egeSource = {
  title: "ФИПИ: демоверсии, спецификации и кодификаторы ЕГЭ",
  url: "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory",
};

function numbers(
  examVersionId: string,
  count: number,
  firstPartEnd: number,
  labels: Record<number, string>,
): ExamNumberDefinition[] {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    title: labels[index + 1] ?? `Задание №${index + 1}`,
    part: index < firstPartEnd ? 1 : 2,
    answerFormat: index < firstPartEnd ? "short" : "extended",
    maxPrimaryScore: getExamNumberXPScoringRule(examVersionId, index + 1)?.maxPrimaryScore ?? null,
    scoringStatus: getExamNumberXPScoringRule(examVersionId, index + 1)?.status ?? "not-configured",
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
    numbers: numbers("oge-math-2026", 25, 19, {
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
    available: true,
    title: "ЕГЭ · Математика · Базовый уровень",
    numbers: numbers("ege-math-base-2026", 21, 21, {
      1: "Вычисления и единицы измерения",
      2: "Прикладные текстовые задачи и формулы",
      3: "Таблицы и диаграммы",
      4: "Вычисления в практических задачах",
      5: "Вероятность",
      6: "Таблицы, графики и выбор условий",
      7: "Функции, графики и производная",
      8: "Логика и рассуждения",
      9: "Прикладная планиметрия",
      10: "Планиметрия",
      11: "Стереометрия: объёмы и площади",
      12: "Планиметрия: отношения и теоремы",
      13: "Стереометрия: геометрические величины",
      14: "Числа и вычисления",
      15: "Проценты",
      16: "Преобразования выражений",
      17: "Уравнения",
      18: "Неравенства",
      19: "Целые числа и выбор метода",
      20: "Текстовые задачи и уравнения",
      21: "Логические текстовые задачи",
    }),
    sources: [egeSource, {
      title: "Копия спецификации ФИПИ 2026, база: печатные с. 7–12 (PDF с. 4–6)",
      url: "https://pro-schools.ru/fipi/ege/spec/2026/ma-11-ege-2026-spec-bazovyy.pdf",
    }],
    verificationStatus: "not-verified-online",
    verificationNote: "Учебный банк по структуре 2026 года: 21 краткий ответ, максимум 21 первичный балл, 180 минут. Структура сверена с доступной копией спецификации ФИПИ 2026 (печатные с. 7–12). Загруженные архивы не поступили; соответствие их содержимому и окончательной структуре 2027 года не подтверждено. Условия и решения — авторские.",
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
    numbers: numbers("ege-math-profile-2026", 19, 12, {
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
    return subjectExamDefinitions.find((entry) => entry.examType === selection.examType && entry.subjectId === selection.subjectId && selection.level == null);
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
