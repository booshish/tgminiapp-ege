import type { Task } from "./tasks";
import type { XPScoringRule } from "./scoring-types";

export type { XPScoringRule } from "./scoring-types";

export const scoringConfigurationNote =
  "Сетка математики 2026 года задана в настройках проекта. Онлайн-сверка ФИПИ недоступна (403); это не подтверждение официального результата экзамена.";

/** Exact grid supplied in the project brief. No rules for unavailable subjects/versions. */
export const configuredXPScoringRules: readonly XPScoringRule[] = [
  ...Array.from({ length: 25 }, (_, index): XPScoringRule => {
    const number = index + 1;
    const part = number <= 19 ? 1 : 2;
    return {
      status: "project-config",
      ruleId: `oge-math-2026-${number}`,
      examVersionId: "oge-math-2026",
      examYear: 2026,
      subjectId: "math",
      examType: "ОГЭ",
      examNumber: number,
      level: null,
      part,
      answerFormat: part === 1 ? "short" : "extended",
      maxPrimaryScore: part === 1 ? 1 : 2,
      sourceUrl: "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory",
    };
  }),
  ...Array.from({ length: 19 }, (_, index): XPScoringRule => {
    const number = index + 1;
    const maxPrimaryScore = number <= 12 ? 1
      : number === 13 || number === 15 || number === 16 ? 2
        : number === 14 || number === 17 ? 3 : 4;
    return {
      status: "project-config",
      ruleId: `ege-math-profile-2026-${number}`,
      examVersionId: "ege-math-profile-2026",
      examYear: 2026,
      subjectId: "math",
      examType: "ЕГЭ",
      examNumber: number,
      level: "profile",
      part: number <= 12 ? 1 : 2,
      answerFormat: number <= 12 ? "short" : "extended",
      maxPrimaryScore,
      sourceUrl: "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory",
    };
  }),
  // Read from the 2026 specification copy, PDF p.5–6 (printed p.9–12).
  // Still project-config: uploaded archive identity and complete source review are pending.
  ...Array.from({ length: 21 }, (_, index): XPScoringRule => ({
    status: "project-config", ruleId: `ege-math-base-2026-${index + 1}`,
    examVersionId: "ege-math-base-2026", examYear: 2026,
    subjectId: "math", examType: "ЕГЭ", examNumber: index + 1,
    level: "base", part: 1, answerFormat: "short", maxPrimaryScore: 1,
    sourceUrl: "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory",
  })),
];

/** Kept separate so a configured grid cannot be mistaken for a completed source review. */
export const verifiedXPScoringRules = configuredXPScoringRules.filter(
  (rule) => rule.status === "verified",
);

export function getExamNumberXPScoringRule(
  examVersionId: string,
  number: number,
): XPScoringRule | null {
  return configuredXPScoringRules.find((rule) =>
    rule.examVersionId === examVersionId && rule.examNumber === number,
  ) ?? null;
}

export function getTaskXPScoringRule(task: Task): XPScoringRule | null {
  if (task.examNumber === null || task.part === null || task.availability === "history-only") return null;
  const rule = getExamNumberXPScoringRule(task.examVersionId, task.examNumber);
  if (!rule || rule.examYear !== task.examYear || rule.subjectId !== task.subjectId
    || rule.examType !== task.examType[0] || rule.level !== task.level
    || rule.part !== task.part
    || rule.answerFormat !== (task.answerFormat === "extended" ? "extended" : "short")) return null;
  return rule;
}
