export const subjects = [
  ["math", "Математика"], ["russian", "Русский язык"], ["physics", "Физика"],
  ["chemistry", "Химия"], ["biology", "Биология"], ["geography", "География"],
  ["history", "История"], ["social-studies", "Обществознание"], ["informatics", "Информатика"],
  ["literature", "Литература"], ["english", "Английский язык"], ["german", "Немецкий язык"],
  ["french", "Французский язык"], ["spanish", "Испанский язык"], ["chinese", "Китайский язык"],
] as const;
export type SubjectId = typeof subjects[number][0];
export function isSubjectId(value: unknown): value is SubjectId {
  return subjects.some(([id]) => id === value);
}
export function getSubjects(exam: "ОГЭ" | "ЕГЭ") {
  return subjects.filter(([id]) => exam === "ЕГЭ" || id !== "chinese");
}
export function subjectTitle(id: SubjectId) {
  return subjects.find(([key]) => key === id)?.[1] ?? id;
}
