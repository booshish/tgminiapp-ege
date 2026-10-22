import type { Task } from "../tasks";
import { originalPublication } from "./original-publication";
import { originalProvenance } from "./provenance";
import { russianSources, russianTitles } from "./russian-model";
import { ogeRussianEntries } from "./russian-oge";
import { egeRussianEntries } from "./russian-ege";
import { russianPack2 } from "./russian-pack2";

export type RussianEntry = {
  number: number; slug: string; prompt: string; answer: string; explanation: string;
  mode?: "word" | "ordered" | "choices";
  passage?: { id: string; sentences: string[] };
  references?: number[];
};
// Append after all previously shipped entries: historical IDs and indices stay stable.
export const russianTasks: Task[] = [
  ...ogeRussianEntries.map(entry => ({ exam: "ОГЭ" as const, entry })),
  ...egeRussianEntries.map(entry => ({ exam: "ЕГЭ" as const, entry })),
  ...russianPack2,
].map(({ exam, entry }) => {
    const id = `${exam === "ОГЭ" ? "oge" : "ege"}-russian-2027-n${entry.number}-${entry.slug}-r1`;
    const passage = entry.passage ? entry.passage.sentences.map((sentence,i) => `(${i+1}) ${sentence}`).join("\n") + "\n\n" : "";
    const instruction = entry.mode === "word" ? "Запишите ответ без пробелов, кавычек и дополнительных знаков." : entry.mode === "ordered" ? "Запишите цифры подряд в порядке букв. В практике проверяется весь ответ, без частичных экзаменационных баллов." : "Запишите номера правильных ответов подряд, без пробелов и повторов; порядок номеров не важен.";
    return {
      id, subjectId: "russian", examType: [exam], level: null,
      examNumber: entry.number, examYear: 2027, examVersionId: `${exam === "ОГЭ" ? "oge" : "ege"}-russian-2027-draft`,
      part: exam === "ОГЭ" ? 2 : 1, topicId: `${exam === "ОГЭ" ? "oge" : "ege"}-russian-n${entry.number}`,
      prototypeId: `${exam === "ОГЭ" ? "oge" : "ege"}-russian-n${entry.number}-${entry.slug}`,
      title: russianTitles[exam][entry.number-1],
      prompt: passage + entry.prompt + "\n\n" + instruction,
      answerRule: entry.mode === "word" ? { type: "text" as const, value: entry.answer, caseInsensitive: true } : { type: "choices" as const, value: entry.answer, ordered: entry.mode === "ordered" },
      answerFormat: "text", answerDisplay: entry.answer, difficulty: [8,20,21,22].includes(entry.number) && exam === "ЕГЭ" ? "advanced" : "standard",
      solution: [{ text: entry.explanation }],
      ...(entry.passage ? { sharedConditionId: entry.passage.id } : {}),
      requirementsReference: { url: russianSources[exam], pdfPage: exam === "ОГЭ" ? 7 : 9, year: 2027, status: "draft-copy-reviewed" },
      source: { kind: "author", label: "Оригинальная практика · PDF-копия проекта требований 2027", revision: 1 },
      provenance: originalProvenance("original-individual-task"), publication: originalPublication(id, "russian-bank"),
      scoring: { status: "pending-official-verification", maxPrimaryScore: exam === "ЕГЭ" && [8,22].includes(entry.number) ? 2 : 1 },
    };
});
export const russianPrototypes = russianTasks.map(task => ({ id: task.prototypeId, topicId: task.topicId, title: task.title }));
