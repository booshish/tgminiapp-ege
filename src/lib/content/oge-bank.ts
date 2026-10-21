import type { Task } from "../tasks";
import { makeOriginalTask, type OriginalTaskInput } from "./task-factory";

/** Fixed, reproducible author variants. Changing the recipe requires a new ID revision. */
export type OgeGeneratorCase = {
  taskId: string;
  number: number;
  variant: number;
  parameters: Record<string, number>;
};
export const ogeGeneratorCases: OgeGeneratorCase[] = [];
export const ogeTasks: Task[] = [];
export const ogePrototypes: { id: string; topicId: string; title: string }[] = [];
const criteriaUrl = "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory";
const decimal = (value: number) => String(value).replace(".", ",");
const fraction = (numerator: number, denominator: number) => `${numerator}/${denominator}`;

function add(
  number: number,
  variant: number,
  prototype: string,
  title: string,
  parameters: Record<string, number>,
  content: Omit<OriginalTaskInput, "id" | "examType" | "level" | "examNumber" | "topicId" | "prototypeId" | "title">,
) {
  const id = `oge-2026-n${number}-${prototype}-v${variant + 1}-r1`;
  const prototypeId = `oge-${number}-${prototype}`;
  const topicId = `oge-number-${number}`;
  if (!ogePrototypes.some((entry) => entry.id === prototypeId))
    ogePrototypes.push({ id: prototypeId, topicId, title });
  ogeTasks.push(makeOriginalTask({
    id, examType: ["ОГЭ"], level: null, examNumber: number,
    topicId, prototypeId, title, ...content,
  }, "oge-bank"));
  ogeGeneratorCases.push({ taskId: id, number, variant, parameters });
}

for (let v = 0; v < 10; v += 1) {
  const length = 18 + 2 * v;
  const width = 12 + v;
  const houseLength = 6 + v;
  const houseWidth = 4 + v;
  const patioLength = 3 + v;
  const patioWidth = 2 + v;
  const gate = 3 + v % 3;
  const price = 100 + 10 * v;
  const sharedConditionId = `oge-land-plan-v${v + 1}-r1`;
  const group = `Общее условие к группе №1–5. На плане прямоугольного участка в масштабе 1:200 его стороны равны ${decimal(length / 2)} см и ${decimal(width / 2)} см. Дом — прямоугольник ${decimal(houseLength / 2)} см × ${decimal(houseWidth / 2)} см в левом нижнем углу плана. Площадка — прямоугольник ${decimal(patioLength / 2)} см × ${decimal(patioWidth / 2)} см в правом верхнем углу. Дом и площадка не перекрываются; остальная площадь занята газоном. Размер клетки на плане значения не имеет: все размеры заданы в сантиметрах. Для площадки используют квадратные плитки со стороной 50 см без промежутков и обрезки. Вдоль границы участка нужен забор, кроме ворот шириной ${gate} м; метр забора стоит ${price} рублей.`;
  const common = { length, width, houseLength, houseWidth, patioLength, patioWidth, gate, price };
  const perimeter = 2 * (length + width);
  const houseArea = houseLength * houseWidth;
  const patioArea = patioLength * patioWidth;
  const lawnArea = length * width - houseArea - patioArea;
  const parts = [
    { number: 1, prototype: "plan-perimeter", title: "Масштаб и периметр участка", question: "Найдите периметр участка в метрах.", value: perimeter,
      solution: [
        { text: "Масштаб 1:200 означает: 1 см плана соответствует 200 см, то есть 2 м на местности." },
        { text: `Стороны участка: ${decimal(length / 2)} · 2 = ${length} м и ${decimal(width / 2)} · 2 = ${width} м.` },
        { text: `Периметр прямоугольника равен ${perimeter} м.`, latex: `P=2(${length}+${width})=${perimeter}` },
      ] },
    { number: 2, prototype: "plan-house-area", title: "Площадь дома по плану", question: "Найдите площадь, занятую домом, в квадратных метрах.", value: houseArea,
      solution: [
        { text: "Для линейных размеров 1 см плана соответствует 2 м на местности." },
        { text: `Стороны дома равны ${houseLength} м и ${houseWidth} м.` },
        { text: `Площадь дома — ${houseArea} м².`, latex: `S=${houseLength}\\cdot${houseWidth}=${houseArea}` },
      ] },
    { number: 3, prototype: "plan-lawn-area", title: "Свободная площадь участка", question: "Найдите площадь газона в квадратных метрах.", value: lawnArea,
      solution: [
        { text: `В масштабе 1:200 стороны участка равны ${length} и ${width} м, дома — ${houseLength} и ${houseWidth} м, площадки — ${patioLength} и ${patioWidth} м.` },
        { text: "Дом и площадка не перекрываются. Их площади нужно вычесть из площади участка." },
        { text: `Площадь газона — ${lawnArea} м².`, latex: `S=${length}\\cdot${width}-${houseLength}\\cdot${houseWidth}-${patioLength}\\cdot${patioWidth}=${lawnArea}` },
      ] },
    { number: 4, prototype: "plan-tiles", title: "Плитки для площадки", question: "Сколько плиток необходимо для покрытия всей площадки?", value: patioArea * 4,
      solution: [
        { text: `Реальные стороны площадки равны ${patioLength} и ${patioWidth} м.` },
        { text: "Сторона плитки 50 см = 0,5 м. По каждой стороне укладывается целое число плиток, поэтому обрезка не нужна." },
        { text: `Число плиток равно ${patioArea * 4}.`, latex: `N=\\frac{${patioLength}}{0{,}5}\\cdot\\frac{${patioWidth}}{0{,}5}=${patioArea * 4}` },
      ] },
    { number: 5, prototype: "plan-fence-cost", title: "Стоимость ограждения", question: "Сколько рублей стоит забор без ворот? Стоимость работ и самих ворот не учитывайте.", value: (perimeter - gate) * price,
      solution: [
        { text: `Стороны участка равны ${length} и ${width} м, периметр — ${perimeter} м.` },
        { text: `Ворота занимают ${gate} м границы. Длина забора равна ${perimeter - gate} м.` },
        { text: `Стоимость забора — ${(perimeter - gate) * price} рублей.`, latex: `C=(${perimeter}-${gate})\\cdot${price}=${(perimeter - gate) * price}` },
      ] },
  ];
  for (const entry of parts) add(entry.number, v, entry.prototype, entry.title, common, {
    sharedConditionId, prompt: `${group}\n\n${entry.question}`,
    answerRule: { type: "number", value: String(entry.value) }, answerDisplay: String(entry.value),
    solution: entry.solution,
  });

  const a = v + 1, b = [2, 4, 5, 8, 10, 20, 25, 40, 50, 100][v];
  const c = v + 3, d = [5, 10, 20, 25, 40, 50, 100, 125, 200, 250][v];
  add(6, v, "fraction-sum", "Действия с обыкновенными дробями", { a, b, c, d }, {
    prompt: "Вычислите значение выражения. Ответ запишите целым числом или конечной десятичной дробью.",
    conditionLatex: `\\frac{${a}}{${b}}+\\frac{${c}}{${d}}`,
    answerRule: { type: "number", value: fraction(a * d + c * b, b * d) },
    answerDisplay: decimal((a * d + c * b) / (b * d)),
    solution: [
      { text: `Общий знаменатель можно взять равным произведению ${b} · ${d} = ${b * d}.` },
      { text: "Домножим числитель и знаменатель каждой дроби на недостающий множитель.", latex: `\\frac{${a}\\cdot${d}+${c}\\cdot${b}}{${b}\\cdot${d}}=\\frac{${a * d + c * b}}{${b * d}}` },
      { text: "Полученную обыкновенную дробь можно перевести в конечную десятичную. Равная ей обыкновенная дробь также принимается в тренировке." },
    ],
  });
  const k = v + 2, radicand = k * k + k;
  add(7, v, "root-interval", "Число на координатной прямой", { k, radicand }, {
    prompt: `Между какими двумя соседними целыми числами находится √${radicand}? В ответ запишите меньшее из этих чисел.`,
    answerRule: { type: "number", value: String(k) }, answerDisplay: String(k),
    solution: [
      { text: "Сравним подкоренное число с квадратами соседних целых чисел.", latex: `${k}^2=${k * k}<${radicand}<${(k + 1) * (k + 1)}=${k + 1}^2` },
      { text: "На неотрицательных числах извлечение квадратного корня сохраняет порядок.", latex: `${k}<\\sqrt{${radicand}}<${k + 1}` },
      { text: `Меньшее из соседних целых — ${k}.` },
    ],
  });
  const x = 2 * k + 1;
  add(8, v, "difference-squares", "Преобразование алгебраической дроби", { a: k, x }, {
    prompt: `Упростите выражение и найдите его значение при x = ${x}.`,
    conditionLatex: `\\frac{x^2-${k * k}}{x-${k}}`,
    answerRule: { type: "number", value: String(x + k) }, answerDisplay: String(x + k),
    solution: [
      { text: `Область допустимых значений: x ≠ ${k}. Заданное значение ${x} допустимо.` },
      { text: "Разложим числитель как разность квадратов и сократим ненулевой множитель.", latex: `\\frac{(x-${k})(x+${k})}{x-${k}}=x+${k}` },
      { text: `Подставим x = ${x}: ${x} + ${k} = ${x + k}.` },
    ],
  });
  add(9, v, "quadratic-larger-root", "Квадратное уравнение", { k }, {
    prompt: "Решите уравнение. Если корней несколько, в ответ запишите больший корень.",
    conditionLatex: `x^2-2x-${k * (k + 2)}=0`,
    answerRule: { type: "number", value: String(k + 2) }, answerDisplay: String(k + 2),
    solution: [
      { text: "Найдём два числа с суммой 2 и произведением, равным свободному члену.", latex: `x^2-2x-${k * (k + 2)}=(x+${k})(x-${k + 2})` },
      { text: `Произведение равно нулю, когда x = −${k} или x = ${k + 2}.` },
      { text: `Больший корень — ${k + 2}.` },
    ],
  });
  const red = 10 + v, blue = 20 + 2 * v, green = 70 - 3 * v, total = red + blue + green;
  add(10, v, "not-red-ball", "Равновозможные исходы", { red, blue, green }, {
    prompt: `В непрозрачном мешке лежат ${red} красных, ${blue} синих и ${green} зелёных шаров, одинаковых на ощупь. Наугад достают один шар. Найдите вероятность того, что он не красный. Ответ запишите десятичной дробью.`,
    answerRule: { type: "number", value: fraction(blue + green, total) }, answerDisplay: decimal((blue + green) / total),
    solution: [
      { text: `Всего ${red} + ${blue} + ${green} = ${total} равновозможных исходов.` },
      { text: `Подходят синие и зелёные шары: ${blue} + ${green} = ${blue + green}.` },
      { text: "Делим число благоприятных исходов на число всех исходов.", latex: `P=\\frac{${blue + green}}{${total}}` },
    ],
  });
  const slope = v + 1, intercept = slope * (v + 3);
  add(11, v, "line-through-points", "График линейной функции", { slope, intercept }, {
    prompt: `График линейной функции проходит через точки A(1; ${slope + intercept}) и B(3; ${3 * slope + intercept}). Найдите абсциссу точки пересечения этого графика с осью Ox.`,
    answerRule: { type: "number", value: fraction(-intercept, slope) }, answerDisplay: String(-intercept / slope),
    solution: [
      { text: "Найдём угловой коэффициент по двум точкам.", latex: `k=\\frac{${3 * slope + intercept}-${slope + intercept}}{3-1}=${slope}` },
      { text: `Из координат A получаем b = ${slope + intercept} − ${slope} = ${intercept}. Значит, y = ${slope}x + ${intercept}.` },
      { text: "На оси Ox значение y равно нулю.", latex: `${slope}x+${intercept}=0,\\quad x=-\\frac{${intercept}}{${slope}}` },
    ],
  });
  const mass = v + 2, speed = 2 * (v + 3), energy = mass * speed * speed / 2;
  add(12, v, "kinetic-energy", "Вычисление по формуле", { mass, speed, energy }, {
    prompt: `Кинетическая энергия тела вычисляется по формуле E = mv²/2, где m — масса в килограммах, v — скорость в метрах в секунду, E — энергия в джоулях. Найдите массу тела, если E = ${energy} Дж, v = ${speed} м/с. Ответ дайте в килограммах.`,
    conditionLatex: "E=\\frac{mv^2}{2}",
    answerRule: { type: "number", value: String(mass) }, answerDisplay: String(mass),
    solution: [
      { text: "Выразим массу. Скорость ненулевая, поэтому можно разделить на её квадрат.", latex: "m=\\frac{2E}{v^2}" },
      { text: "Подставим исходные данные.", latex: `m=\\frac{2\\cdot${energy}}{${speed}^2}=${mass}` },
      { text: `Масса равна ${mass} кг.` },
    ],
  });
  const lower = v + 1, offset = v + 2, right = 3 * v + 8, upper = 2 * v + 5;
  add(13, v, "integer-in-system", "Целое решение системы неравенств", { lower, offset, right }, {
    prompt: "Найдите наибольшее целое решение системы неравенств.",
    conditionLatex: `\\begin{cases}2x-${offset}<${right},\\\\x\\ge${lower}.\\end{cases}`,
    answerRule: { type: "number", value: String(upper - 1) }, answerDisplay: String(upper - 1),
    solution: [
      { text: "Решим первое неравенство; при делении на положительное число знак сохраняется.", latex: `2x<${right + offset},\\quad x<${upper}` },
      { text: "Учтём второе ограничение.", latex: `${lower}\\le x<${upper}` },
      { text: `Верхняя граница ${upper} исключена, поэтому наибольшее целое решение — ${upper - 1}.` },
    ],
  });
  const first = v + 2, difference = v + 1, index = v + 5;
  add(14, v, "arithmetic-term", "Арифметическая прогрессия", { first, difference, index }, {
    prompt: `В арифметической прогрессии первый член равен ${first}, разность равна ${difference}. Найдите ${index}-й член прогрессии.`,
    answerRule: { type: "number", value: String(first + (index - 1) * difference) }, answerDisplay: String(first + (index - 1) * difference),
    solution: [
      { text: "До n-го члена от первого нужно сделать n − 1 одинаковых прибавлений.", latex: "a_n=a_1+(n-1)d" },
      { text: "Подставим номер члена, первый член и разность.", latex: `a_{${index}}=${first}+(${index}-1)\\cdot${difference}=${first + (index - 1) * difference}` },
      { text: `Искомый член — ${first + (index - 1) * difference}.` },
    ],
  });
  const apex = 40 + 2 * v;
  add(15, v, "isosceles-angle", "Углы равнобедренного треугольника", { apex }, {
    prompt: `В треугольнике ABC стороны AB и AC равны, угол BAC равен ${apex}°. Найдите угол ABC. Ответ дайте в градусах.`,
    answerRule: { type: "number", value: String((180 - apex) / 2) }, answerDisplay: String((180 - apex) / 2),
    solution: [
      { text: "Равным сторонам AB и AC противолежат равные углы C и B." },
      { text: "Сумма углов треугольника равна 180°.", latex: `2\\angle B+${apex}^{\\circ}=180^{\\circ}` },
      { text: `Угол ABC равен (180 − ${apex}) : 2 = ${(180 - apex) / 2}°.` },
    ],
  });
  const scale = v + 1, radius = 5 * scale, distance = 3 * scale;
  add(16, v, "circle-chord", "Длина хорды окружности", { radius, distance }, {
    prompt: `Радиус окружности равен ${radius} см. Расстояние от её центра до хорды AB равно ${distance} см. Найдите длину хорды AB в сантиметрах.`,
    answerRule: { type: "number", value: String(8 * scale) }, answerDisplay: String(8 * scale),
    solution: [
      { text: "Перпендикуляр из центра окружности делит хорду пополам. Обозначим его основание M." },
      { text: "В прямоугольном треугольнике OMA гипотенуза — радиус.", latex: `AM=\\sqrt{${radius}^2-${distance}^2}=${4 * scale}` },
      { text: `Длина хорды AB = 2 · AM = ${8 * scale} см.` },
    ],
  });
  const diagonal1 = 2 * (v + 3), diagonal2 = 2 * (v + 5);
  add(17, v, "rhombus-area", "Площадь ромба", { diagonal1, diagonal2 }, {
    prompt: `Диагонали ромба равны ${diagonal1} см и ${diagonal2} см. Найдите его площадь в квадратных сантиметрах.`,
    answerRule: { type: "number", value: String(diagonal1 * diagonal2 / 2) }, answerDisplay: String(diagonal1 * diagonal2 / 2),
    solution: [
      { text: "Диагонали ромба перпендикулярны и делятся точкой пересечения пополам." },
      { text: "Четыре прямоугольных треугольника дают половину произведения диагоналей.", latex: "S=\\frac{d_1d_2}{2}" },
      { text: `Площадь равна ${diagonal1 * diagonal2 / 2} см².`, latex: `S=\\frac{${diagonal1}\\cdot${diagonal2}}{2}=${diagonal1 * diagonal2 / 2}` },
    ],
  });
  const bx = v + 5, cy = v + 4;
  add(18, v, "grid-triangle-area", "Площадь фигуры по клеткам", { ax: 1, ay: 1, bx, by: 1, cx: 2, cy }, {
    prompt: `На клетчатой бумаге с клетками 1 × 1 отмечен треугольник с вершинами A(1; 1), B(${bx}; 1), C(2; ${cy}). Координаты отсчитываются по линиям сетки в клетках. Найдите площадь треугольника.`,
    answerRule: { type: "number", value: fraction((bx - 1) * (cy - 1), 2) }, answerDisplay: decimal((bx - 1) * (cy - 1) / 2),
    solution: [
      { text: `Основание AB горизонтально, его длина равна ${bx} − 1 = ${bx - 1} клеток.` },
      { text: `Расстояние от C до прямой AB равно разности ординат: ${cy} − 1 = ${cy - 1} клеток.` },
      { text: "Площадь — половина произведения основания и высоты.", latex: `S=\\frac{${bx - 1}\\cdot${cy - 1}}{2}=${decimal((bx - 1) * (cy - 1) / 2).replace(",", "{,}")}` },
    ],
  });
  const polygonSides = v + 3;
  const statements = [
    { text: `Если катеты прямоугольного треугольника равны ${3 * scale} и ${4 * scale}, то его гипотенуза равна ${5 * scale}.`, true: true, reason: `Верно по теореме Пифагора: ${3 * scale}² + ${4 * scale}² = ${5 * scale}².` },
    { text: `Площадь круга радиуса ${scale} равна ${scale * scale + 1}π.`, true: false, reason: `Неверно: площадь круга равна πr² = ${scale * scale}π.` },
    { text: `Сумма внутренних углов выпуклого ${polygonSides}-угольника равна ${180 * (polygonSides - 2)}°.`, true: true, reason: `Верно: сумма углов выпуклого n-угольника равна 180°(n − 2).` },
  ];
  const rotated = [...statements.slice(v % 3), ...statements.slice(0, v % 3)];
  const correctNumbers = rotated.flatMap((statement, i) => statement.true ? [i + 1] : []).join("");
  add(19, v, "geometric-statements", "Верные геометрические утверждения", { scale, polygonSides, rotation: v % 3 }, {
    prompt: `Какие утверждения верны? Запишите номера верных утверждений подряд в возрастающем порядке, без пробелов и разделителей.\n\n${rotated.map((statement, i) => `${i + 1}. ${statement.text}`).join("\n")}`,
    answerRule: { type: "number", value: correctNumbers }, answerDisplay: correctNumbers,
    solution: rotated.map((statement, i) => ({ text: `${i + 1}. ${statement.reason}` })).concat({ text: `Номера верных утверждений: ${correctNumbers}.` }),
  });
}

for (let v = 0; v < 4; v += 1) {
  const excluded = v + 1, root = v + 4;
  add(20, v, "rational-equation", "Рациональное уравнение и ОДЗ", { excluded, root }, {
    prompt: "Решите уравнение. Запишите область допустимых значений и обоснуйте, какие найденные значения являются корнями.",
    conditionLatex: `\\frac{x^2-${excluded + root}x+${excluded * root}}{x-${excluded}}=0`,
    answerRule: { type: "self" }, answerDisplay: `x = ${root}`,
    solution: [
      { text: `Знаменатель не может быть нулём: x ≠ ${excluded}.` },
      { text: "Дробь равна нулю, когда числитель равен нулю, а знаменатель ненулевой.", latex: `(x-${excluded})(x-${root})=0` },
      { text: `Получены кандидаты x = ${excluded} и x = ${root}. Первый исключён ОДЗ.` },
      { text: `При x = ${root} числитель нулевой, знаменатель равен ${root - excluded} ≠ 0. Ответ: ${root}.` },
    ],
    selfCheckNotes: ["Указано ограничение знаменателя.", "Числитель правильно разложен и найдены оба кандидата.", "Недопустимое значение исключено, итог проверен. Это авторские ориентиры, а не официальная схема баллов."],
    criteriaSourceUrl: criteriaUrl,
  });
  const faster = v + 4, slower = faster + 2;
  const timeNumerator = faster * slower, timeDenominator = faster + slower;
  add(21, v, "joint-work", "Совместная работа двух труб", { faster, slower }, {
    prompt: `Две трубы вместе наполняют пустой бассейн за ${timeNumerator}/${timeDenominator} часа. Первая труба одна наполняет его на 2 часа быстрее второй. Производительности постоянны; утечки нет. За сколько часов каждая труба отдельно наполнит бассейн? Составьте уравнение и обоснуйте выбор корня.`,
    answerRule: { type: "self" }, answerDisplay: `Первая — ${faster} ч, вторая — ${slower} ч.`,
    solution: [
      { text: "Пусть первой трубе нужно x часов, x > 0. Тогда второй — x + 2, а их производительности равны 1/x и 1/(x + 2)." },
      { text: "Сумма производительностей равна обратному времени совместной работы.", latex: `\\frac1x+\\frac1{x+2}=\\frac{${timeDenominator}}{${timeNumerator}}` },
      { text: "Умножаем на положительное при x > 0 произведение знаменателей и приводим к произведению множителей.", latex: `(x-${faster})(${faster + 1}x+${faster + 2})=0` },
      { text: `Корень −${faster + 2}/${faster + 1} отрицательный и не подходит. Остаётся x = ${faster}; второй трубе нужно ${slower} часов.` },
      { text: "Проверка: сумма обратных времён равна заданной совместной производительности.", latex: `\\frac1{${faster}}+\\frac1{${slower}}=\\frac{${timeDenominator}}{${timeNumerator}}` },
    ],
    selfCheckNotes: ["Времена и производительности различены; x > 0.", "Составлено уравнение совместной работы и найден положительный корень.", "Указаны времена обеих труб и проверены исходные условия. Официальная оценка по этому авторскому прототипу не подтверждена."],
    criteriaSourceUrl: criteriaUrl,
  });
  const removed = v + 2;
  add(22, v, "line-with-hole", "График с исключённой точкой", { removed }, {
    prompt: "Постройте график функции, сохранив все ограничения исходного выражения. Найдите значение m, при котором прямая y = m не имеет с этим графиком общих точек.",
    conditionLatex: `y=\\frac{x^2-${removed * removed}}{x-${removed}}`,
    answerRule: { type: "self" }, answerDisplay: `Прямая y = x + ${removed} без точки (${removed}; ${2 * removed}); m = ${2 * removed}.`,
    solution: [
      { text: `Область определения: x ≠ ${removed}.` },
      { text: "Сократим общий множитель, сохранив ограничение.", latex: `y=\\frac{(x-${removed})(x+${removed})}{x-${removed}}=x+${removed},\\quad x\\ne${removed}` },
      { text: `Нужно построить прямую y = x + ${removed} и выколоть точку (${removed}; ${2 * removed}).` },
      { text: `Горизонтальная прямая y = m пересекает полную прямую при x = m − ${removed}. Пересечение пропадает только при x = ${removed}.` },
      { text: `Следовательно, m = ${2 * removed}. При любом другом m существует ровно одна общая точка.` },
    ],
    selfCheckNotes: ["Показана ОДЗ, исключённая точка не возвращена после сокращения.", "График построен с выколотой точкой.", "Обоснованы единственность значения m и наличие пересечения при остальных m. Ориентиры авторские."],
    criteriaSourceUrl: criteriaUrl,
  });
  const a = v + 2, b = v + 3, projection1 = a * a, projection2 = b * b;
  const height = a * b, area = (projection1 + projection2) * height / 2;
  add(23, v, "altitude-projections", "Высота к гипотенузе", { projection1, projection2 }, {
    prompt: `В прямоугольном треугольнике ABC угол C равен 90°. Высота CD делит гипотенузу AB на отрезки AD = ${projection1} см и DB = ${projection2} см. Найдите площадь треугольника ABC и обоснуйте используемую связь высоты с отрезками гипотенузы.`,
    answerRule: { type: "self" }, answerDisplay: `${decimal(area)} см²`,
    solution: [
      { text: "Треугольники ACD и CBD подобны: у обоих прямой угол при D, а ∠ACD = ∠CBD как углы, дополняющие ∠A до 90°." },
      { text: "Из соответствующих сторон подобных треугольников получаем AD/CD = CD/DB.", latex: `CD^2=AD\\cdot DB=${projection1}\\cdot${projection2},\\quad CD=${height}` },
      { text: `Гипотенуза AB = ${projection1} + ${projection2} = ${projection1 + projection2} см.` },
      { text: "Площадь найдём через основание AB и высоту CD.", latex: `S=\\frac12\\cdot${projection1 + projection2}\\cdot${height}=${decimal(area).replace(",", "{,}")}` },
    ],
    selfCheckNotes: ["Обосновано подобие или корректно применена теорема о высоте к гипотенузе.", "Вычислены высота и вся гипотенуза, а не один её отрезок.", "Площадь найдена с коэффициентом 1/2 и верными единицами. Это авторская проверка шагов."],
    criteriaSourceUrl: criteriaUrl,
  });
}

const proofs: { prototype: string; title: string; prompt: string; answer: string; steps: string[] }[] = [
  {
    prototype: "trapezoid-midpoints",
    title: "Середины оснований трапеции",
    prompt: "В выпуклой трапеции ABCD основания AB и CD параллельны. Диагонали AC и BD пересекаются в точке O. Точки M и N — середины оснований AB и CD соответственно. Докажите, что M, O и N лежат на одной прямой.",
    answer: "Точки M, O и N лежат на одной прямой.",
    steps: [
      "Треугольники AOB и COD подобны по двум углам: углы при O вертикальные, а углы при основаниях равны из параллельности AB и CD.",
      "Обозначим AB/CD = k > 0. Из подобия OA/OC = OB/OD = k. Векторы OA и OC противоположно направлены; так же направлены OB и OD.",
      "Возьмём O за начало координат. Тогда векторы a = −kc и b = −kd. Поскольку M и N — середины, m = (a + b)/2 = −k(c + d)/2 = −kn.",
      "Следовательно, векторы OM и ON коллинеарны. Поэтому точки M, O и N лежат на одной прямой. Можно вместо координат использовать гомотетию с центром O и коэффициентом −k.",
    ],
  },
  {
    prototype: "two-tangents",
    title: "Касательные и хорда касания",
    prompt: "Из точки P вне окружности с центром O проведены касательные PA и PB, где A и B — разные точки касания. Докажите, что прямая OP перпендикулярна хорде AB и проходит через её середину.",
    answer: "OP — серединный перпендикуляр к AB.",
    steps: [
      "Радиусы OA и OB равны. Радиус, проведённый в точку касания, перпендикулярен касательной: OA ⟂ PA и OB ⟂ PB.",
      "Прямоугольные треугольники OAP и OBP равны по гипотенузе OP и катету OA = OB. Значит, PA = PB.",
      "Точки O и P равноудалены от A и B. Каждая лежит на серединном перпендикуляре к отрезку AB; при этом O ≠ P.",
      "Через две разные точки проходит единственная прямая. Поэтому OP совпадает с серединным перпендикуляром: перпендикулярна AB и делит её пополам.",
    ],
  },
  {
    prototype: "acute-altitudes",
    title: "Две высоты острого треугольника",
    prompt: "В остроугольном треугольнике ABC проведены высоты AD и BE: D лежит на BC, E — на AC. Докажите, что CD · CB = CE · CA.",
    answer: "CD · CB = CE · CA.",
    steps: [
      "Треугольники CDA и CEB прямоугольные: AD ⟂ BC и BE ⟂ AC.",
      "Угол DCA равен углу ECB: оба совпадают с углом ACB, поскольку D и E находятся на соответствующих сторонах.",
      "Треугольники CDA и CEB подобны по двум углам. Их соответствующие стороны: CD ↔ CE и CA ↔ CB.",
      "Следовательно, CD/CE = CA/CB. Все длины положительны; умножение на CE · CB даёт CD · CB = CE · CA.",
    ],
  },
  {
    prototype: "incircle-tangents",
    title: "Отрезки касательных вписанной окружности",
    prompt: "Окружность вписана в треугольник ABC и касается сторон AB, BC, CA в точках F, D, E соответственно. Докажите, что AF = (AB + AC − BC)/2.",
    answer: "AF = (AB + AC − BC)/2.",
    steps: [
      "Отрезки касательных из одной точки равны: AF = AE, BF = BD, CE = CD.",
      "Обозначим AF = AE = x, BF = BD = y, CE = CD = z. Тогда AB = x + y, AC = x + z, BC = y + z.",
      "Сложим первые две длины и вычтем третью: AB + AC − BC = (x + y) + (x + z) − (y + z) = 2x.",
      "Разделив равенство на 2, получим требуемое AF = x = (AB + AC − BC)/2.",
    ],
  },
];
for (const [v, proof] of proofs.entries()) add(24, v, proof.prototype, proof.title, {}, {
  prompt: proof.prompt, answerRule: { type: "self" }, answerDisplay: proof.answer,
  solution: proof.steps.map((text) => ({ text })),
  selfCheckNotes: ["Доказательство опирается на данное условие, а не на вид предполагаемого рисунка.", "Каждое равенство углов, сторон или отношений обосновано.", "Получен именно требуемый вывод. Это авторские ориентиры; официальные критерии для данного задания не подтверждены."],
  criteriaSourceUrl: criteriaUrl,
});

for (const [v, [u, w]] of [[3, 1], [4, 1], [4, 3], [5, 2]].entries()) {
  const leg1 = u * u - w * w, leg2 = 2 * u * w, radius = w * (u - w);
  const firstTangent = leg1 - radius, secondTangent = leg2 - radius;
  const hypotenuse = firstTangent + secondTangent;
  const discriminant = hypotenuse * hypotenuse + 4 * firstTangent * secondTangent;
  add(25, v, "right-incircle-area", "Вписанная окружность и площадь", { u, w, firstTangent, secondTangent }, {
    prompt: `В прямоугольном треугольнике ABC угол C равен 90°. Вписанная окружность касается гипотенузы AB в точке D, причём AD = ${firstTangent} см и DB = ${secondTangent} см. Найдите площадь треугольника. Запишите обоснованное решение.`,
    answerRule: { type: "self" }, answerDisplay: `${leg1 * leg2 / 2} см²`,
    solution: [
      { text: "Пусть окружность касается AC и BC в точках E и F. Отрезки касательных из A равны: AE = AD; из B: BF = BD; из C: CE = CF = x > 0." },
      { text: `Значит, AC = ${firstTangent} + x, BC = ${secondTangent} + x, AB = ${hypotenuse}. По теореме Пифагора:`, latex: `(${firstTangent}+x)^2+(${secondTangent}+x)^2=${hypotenuse}^2` },
      { text: "Раскроем скобки и разделим на 2.", latex: `x^2+${hypotenuse}x-${firstTangent * secondTangent}=0` },
      { text: `Дискриминант равен ${discriminant}, его квадратный корень — ${Math.sqrt(discriminant)}. Положительный корень x = ${radius}; другой корень отрицателен.` },
      { text: `Катеты равны ${leg1} и ${leg2} см. Площадь прямоугольного треугольника:`, latex: `S=\\frac{${leg1}\\cdot${leg2}}{2}=${leg1 * leg2 / 2}` },
    ],
    selfCheckNotes: ["Правильно использовано равенство отрезков касательных, введён положительный неизвестный отрезок.", "Составлено уравнение Пифагора для целых катетов и гипотенузы.", "Выбран допустимый корень и вычислена площадь. Эти ориентиры не заменяют официальные критерии ФИПИ."],
    criteriaSourceUrl: criteriaUrl,
  });
}
