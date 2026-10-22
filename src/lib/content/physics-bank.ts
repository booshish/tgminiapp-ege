import type { Task } from "../tasks";
import { originalPublication } from "./original-publication";
import { originalProvenance } from "./provenance";
import { physicsSource } from "../subject-models";

/** Independent original conditions; factual number mapping only, no demo text. */
const entries = [
  [1, "Тележка движется вдоль оси x. При t = 0 её координата 7 м, скорость −4 м/с, постоянное ускорение 2 м/с². Найдите координату тележки через 3 с, в метрах.", "4", "Проекция перемещения равна −4 · 3 + 2 · 3² / 2 = −3 м. Координата x = 7 − 3 = 4 м. Время остановки 2 с не мешает применению формулы: ускорение постоянно и после смены направления."],
  [2, "Ящик массой 6 кг скользит по горизонтальной поверхности. На него действует горизонтальная сила 27 Н вправо, сила трения скольжения равна 9 Н влево. Других горизонтальных сил нет. Найдите проекцию ускорения на ось, направленную вправо, в м/с².", "3", "Горизонтальная равнодействующая равна 27 − 9 = 18 Н. По второму закону Ньютона aₓ = 18/6 = 3 м/с². Вес и реакция опоры направлены вертикально и в горизонтальную сумму не входят."],
  [3, "Две небольшие тележки массами 2 и 3 кг движутся по одной прямой навстречу друг другу. Проекции их скоростей на одну ось: +5 и −1 м/с соответственно. При столкновении тележки сцепляются. Внешним импульсом можно пренебречь. Найдите проекцию их общей скорости в м/с.", "1.4", "Сохраняется суммарный импульс: 2 · 5 + 3 · (−1) = 7 кг·м/с. Общая масса 5 кг, поэтому vₓ = 7/5 = 1,4 м/с. Положительный знак указывает направление первой тележки; механическая энергия при сцеплении не сохраняется."],
  [4, "Лёгкий жёсткий рычаг находится в равновесии. Две силы направлены перпендикулярно рычагу и вращают его в противоположных направлениях. Сила 18 Н приложена на расстоянии 0,4 м от оси. На каком расстоянии от оси приложена сила 12 Н? Ответ дайте в метрах.", "0.6", "Моменты сил относительно оси равны: 18 · 0,4 = 12 · l. Поэтому l = 7,2/12 = 0,6 м. Сила реакции оси не создаёт момента относительно этой оси; собственным весом лёгкого рычага пренебрегаем."],
] as const;

export const physicsTasks: Task[] = entries.map(([number, prompt, answer, explanation]) => {
  const id = `ege-physics-2027-n${number}-original-r1`;
  return {
    id, subjectId: "physics", examType: ["ЕГЭ"], level: null, examNumber: number,
    examYear: 2027, examVersionId: "ege-physics-2027-draft", part: 1,
    topicId: `ege-physics-n${number}`, prototypeId: `ege-physics-n${number}-original`,
    title: ["Координата после смены направления", "Равнодействующая с трением", "Сцепление тележек", "Плечо силы"][number-1],
    prompt, answerDisplay: answer.replace(".", ","), answerRule: { type: "number", value: answer },
    answerFormat: "number", difficulty: "standard", solution: [{ text: explanation }],
    source: { kind: "author", label: "Оригинальная тренировка · проект ЕГЭ 2027", revision: 1 },
    requirementsReference: { url: physicsSource, pdfPage: 2, year: 2027, status: "draft-copy-reviewed" },
    provenance: originalProvenance("original-individual-task"), publication: originalPublication(id, "physics-bank"),
    scoring: { status: "pending-official-verification", maxPrimaryScore: 1 },
  };
});
export const physicsPrototypes = physicsTasks.map(task => ({ id: task.prototypeId, topicId: task.topicId, title: task.title }));
