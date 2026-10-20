import type { Exam } from "./navigation";
import { getExamDefinition, type ExamLevel } from "./exams";

export type { Exam } from "./navigation";
export type SubjectId = "math";
export type AnswerRule =
  { type: "number"; value: string } | { type: "set"; values: string[] };

export type Task = {
  id: string;
  topicId: string;
  prototypeId: string;
  examType: [Exam];
  subjectId: SubjectId;
  level: ExamLevel | null;
  examNumber: number | null;
  examYear: number;
  /** Historical event compatibility only; never used for selecting tasks. */
  legacyExamTypes?: Exam[];
  title: string;
  prompt: string;
  conditionLatex?: string;
  diagram?: { type: "right-triangle"; adjacent: number; opposite: number };
  answerRule: AnswerRule;
  solution: { text: string; latex?: string }[];
  answerDisplay: string;
};

export const prototypes = [
  {
    id: "fraction-arithmetic",
    topicId: "fractions",
    title: "Сложение и вычитание дробей",
  },
  {
    id: "decimal-arithmetic",
    topicId: "decimals",
    title: "Действия с десятичными дробями",
  },
  {
    id: "percentage-price",
    topicId: "percentages",
    title: "Проценты и изменение цены",
  },
  {
    id: "linear-basic",
    topicId: "linear-equations",
    title: "Линейные уравнения",
  },
  {
    id: "quadratic-roots",
    topicId: "quadratic-equations",
    title: "Корни квадратного уравнения",
  },
  {
    id: "powers-and-roots",
    topicId: "powers-roots",
    title: "Степени и квадратные корни",
  },
  {
    id: "triangle-sine",
    topicId: "geometry",
    title: "Синус в прямоугольном треугольнике",
  },
  {
    id: "exponential-equation",
    topicId: "powers-roots",
    title: "Простейшие показательные уравнения",
  },
  {
    id: "classical-probability",
    topicId: "probability",
    title: "Равновозможные исходы",
  },
];

function defineTask(data: Omit<Task, "subjectId" | "examYear">): Task {
  return { ...data, subjectId: "math", examYear: 2026 };
}

/** Author-written examples. Original 24 IDs and indexes stay stable for old local records. */
export const tasks: Task[] = [
  defineTask({
    id: "triangle-sine",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 15,
    legacyExamTypes: ["ОГЭ", "ЕГЭ"],
    topicId: "geometry",
    prototypeId: "triangle-sine",
    title: "Синус острого угла",
    prompt:
      "В прямоугольном треугольнике ABC угол B равен 90°, AB = 6, BC = 8. Найдите sin A.",
    diagram: { type: "right-triangle", adjacent: 6, opposite: 8 },
    answerRule: { type: "number", value: "4/5" },
    answerDisplay: "0,8",
    solution: [
      {
        text: "Найдём гипотенузу по теореме Пифагора.",
        latex: "AC=\\sqrt{6^2+8^2}=10",
      },
      {
        text: "Напротив угла A лежит катет BC. Синус — отношение противолежащего катета к гипотенузе.",
        latex: "\\sin A=\\frac{BC}{AC}=\\frac{8}{10}=0{,}8",
      },
    ],
  }),
  defineTask({
    id: "linear-equation",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 9,
    legacyExamTypes: ["ОГЭ", "ЕГЭ"],
    topicId: "linear-equations",
    prototypeId: "linear-basic",
    title: "Найдите неизвестное",
    prompt: "Решите уравнение. Запишите значение x.",
    conditionLatex: "3x-7=11",
    answerRule: { type: "number", value: "6" },
    answerDisplay: "6",
    solution: [
      { text: "Прибавим 7 к обеим частям уравнения.", latex: "3x=18" },
      { text: "Разделим обе части на 3.", latex: "x=6" },
      { text: "Проверим подстановкой.", latex: "3\\cdot6-7=11" },
    ],
  }),
  defineTask({
    id: "fraction-addition",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 6,
    legacyExamTypes: ["ОГЭ", "ЕГЭ"],
    topicId: "fractions",
    prototypeId: "fraction-arithmetic",
    title: "Сложение дробей",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\frac14+\\frac38",
    answerRule: { type: "number", value: "5/8" },
    answerDisplay: "0,625",
    solution: [
      {
        text: "Приведём дроби к общему знаменателю 8.",
        latex: "\\frac14=\\frac28",
      },
      {
        text: "Сложим числители, сохранив знаменатель.",
        latex: "\\frac28+\\frac38=\\frac58=0{,}625",
      },
    ],
  }),
  defineTask({
    id: "probability-balls",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 10,
    legacyExamTypes: ["ОГЭ", "ЕГЭ"],
    topicId: "probability",
    prototypeId: "classical-probability",
    title: "Случайный выбор",
    prompt:
      "В мешке 3 зелёных и 7 белых шаров, одинаковых на ощупь. Наугад вынимают один шар. Найдите вероятность того, что он зелёный.",
    answerRule: { type: "number", value: "3/10" },
    answerDisplay: "0,3",
    solution: [
      { text: "Всего 10 равновозможных исходов: 3 зелёных и 7 белых шаров." },
      {
        text: "Благоприятных исходов 3. Разделим их число на число всех исходов.",
        latex: "P=\\frac{3}{10}=0{,}3",
      },
    ],
  }),
  defineTask({
    id: "percentage-discount",
    examType: ["ОГЭ"],
    level: null,
    examNumber: null,
    legacyExamTypes: ["ОГЭ", "ЕГЭ"],
    topicId: "percentages",
    prototypeId: "percentage-price",
    title: "Цена со скидкой",
    prompt:
      "Тетрадь стоила 200 рублей. Магазин снизил цену на 15%. Сколько рублей теперь стоит тетрадь?",
    answerRule: { type: "number", value: "170" },
    answerDisplay: "170",
    solution: [
      {
        text: "Найдём размер скидки в рублях.",
        latex: "200\\cdot\\frac{15}{100}=30",
      },
      { text: "Вычтем скидку из первоначальной цены.", latex: "200-30=170" },
    ],
  }),
  defineTask({
    id: "fraction-subtraction",
    examType: ["ОГЭ"],
    level: null,
    examNumber: null,
    topicId: "fractions",
    prototypeId: "fraction-arithmetic",
    title: "Вычитание дробей",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\frac56-\\frac14",
    answerRule: { type: "number", value: "7/12" },
    answerDisplay: "7/12",
    solution: [
      {
        text: "Общий знаменатель для 6 и 4 — число 12.",
        latex: "\\frac56=\\frac{10}{12},\\quad\\frac14=\\frac3{12}",
      },
      {
        text: "Вычтем числители.",
        latex: "\\frac{10}{12}-\\frac3{12}=\\frac7{12}",
      },
    ],
  }),
  defineTask({
    id: "fraction-signed",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: null,
    topicId: "fractions",
    prototypeId: "fraction-arithmetic",
    title: "Дроби со знаком",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "-\\frac23+\\frac56",
    answerRule: { type: "number", value: "1/6" },
    answerDisplay: "1/6",
    solution: [
      {
        text: "Приведём первую дробь к знаменателю 6.",
        latex: "-\\frac23=-\\frac46",
      },
      {
        text: "Сложим числители с учётом знаков.",
        latex: "-\\frac46+\\frac56=\\frac16",
      },
    ],
  }),
  defineTask({
    id: "decimal-addition",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 6,
    legacyExamTypes: ["ОГЭ", "ЕГЭ"],
    topicId: "decimals",
    prototypeId: "decimal-arithmetic",
    title: "Десятичные дроби",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "2{,}35+0{,}8",
    answerRule: { type: "number", value: "3.15" },
    answerDisplay: "3,15",
    solution: [
      {
        text: "Запишем 0,8 как 0,80 и сложим числа по разрядам.",
        latex: "2{,}35+0{,}80=3{,}15",
      },
    ],
  }),
  defineTask({
    id: "decimal-product",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 6,
    topicId: "decimals",
    prototypeId: "decimal-arithmetic",
    title: "Умножение десятичных дробей",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "1{,}2\\cdot0{,}5",
    answerRule: { type: "number", value: "0.6" },
    answerDisplay: "0,6",
    solution: [
      {
        text: "Умножить на 0,5 — значит взять половину числа.",
        latex: "1{,}2\\cdot0{,}5=0{,}6",
      },
    ],
  }),
  defineTask({
    id: "decimal-division",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 13,
    topicId: "decimals",
    prototypeId: "decimal-arithmetic",
    title: "Деление десятичных дробей",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "4{,}2:0{,}07",
    answerRule: { type: "number", value: "60" },
    answerDisplay: "60",
    solution: [
      {
        text: "Умножим делимое и делитель на 100, чтобы делитель стал целым.",
        latex: "4{,}2:0{,}07=420:7",
      },
      { text: "Выполним деление.", latex: "420:7=60" },
    ],
  }),
  defineTask({
    id: "percentage-jacket",
    examType: ["ОГЭ"],
    level: null,
    examNumber: null,
    topicId: "percentages",
    prototypeId: "percentage-price",
    title: "Скидка на покупку",
    prompt:
      "Куртка стоила 1500 рублей. Её цену снизили на 20%. Найдите новую цену в рублях.",
    answerRule: { type: "number", value: "1200" },
    answerDisplay: "1200",
    solution: [
      { text: "Найдём сумму скидки.", latex: "1500\\cdot0{,}2=300" },
      { text: "Вычтем её из исходной цены.", latex: "1500-300=1200" },
    ],
  }),
  defineTask({
    id: "percentage-increase",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 15,
    topicId: "percentages",
    prototypeId: "percentage-price",
    title: "Изменение цены",
    prompt:
      "Цена книги 800 рублей. После подорожания на 12% сколько рублей стоит книга?",
    answerRule: { type: "number", value: "896" },
    answerDisplay: "896",
    solution: [
      {
        text: "Найдём, на сколько рублей увеличилась цена.",
        latex: "800\\cdot\\frac{12}{100}=96",
      },
      { text: "Прибавим увеличение к исходной цене.", latex: "800+96=896" },
    ],
  }),
  defineTask({
    id: "linear-negative",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 9,
    topicId: "linear-equations",
    prototypeId: "linear-basic",
    title: "Линейное уравнение",
    prompt: "Решите уравнение. Запишите значение x.",
    conditionLatex: "5x+9=-6",
    answerRule: { type: "number", value: "-3" },
    answerDisplay: "−3",
    solution: [
      { text: "Вычтем 9 из обеих частей.", latex: "5x=-15" },
      { text: "Разделим обе части на 5.", latex: "x=-3" },
    ],
  }),
  defineTask({
    id: "linear-brackets",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 17,
    topicId: "linear-equations",
    prototypeId: "linear-basic",
    title: "Уравнение со скобками",
    prompt: "Решите уравнение. Запишите значение x.",
    conditionLatex: "2(x-3)=x+5",
    answerRule: { type: "number", value: "11" },
    answerDisplay: "11",
    solution: [
      { text: "Раскроем скобки.", latex: "2x-6=x+5" },
      { text: "Вычтем x и прибавим 6 к обеим частям.", latex: "x=11" },
    ],
  }),
  defineTask({
    id: "quadratic-two-roots",
    examType: ["ОГЭ"],
    level: null,
    examNumber: null,
    legacyExamTypes: ["ОГЭ", "ЕГЭ"],
    topicId: "quadratic-equations",
    prototypeId: "quadratic-roots",
    title: "Корни уравнения",
    prompt: "Решите уравнение. Запишите все корни через точку с запятой.",
    conditionLatex: "x^2-5x+6=0",
    answerRule: { type: "set", values: ["2", "3"] },
    answerDisplay: "2; 3",
    solution: [
      {
        text: "Нужны два числа с суммой 5 и произведением 6. Это 2 и 3.",
        latex: "x^2-5x+6=(x-2)(x-3)",
      },
      {
        text: "Произведение равно нулю, если хотя бы один множитель равен нулю.",
        latex: "x=2\\quad\\text{или}\\quad x=3",
      },
    ],
  }),
  defineTask({
    id: "quadratic-opposite-roots",
    examType: ["ОГЭ"],
    level: null,
    examNumber: null,
    topicId: "quadratic-equations",
    prototypeId: "quadratic-roots",
    title: "Квадрат неизвестного",
    prompt: "Решите уравнение. Запишите все корни через точку с запятой.",
    conditionLatex: "x^2=16",
    answerRule: { type: "set", values: ["-4", "4"] },
    answerDisplay: "−4; 4",
    solution: [
      {
        text: "Квадраты и 4, и −4 равны 16, поэтому у уравнения два корня.",
        latex: "x=-4\\quad\\text{или}\\quad x=4",
      },
    ],
  }),
  defineTask({
    id: "quadratic-fractional-roots",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: null,
    topicId: "quadratic-equations",
    prototypeId: "quadratic-roots",
    title: "Квадратное уравнение",
    prompt: "Решите уравнение. Запишите все корни через точку с запятой.",
    conditionLatex: "2x^2+x-1=0",
    answerRule: { type: "set", values: ["-1", "1/2"] },
    answerDisplay: "−1; 0,5",
    solution: [
      { text: "Разложим левую часть на множители.", latex: "(2x-1)(x+1)=0" },
      {
        text: "Приравняем каждый множитель к нулю.",
        latex: "x=\\frac12\\quad\\text{или}\\quad x=-1",
      },
    ],
  }),
  defineTask({
    id: "powers-quotient",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 8,
    legacyExamTypes: ["ОГЭ", "ЕГЭ"],
    topicId: "powers-roots",
    prototypeId: "powers-and-roots",
    title: "Степени с одинаковым основанием",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\frac{2^5}{2^3}",
    answerRule: { type: "number", value: "4" },
    answerDisplay: "4",
    solution: [
      {
        text: "При делении степеней с одним ненулевым основанием показатели вычитаются.",
        latex: "\\frac{2^5}{2^3}=2^{5-3}=2^2=4",
      },
    ],
  }),
  defineTask({
    id: "roots-sum",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 8,
    topicId: "powers-roots",
    prototypeId: "powers-and-roots",
    title: "Квадратные корни",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\sqrt{81}+\\sqrt{49}",
    answerRule: { type: "number", value: "16" },
    answerDisplay: "16",
    solution: [
      {
        text: "Арифметический квадратный корень неотрицателен.",
        latex: "\\sqrt{81}+\\sqrt{49}=9+7=16",
      },
    ],
  }),
  defineTask({
    id: "roots-product",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 14,
    topicId: "powers-roots",
    prototypeId: "powers-and-roots",
    title: "Произведение корней",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\sqrt{12}\\cdot\\sqrt3",
    answerRule: { type: "number", value: "6" },
    answerDisplay: "6",
    solution: [
      {
        text: "Для неотрицательных чисел произведение корней равно корню из произведения.",
        latex: "\\sqrt{12}\\cdot\\sqrt3=\\sqrt{36}=6",
      },
    ],
  }),
  defineTask({
    id: "triangle-sine-five-twelve",
    examType: ["ОГЭ"],
    level: null,
    examNumber: null,
    topicId: "geometry",
    prototypeId: "triangle-sine",
    title: "Синус в треугольнике",
    prompt:
      "В прямоугольном треугольнике ABC угол B равен 90°, AB = 5, BC = 12. Найдите sin A. Можно записать ответ обыкновенной дробью.",
    diagram: { type: "right-triangle", adjacent: 5, opposite: 12 },
    answerRule: { type: "number", value: "12/13" },
    answerDisplay: "12/13",
    solution: [
      { text: "Найдём гипотенузу.", latex: "AC=\\sqrt{5^2+12^2}=13" },
      {
        text: "Разделим противолежащий катет на гипотенузу.",
        latex: "\\sin A=\\frac{BC}{AC}=\\frac{12}{13}",
      },
    ],
  }),
  defineTask({
    id: "triangle-sine-eight-fifteen",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: null,
    topicId: "geometry",
    prototypeId: "triangle-sine",
    title: "Тригонометрия треугольника",
    prompt:
      "В прямоугольном треугольнике ABC угол B равен 90°, AB = 8, BC = 15. Найдите sin A. Можно записать ответ обыкновенной дробью.",
    diagram: { type: "right-triangle", adjacent: 8, opposite: 15 },
    answerRule: { type: "number", value: "15/17" },
    answerDisplay: "15/17",
    solution: [
      {
        text: "По теореме Пифагора вычислим гипотенузу.",
        latex: "AC=\\sqrt{8^2+15^2}=17",
      },
      {
        text: "Катет BC лежит напротив угла A.",
        latex: "\\sin A=\\frac{15}{17}",
      },
    ],
  }),
  defineTask({
    id: "probability-die",
    examType: ["ОГЭ"],
    level: null,
    examNumber: null,
    topicId: "probability",
    prototypeId: "classical-probability",
    title: "Бросок кубика",
    prompt:
      "Бросают обычный честный шестигранный кубик с числами от 1 до 6. Найдите вероятность того, что выпадет число больше 4.",
    answerRule: { type: "number", value: "1/3" },
    answerDisplay: "1/3",
    solution: [
      { text: "Всего 6 равновозможных исходов. Подходят два числа: 5 и 6." },
      {
        text: "Разделим число подходящих исходов на общее число исходов.",
        latex: "P=\\frac26=\\frac13",
      },
    ],
  }),
  defineTask({
    id: "probability-cards",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 5,
    topicId: "probability",
    prototypeId: "classical-probability",
    title: "Карточки с числами",
    prompt:
      "Из 20 одинаковых на ощупь карточек с числами от 1 до 20 наугад выбирают одну. Найдите вероятность того, что число на ней делится на 5.",
    answerRule: { type: "number", value: "1/5" },
    answerDisplay: "0,2",
    solution: [
      {
        text: "На 5 делятся числа 5, 10, 15 и 20. Это 4 подходящих исхода из 20.",
      },
      { text: "Вычислим вероятность.", latex: "P=\\frac4{20}=\\frac15=0{,}2" },
    ],
  }),
  defineTask({
    id: "oge-fraction-sum-terminating",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 6,
    topicId: "fractions",
    prototypeId: "fraction-arithmetic",
    title: "Сумма дробей",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\frac14+\\frac3{10}",
    answerRule: { type: "number", value: "11/20" },
    answerDisplay: "0,55",
    solution: [
      {
        text: "Приведём обе дроби к знаменателю 20.",
        latex: "\\frac14+\\frac3{10}=\\frac5{20}+\\frac6{20}",
      },
      {
        text: "Сложим числители и переведём результат в десятичную запись.",
        latex: "\\frac{11}{20}=0{,}55",
      },
    ],
  }),
  defineTask({
    id: "oge-quadratic-larger-root",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 9,
    topicId: "quadratic-equations",
    prototypeId: "quadratic-roots",
    title: "Корень квадратного уравнения",
    prompt: "Решите уравнение. Если корней несколько, запишите больший корень.",
    conditionLatex: "x^2-5x+6=0",
    answerRule: { type: "number", value: "3" },
    answerDisplay: "3",
    solution: [
      {
        text: "Разложим левую часть на множители.",
        latex: "x^2-5x+6=(x-2)(x-3)",
      },
      {
        text: "Каждый множитель приравниваем к нулю и выбираем больший корень.",
        latex: "x=2\\quad\\text{или}\\quad x=3;\\qquad3>2",
      },
    ],
  }),
  defineTask({
    id: "oge-probability-even-die",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 10,
    topicId: "probability",
    prototypeId: "classical-probability",
    title: "Вероятность при броске кубика",
    prompt:
      "Бросают обычный честный шестигранный кубик с числами от 1 до 6. Найдите вероятность того, что выпадет чётное число.",
    answerRule: { type: "number", value: "1/2" },
    answerDisplay: "0,5",
    solution: [
      {
        text: "Подходят три исхода: 2, 4 и 6. Всего равновозможных исходов шесть.",
      },
      {
        text: "Разделим число подходящих исходов на общее число исходов.",
        latex: "P=\\frac36=\\frac12=0{,}5",
      },
    ],
  }),
  defineTask({
    id: "oge-triangle-three-four",
    examType: ["ОГЭ"],
    level: null,
    examNumber: 15,
    topicId: "geometry",
    prototypeId: "triangle-sine",
    title: "Синус острого угла",
    prompt:
      "В прямоугольном треугольнике ABC угол B равен 90°, AB = 4, BC = 3. Найдите sin A.",
    diagram: { type: "right-triangle", adjacent: 4, opposite: 3 },
    answerRule: { type: "number", value: "3/5" },
    answerDisplay: "0,6",
    solution: [
      {
        text: "По теореме Пифагора найдём гипотенузу.",
        latex: "AC=\\sqrt{4^2+3^2}=5",
      },
      {
        text: "Катет BC лежит напротив угла A. Разделим его длину на гипотенузу.",
        latex: "\\sin A=\\frac35=0{,}6",
      },
    ],
  }),
  defineTask({
    id: "ege-base-fraction-sum",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 13,
    topicId: "fractions",
    prototypeId: "fraction-arithmetic",
    title: "Действия с дробями",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\frac15+\\frac3{10}",
    answerRule: { type: "number", value: "1/2" },
    answerDisplay: "0,5",
    solution: [
      {
        text: "Приведём первую дробь к знаменателю 10.",
        latex: "\\frac15+\\frac3{10}=\\frac2{10}+\\frac3{10}",
      },
      {
        text: "Сложим числители и сократим дробь.",
        latex: "\\frac5{10}=\\frac12=0{,}5",
      },
    ],
  }),
  defineTask({
    id: "ege-base-decimal-difference",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 13,
    topicId: "decimals",
    prototypeId: "decimal-arithmetic",
    title: "Разность десятичных дробей",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "1{,}75-0{,}6",
    answerRule: { type: "number", value: "1.15" },
    answerDisplay: "1,15",
    solution: [
      {
        text: "Запишем 0,6 как 0,60, чтобы вычитать числа по разрядам.",
        latex: "1{,}75-0{,}60=1{,}15",
      },
    ],
  }),
  defineTask({
    id: "ege-base-discount",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 15,
    topicId: "percentages",
    prototypeId: "percentage-price",
    title: "Стоимость со скидкой",
    prompt:
      "Рюкзак стоил 1000 рублей. Во время распродажи цена снизилась на 15%. Сколько рублей стоит рюкзак после скидки?",
    answerRule: { type: "number", value: "850" },
    answerDisplay: "850",
    solution: [
      { text: "Найдём размер скидки.", latex: "1000\\cdot0{,}15=150" },
      { text: "Вычтем скидку из прежней цены.", latex: "1000-150=850" },
    ],
  }),
  defineTask({
    id: "ege-base-linear-equation",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 17,
    topicId: "linear-equations",
    prototypeId: "linear-basic",
    title: "Линейное уравнение",
    prompt: "Решите уравнение. Запишите значение x.",
    conditionLatex: "4x-3=17",
    answerRule: { type: "number", value: "5" },
    answerDisplay: "5",
    solution: [
      { text: "Прибавим 3 к обеим частям уравнения.", latex: "4x=20" },
      { text: "Разделим обе части на 4.", latex: "x=5" },
    ],
  }),
  defineTask({
    id: "ege-base-quadratic-roots",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: null,
    topicId: "quadratic-equations",
    prototypeId: "quadratic-roots",
    title: "Корни квадратного уравнения",
    prompt: "Решите уравнение. Запишите все корни через точку с запятой.",
    conditionLatex: "x^2-7x+12=0",
    answerRule: { type: "set", values: ["3", "4"] },
    answerDisplay: "3; 4",
    solution: [
      {
        text: "Разложим левую часть на множители.",
        latex: "x^2-7x+12=(x-3)(x-4)",
      },
      {
        text: "Произведение равно нулю, если один из множителей равен нулю.",
        latex: "x=3\\quad\\text{или}\\quad x=4",
      },
    ],
  }),
  defineTask({
    id: "ege-base-powers-quotient",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 14,
    topicId: "powers-roots",
    prototypeId: "powers-and-roots",
    title: "Частное степеней",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\frac{3^4}{3^2}",
    answerRule: { type: "number", value: "9" },
    answerDisplay: "9",
    solution: [
      {
        text: "При делении степеней с одним ненулевым основанием вычтем показатели.",
        latex: "\\frac{3^4}{3^2}=3^{4-2}=3^2=9",
      },
    ],
  }),
  defineTask({
    id: "ege-base-triangle-sine",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: null,
    topicId: "geometry",
    prototypeId: "triangle-sine",
    title: "Синус в прямоугольном треугольнике",
    prompt:
      "В прямоугольном треугольнике ABC угол B равен 90°, AB = 8, BC = 6. Найдите sin A.",
    diagram: { type: "right-triangle", adjacent: 8, opposite: 6 },
    answerRule: { type: "number", value: "3/5" },
    answerDisplay: "0,6",
    solution: [
      {
        text: "Вычислим гипотенузу по теореме Пифагора.",
        latex: "AC=\\sqrt{8^2+6^2}=10",
      },
      {
        text: "Разделим противолежащий катет на гипотенузу.",
        latex: "\\sin A=\\frac6{10}=0{,}6",
      },
    ],
  }),
  defineTask({
    id: "ege-base-probability-balls",
    examType: ["ЕГЭ"],
    level: "base",
    examNumber: 5,
    topicId: "probability",
    prototypeId: "classical-probability",
    title: "Выбор шара",
    prompt:
      "В коробке 5 синих и 15 белых шаров, одинаковых на ощупь. Наугад выбирают один шар. Найдите вероятность того, что он синий.",
    answerRule: { type: "number", value: "1/4" },
    answerDisplay: "0,25",
    solution: [
      { text: "Всего шаров 20; подходят 5 синих." },
      {
        text: "Разделим число подходящих исходов на число всех равновозможных исходов.",
        latex: "P=\\frac5{20}=\\frac14=0{,}25",
      },
    ],
  }),
  defineTask({
    id: "ege-profile-triangle-twelve-nine",
    examType: ["ЕГЭ"],
    level: "profile",
    examNumber: 1,
    topicId: "geometry",
    prototypeId: "triangle-sine",
    title: "Синус в треугольнике",
    prompt:
      "В прямоугольном треугольнике ABC угол B равен 90°, AB = 12, BC = 9. Найдите sin A.",
    diagram: { type: "right-triangle", adjacent: 12, opposite: 9 },
    answerRule: { type: "number", value: "3/5" },
    answerDisplay: "0,6",
    solution: [
      { text: "Найдём гипотенузу.", latex: "AC=\\sqrt{12^2+9^2}=15" },
      {
        text: "Для угла A противолежащим является катет BC.",
        latex: "\\sin A=\\frac9{15}=0{,}6",
      },
    ],
  }),
  defineTask({
    id: "ege-profile-triangle-nine-twelve",
    examType: ["ЕГЭ"],
    level: "profile",
    examNumber: 1,
    topicId: "geometry",
    prototypeId: "triangle-sine",
    title: "Прямоугольный треугольник",
    prompt:
      "В прямоугольном треугольнике ABC угол B равен 90°, AB = 9, BC = 12. Найдите sin A.",
    diagram: { type: "right-triangle", adjacent: 9, opposite: 12 },
    answerRule: { type: "number", value: "4/5" },
    answerDisplay: "0,8",
    solution: [
      {
        text: "По теореме Пифагора найдём гипотенузу.",
        latex: "AC=\\sqrt{9^2+12^2}=15",
      },
      {
        text: "Разделим противолежащий катет на гипотенузу.",
        latex: "\\sin A=\\frac{12}{15}=0{,}8",
      },
    ],
  }),
  defineTask({
    id: "ege-profile-probability-balls",
    examType: ["ЕГЭ"],
    level: "profile",
    examNumber: 4,
    topicId: "probability",
    prototypeId: "classical-probability",
    title: "Случайный выбор шара",
    prompt:
      "В мешке 2 красных и 8 белых шаров, одинаковых на ощупь. Наугад вынимают один шар. Найдите вероятность того, что он красный.",
    answerRule: { type: "number", value: "1/5" },
    answerDisplay: "0,2",
    solution: [
      { text: "Всего 10 шаров, из них 2 красных." },
      {
        text: "Найдём долю подходящих равновозможных исходов.",
        latex: "P=\\frac2{10}=0{,}2",
      },
    ],
  }),
  defineTask({
    id: "ege-profile-probability-cards",
    examType: ["ЕГЭ"],
    level: "profile",
    examNumber: 4,
    topicId: "probability",
    prototypeId: "classical-probability",
    title: "Случайная карточка",
    prompt:
      "Из 25 одинаковых на ощупь карточек с числами от 1 до 25 наугад выбирают одну. Найдите вероятность того, что число на ней делится на 5.",
    answerRule: { type: "number", value: "1/5" },
    answerDisplay: "0,2",
    solution: [
      {
        text: "Подходят числа 5, 10, 15, 20 и 25: всего 5 из 25 равновозможных исходов.",
      },
      { text: "Вычислим вероятность.", latex: "P=\\frac5{25}=\\frac15=0{,}2" },
    ],
  }),
  defineTask({
    id: "ege-profile-exponential-two",
    examType: ["ЕГЭ"],
    level: "profile",
    examNumber: 6,
    topicId: "powers-roots",
    prototypeId: "exponential-equation",
    title: "Показательное уравнение",
    prompt: "Решите уравнение. Запишите значение x.",
    conditionLatex: "2^{x+1}=16",
    answerRule: { type: "number", value: "3" },
    answerDisplay: "3",
    solution: [
      {
        text: "Запишем правую часть как степень числа 2.",
        latex: "2^{x+1}=2^4",
      },
      {
        text: "Степенная функция с основанием 2 принимает каждое значение один раз, поэтому показатели равны.",
        latex: "x+1=4;\\qquad x=3",
      },
    ],
  }),
  defineTask({
    id: "ege-profile-exponential-three",
    examType: ["ЕГЭ"],
    level: "profile",
    examNumber: 6,
    topicId: "powers-roots",
    prototypeId: "exponential-equation",
    title: "Уравнение со степенью",
    prompt: "Решите уравнение. Запишите значение x.",
    conditionLatex: "3^{2x-1}=27",
    answerRule: { type: "number", value: "2" },
    answerDisplay: "2",
    solution: [
      { text: "Представим 27 как степень числа 3.", latex: "3^{2x-1}=3^3" },
      {
        text: "При одинаковом основании 3 равенство степеней означает равенство показателей.",
        latex: "2x-1=3;\\quad2x=4;\\quad x=2",
      },
    ],
  }),
  defineTask({
    id: "ege-profile-roots-product",
    examType: ["ЕГЭ"],
    level: "profile",
    examNumber: 7,
    topicId: "powers-roots",
    prototypeId: "powers-and-roots",
    title: "Произведение квадратных корней",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\sqrt{32}\\cdot\\sqrt2",
    answerRule: { type: "number", value: "8" },
    answerDisplay: "8",
    solution: [
      {
        text: "Оба подкоренных числа неотрицательны. Корни можно перемножить под одним знаком корня.",
        latex: "\\sqrt{32}\\cdot\\sqrt2=\\sqrt{64}=8",
      },
    ],
  }),
  defineTask({
    id: "ege-profile-powers-quotient",
    examType: ["ЕГЭ"],
    level: "profile",
    examNumber: 7,
    topicId: "powers-roots",
    prototypeId: "powers-and-roots",
    title: "Вычисление со степенями",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\frac{3^5}{3^3}",
    answerRule: { type: "number", value: "9" },
    answerDisplay: "9",
    solution: [
      {
        text: "Вычтем показатели степеней с одним ненулевым основанием.",
        latex: "\\frac{3^5}{3^3}=3^{5-3}=3^2=9",
      },
    ],
  }),
  defineTask({
    id: "ege-profile-fraction-difference",
    examType: ["ЕГЭ"],
    level: "profile",
    examNumber: 7,
    topicId: "fractions",
    prototypeId: "fraction-arithmetic",
    title: "Вычисление дробного выражения",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\frac34-\\frac18",
    answerRule: { type: "number", value: "5/8" },
    answerDisplay: "0,625",
    solution: [
      {
        text: "Приведём первую дробь к знаменателю 8.",
        latex: "\\frac34-\\frac18=\\frac68-\\frac18=\\frac58=0{,}625",
      },
    ],
  }),
  defineTask({
    id: "ege-profile-fraction-product",
    examType: ["ЕГЭ"],
    level: "profile",
    examNumber: 7,
    topicId: "fractions",
    prototypeId: "fraction-arithmetic",
    title: "Произведение дробей",
    prompt: "Вычислите значение выражения.",
    conditionLatex: "\\frac35\\cdot\\frac54",
    answerRule: { type: "number", value: "3/4" },
    answerDisplay: "0,75",
    solution: [
      {
        text: "Перемножим числители и знаменатели и сократим общий множитель 5.",
        latex: "\\frac35\\cdot\\frac54=\\frac{15}{20}=\\frac34=0{,}75",
      },
    ],
  }),
];

export type PracticeTaskFilter = {
  examType: Exam;
  subjectId?: SubjectId;
  level?: ExamLevel | null;
  examNumber?: number;
  topicId?: string;
  prototypeId?: string;
};

/** Never replace an empty selection with another exam, level, number or topic. */
export function getPracticeTasks(filter: PracticeTaskFilter): Task[] {
  const definition = getExamDefinition(filter);
  if (!definition) return [];
  if (
    filter.examNumber !== undefined &&
    !definition.numbers.some((entry) => entry.number === filter.examNumber)
  )
    return [];
  return tasks.filter(
    (task) =>
      task.examType[0] === definition.examType &&
      task.subjectId === definition.subjectId &&
      task.level === definition.level &&
      (filter.examNumber === undefined ||
        task.examNumber === filter.examNumber) &&
      (!filter.topicId || task.topicId === filter.topicId) &&
      (!filter.prototypeId || task.prototypeId === filter.prototypeId),
  );
}

type Rational = { numerator: bigint; denominator: bigint };
const zero = BigInt(0);
const one = BigInt(1);
const ten = BigInt(10);

function gcd(a: bigint, b: bigint): bigint {
  a = a < zero ? -a : a;
  b = b < zero ? -b : b;
  while (b !== zero) [a, b] = [b, a % b];
  return a;
}

function rational(numerator: bigint, denominator: bigint): Rational | null {
  if (denominator === zero) return null;
  if (denominator < zero) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function parseDecimal(input: string): Rational | null {
  const value = input.trim().replace(/−/g, "-").replace(/,/g, ".");
  if (value.length > 128 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))
    return null;
  const negative = value.startsWith("-");
  const unsigned = value.replace(/^[+-]/, "");
  const [whole = "", decimals = ""] = unsigned.split(".");
  const numerator = BigInt((whole || "0") + decimals) * (negative ? -one : one);
  return rational(numerator, ten ** BigInt(decimals.length));
}

function parseRational(input: string): Rational | null {
  if (typeof input !== "string" || input.length > 256) return null;
  const parts = input.split("/");
  if (parts.length === 1) return parseDecimal(parts[0]);
  if (parts.length !== 2) return null;
  const numerator = parseDecimal(parts[0]);
  const denominator = parseDecimal(parts[1]);
  if (!numerator || !denominator) return null;
  return rational(
    numerator.numerator * denominator.denominator,
    numerator.denominator * denominator.numerator,
  );
}

function rationalKey(value: Rational): string {
  return `${value.numerator}/${value.denominator}`;
}

/** Exact comparison: 4/5 and 0,8 match, but a nearby rounded decimal does not. */
export function checkTaskAnswer(
  input: string,
  rule: AnswerRule,
): { valid: boolean; correct: boolean; message?: string } {
  if (typeof input !== "string" || input.length > 1024) {
    return {
      valid: false,
      correct: false,
      message: "Ответ слишком длинный. Запишите число или дробь.",
    };
  }
  if (rule.type === "number") {
    const answer = parseRational(input);
    if (!answer)
      return {
        valid: false,
        correct: false,
        message: "Введите число или обыкновенную дробь.",
      };
    const expected = parseRational(rule.value);
    return {
      valid: true,
      correct:
        expected !== null && rationalKey(answer) === rationalKey(expected),
    };
  }

  const trimmed = input.trim();
  const unwrapped =
    trimmed.startsWith("{") && trimmed.endsWith("}")
      ? trimmed.slice(1, -1)
      : trimmed;
  const answers = unwrapped.split(";").map(parseRational);
  if (answers.some((answer) => answer === null)) {
    return {
      valid: false,
      correct: false,
      message: "Запишите все корни через точку с запятой.",
    };
  }
  const answerKeys = answers.map((answer) => rationalKey(answer!));
  if (new Set(answerKeys).size !== answerKeys.length) {
    return {
      valid: false,
      correct: false,
      message: "Каждый корень запишите один раз.",
    };
  }
  const expected = rule.values.map(parseRational);
  const expectedKeys = expected
    .filter((value) => value !== null)
    .map(rationalKey)
    .sort();
  return {
    valid: true,
    correct:
      expectedKeys.length === rule.values.length &&
      answerKeys.length === expectedKeys.length &&
      answerKeys.sort().every((value, index) => value === expectedKeys[index]),
  };
}
