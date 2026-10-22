import type { Task } from "../tasks";
import { makeOriginalTask } from "./task-factory";

/** Reproducible author-written training bank, not official FIPI questions. */
export type EgeGeneratorCase = {
  taskId: string;
  family: string;
  parameters: Record<string, number>;
};
export const egeGeneratorCases: EgeGeneratorCase[] = [];
export const egePrototypes: { id: string; topicId: string; title: string }[] = [];
export const egeTasks: Task[] = [];
const criteriaSourceUrl = "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory";
const latex = String.raw;
const decimal = (value: number) => String(Number(value.toFixed(6))).replace(".", ",");

function add(
  number: number,
  family: string,
  variant: number,
  title: string,
  data: Pick<Task, "prompt" | "solution" | "answerDisplay"> &
    Partial<Pick<Task, "conditionLatex" | "selfCheckNotes" | "difficulty">> &
    { value?: string; parameters: Record<string, number> },
) {
  const prototypeId = `ege-${number}-${family}`;
  const topicId = `ege-profile-number-${number}`;
  if (!egePrototypes.some((entry) => entry.id === prototypeId)) {
    egePrototypes.push({ id: prototypeId, topicId, title });
  }
  const id = `ege-2026-${number}-${family}-v1-${variant}`;
  const { value, parameters, ...content } = data;
  egeTasks.push(makeOriginalTask({
    id, topicId, prototypeId, examType: ["ЕГЭ"], level: "profile", examNumber: number,
    title, ...content,
    difficulty: content.difficulty ?? (number <= 12 ? "standard" : "advanced"),
    answerRule: number <= 12 ? { type: "number", value: value! } : { type: "self" },
    ...(number > 12 ? { criteriaSourceUrl } : {}),
  }));
  egeGeneratorCases.push({ taskId: id, family, parameters });
}

for (let k = 1; k <= 6; k += 1) {
  const a = 3 * k, b = 4 * k;
  add(1, "right-triangle-area", k, "Площадь прямоугольного треугольника", {
    prompt: `Катеты прямоугольного треугольника равны ${a} и ${b}. Найдите площадь треугольника.`,
    value: String(a * b / 2), answerDisplay: String(a * b / 2), parameters: { a, b },
    solution: [
      { text: "Катеты перпендикулярны, поэтому один служит основанием, а второй — высотой.", latex: latex`S=\frac{ab}{2}` },
      { text: "Подставим длины катетов.", latex: latex`S=\frac{${a}\cdot${b}}{2}=${a * b / 2}` },
    ],
  });
  const base1 = 2 * k + 4, base2 = 2 * k + 10, height = k + 3;
  add(1, "trapezoid-area", k, "Площадь трапеции", {
    prompt: `Основания трапеции равны ${base1} и ${base2}, а высота равна ${height}. Найдите площадь трапеции.`,
    value: String((base1 + base2) * height / 2), answerDisplay: String((base1 + base2) * height / 2), parameters: { base1, base2, height },
    solution: [
      { text: "Площадь трапеции равна произведению полусуммы оснований на высоту.", latex: latex`S=\frac{a+b}{2}\,h` },
      { text: "Используем обе длины оснований, а не боковую сторону.", latex: latex`S=\frac{${base1}+${base2}}{2}\cdot${height}=${(base1 + base2) * height / 2}` },
    ],
  });

  const ux = k + 1, uy = k + 2, vx = k + 3, vy = 1 - k;
  const dot = ux * vx + uy * vy;
  add(2, "dot-product", k, "Скалярное произведение векторов", {
    prompt: `Даны векторы u = (${ux}; ${uy}) и v = (${vx}; ${vy}). Найдите их скалярное произведение.`,
    value: String(dot), answerDisplay: String(dot), parameters: { ux, uy, vx, vy },
    solution: [
      { text: "Перемножим соответствующие координаты и сложим результаты.", latex: latex`\vec u\cdot\vec v=u_xv_x+u_yv_y` },
      { text: "Сохраняем знак второй координаты вектора v.", latex: latex`\vec u\cdot\vec v=${ux}\cdot${vx}+${uy}\cdot(${vy})=${dot}` },
    ],
  });
  const ax = k + 1, ay = 2 * k, bx = 4 * k + 1, by = 6 * k;
  add(2, "vector-length", k, "Длина вектора по координатам точек", {
    prompt: `Точки A и B имеют координаты A(${ax}; ${ay}), B(${bx}; ${by}). Найдите длину вектора AB.`,
    value: String(5 * k), answerDisplay: String(5 * k), parameters: { ax, ay, bx, by },
    solution: [
      { text: "Вычтем координаты начала из координат конца.", latex: latex`\overrightarrow{AB}=(${bx}-${ax};\ ${by}-${ay})=(${3 * k};\ ${4 * k})` },
      { text: "Применим формулу длины вектора.", latex: latex`|AB|=\sqrt{${3 * k}^{2}+${4 * k}^{2}}=${5 * k}` },
    ],
  });

  const side1 = 2 * k, side2 = 3 * k, side3 = 6 * k;
  add(3, "prism-diagonal", k, "Диагональ прямоугольного параллелепипеда", {
    prompt: `Рёбра прямоугольного параллелепипеда, выходящие из одной вершины, равны ${side1}, ${side2} и ${side3}. Найдите длину пространственной диагонали.`,
    value: String(7 * k), answerDisplay: String(7 * k), parameters: { side1, side2, side3 },
    solution: [
      { text: "Дважды применим теорему Пифагора: сначала к грани, затем к треугольнику с пространственной диагональю.", latex: latex`d^2=a^2+b^2+c^2` },
      { text: "Сложим квадраты трёх взаимно перпендикулярных рёбер.", latex: latex`d=\sqrt{${side1}^{2}+${side2}^{2}+${side3}^{2}}=${7 * k}` },
    ],
  });
  const length = k + 2, width = k + 4, pyramidHeight = 3 * k;
  add(3, "pyramid-volume", k, "Объём пирамиды", {
    prompt: `Основание пирамиды — прямоугольник со сторонами ${length} и ${width}. Высота пирамиды равна ${pyramidHeight}. Найдите объём пирамиды.`,
    value: String(length * width * k), answerDisplay: String(length * width * k), parameters: { length, width, height: pyramidHeight },
    solution: [
      { text: "Найдём площадь прямоугольного основания.", latex: latex`S_{\text{осн}}=${length}\cdot${width}=${length * width}` },
      { text: "Объём пирамиды составляет треть произведения площади основания на высоту.", latex: latex`V=\frac{1}{3}\cdot${length * width}\cdot${pyramidHeight}=${length * width * k}` },
    ],
  });

  const red = k + 2, total = 20;
  add(4, "one-draw", k, "Вероятность одного выбора", {
    prompt: `В непрозрачном мешке ${total} одинаковых на ощупь шаров, из них ${red} красных, остальные синие. Наугад вынимают один шар. Найдите вероятность того, что он красный.`,
    value: `${red}/${total}`, answerDisplay: decimal(red / total), parameters: { red, total },
    solution: [
      { text: "Все шары выбираются с одинаковой вероятностью; благоприятны красные.", latex: latex`P=\frac{\text{число красных шаров}}{\text{число всех шаров}}` },
      { text: "Вычислим отношение.", latex: latex`P=\frac{${red}}{${total}}=${decimal(red / total)}` },
    ],
  });
  const defective = 3 * (k + 1);
  add(4, "complement", k, "Вероятность противоположного события", {
    prompt: `В партии из 100 деталей ${defective} имеют дефект. Деталь выбирают наугад. Найдите вероятность выбрать исправную деталь.`,
    value: `${100 - defective}/100`, answerDisplay: decimal((100 - defective) / 100), parameters: { defective, total: 100 },
    solution: [
      { text: "Исправная деталь и деталь с дефектом — противоположные исходы.", latex: latex`P(\text{исправна})=1-P(\text{дефект})` },
      { text: "Вычтем вероятность дефекта из единицы.", latex: latex`P=1-\frac{${defective}}{100}=${decimal((100 - defective) / 100)}` },
    ],
  });

  const p10 = k + 2, q10 = 7, exactlyOne100 = p10 * (10 - q10) + (10 - p10) * q10;
  add(5, "exactly-one", k, "Ровно одно попадание", {
    prompt: `Два стрелка независимо друг от друга делают по одному выстрелу. Вероятности попадания равны ${decimal(p10 / 10)} и ${decimal(q10 / 10)}. Найдите вероятность ровно одного попадания.`,
    value: `${exactlyOne100}/100`, answerDisplay: decimal(exactlyOne100 / 100), parameters: { p10, q10 },
    solution: [
      { text: "Есть два несовместных случая: первый попал, второй промахнулся; или наоборот.", latex: latex`P=p(1-q)+(1-p)q` },
      { text: "В каждом случае используем независимость, затем складываем вероятности.", latex: latex`P=${decimal(p10 / 10)}\cdot${decimal(1 - q10 / 10)}+${decimal(1 - p10 / 10)}\cdot${decimal(q10 / 10)}=${decimal(exactlyOne100 / 100)}` },
    ],
  });
  const chance10 = k + 1, atLeastOne100 = 100 - (10 - chance10) ** 2;
  add(5, "at-least-one", k, "Хотя бы один успех", {
    prompt: `Игрок независимо участвует в двух розыгрышах. Вероятность выигрыша в каждом равна ${decimal(chance10 / 10)}. Найдите вероятность выиграть хотя бы в одном розыгрыше.`,
    value: `${atLeastOne100}/100`, answerDisplay: decimal(atLeastOne100 / 100), parameters: { chance10 },
    solution: [
      { text: "Противоположное событие — проигрыш в обоих розыгрышах.", latex: latex`P(\text{ни одного})=(1-p)^2` },
      { text: "Вычтем его вероятность из единицы.", latex: latex`P=1-(${decimal(1 - chance10 / 10)})^2=${decimal(atLeastOne100 / 100)}` },
    ],
  });

  add(6, "exponential", k, "Показательное уравнение", {
    prompt: "Решите уравнение.", conditionLatex: latex`2^{x-${k}}=8`,
    value: String(k + 3), answerDisplay: String(k + 3), parameters: { shift: k },
    solution: [
      { text: "Представим правую часть как степень двойки.", latex: latex`8=2^3` },
      { text: "Функция 2 в степени x строго возрастает, поэтому показатели равны.", latex: latex`x-${k}=3\quad\Rightarrow\quad x=${k + 3}` },
    ],
  });
  const shift = k + 2;
  add(6, "logarithmic", k, "Логарифмическое уравнение", {
    prompt: "Решите уравнение.", conditionLatex: latex`\log_2(x-${shift})=3`,
    value: String(shift + 8), answerDisplay: String(shift + 8), parameters: { shift, base: 2, exponent: 3 },
    solution: [
      { text: "Аргумент логарифма должен быть положительным.", latex: latex`x>${shift}` },
      { text: "По определению логарифма получаем уравнение без логарифма.", latex: latex`x-${shift}=2^3=8\quad\Rightarrow\quad x=${shift + 8}` },
      { text: `Число ${shift + 8} больше ${shift}, поэтому входит в область определения.` },
    ],
  });

  const r1 = k + 2, r2 = k + 7;
  add(7, "radical-identity", k, "Преобразование выражения с корнями", {
    prompt: "Найдите значение выражения.", conditionLatex: latex`(\sqrt{${r1}}+\sqrt{${r2}})^2-2\sqrt{${r1 * r2}}`,
    value: String(r1 + r2), answerDisplay: String(r1 + r2), parameters: { r1, r2 },
    solution: [
      { text: "Раскроем квадрат суммы и используем произведение квадратных корней из неотрицательных чисел.", latex: latex`(\sqrt a+\sqrt b)^2=a+2\sqrt{ab}+b` },
      { text: "Иррациональные слагаемые сокращаются.", latex: latex`${r1}+2\sqrt{${r1 * r2}}+${r2}-2\sqrt{${r1 * r2}}=${r1 + r2}` },
    ],
  });
  const exponent = 5 - k, power = 2 ** exponent;
  add(7, "power-rules", k, "Действия со степенями", {
    prompt: "Найдите значение выражения.", conditionLatex: latex`\frac{2^{${k + 4}}\cdot8}{4^{${k + 1}}}`,
    value: String(power), answerDisplay: decimal(power), parameters: { k },
    solution: [
      { text: "Приведём все степени к основанию 2.", latex: latex`8=2^3,\qquad4^{${k + 1}}=2^{${2 * k + 2}}` },
      { text: "При умножении показатели складываются, при делении — вычитаются.", latex: latex`2^{${k + 4}+3-${2 * k + 2}}=2^{${exponent}}=${decimal(power)}` },
    ],
  });

  const coefficientA = k + 1, coefficientB = 3 * k + 2, derivative = k * k + k + 2;
  add(8, "derivative-point", k, "Производная в точке", {
    prompt: `Найдите значение производной функции в точке x = ${k}.`,
    conditionLatex: latex`f(x)=x^3-${coefficientA}x^2+${coefficientB}x+${k + 4}`,
    value: String(derivative), answerDisplay: String(derivative), parameters: { point: k, a: coefficientA, b: coefficientB, c: k + 4 },
    solution: [
      { text: "Дифференцируем каждое слагаемое, производная постоянной равна нулю.", latex: latex`f'(x)=3x^2-${2 * coefficientA}x+${coefficientB}` },
      { text: "Подставим заданную точку.", latex: latex`f'(${k})=3\cdot${k}^2-${2 * coefficientA}\cdot${k}+${coefficientB}=${derivative}` },
    ],
  });
  const qa = k + 1, qb = k, slope = 2 * qa * (k + 2) + qb;
  add(8, "parallel-tangent", k, "Касательная, параллельная прямой", {
    prompt: `При каком x касательная к графику функции параллельна прямой y = ${slope}x + 1?`,
    conditionLatex: latex`f(x)=${qa}x^2+${qb}x+2`,
    value: String(k + 2), answerDisplay: String(k + 2), parameters: { a: qa, b: qb, slope },
    solution: [
      { text: "У параллельных прямых одинаковые угловые коэффициенты. Наклон касательной равен производной.", latex: latex`f'(x)=${2 * qa}x+${qb}=${slope}` },
      { text: "Решим полученное линейное уравнение.", latex: latex`x=\frac{${slope}-${qb}}{${2 * qa}}=${k + 2}` },
    ],
  });

  const v0 = k + 3, time = k + 2, distance = v0 * time + time * time;
  add(9, "accelerated-motion", k, "Равноускоренное движение", {
    prompt: `Тело движется прямолинейно с начальной скоростью ${v0} м/с и постоянным ускорением 2 м/с². Путь за t секунд задаётся формулой s = v₀t + at²/2. За сколько секунд тело пройдёт ${distance} м? Рассматривайте t ≥ 0.`,
    value: String(time), answerDisplay: String(time), parameters: { v0, acceleration: 2, distance },
    solution: [
      { text: "Подставим исходные данные в формулу пути.", latex: latex`${distance}=${v0}t+t^2` },
      { text: "Перенесём всё в левую часть и разложим на множители.", latex: latex`t^2+${v0}t-${distance}=(t-${time})(t+${v0 + time})=0` },
      { text: `Отрицательный корень не подходит по смыслу времени. Ответ: ${time} секунд.` },
    ],
  });
  const current = k + 1, resistance = 2 * k, seconds = 30, heat = current * current * resistance * seconds;
  add(9, "joule-law", k, "Вычисление по физической формуле", {
    prompt: `Количество теплоты Q (в джоулях) вычисляют по формуле Q = I²Rt, где I — сила тока в амперах, R — сопротивление в омах, t — время в секундах. При R = ${resistance} Ом и t = ${seconds} с выделилось ${heat} Дж. Найдите положительное значение I.`,
    value: String(current), answerDisplay: String(current), parameters: { resistance, seconds, heat },
    solution: [
      { text: "Выразим квадрат силы тока из исходной формулы.", latex: latex`I^2=\frac{Q}{Rt}=\frac{${heat}}{${resistance}\cdot${seconds}}=${current * current}` },
      { text: "По условию нужна положительная сила тока.", latex: latex`I=\sqrt{${current * current}}=${current}` },
    ],
  });

  const slow = 12 + 3 * k, fast = slow + 3, delay = 1, catchTime = slow / 3;
  add(10, "catch-up", k, "Движение вдогонку", {
    prompt: `Из одного пункта по одной дороге выехал велосипедист со скоростью ${slow} км/ч. Через ${delay} час вслед за ним выехал второй со скоростью ${fast} км/ч. Скорости постоянны. Через сколько часов после своего выезда второй догонит первого?`,
    value: String(catchTime), answerDisplay: String(catchTime), parameters: { slow, fast, delay },
    solution: [
      { text: "Первый велосипедист имеет преимущество в пути, равное произведению скорости на задержку.", latex: latex`d_0=${slow}\cdot${delay}=${slow * delay}` },
      { text: "Расстояние сокращается со скоростью, равной разности скоростей.", latex: latex`t=\frac{${slow * delay}}{${fast}-${slow}}=${catchTime}` },
    ],
  });
  const first = 10 * k, second = 15 * k;
  add(10, "joint-work", k, "Совместная работа", {
    prompt: `Первый насос заполняет резервуар за ${first} минут, второй — за ${second} минут. За сколько минут они заполнят пустой резервуар, работая одновременно с постоянной производительностью?`,
    value: String(6 * k), answerDisplay: String(6 * k), parameters: { first, second },
    solution: [
      { text: "Примем объём резервуара за единицу. Производительности насосов складываются.", latex: latex`v=\frac{1}{${first}}+\frac{1}{${second}}=\frac{1}{${6 * k}}` },
      { text: "Время равно объёму, делённому на суммарную производительность.", latex: latex`t=\frac{1}{v}=${6 * k}` },
    ],
  });

  const fa = k + 1, fb = 2 * k, y1 = fa + fb, y2 = 2 * fa + fb;
  add(11, "linear-function", k, "Восстановление линейной функции", {
    prompt: `График функции f(x) = ax + b проходит через точки (1; ${y1}) и (2; ${y2}). Найдите f(3).`,
    value: String(3 * fa + fb), answerDisplay: String(3 * fa + fb), parameters: { y1, y2 },
    solution: [
      { text: "При увеличении x на единицу значение линейной функции изменяется на a.", latex: latex`a=${y2}-${y1}=${fa}` },
      { text: "Найдём свободный член по первой точке и вычислим значение при x = 3.", latex: latex`b=${y1}-${fa}=${fb},\qquad f(3)=3\cdot${fa}+${fb}=${3 * fa + fb}` },
    ],
  });
  const xPoint = k + 1, yPoint = 2 * xPoint, coefficient = xPoint * yPoint;
  add(11, "inverse-function", k, "Обратная пропорциональность", {
    prompt: `График функции y = c/x проходит через точку (${xPoint}; ${yPoint}). При каком x значение y равно 2?`,
    value: String(coefficient / 2), answerDisplay: String(coefficient / 2), parameters: { xPoint, yPoint, targetY: 2 },
    solution: [
      { text: "Используем известную точку, чтобы найти коэффициент c.", latex: latex`c=${xPoint}\cdot${yPoint}=${coefficient}` },
      { text: "Найдём аргумент при заданном значении функции, учитывая x ≠ 0.", latex: latex`2=\frac{${coefficient}}{x}\quad\Rightarrow\quad x=${coefficient / 2}` },
    ],
  });

  const vertex = k + 1, peak = 3 * k + 4;
  add(12, "quadratic-maximum", k, "Наибольшее значение на отрезке", {
    prompt: `Найдите наибольшее значение функции на отрезке [${vertex - 2}; ${vertex + 3}].`,
    conditionLatex: latex`f(x)=-(x-${vertex})^2+${peak}`,
    value: String(peak), answerDisplay: String(peak), parameters: { vertex, peak, left: vertex - 2, right: vertex + 3 },
    solution: [
      { text: "Квадрат неотрицателен, поэтому функция не превосходит указанной константы.", latex: latex`-(x-${vertex})^2\le0\quad\Rightarrow\quad f(x)\le${peak}` },
      { text: `Равенство достигается при x = ${vertex}. Эта точка принадлежит заданному отрезку, поэтому максимум равен ${peak}.` },
    ],
  });
  const stationary = k + 1, cubicMinimum = -2 * stationary ** 3;
  add(12, "cubic-minimum", k, "Наименьшее значение кубической функции", {
    prompt: `Найдите наименьшее значение функции на отрезке [0; ${2 * stationary}].`,
    conditionLatex: latex`f(x)=x^3-${3 * stationary * stationary}x`,
    value: String(cubicMinimum), answerDisplay: String(cubicMinimum), parameters: { stationary, left: 0, right: 2 * stationary },
    solution: [
      { text: "Найдём стационарные точки.", latex: latex`f'(x)=3x^2-${3 * stationary * stationary}=0\quad\Rightarrow\quad x=\pm${stationary}` },
      { text: `В отрезок входит только x = ${stationary}. Сравним значение в этой точке и на концах отрезка.`, latex: latex`f(0)=0,\quad f(${stationary})=${cubicMinimum},\quad f(${2 * stationary})=${2 * stationary ** 3}` },
      { text: `Наименьшее из трёх значений: ${cubicMinimum}.` },
    ],
  });
}

for (let k = 1; k <= 4; k += 1) {
  const period = k - 1;
  add(13, "trig-roots-selection", k, "Тригонометрическое уравнение и отбор корней", {
    prompt: `а) Решите уравнение. б) Укажите все его корни на отрезке [${2 * period}π; ${2 * (period + 1)}π].`,
    conditionLatex: latex`2\sin^2x-3\sin x+1=0`, parameters: { period },
    answerDisplay: `Все корни: x = π/6 + 2πn; x = 5π/6 + 2πn; x = π/2 + 2πn, n ∈ Z. На отрезке: ${12 * period + 1}π/6; ${4 * period + 1}π/2; ${12 * period + 5}π/6.`,
    solution: [
      { text: "Введём t = sin x. Разложим квадратный трёхчлен.", latex: latex`2t^2-3t+1=(2t-1)(t-1)=0` },
      { text: "Оба значения допустимы для синуса: t = 1/2 и t = 1.", latex: latex`x=\frac\pi6+2\pi n;\quad x=\frac{5\pi}6+2\pi n;\quad x=\frac\pi2+2\pi n,\quad n\in\mathbb Z` },
      { text: `Для заданного отрезка в каждой серии подходит n = ${period}; соседние значения n дают корни за его границами. Концы отрезка не являются корнями.`, latex: latex`x\in\left\{\frac{${12 * period + 1}\pi}{6};\ \frac{${4 * period + 1}\pi}{2};\ \frac{${12 * period + 5}\pi}{6}\right\}` },
    ],
    selfCheckNotes: ["Получены обе допустимые величины sin x.", "Записаны все три серии корней с целым параметром.", "Отбор выполнен для заданного отрезка; лишних и пропущенных корней нет. Это авторский ориентир, не официальные критерии."],
  });

  const side = k + 2, height = k + 1;
  add(14, "prism-line-plane-angle", k, "Перпендикулярность и угол с плоскостью", {
    prompt: `В прямом параллелепипеде ABCDA₁B₁C₁D₁ основание ABCD — квадрат со стороной ${side}, а высота AA₁ равна ${height}. Вершины основания перечислены по порядку; A₁ находится над A и аналогично для других вершин. а) Докажите, что AC перпендикулярна плоскости BB₁D. б) Найдите тангенс угла между прямой A₁C и плоскостью BB₁D.`,
    parameters: { side, height }, answerDisplay: `а) AC ⟂ (BB₁D). б) tan φ = ${side}√2/${height}.`,
    solution: [
      { text: "Диагонали квадрата AC и BD перпендикулярны. Направление BB₁ перпендикулярно основанию, а значит и направлению AC. В плоскости BB₁D через точку O пересечения диагоналей проведём прямую, параллельную BB₁. Она и BD — пересекающиеся прямые этой плоскости, перпендикулярные AC. По признаку перпендикулярности AC перпендикулярна плоскости BB₁D." },
      { text: "Вектор A₁C складывается из горизонтального вектора AC и вертикального вектора A₁A. Первый перпендикулярен плоскости, второй параллелен ей. Поэтому длина перпендикулярной компоненты равна AC, а длина проекции направления — AA₁.", latex: latex`|AC|=${side}\sqrt2,\qquad |AA_1|=${height}` },
      { text: "Тангенс угла прямой с плоскостью равен отношению перпендикулярной компоненты к длине проекции.", latex: latex`\tan\varphi=\frac{|AC|}{|AA_1|}=\frac{${side}\sqrt2}{${height}}` },
    ],
    selfCheckNotes: ["Для признака перпендикулярности указаны две пересекающиеся прямые плоскости через нужную точку.", "Угол прямой с плоскостью не перепутан с дополнительным углом к нормали.", "Обосновано отношение длин компонент. Официальная проверка решения здесь не проводится."],
  });

  const root1 = k, root2 = k + 2, pole = k + 4;
  add(15, "rational-inequality", k, "Рациональное неравенство методом интервалов", {
    prompt: "Решите неравенство, указав все допустимые значения x.",
    conditionLatex: latex`\frac{(x-${root1})(x-${root2})}{x-${pole}}\ge0`,
    parameters: { root1, root2, pole }, answerDisplay: `[${root1}; ${root2}] ∪ (${pole}; +∞)`,
    solution: [
      { text: "Знаменатель не должен равняться нулю.", latex: latex`x\ne${pole}` },
      { text: `Критические точки: ${root1}, ${root2}, ${pole}. На правом интервале все множители положительны. При переходе через каждую точку нечётной кратности знак меняется.` },
      { text: "Запишем знаки слева направо.", latex: latex`(-\infty;${root1}):\ -;\quad(${root1};${root2}):\ +;\quad(${root2};${pole}):\ -;\quad(${pole};+\infty):\ +` },
      { text: "Нули числителя включаем, полюс исключаем, поскольку деление на нуль запрещено.", latex: latex`x\in[${root1};${root2}]\cup(${pole};+\infty)` },
    ],
    selfCheckNotes: ["Область определения указана до преобразований.", "Неравенство не умножалось на выражение неизвестного знака без разбора случаев.", "Границы интервалов включены или исключены обоснованно; это авторский разбор."],
  });

  const principal = 300000 * k, rate = 5 * k + 5, principalPayment = principal / 3;
  const firstPayment = principalPayment + principal * rate / 100;
  const secondPayment = principalPayment + 2 * principal * rate / 300;
  const thirdPayment = principalPayment + principal * rate / 300;
  const total = firstPayment + secondPayment + thirdPayment;
  add(16, "loan-equal-principal", k, "Кредит с равномерным уменьшением долга", {
    prompt: `Кредит ${principal} рублей выдан на три года. В начале каждого года долг увеличивается на ${rate}%, затем в конце года вносится платёж. После каждого платежа долг должен уменьшаться на одну и ту же сумму по сравнению с долгом после предыдущего платежа (для первого года — с первоначальным кредитом). После третьего платежа долг равен нулю. Найдите общую сумму выплат и размер третьего платежа.`,
    parameters: { principal, rate, years: 3 }, answerDisplay: `Общая сумма: ${total} руб.; третий платёж: ${thirdPayment} руб.`,
    solution: [
      { text: "Ежегодно погашается треть первоначального основного долга.", latex: latex`\Delta=\frac{${principal}}3=${principalPayment}` },
      { text: `Проценты начисляют на долги до платежей: ${principal}, ${2 * principalPayment} и ${principalPayment} рублей. К процентам каждый раз добавляется погашение основного долга.` },
      { text: "Вычислим три платежа.", latex: latex`P_1=${firstPayment},\qquad P_2=${secondPayment},\qquad P_3=${thirdPayment}` },
      { text: "Сложим выплаты; это первоначальный кредит и все начисленные проценты.", latex: latex`P_1+P_2+P_3=${principal}+\frac{${rate}}{100}\left(${principal}+${2 * principalPayment}+${principalPayment}\right)=${total}` },
    ],
    selfCheckNotes: ["Проценты начисляются на текущий остаток долга, а не каждый раз на первоначальную сумму.", "Равные уменьшения основного долга не перепутаны с равными полными платежами.", "После третьего платежа остаток равен нулю; общая сумма и третий платёж вычислены отдельно."],
  });

  const radius = 3 * k, centerDistance = 5 * k, tangentLength = 4 * k;
  const areaNumerator = 192 * k * k;
  add(17, "two-tangents-area", k, "Касательные к окружности: доказательство и площадь", {
    prompt: `Из точки P вне окружности с центром O проведены касательные PA и PB; A и B — точки касания. Радиус окружности равен ${radius}, OP = ${centerDistance}. а) Докажите, что OP перпендикулярна AB. б) Найдите площадь треугольника PAB.`,
    parameters: { radius, centerDistance }, answerDisplay: `а) OP ⟂ AB. б) S = ${decimal(areaNumerator / 25)}.`,
    solution: [
      { text: "Радиусы к точкам касания перпендикулярны касательным. Прямоугольные треугольники OAP и OBP равны по общей гипотенузе OP и равным катетам OA, OB. Поэтому A и B симметричны относительно OP, и прямая OP — серединный перпендикуляр к AB. Обозначим H = OP ∩ AB." },
      { text: "Найдём длину касательной по теореме Пифагора.", latex: latex`PA=\sqrt{OP^2-OA^2}=\sqrt{${centerDistance}^2-${radius}^2}=${tangentLength}` },
      { text: "AH — высота прямоугольного треугольника OAP к гипотенузе OP. Из равенства площадей и свойства проекции катета получаем:", latex: latex`AH=\frac{OA\cdot PA}{OP}=\frac{${12 * k}}5,\quad OH=\frac{OA^2}{OP}=\frac{${9 * k}}5,\quad PH=\frac{${16 * k}}5` },
      { text: "В треугольнике PAB основание AB = 2AH, высота — PH.", latex: latex`S_{PAB}=\frac12\cdot2AH\cdot PH=\frac{${12 * k}}5\cdot\frac{${16 * k}}5=\frac{${areaNumerator}}{25}=${decimal(areaNumerator / 25)}` },
    ],
    selfCheckNotes: ["Перпендикулярность доказана, а не принята по рисунку.", "Различены OH и PH; высота к AB выходит из P.", "Площадь вычислена для PAB, а не для OAP. Приведён авторский образец оформления."],
  });

  const coefficient = k;
  add(18, "parameter-positive-roots", k, "Параметр и два положительных корня", {
    prompt: "Найдите все значения параметра a, при которых уравнение имеет два различных положительных действительных корня.",
    conditionLatex: latex`x^2-2ax+${coefficient}a+${coefficient + 1}=0`,
    parameters: { coefficient }, answerDisplay: `a > ${coefficient + 1}`,
    solution: [
      { text: "Для двух различных действительных корней необходим положительный дискриминант.", latex: latex`D=4\left(a^2-${coefficient}a-${coefficient + 1}\right)=4(a+1)(a-${coefficient + 1})>0` },
      { text: "По теореме Виета два действительных корня положительны тогда и только тогда, когда их сумма и произведение положительны.", latex: latex`x_1+x_2=2a>0,\qquad x_1x_2=${coefficient}a+${coefficient + 1}>0` },
      { text: `Условие суммы даёт a > 0; при нём произведение положительно. Из двух ветвей дискриминанта a < −1 или a > ${coefficient + 1} остаётся только вторая.` },
      { text: "Граница не включается: при нулевом дискриминанте корни совпадают.", latex: latex`a\in(${coefficient + 1};+\infty)` },
    ],
    selfCheckNotes: ["Различные корни требуют D > 0, а не D ≥ 0.", "Положительность обоих корней обоснована суммой и произведением вместе.", "Пересечены все условия; проверена исключённая граница. Официальной оценки здесь нет."],
  });

  const multiplier = [2, 3, 4, 6][k - 1];
  const divisors = Array.from({ length: multiplier }, (_, index) => index + 1).filter((d) => multiplier * multiplier % d === 0);
  const pairs = divisors.map((d) => [multiplier + d, multiplier + multiplier * multiplier / d]);
  const minimum = 4 * multiplier, maximum = (multiplier + 1) ** 2;
  add(19, "integer-product-shift", k, "Натуральные решения и экстремальные суммы", {
    prompt: `Натуральные числа x и y удовлетворяют равенству xy = ${multiplier}(x + y), причём x ≤ y. а) Найдите все пары (x; y). б) Найдите наименьшее значение x + y. в) Найдите наибольшее значение x + y. Натуральными считаются положительные целые числа.`,
    parameters: { multiplier }, answerDisplay: `Пары: ${pairs.map(([x, y]) => `(${x}; ${y})`).join(", ")}. Минимальная сумма: ${minimum}; максимальная: ${maximum}.`,
    solution: [
      { text: `Из исходного равенства следует x > ${multiplier} и y > ${multiplier}: при x ≤ ${multiplier} левая часть была бы не больше ${multiplier}y, а правая строго больше. Дополнением до произведения получаем:`, latex: latex`(x-${multiplier})(y-${multiplier})=${multiplier * multiplier}` },
      { text: `Положим d = x − ${multiplier}. Тогда d — положительный делитель ${multiplier * multiplier}, а x ≤ y означает d ≤ ${multiplier}. Перебираем все такие делители: ${divisors.join(", ")}.` },
      { text: "Каждому делителю соответствует ровно одна пара.", latex: latex`(x;y)=\left(${multiplier}+d;\ ${multiplier}+\frac{${multiplier * multiplier}}{d}\right)` },
      { text: `Полный список: ${pairs.map(([x, y]) => `(${x}; ${y})`).join(", ")}. Суммы этих пар позволяют сравнить все допустимые случаи.` },
      { text: `Минимум ${minimum} достигается при x = y = ${2 * multiplier}; максимум ${maximum} — при x = ${multiplier + 1}, y = ${multiplier + multiplier * multiplier}.` },
    ],
    selfCheckNotes: ["Обосновано, почему оба множителя после преобразования положительны.", "Перечислены все делители с условием x ≤ y, пары проверены в исходном равенстве.", "Минимум и максимум получены по полному списку; пример одной пары не заменяет доказательство полноты."],
  });
}

/** Additional hand-authored subtypes. These are not another seed of the recipes above. */
export const egeSupplementIds: string[] = [];
function addSupplement(
  number: number,
  family: string,
  title: string,
  prompt: string,
  answerDisplay: string,
  solution: Task["solution"],
  selfCheckNotes: string[],
  conditionLatex?: string,
) {
  const id = `ege-2026-${number}-${family}-v1-1`;
  const prototypeId = `ege-${number}-${family}`;
  const topicId = `ege-profile-number-${number}`;
  egePrototypes.push({ id: prototypeId, topicId, title });
  egeTasks.push(makeOriginalTask({
    id, prototypeId, topicId, examType: ["ЕГЭ"], level: "profile", examNumber: number,
    creationMethod: "original-individual-task",
    title, prompt, answerDisplay, solution, selfCheckNotes,
    answerRule: { type: "self" }, criteriaSourceUrl,
    ...(conditionLatex ? { conditionLatex } : {}),
  }));
  egeSupplementIds.push(id);
}

addSupplement(13, "double-angle-without-division", "Двойной угол и потерянные при делении корни",
  "а) Решите уравнение. б) Найдите все его корни на отрезке [−π/2; π]. Концы отрезка также проверьте.",
  "а) x = π/2 + πn; x = π/6 + 2πn; x = 5π/6 + 2πn, n ∈ Z. б) −π/2; π/6; π/2; 5π/6.", [
    { text: "Используем формулу двойного угла и перенесём всё в одну часть. Делить на cos x нельзя: при нулевом косинусе могут быть корни.", latex: latex`2\sin x\cos x-\cos x=\cos x(2\sin x-1)=0` },
    { text: "Произведение равно нулю, когда хотя бы один множитель равен нулю. Выписываем обе группы.", latex: latex`\cos x=0\ \Rightarrow\ x=\frac\pi2+\pi n;\qquad \sin x=\frac12\ \Rightarrow\ x=\frac\pi6+2\pi n\ \text{или}\ x=\frac{5\pi}6+2\pi n,\ n\in\mathbb Z` },
    { text: "Для первой серии подходят n = −1 и n = 0: −π/2 и π/2. Для каждой из двух остальных серий подходит только n = 0." },
    { text: "Получены четыре разных корня: −π/2, π/6, π/2, 5π/6. Левый конец входит в ответ; правый конец π не удовлетворяет уравнению, поскольку 0 ≠ −1." },
  ], ["cos x не сокращён без разбора случая cos x = 0.", "Записаны все серии с целым параметром.", "Проверены границы отрезка и перечислены все четыре корня; это авторские ориентиры."],
  latex`\sin 2x=\cos x`);

addSupplement(14, "pyramid-plane-distance", "Перпендикулярное сечение пирамиды",
  "В пирамиде SABC основание ABC — прямоугольный равнобедренный треугольник с прямым углом A, AB = AC = 6. Ребро SA = 4 перпендикулярно плоскости ABC. Точка M — середина BC. а) Докажите, что BC перпендикулярна плоскости SAM. б) Найдите расстояние от A до плоскости SBC.",
  "а) BC ⟂ (SAM). б) 12/√17 = 12√17/17.", [
    { text: "В равнобедренном треугольнике ABC медиана AM является высотой, поэтому AM ⟂ BC. Через M проведём прямую, параллельную SA: она лежит в плоскости SAM и перпендикулярна BC, так как SA перпендикулярно плоскости основания." },
    { text: "BC перпендикулярна двум пересекающимся в M прямым плоскости SAM, поэтому BC ⟂ (SAM). По теореме Пифагора BC = 6√2, а медиана из прямого угла AM = BC/2 = 3√2." },
    { text: "В прямоугольном треугольнике SAM угол A прямой. Опустим из A перпендикуляр AH на SM. Через H в плоскости SBC можно провести прямую, параллельную BC; эта прямая перпендикулярна всей плоскости SAM и потому перпендикулярна AH." },
    { text: "AH перпендикулярна пересекающимся прямым SM и проведённой через H параллели к BC. Значит, AH ⟂ (SBC), и искомое расстояние равно AH." },
    { text: "Найдём SM и выразим одну и ту же площадь треугольника SAM через разные основания.", latex: latex`SM=\sqrt{4^2+(3\sqrt2)^2}=\sqrt{34},\quad \frac12SA\cdot AM=\frac12SM\cdot AH,\quad AH=\frac{12\sqrt2}{\sqrt{34}}=\frac{12}{\sqrt{17}}` },
  ], ["В признаке перпендикулярности к плоскости использованы две пересекающиеся прямые.", "Доказано, что выбранная высота сечения перпендикулярна плоскости SBC.", "Расстояние найдено как длина перпендикуляра, без подмены ребром или наклонной; ориентиры авторские."]);

addSupplement(15, "logarithmic-sum-domain", "Сумма логарифмов в неравенстве",
  "Решите неравенство. Запишите область допустимых значений до объединения логарифмов.",
  "(1; 3]", [
    { text: "Оба аргумента логарифмов положительны. Пересечение ограничений x > 1 и x > −1 даёт x > 1." },
    { text: "В области определения можно объединить логарифмы. Основание 2 больше 1, поэтому направление неравенства сохраняется.", latex: latex`\log_2((x-1)(x+1))\le3\ \Longleftrightarrow\ x^2-1\le8` },
    { text: "Решение квадратного неравенства: x² ≤ 9, то есть −3 ≤ x ≤ 3. Пересечём этот отрезок с x > 1." },
    { text: "Ответ: 1 < x ≤ 3. При x = 3 сумма логарифмов равна log₂(2 · 4) = 3, а при x = 1 один аргумент нулевой, поэтому левую границу исключаем." },
  ], ["Учтены отдельные положительные аргументы, а не только их произведение.", "Знак сохранён по возрастанию логарифма с основанием 2.", "Проверены обе границы ответа. Это авторский разбор, не официальная схема оценивания."],
  latex`\log_2(x-1)+\log_2(x+1)\le3`);

addSupplement(16, "deposit-with-withdrawals", "Вклад с ежегодным снятием",
  "На вклад внесли 200 000 рублей. В конце каждого года банк начисляет один и тот же неотрицательный годовой процент, после чего вкладчик снимает 50 000 рублей. После второго такого снятия на вкладе осталось 178 000 рублей. Дополнительных пополнений и комиссий нет. Найдите годовую процентную ставку и проверьте остаток после каждого года.",
  "20% годовых; остатки после снятий: 190 000 и 178 000 рублей.", [
    { text: "Обозначим годовой множитель q = 1 + p/100. По условию p ≥ 0, поэтому q ≥ 1. После первого начисления и снятия останется 200000q − 50000." },
    { text: "На второй год проценты начисляются именно на этот остаток. Составим уравнение после второго снятия.", latex: latex`(200000q-50000)q-50000=178000` },
    { text: "Приведём к квадратному уравнению и разложим на множители.", latex: latex`200000q^2-50000q-228000=0\ \Longleftrightarrow\ 100q^2-25q-114=(5q-6)(20q+19)=0` },
    { text: "Получаем q = 6/5 = 1,2 или q = −19/20. Второй корень противоречит q ≥ 1. Поэтому p = 100(q − 1) = 20%." },
    { text: "Проверка: 200000 · 1,2 − 50000 = 190000; 190000 · 1,2 − 50000 = 178000. Средств хватает на каждое снятие, ставка неотрицательна." },
  ], ["Снятие происходит после начисления процентов в каждом году.", "Проценты второго года начислены на оставшийся вклад.", "Отброшен недопустимый множитель и проверены оба остатка; авторские ориентиры."]);

addSupplement(17, "pedal-circle-chord", "Окружность на высоте и хорда",
  "В треугольнике ABC стороны AB = 13, AC = 15, BC = 14. Высота AD опущена на BC, D лежит на стороне BC. Из D опущены перпендикуляры DP и DQ на AB и AC соответственно. а) Докажите, что A, P, D, Q лежат на одной окружности. б) Найдите PQ.",
  "а) Окружность с диаметром AD. б) PQ = 672/65.", [
    { text: "AP лежит на AB, поэтому ∠APD = 90°. Аналогично ∠AQD = 90°. По обратной теореме об угле, опирающемся на диаметр, обе точки P и Q лежат на окружности с диаметром AD. Вместе с её концами A и D это доказывает пункт а)." },
    { text: "Пусть BD = x, AD = h > 0. Две теоремы Пифагора дают x² + h² = 169 и (14 − x)² + h² = 225. Вычитание даёт x = 5, затем h = 12." },
    { text: "Площадь ABC равна 14 · 12 / 2 = 84. Выражая её через две стороны и угол между ними, найдём синус угла A.", latex: latex`\sin A=\frac{2S}{AB\cdot AC}=\frac{168}{13\cdot15}=\frac{56}{65}` },
    { text: "Точки P и Q находятся на лучах AB и AC, поэтому ∠PAQ = ∠BAC. В окружности APDQ радиус равен AD/2 = 6. Расширенная теорема синусов для вписанного треугольника APQ даёт:", latex: latex`PQ=2R\sin\angle PAQ=12\cdot\frac{56}{65}=\frac{672}{65}` },
    { text: "Полученная длина меньше диаметра 12, как и должно быть для хорды. Использована окружность с диаметром AD, а не описанная окружность ABC." },
  ], ["Принадлежность обеих точек одной окружности обоснована прямыми углами.", "Высота и синус угла A вычислены из исходных сторон.", "В формуле хорды взят радиус именно окружности APDQ; это авторский образец самопроверки."]);

addSupplement(18, "modulus-line-intersections", "Параметр и пересечения суммы модулей",
  "Найдите все действительные a, при которых уравнение имеет ровно два различных действительных корня. Проверьте граничные значения параметра.",
  "3/2 < a < 2", [
    { text: "Раскроем сумму модулей по точкам −1 и 2. Для x < −1 получаем 1 − 2x, для −1 ≤ x ≤ 2 — 3, для x > 2 — 2x − 1." },
    { text: "На левой ветви уравнение (a + 2)x = 1 имеет допустимый корень x = 1/(a + 2) < −1 только при −3 < a < −2. При a = −2 корня нет." },
    { text: "В средней части 3 = ax. При a = 0 корней нет; при a ≠ 0 корень 3/a попадает в [−1; 2] ровно при a ≤ −3 или a ≥ 3/2." },
    { text: "На правой ветви (2 − a)x = 1. Условие x > 2 равносильно 0 < 2 − a < 1/2, то есть 3/2 < a < 2. При a = 2 уравнение этой ветви невозможно." },
    { text: "При отрицательных a условия левой и средней частей не пересекаются, поэтому двух разных корней нет. При 3/2 < a < 2 есть один корень в средней части и один справа; иных корней нет." },
    { text: "При a = 3/2 получается одна точка x = 2, а не два корня: это общая граница частей. При a = 2 остаётся единственный корень x = 3/2. Поэтому обе границы исключаются." },
  ], ["Каждый найденный корень проверен в своём промежутке раскрытия модулей.", "Разобраны нулевые коэффициенты a, a + 2 и 2 − a.", "Совпадение на границе частей не посчитано дважды. Ориентиры авторские."],
  latex`|x-2|+|x+1|=ax`);

addSupplement(19, "integer-linear-constraint", "Целочисленное ограничение и максимум",
  "Положительные целые числа x и y удовлетворяют x + 2y = 37. а) Может ли произведение xy равняться 168? б) Найдите наибольшее возможное произведение xy. в) Найдите наименьшее возможное |x − y|. В каждом пункте обоснуйте ответ.",
  "а) Да: (21; 8). б) 171 при (19; 9). в) 1 при (13; 12).", [
    { text: "Выразим x = 37 − 2y. Из положительности и целочисленности следует 1 ≤ y ≤ 18. Это полный диапазон допустимых y." },
    { text: "а) При y = 8 получается x = 21: сумма x + 2y = 37 и произведение 21 · 8 = 168. Значит, такое произведение возможно." },
    { text: "б) Произведение равно y(37 − 2y). Выделим полный квадрат.", latex: latex`xy=-2\left(y-\frac{37}{4}\right)^2+\frac{1369}{8}` },
    { text: "Вершина параболы находится при y = 9,25. Ближайшее допустимое целое y = 9; следующее y = 10 дальше от вершины, остальные ещё дальше. При y = 9 имеем x = 19 и xy = 171. Тем самым доказан максимум по всем целым y." },
    { text: "в) Разность x − y = 37 − 3y не может быть нулевой, потому что 37 не делится на 3. Её модуль — положительное целое число, значит не меньше 1. При y = 12 и x = 13 достигается 1." },
  ], ["Установлен полный конечный диапазон целочисленных решений.", "Максимум доказан с учётом целых y, а не взят в недопустимой вершине параболы.", "Для каждого экстремума приведён достигающий его пример и обоснована граница; авторские ориентиры."]);
