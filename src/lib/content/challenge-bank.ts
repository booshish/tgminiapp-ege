import type { Task } from "../tasks";
import { makeOriginalTask } from "./task-factory";

/** Higher demand comes from extra reasoning steps, not merely larger numbers.
 * Difficulty is an author judgement pending pedagogical calibration. */
export const challengePrototypes = [
  { id: "oge-6-multi-step-fractions", topicId: "oge-number-6", title: "Дроби: скобки и несколько действий" },
  { id: "oge-9-rational-domain", topicId: "oge-number-9", title: "Рациональное уравнение и исключённый корень" },
  { id: "ege-6-logarithm-domain", topicId: "ege-profile-number-6", title: "Сумма логарифмов и область определения" },
  { id: "ege-7-conjugate-fractions", topicId: "ege-profile-number-7", title: "Сопряжённые выражения и отрицательная степень" },
];
export const challengeTasks: Task[] = [];
export const challengeGeneratorCases: {
  taskId: string;
  family: string;
  parameters: Record<string, number>;
}[] = [];
const latex = String.raw;
const decimal = (n: number) => String(n).replace(".", ",");
function add(
  prototype: typeof challengePrototypes[number],
  variant: number,
  data: Pick<Task, "prompt" | "conditionLatex" | "solution" | "answerDisplay">,
  value: string,
  parameters: Record<string, number>,
) {
  const oge = prototype.id.startsWith("oge-");
  const number = Number(prototype.id.split("-")[1]);
  const id = `${prototype.id}-v1-${variant}`;
  const task = makeOriginalTask({
    id, topicId: prototype.topicId, prototypeId: prototype.id,
    examType: [oge ? "ОГЭ" : "ЕГЭ"], level: oge ? null : "profile", examNumber: number,
    difficulty: "advanced", title: prototype.title,
    ...data, answerRule: { type: "number", value },
  });
  challengeTasks.push({ ...task, source: {
    ...task.source,
    label: "Авторское задание · повышенная сложность, предварительная оценка без калибровки",
  } });
  challengeGeneratorCases.push({ taskId: id, family: prototype.id, parameters });
}

for (let k = 1; k <= 3; k += 1) {
  const numerator = 7 * k + 8;
  add(challengePrototypes[0], k, {
    prompt: "Найдите значение выражения.",
    conditionLatex: latex`\left(\frac{${k}}2+\frac13\right):\frac56-\frac{${k}}4`,
    answerDisplay: decimal(numerator / 20),
    solution: [
      { text: "Сначала сложим дроби в скобках, приведя их к знаменателю 6.", latex: latex`\frac{${k}}2+\frac13=\frac{${3 * k + 2}}6` },
      { text: "Деление на дробь заменим умножением на обратную ей. После сокращения получим:", latex: latex`\frac{${3 * k + 2}}6:\frac56=\frac{${3 * k + 2}}6\cdot\frac65=\frac{${3 * k + 2}}5` },
      { text: "Последнее вычитание выполним с общим знаменателем 20.", latex: latex`\frac{${3 * k + 2}}5-\frac{${k}}4=\frac{${4 * (3 * k + 2)}-${5 * k}}{20}=\frac{${numerator}}{20}=${decimal(numerator / 20)}` },
    ],
  }, `${numerator}/20`, { k });

  const forbidden = k + 1, accepted = 2 * k + 5, sum = forbidden + accepted, product = forbidden * accepted;
  add(challengePrototypes[1], k, {
    prompt: "Решите уравнение.",
    conditionLatex: latex`\frac{x^2-${sum}x+${product}}{x-${forbidden}}=0`,
    answerDisplay: String(accepted),
    solution: [
      { text: "Дробь определена, только когда знаменатель не равен нулю.", latex: latex`x\ne${forbidden}` },
      { text: "Дробь равна нулю, когда её числитель равен нулю, а знаменатель отличен от нуля.", latex: latex`x^2-${sum}x+${product}=(x-${forbidden})(x-${accepted})=0` },
      { text: `Получены кандидаты ${forbidden} и ${accepted}. Первый запрещён областью определения.`, latex: latex`x=${accepted},\qquad ${accepted}-${forbidden}=${accepted - forbidden}\ne0` },
    ],
  }, String(accepted), { forbidden, sum, product });

  const firstShift = k, secondShift = k + 2, argument = (k + 4) * (k + 2), validRoot = 2 * k + 4;
  add(challengePrototypes[2], k, {
    prompt: "Решите уравнение.",
    conditionLatex: latex`\log_2(x-${firstShift})+\log_2(x-${secondShift})=\log_2${argument}`,
    answerDisplay: String(validRoot),
    solution: [
      { text: "Каждый аргумент логарифма должен быть положительным. Пересечём ограничения.", latex: latex`x>${firstShift},\quad x>${secondShift}\quad\Rightarrow\quad x>${secondShift}` },
      { text: "В области определения сумма логарифмов равна логарифму произведения. Логарифмическая функция с основанием 2 возрастает, поэтому её аргументы равны.", latex: latex`(x-${firstShift})(x-${secondShift})=${argument}` },
      { text: "Перенесём всё в одну сторону и разложим квадратный трёхчлен.", latex: latex`x^2-${firstShift + secondShift}x-${2 * validRoot}=(x-${validRoot})(x+2)=0` },
      { text: `Из корней ${validRoot} и −2 только ${validRoot} удовлетворяет x > ${secondShift}.`, latex: latex`x=${validRoot}` },
    ],
  }, String(validRoot), { firstShift, secondShift, argument });

  const firstRadicand = k + 3, secondRadicand = k + 1;
  const rationalPart = firstRadicand + secondRadicand, powerPart = 2 ** k;
  add(challengePrototypes[3], k, {
    prompt: "Найдите значение выражения.",
    conditionLatex: latex`\frac{\sqrt{${firstRadicand}}+\sqrt{${secondRadicand}}}{\sqrt{${firstRadicand}}-\sqrt{${secondRadicand}}}+\frac{\sqrt{${firstRadicand}}-\sqrt{${secondRadicand}}}{\sqrt{${firstRadicand}}+\sqrt{${secondRadicand}}}+\left(\frac12\right)^{-${k}}`,
    answerDisplay: String(rationalPart + powerPart),
    solution: [
      { text: "Оба знаменателя отличны от нуля: подкоренные числа положительны и различны. Приведём две дроби к общему знаменателю — произведению сопряжённых выражений.", latex: latex`(\sqrt{${firstRadicand}}-\sqrt{${secondRadicand}})(\sqrt{${firstRadicand}}+\sqrt{${secondRadicand}})=${firstRadicand}-${secondRadicand}=2` },
      { text: "В числителе складываются квадрат суммы и квадрат разности. Слагаемые с корнем сокращаются.", latex: latex`\frac{(\sqrt{${firstRadicand}}+\sqrt{${secondRadicand}})^2+(\sqrt{${firstRadicand}}-\sqrt{${secondRadicand}})^2}{2}=\frac{2(${firstRadicand}+${secondRadicand})}{2}=${rationalPart}` },
      { text: "Отрицательный показатель обращает основание дроби. Затем сложим результаты.", latex: latex`\left(\frac12\right)^{-${k}}=2^{${k}}=${powerPart},\qquad ${rationalPart}+${powerPart}=${rationalPart + powerPart}` },
    ],
  }, String(rationalPart + powerPart), { firstRadicand, secondRadicand, exponent: k });
}
