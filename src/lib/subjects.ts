export const subjects = [
  ["math", "Математика"], ["russian", "Русский язык"], ["physics", "Физика"],
  ["chemistry", "Химия"], ["biology", "Биология"], ["geography", "География"],
  ["history", "История"], ["social-studies", "Обществознание"], ["informatics", "Информатика"],
  ["literature", "Литература"], ["english", "Английский язык"], ["german", "Немецкий язык"],
  ["french", "Французский язык"], ["spanish", "Испанский язык"], ["chinese", "Китайский язык"],
] as const;
export type SubjectId = typeof subjects[number][0];
export type DirectionStatus = "active" | "planned" | "hidden";
/** Editorial policy, independent of student availability and entitlements.
 * Resume only after a separate explicit product decision. No CLI bypass. */
export const contentExpansionPauses: Readonly<Record<string, string>> = {
  "ege-math-profile": "Пополнение приостановлено по решению владельца; существующий банк остаётся доступным",
};
export function assertContentExpansionAllowed(modelId: string) {
  if (contentExpansionPauses[modelId]) throw Error(`Content expansion paused: ${modelId}. ${contentExpansionPauses[modelId]}`);
}
export function isContentExpansionPaused(modelId: string) {
  return Boolean(contentExpansionPauses[modelId]);
}
/** Product availability only; never a claim of content completeness or an entitlement. */
export function directionStatus(exam: "ОГЭ" | "ЕГЭ", subject: string): DirectionStatus {
  const active = exam === "ОГЭ"
    ? ["math", "russian", "informatics", "biology", "chemistry", "social-studies"]
    : ["math", "russian", "informatics"];
  if (active.includes(subject)) return "active";
  return exam === "ЕГЭ" && ["chemistry", "biology", "history"].includes(subject) ? "planned" : "hidden";
}
export function isActiveSubject(exam: "ОГЭ" | "ЕГЭ", subject: string) {
  return directionStatus(exam, subject) === "active";
}
export function getActiveSubjects(exam: "ОГЭ" | "ЕГЭ") {
  return getSubjects(exam).filter(([id]) => isActiveSubject(exam, id));
}
export function isSubjectId(value: unknown): value is SubjectId {
  return subjects.some(([id]) => id === value);
}
export function getSubjects(exam: "ОГЭ" | "ЕГЭ") {
  return subjects.filter(([id]) => exam === "ЕГЭ" || id !== "chinese");
}
export function subjectTitle(id: SubjectId) {
  return subjects.find(([key]) => key === id)?.[1] ?? id;
}
