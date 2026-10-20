import type { VerifiedXPScoringRule } from "./gamification";
import type { Task } from "./tasks";

/** Add rules only after reading the cited official specification for this exam/year. */
export const verifiedXPScoringRules: readonly VerifiedXPScoringRule[] = [];

export function getTaskXPScoringRule(task: Task): VerifiedXPScoringRule | null {
  if (task.part !== 1 || task.examNumber === null) return null;
  return verifiedXPScoringRules.find((rule) =>
    rule.examVersionId === task.examVersionId &&
    rule.examType === task.examType[0] &&
    rule.level === task.level && rule.examNumber === task.examNumber,
  ) ?? null;
}
