import type { Task } from "../tasks";
import { makeOriginalTask } from "./task-factory";

/** Original families mapped to the read 2026 specification, not copied demo tasks. */
export type BaseGeneratorCase = {
  taskId: string;
  number: number;
  family: string;
  parameters: Record<string, number>;
};
export const baseGeneratorCases: BaseGeneratorCase[] = [];
export const baseTasks: Task[] = [];
export const basePrototypes: { id: string; topicId: string; title: string }[] = [];
const m = String.raw;
const display = (value: number) => String(Number(value.toFixed(9))).replace(".", ",");
function add(
  number: number, family: string, variant: number, title: string,
  parameters: Record<string, number>, value: number, prompt: string,
  solution: Task["solution"], conditionLatex?: string,
) {
  const id = `base-2026-n${number}-${family}-v${variant}-r1`;
  const prototypeId = `base-${number}-${family}`;
  const topicId = `ege-base-number-${number}`;
  if (!basePrototypes.some((item) => item.id === prototypeId)) basePrototypes.push({ id: prototypeId, topicId, title });
  baseTasks.push(makeOriginalTask({
    id, prototypeId, topicId, examType: ["ЕГЭ"], level: "base", examNumber: number,
    title, prompt, solution, answerDisplay: display(value),
    difficulty: ["time-units", "decimal-difference", "cube-surface", "power-quotient"].includes(family) ? "foundation"
      : ["mixture", "last-digit", "coin-search", "counting-paths"].includes(family) ? "advanced" : "standard",
    answerRule: { type: "number", value: String(Number(value.toFixed(9))) },
    ...(conditionLatex ? { conditionLatex } : {}),
  }));
  baseGeneratorCases.push({ taskId: id, number, family, parameters });
}

for (let v = 1; v <= 5; v++) {
  const numerator = 7 + v, denominator = 4, multiplier = 2 + 2 * v;
  add(1, "fraction-product", v, "Вычисление произведения дроби и числа", { numerator, denominator, multiplier }, numerator * multiplier / denominator,
    "Вычислите значение выражения. Запишите целое число или конечную десятичную дробь.", [
      { text: "Умножаем числитель дроби на целое число, знаменатель сохраняем." },
      { text: "Делим полученный числитель на знаменатель.", latex: m`\frac{${numerator}\cdot${multiplier}}{${denominator}}=${display(numerator * multiplier / denominator)}` },
    ], m`\frac{${numerator}}{${denominator}}\cdot${multiplier}`);
  const start = 25 + v, fall = 6 + 2 * v, rise = 3 + v;
  add(1, "signed-change", v, "Несколько изменений величины", { start, fall, rise }, start - fall + rise,
    `Утром температура в теплице была ${start}°C. После проветривания она понизилась на ${fall}°C, а затем повысилась на ${rise}°C. Какой стала температура?`, [
      { text: `После проветривания: ${start} − ${fall} = ${start - fall}°C.` },
      { text: `После повышения: ${start - fall} + ${rise} = ${start - fall + rise}°C.` },
    ]);

  const acceleration = 2 + v, velocity = 6 + 2 * v, path = velocity ** 2 / (2 * acceleration);
  add(2, "braking-formula", v, "Скорость по формуле тормозного пути", { acceleration, path }, velocity,
    `Тормозной путь s (м) вычисляют по формуле s = u²/(2a), где u — начальная скорость в м/с, a — модуль постоянного ускорения в м/с². При a = ${acceleration} тормозной путь равен ${path} м. Найдите положительную скорость u.`, [
      { text: `Из формулы получаем u² = 2as = ${2 * acceleration * path}.` },
      { text: `Скорость положительна, значит u = √${2 * acceleration * path} = ${velocity} м/с.` },
    ], m`s=\frac{u^2}{2a}`);
  const degrees = 10 + 5 * v, fahrenheit = degrees * 9 / 5 + 32;
  add(2, "temperature-formula", v, "Перевод температур по формуле", { fahrenheit }, degrees,
    `Температуры по шкалам Фаренгейта F и Цельсия C связаны формулой F = 9C/5 + 32. Найдите C, если F = ${fahrenheit}.`, [
      { text: `Сначала вычтем 32: 9C/5 = ${fahrenheit - 32}.` },
      { text: `Затем умножим на 5/9: C = ${fahrenheit - 32} · 5/9 = ${degrees}.` },
    ], m`F=\frac95C+32`);

  const leftCount = 12 + 2 * v, rightCount = 18 + 3 * v;
  add(3, "table-ratio", v, "Доля по данным таблицы", { leftCount, rightCount }, 40,
    `В таблице участников двух групп указано: группа A — ${leftCount}, группа B — ${rightCount}. Других групп нет. Сколько процентов всех участников составляет группа A?`, [
      { text: `Общее число: ${leftCount} + ${rightCount} = ${leftCount + rightCount}.` },
      { text: `Доля A: ${leftCount}/(${leftCount + rightCount}) · 100% = 40%. В ответ записываем 40.` },
    ]);
  const single = 3 + v, double = 4 + v, triple = 2 + v;
  add(3, "frequency-table", v, "Сумма по таблице частот", { single, double, triple }, single + 2 * double + 3 * triple,
    `Таблица заказов: по одному комплекту заказали ${single} покупателя, по два — ${double}, по три — ${triple}. Сколько всего комплектов заказано?`, [
      { text: "Частота показывает число покупателей, а не число комплектов. Каждое число заказанных комплектов умножаем на соответствующую частоту." },
      { text: `${single} · 1 + ${double} · 2 + ${triple} · 3 = ${single + 2 * double + 3 * triple}.` },
    ]);

  const passengers = 25 + 4 * v, smallSeats = 4, bigSeats = 7, smallCost = 11 + v, bigCost = 17 + v;
  const transportCosts: number[] = [];
  for (let big = 0; big <= Math.ceil(passengers / bigSeats); big++) {
    const small = Math.max(0, Math.ceil((passengers - big * bigSeats) / smallSeats));
    transportCosts.push(big * bigCost + small * smallCost);
  }
  const cheap = Math.min(...transportCosts);
  add(4, "mixed-vehicles", v, "Сравнение способов перевозки", { passengers, smallSeats, bigSeats, smallCost, bigCost }, cheap,
    `Нужно перевезти ${passengers} пассажиров за один рейс. Можно заказать сколько угодно машин на ${smallSeats} места по ${smallCost} руб. и на ${bigSeats} мест по ${bigCost} руб., в том числе вместе машины разных типов. Пустые места разрешены. Найдите наименьшую стоимость перевозки.`, [
      { text: `Достаточно рассмотреть от 0 до ${Math.ceil(passengers / bigSeats)} больших машин: большее число уже везёт всех и стоит дороже.` },
      { text: `Для каждого их количества добираем минимально необходимое число малых. Полученные стоимости по порядку: ${transportCosts.join(", ")} руб.` },
      { text: `Минимум среди всех допустимых случаев — ${cheap} руб.` },
    ]);
  const totalLength = 38 + 5 * v, leftover = 2 + v, piece = 6 + v;
  add(4, "cutting-count", v, "Число целых отрезков", { totalLength, leftover, piece }, Math.floor((totalLength - leftover) / piece),
    `Из провода длиной ${totalLength} м сначала отрезали ${leftover} м. Оставшуюся часть режут на отрезки по ${piece} м. Какое наибольшее число целых отрезков такой длины получится?`, [
      { text: `Осталось ${totalLength} − ${leftover} = ${totalLength - leftover} м.` },
      { text: `Целых отрезков: целая часть от (${totalLength - leftover})/${piece}, то есть ${Math.floor((totalLength - leftover) / piece)}.` },
    ]);

  const chanceA = v + 1, chanceB = 8 - v;
  add(5, "exactly-one-success", v, "Ровно один успех", { chanceA, chanceB }, (chanceA * (10 - chanceB) + (10 - chanceA) * chanceB) / 100,
    `Два независимых датчика срабатывают с вероятностями ${display(chanceA / 10)} и ${display(chanceB / 10)} соответственно. Найдите вероятность того, что сработает ровно один датчик.`, [
      { text: "Случаи «первый сработал, второй нет» и «первый не сработал, второй сработал» несовместны." },
      { text: `Их вероятности: ${chanceA * (10 - chanceB)}/100 и ${(10 - chanceA) * chanceB}/100. Сумма — ${(chanceA * (10 - chanceB) + (10 - chanceA) * chanceB) / 100}.` },
    ]);
  const chance = v + 2;
  add(5, "at-least-one-success", v, "Хотя бы один успех", { chance }, 1 - (10 - chance) ** 2 / 100,
    `Вероятность успешного испытания равна ${display(chance / 10)}. Проводят два независимых испытания. Найдите вероятность хотя бы одного успеха.`, [
      { text: `Неудача в одном испытании имеет вероятность ${display((10 - chance) / 10)}.` },
      { text: `Две неудачи имеют вероятность ${display((10 - chance) ** 2 / 100)}. Вычитаем её из 1 и получаем ${display(1 - (10 - chance) ** 2 / 100)}.` },
    ]);

  const requiredMemory = 8 + v, maxPrice = 70 + 5 * v;
  const prices = [maxPrice - 5, maxPrice + 2, maxPrice - 3, maxPrice - 1];
  const memories = [requiredMemory - 1, requiredMemory + 3, requiredMemory + 1, requiredMemory + 2];
  add(6, "conditions-table", v, "Отбор по двум условиям таблицы", { requiredMemory, maxPrice }, 34,
    `Таблица устройств (номер: память, цена): 1: ${memories[0]} ГБ, ${prices[0]} руб.; 2: ${memories[1]} ГБ, ${prices[1]} руб.; 3: ${memories[2]} ГБ, ${prices[2]} руб.; 4: ${memories[3]} ГБ, ${prices[3]} руб. Подходят устройства с памятью не меньше ${requiredMemory} ГБ и ценой не выше ${maxPrice} руб. Запишите номера всех подходящих устройств подряд в порядке возрастания.`, [
      { text: "Устройство 1 не проходит по памяти, устройство 2 — по цене." },
      { text: "Устройства 3 и 4 удовлетворяют обоим условиям. Последовательность номеров: 34." },
    ]);
  const baseFee = 40 + 5 * v, included = 3 + v, perUnit = 6 + v, usage = included + 4;
  add(6, "billing-table", v, "Стоимость по ступенчатым условиям", { baseFee, included, perUnit, usage }, baseFee + 4 * perUnit,
    `Таблица платы за сервис: ${baseFee} руб. включают первые ${included} единиц использования; каждая единица сверх них стоит ${perUnit} руб. За месяц использовано ${usage} единиц. Сколько рублей нужно заплатить?`, [
      { text: `Дополнительно оплачиваются ${usage} − ${included} = 4 единицы.` },
      { text: `Полная плата ${baseFee} + 4 · ${perUnit} = ${baseFee + 4 * perUnit} руб.` },
    ]);

  const stationary1 = -v, stationary2 = v + 2;
  add(7, "derivative-signs", v, "Экстремумы по знакам производной", { stationary1, stationary2 }, stationary2,
    `Дифференцируемая функция задана на всей числовой прямой. Её производная положительна при x < ${stationary1}, отрицательна при ${stationary1} < x < ${stationary2} и положительна при x > ${stationary2}; в граничных точках производная равна нулю. Найдите абсциссу точки минимума.`, [
      { text: `При x = ${stationary1} знак производной меняется с плюса на минус: это максимум.` },
      { text: `При x = ${stationary2} знак меняется с минуса на плюс: убывание сменяется возрастанием. Это минимум.` },
    ]);
  const xPoint = v + 1, gradient = 2 * v + 1, offset = 7 - v;
  add(7, "line-value", v, "Значение линейной функции по двум точкам", { xPoint, gradient, offset }, gradient * xPoint + offset,
    `График линейной функции проходит через точки (0; ${offset}) и (2; ${2 * gradient + offset}). Найдите значение функции при x = ${xPoint}.`, [
      { text: `Свободный член равен ${offset}. Угловой коэффициент: (${2 * gradient + offset} − ${offset})/2 = ${gradient}.` },
      { text: `Функция имеет вид y = ${gradient}x + (${offset}). При x = ${xPoint} получаем ${gradient * xPoint + offset}.` },
    ]);

  const totalPeople = 20 + 2 * v, onlyFirst = 4 + v, onlySecond = 7 + v, overlap = 3 + v;
  add(8, "sets-neither", v, "Дополнение объединения множеств", { totalPeople, onlyFirst, onlySecond, overlap }, totalPeople - onlyFirst - onlySecond - overlap,
    `В группе ${totalPeople} человек. Только английский изучают ${onlyFirst}, только испанский — ${onlySecond}, оба языка — ${overlap}. Остальные не изучают ни один из двух языков. Сколько человек не изучают ни один из них?`, [
      { text: `Три перечисленные группы не пересекаются. Хотя бы один язык изучают ${onlyFirst} + ${onlySecond} + ${overlap} = ${onlyFirst + onlySecond + overlap} человек.` },
      { text: `Остальные: ${totalPeople} − ${onlyFirst + onlySecond + overlap} = ${totalPeople - onlyFirst - onlySecond - overlap}.` },
    ]);
  const firstBound = 5 + v, secondBound = 15 + v;
  add(8, "logical-counterexample", v, "Необходимое следствие неравенства", { firstBound, secondBound }, 2,
    `Дано: x — действительное число, ${firstBound} < x < ${secondBound}. Какое утверждение обязательно верно? 1) x — целое; 2) x² > ${firstBound ** 2}; 3) x > ${secondBound - 1}; 4) x = ${(firstBound + secondBound) / 2}. Запишите номер единственного верного следствия.`, [
      { text: "Промежуток содержит как целые, так и нецелые числа, поэтому 1 не обязательно. Утверждения 3 и 4 исключают часть допустимых x." },
      { text: `Все допустимые x положительны и больше ${firstBound}; возведение положительных чисел в квадрат сохраняет строгое неравенство. Поэтому верно 2.` },
    ]);

  const wallL = 7 + v, wallH = 3, windowArea = 2 + v, coverage = 4;
  add(9, "paint-wall", v, "Площадь окраски с исключением окна", { wallL, wallH, windowArea, coverage }, Math.ceil((wallL * wallH - windowArea) / coverage),
    `Прямоугольная стена имеет длину ${wallL} м и высоту ${wallH} м; площадь окна в ней ${windowArea} м². Стену, кроме окна, красят в один слой. Одной банки хватает на ${coverage} м². Какое наименьшее целое число банок потребуется?`, [
      { text: `Площадь окраски ${wallL} · ${wallH} − ${windowArea} = ${wallL * wallH - windowArea} м².` },
      { text: `Делим на ${coverage} м² и округляем вверх: ${Math.ceil((wallL * wallH - windowArea) / coverage)} банок.` },
    ]);
  const planCm = 3 + v, scale = 500 + 100 * v;
  add(9, "map-scale", v, "Масштаб и единицы длины", { planCm, scale }, planCm * scale / 100,
    `Масштаб плана 1:${scale}. Прямой отрезок на плане имеет длину ${planCm} см. Найдите соответствующую реальную длину в метрах.`, [
      { text: `Реальная длина в сантиметрах: ${planCm} · ${scale} = ${planCm * scale}.` },
      { text: `В одном метре 100 см: ${planCm * scale}/100 = ${planCm * scale / 100} м.` },
    ]);

  const radius = 2 + v;
  add(10, "circle-area", v, "Площадь круга через длину окружности", { radius }, radius * radius,
    `Длина окружности равна ${2 * radius}π. Найдите площадь ограниченного ею круга, делённую на π.`, [
      { text: `Из C = 2πr получаем r = ${2 * radius}/2 = ${radius}.` },
      { text: `Площадь S = πr², поэтому S/π = ${radius}² = ${radius * radius}.` },
    ]);
  const triangleBase = 4 + 2 * v, triangleHeight = 5 + v;
  add(10, "triangle-area", v, "Площадь по основанию и высоте", { triangleBase, triangleHeight }, triangleBase * triangleHeight / 2,
    `Сторона треугольника равна ${triangleBase}, а проведённая к ней высота равна ${triangleHeight}. Найдите площадь треугольника.`, [
      { text: "Основание и соответствующая высота дают площадь как половину их произведения." },
      { text: `S = ${triangleBase} · ${triangleHeight}/2 = ${triangleBase * triangleHeight / 2}.` },
    ]);

  const cylRadius = v + 1, cylHeight = v + 4;
  add(11, "cylinder-volume", v, "Объём цилиндра", { cylRadius, cylHeight }, cylRadius ** 2 * cylHeight,
    `Радиус основания цилиндра ${cylRadius}, высота ${cylHeight}. Найдите его объём, делённый на π.`, [
      { text: `Площадь основания πr² = ${cylRadius ** 2}π.` },
      { text: `V = πr²h. Поэтому V/π = ${cylRadius ** 2} · ${cylHeight} = ${cylRadius ** 2 * cylHeight}.` },
    ]);
  const coneRadius = 2 + v, coneHeight = 3 * (v + 1);
  add(11, "cone-volume", v, "Объём конуса", { coneRadius, coneHeight }, coneRadius ** 2 * coneHeight / 3,
    `Радиус основания конуса равен ${coneRadius}, его высота равна ${coneHeight}. Найдите объём конуса, делённый на π.`, [
      { text: "Объём конуса равен трети произведения площади основания на высоту." },
      { text: `V/π = ${coneRadius}² · ${coneHeight}/3 = ${coneRadius ** 2 * coneHeight / 3}.` },
    ]);

  const oppositeAngle = 70 + 5 * v;
  add(12, "cyclic-quadrilateral", v, "Углы вписанного четырёхугольника", { oppositeAngle }, 180 - oppositeAngle,
    `Четырёхугольник ABCD вписан в окружность. Угол A равен ${oppositeAngle}°. Найдите противоположный угол C в градусах.`, [
      { text: "Противоположные углы четырёхугольника, вписанного в окружность, в сумме дают 180°." },
      { text: `Угол C = 180° − ${oppositeAngle}° = ${180 - oppositeAngle}°.` },
    ]);
  const originalArea = 5 + v, factor = v + 1;
  add(12, "similarity-area", v, "Площади подобных фигур", { originalArea, factor }, originalArea * factor ** 2,
    `Два треугольника подобны. Сторона второго треугольника в ${factor} раза больше соответствующей стороны первого. Площадь первого равна ${originalArea}. Найдите площадь второго.`, [
      { text: `При коэффициенте подобия ${factor} и основание, и высота увеличиваются в ${factor} раза.` },
      { text: `Площадь увеличивается в ${factor ** 2} раза: ${originalArea} · ${factor ** 2} = ${originalArea * factor ** 2}.` },
    ]);

  const cubeSide = 6 + 2 * v, smallSide = 2;
  add(13, "cube-cutting", v, "Разбиение куба на малые кубики", { cubeSide, smallSide }, (cubeSide / smallSide) ** 3,
    `Куб с ребром ${cubeSide} разрезали плоскостями, параллельными его граням, на кубики с ребром ${smallSide}. Потерь материала нет. Сколько кубиков получилось?`, [
      { text: `По каждому из трёх направлений помещается ${cubeSide}/${smallSide} = ${cubeSide / smallSide} кубиков.` },
      { text: `Общее число: (${cubeSide / smallSide})³ = ${(cubeSide / smallSide) ** 3}.` },
    ]);
  const vesselA = 5 + v, vesselB = 4 + v, waterHeight = 2 + v, waterVolume = vesselA * vesselB * waterHeight;
  add(13, "liquid-height", v, "Высота жидкости в прямоугольном сосуде", { vesselA, vesselB, waterVolume }, waterHeight,
    `В сосуд в форме прямоугольного параллелепипеда с горизонтальным дном размером ${vesselA} см на ${vesselB} см налили ${waterVolume} см³ воды. Сосуд достаточно высокий. На какой высоте от дна находится поверхность воды? Ответ дайте в сантиметрах.`, [
      { text: `Площадь дна: ${vesselA} · ${vesselB} = ${vesselA * vesselB} см².` },
      { text: `Из V = Sh получаем h = ${waterVolume}/${vesselA * vesselB} = ${waterHeight} см.` },
    ]);

  const n = 3 + v, d = 5, divisorTop = 2;
  add(14, "fraction-division", v, "Деление обыкновенных дробей", { n, d, divisorTop }, n / 2,
    "Вычислите значение выражения. Ответ запишите целым числом или конечной десятичной дробью.", [
      { text: "При делении на ненулевую дробь умножаем на обратную ей." },
      { text: "Сокращаем общий множитель 5.", latex: m`\frac{${n}}5:\frac25=\frac{${n}}5\cdot\frac52=\frac{${n}}2=${display(n / 2)}` },
    ], m`\frac{${n}}5:\frac25`);
  const negative = -2 - v, multiply = 3 + v, positive = 11 + 2 * v;
  add(14, "operation-order", v, "Порядок действий и знаки", { negative, multiply, positive }, negative * multiply + positive,
    "Вычислите значение выражения.", [
      { text: `Сначала умножение: (${negative}) · ${multiply} = ${negative * multiply}.` },
      { text: `Затем сложение: ${negative * multiply} + ${positive} = ${negative * multiply + positive}.` },
    ], m`(${negative})\cdot${multiply}+${positive}`);

  const oldPrice = 2000 + 500 * v, increase = 10, reduction = 20;
  add(15, "sequential-percent", v, "Последовательное изменение цены", { oldPrice, increase, reduction }, oldPrice * 1.1 * 0.8,
    `Товар стоил ${oldPrice} руб. Сначала его цену повысили на ${increase}%, а затем новую цену снизили на ${reduction}%. Найдите окончательную цену в рублях.`, [
      { text: `После повышения цена составляет ${oldPrice} · 1,1 = ${display(oldPrice * 1.1)} руб.` },
      { text: `Снижение на 20% считают от новой цены: ${display(oldPrice * 1.1)} · 0,8 = ${display(oldPrice * 1.1 * 0.8)} руб.` },
    ]);
  const firstAmount = 50 + 10 * v, secondAmount = 2 * firstAmount;
  add(15, "percent-comparison", v, "На сколько процентов больше", { firstAmount, secondAmount }, 100,
    `В первом месяце изготовили ${firstAmount} изделий, а во втором — ${secondAmount}. На сколько процентов выпуск во втором месяце больше, чем в первом?`, [
      { text: `Прирост равен ${secondAmount} − ${firstAmount} = ${secondAmount - firstAmount}. За 100% берём выпуск первого месяца.` },
      { text: `Относительный прирост: (${secondAmount - firstAmount})/${firstAmount} · 100% = 100%.` },
    ]);

  const logBase = 2 + v, logExponent = v + 1;
  add(16, "logarithm-value", v, "Значение логарифма", { logBase, logExponent }, logExponent,
    "Вычислите значение выражения.", [
      { text: `Логарифм показывает, в какую степень нужно возвести ${logBase}, чтобы получить ${logBase ** logExponent}.` },
      { text: `${logBase}^${logExponent} = ${logBase ** logExponent}, следовательно, логарифм равен ${logExponent}.` },
    ], m`\log_{${logBase}}${logBase ** logExponent}`);
  const a = v + 2, x = a + 3;
  add(16, "algebraic-fraction", v, "Разложение разности квадратов", { a, x }, x + a,
    `Найдите значение выражения при x = ${x}.`, [
      { text: `Заданный x не равен ${a}, поэтому знаменатель ненулевой.` },
      { text: "Разлагаем числитель и сокращаем ненулевой множитель.", latex: m`\frac{(x-${a})(x+${a})}{x-${a}}=x+${a}` },
      { text: `Подстановка даёт ${x} + ${a} = ${x + a}.` },
    ], m`\frac{x^2-${a * a}}{x-${a}}`);

  const squareRoot = v + 2, radicalShift = 3 + v;
  add(17, "radical-root", v, "Иррациональное уравнение", { squareRoot, radicalShift }, squareRoot ** 2 + radicalShift,
    "Решите уравнение. Запишите значение x.", [
      { text: `ОДЗ: x ≥ ${radicalShift}. Обе части неотрицательны, можно возвести их в квадрат.` },
      { text: `x − ${radicalShift} = ${squareRoot ** 2}, поэтому x = ${squareRoot ** 2 + radicalShift}.` },
      { text: `Проверка: √(${squareRoot ** 2 + radicalShift} − ${radicalShift}) = ${squareRoot}.` },
    ], m`\sqrt{x-${radicalShift}}=${squareRoot}`);
  const ratio = [4, 5, 8, 10, 20][v - 1], singular = v + 1, numeratorConst = 2 + v;
  add(17, "rational-root", v, "Рациональное уравнение и ОДЗ", { ratio, singular, numeratorConst }, singular + numeratorConst / ratio,
    "Решите уравнение. Ответ запишите целым числом или конечной десятичной дробью.", [
      { text: `ОДЗ: x ≠ ${singular}. Умножаем равенство на ненулевой знаменатель.` },
      { text: `Получаем ${ratio}(x − ${singular}) = ${numeratorConst}; x = ${singular} + ${numeratorConst}/${ratio} = ${display(singular + numeratorConst / ratio)}.` },
      { text: "Найденный корень не обращает знаменатель в ноль." },
    ], m`\frac{${numeratorConst}}{x-${singular}}=${ratio}`);

  const inequalityMultiplier = 2 + v, upper = v + 4;
  add(18, "linear-largest", v, "Наибольшее целое решение", { inequalityMultiplier, upper }, upper - 1,
    `Найдите наибольшее целое решение неравенства ${inequalityMultiplier}x < ${inequalityMultiplier * upper}.`, [
      { text: `Делим обе части на положительное число ${inequalityMultiplier}, знак сохраняется: x < ${upper}.` },
      { text: `Из-за строгой границы самое большое допустимое целое — ${upper - 1}.` },
    ]);
  const expBound = v + 2;
  add(18, "exponential-count", v, "Целые решения показательного неравенства", { expBound }, expBound,
    `Сколько положительных целых x удовлетворяют неравенству 2^x ≤ ${2 ** expBound}?`, [
      { text: `${2 ** expBound} = 2^${expBound}. Так как основание 2 больше единицы, x ≤ ${expBound}.` },
      { text: `Положительные целые решения — от 1 до ${expBound}. Их ${expBound}.` },
    ], m`2^x\leq ${2 ** expBound},\qquad x\in\mathbb Z,\ x>0`);

  const divA = 4 + v, divB = 6 + v;
  const commonMultiple = Array.from({ length: divA * divB }, (_, i) => i + 1).find(i => i % divA === 0 && i % divB === 0)!;
  add(19, "least-common-multiple", v, "Общий цикл двух событий", { divA, divB }, commonMultiple,
    `Два индикатора включаются одновременно в момент 0. Затем первый включается через каждые ${divA} секунд, второй — через каждые ${divB} секунд. Через сколько секунд после момента 0 они впервые снова включатся одновременно?`, [
      { text: `Искомое время должно быть положительным числом, кратным и ${divA}, и ${divB}.` },
      { text: `Наименьшее такое кратное — ${commonMultiple}: ${commonMultiple}/${divA} = ${commonMultiple / divA}, ${commonMultiple}/${divB} = ${commonMultiple / divB}.` },
    ]);
  const powerN = 4 * v + 3;
  add(19, "last-digit", v, "Последняя цифра степени", { powerN }, 8,
    `Найдите последнюю цифру числа 2^${powerN}.`, [
      { text: "Последние цифры степеней двойки повторяются с периодом 4: 2, 4, 8, 6." },
      { text: `${powerN} при делении на 4 даёт остаток 3. Берём третью цифру цикла: 8.` },
    ], m`2^{${powerN}}`);

  const slow = 3 + v, fast = slow + 2, delay = 2 + v;
  add(20, "catch-up", v, "Движение вдогонку", { slow, fast, delay }, slow * delay / (fast - slow),
    `Пешеход вышел из пункта A со скоростью ${slow} км/ч. Через ${delay} ч вслед за ним из A по той же дороге выехал велосипедист со скоростью ${fast} км/ч. Скорости постоянны. Через сколько часов после выезда велосипедист догонит пешехода?`, [
      { text: `К моменту выезда отрыв пешехода равен ${slow} · ${delay} = ${slow * delay} км.` },
      { text: `Скорость сокращения отрыва: ${fast} − ${slow} = ${fast - slow} км/ч.` },
      { text: `Время после выезда велосипедиста: ${slow * delay}/${fast - slow} = ${display(slow * delay / (fast - slow))} ч.` },
    ]);
  const massA = 2 + v, concA = 10, massB = 2 * massA, concB = 40;
  add(20, "mixture", v, "Концентрация смеси", { massA, massB, concA, concB }, 30,
    `Смешали ${massA} кг раствора с 10%-ным содержанием вещества и ${massB} кг раствора с 40%-ным содержанием того же вещества. Потерь массы нет. Сколько процентов составляет содержание вещества в смеси?`, [
      { text: `Масса вещества: ${massA} · 0,1 + ${massB} · 0,4 = ${display(massA * 0.1 + massB * 0.4)} кг.` },
      { text: `Масса смеси ${massA + massB} кг. Делим массу вещества на массу смеси и умножаем на 100%: получаем 30%.` },
    ]);

  const target = 17 + 4 * v, coinA = 3, coinB = 5;
  const ways: { a: number; b: number }[] = [];
  for (let b = 0; b * coinB <= target; b++) for (let count = 0; count * coinA <= target; count++)
    if (count * coinA + b * coinB === target) ways.push({ a: count, b });
  const minimumCoins = Math.min(...ways.map(pair => pair.a + pair.b));
  add(21, "coin-search", v, "Наименьшее число монет", { target, coinA, coinB }, minimumCoins,
    `Есть сколько угодно монет номиналами ${coinA} и ${coinB} рублей. Какое наименьшее число монет нужно для суммы ровно ${target} рублей?`, [
      { text: `Проверяем все количества пятирублёвых монет от 0 до ${Math.floor(target / coinB)}. Остаток должен быть неотрицателен и делиться на 3.` },
      { text: `Допустимые пары (трёхрублёвые; пятирублёвые): ${ways.map(pair => `(${pair.a}; ${pair.b})`).join(", ")}.` },
      { text: `Наименьшая сумма количеств монет — ${minimumCoins}.` },
    ]);
  const horizontal = v + 2, vertical = 2;
  const routes = (horizontal + 2) * (horizontal + 1) / 2;
  add(21, "counting-paths", v, "Подсчёт кратчайших маршрутов", { horizontal, vertical }, routes,
    `По сетке можно двигаться только вправо или вверх на одно ребро за шаг. Из A до B нужно пройти ${horizontal} ребра вправо и ${vertical} вверх. Сколько различных кратчайших маршрутов ведёт из A в B?`, [
      { text: `Любой маршрут состоит из ${horizontal + vertical} шагов; ровно два из них идут вверх.` },
      { text: "Маршрут однозначно задаётся двумя различными позициями шагов вверх. Выбираем их без учёта порядка." },
      { text: `Число маршрутов: (${horizontal + 2}) · (${horizontal + 1})/2 = ${routes}.` },
    ]);
}

// Five parameter sets in each family. Two families above and two below per number.
// Twenty family variants per number do not mean twenty unrelated subtypes.
for (let v = 1; v <= 5; v++) {
  const items = 17 + 7 * v, capacity = 4 + v;
  add(1, "packages", v, "Покупка целых упаковок", { items, capacity }, Math.ceil(items / capacity),
    `Для мастерской нужно ${items} одинаковых держателей. Их продают только закрытыми упаковками по ${capacity} штук. Какое наименьшее число упаковок нужно купить?`, [
      { text: `При делении ${items} на ${capacity} получаем ${Math.floor(items / capacity)} полных упаковок и остаток ${items % capacity}.` },
      { text: items % capacity ? "Остаток также нужно покрыть целой упаковкой: округляем вверх." : "Остатка нет: дополнительных упаковок не требуется." },
      { text: `Нужно ${Math.ceil(items / capacity)} упаковок; одна упаковка меньше не покрывает потребность.` },
    ]);
  const hours = 2 + v, minutes = 7 * v;
  add(1, "time-units", v, "Перевод времени в минуты", { hours, minutes }, hours * 60 + minutes,
    `Учебная встреча длится ${hours} ч ${minutes} мин. Сколько минут длится встреча?`, [
      { text: "В одном часе 60 минут. Часы переводим в минуты умножением." },
      { text: `${hours} · 60 + ${minutes} = ${hours * 60 + minutes} минут.` },
    ]);

  const fixed = 90 + 15 * v, rate = 12 + v, km = 8 + 2 * v, cost = fixed + rate * km;
  add(2, "tariff-formula", v, "Расстояние по формуле тарифа", { fixed, rate, cost }, km,
    `Стоимость поездки C (руб.) определяется формулой C = ${fixed} + ${rate}d, где d — расстояние в километрах. Поездка обошлась в ${cost} руб. Найдите d.`, [
      { text: "Вычтем постоянную часть тарифа из полной стоимости." },
      { text: `На оплату расстояния пришлось ${cost} − ${fixed} = ${cost - fixed} рублей.` },
      { text: `Расстояние: (${cost} − ${fixed}) : ${rate} = ${km} км.` },
    ], m`C=${fixed}+${rate}d`);
  const power = 3 + v, seconds = 8 + 2 * v, energy = power * seconds;
  add(2, "power-time", v, "Время по мощности и энергии", { power, energy }, seconds,
    `Энергия E (джоули) связана с постоянной мощностью P (ватты) и временем t (секунды) формулой E = Pt. Устройство мощностью ${power} Вт израсходовало ${energy} Дж. Сколько секунд оно работало?`, [
      { text: "Выразим время: при ненулевой мощности t = E/P." },
      { text: `${energy} : ${power} = ${seconds} с. Проверка: ${power} · ${seconds} = ${energy} Дж.` },
    ], m`E=Pt`);

  const row1 = 20 + v, row2 = 35 + 3 * v, row3 = 23 + 2 * v, row4 = 18 + 4 * v;
  add(3, "table-maximum", v, "Чтение таблицы посещений", { row1, row2, row3, row4 }, 2,
    `Таблица числа посетителей: день 1 — ${row1}; день 2 — ${row2}; день 3 — ${row3}; день 4 — ${row4}. В какой из этих дней посетителей было больше всего? Запишите номер дня.`, [
      { text: "Сравниваем число посетителей, а не номера дней." },
      { text: `Максимальное число ${row2} относится ко дню 2. Ответ: 2.` },
    ]);
  const q1 = 3 * v + 7, q2 = 3 * v + 9, q3 = 3 * v + 11, q4 = 3 * v + 13;
  add(3, "table-mean", v, "Среднее значение по таблице", { q1, q2, q3, q4 }, 3 * v + 10,
    `За четыре смены собрали следующие количества приборов: ${q1}, ${q2}, ${q3}, ${q4}. Найдите среднее число собранных приборов за смену.`, [
      { text: `Сумма четырёх показателей: ${q1 + q2 + q3 + q4}.` },
      { text: `Среднее равно сумме, делённой на число смен: ${q1 + q2 + q3 + q4} : 4 = ${3 * v + 10}.` },
    ]);

  const metres = 41 + 6 * v, roll = 8 + v, rollPrice = 170 + 10 * v;
  add(4, "roll-cost", v, "Округление и стоимость", { metres, roll, rollPrice }, Math.ceil(metres / roll) * rollPrice,
    `Нужно не менее ${metres} м кабеля. Кабель продаётся целыми бухтами по ${roll} м, каждая стоит ${rollPrice} руб. Найдите наименьшую стоимость покупки. Остатки использовать можно.`, [
      { text: `Необходимое число бухт — наименьшее целое, не меньшее ${metres}/${roll}: ${Math.ceil(metres / roll)}.` },
      { text: `Стоимость: ${Math.ceil(metres / roll)} · ${rollPrice} = ${Math.ceil(metres / roll) * rollPrice} руб.` },
    ]);
  const balance = 700 + 30 * v, notebook = 35 + 5 * v;
  add(4, "maximum-purchase", v, "Число покупок на заданную сумму", { balance, notebook }, Math.floor(balance / notebook),
    `На покупку тетрадей выделили ${balance} руб. Одна тетрадь стоит ${notebook} руб. Какое наибольшее число тетрадей можно купить без превышения бюджета?`, [
      { text: "Стоимость целого числа тетрадей не должна превышать бюджет, поэтому частное округляем вниз." },
      { text: `${balance} = ${notebook} · ${Math.floor(balance / notebook)} + ${balance % notebook}. Можно купить ${Math.floor(balance / notebook)} тетрадей.` },
      { text: `Останется ${balance % notebook} руб., что меньше цены одной тетради.` },
    ]);

  const total = 40, favorable = 3 + 2 * v;
  add(5, "one-draw", v, "Равновозможный выбор", { total, favorable }, favorable / total,
    `В коробке ${total} одинаковых на ощупь жетонов, из них ${favorable} зелёных, остальные белые. Случайно достают один жетон. Найдите вероятность зелёного цвета. Ответ запишите десятичной дробью.`, [
      { text: `Всего ${total} равновозможных исходов, подходят ${favorable}.` },
      { text: `Вероятность равна ${favorable}/${total} = ${display(favorable / total)}.` },
    ]);
  const defective = 2 * v + 1;
  add(5, "complement", v, "Противоположное событие", { total: 100, defective }, (100 - defective) / 100,
    `Из 100 изготовленных деталей ровно ${defective} имеют дефект. Для проверки наугад выбирают одну из всех 100 деталей. Найдите вероятность того, что выбранная деталь не имеет дефекта.`, [
      { text: `Исправных деталей: 100 − ${defective} = ${100 - defective}.` },
      { text: `Искомая вероятность: ${100 - defective}/100 = ${display((100 - defective) / 100)}.` },
    ]);

  const need = 8 + v, tariffA = 100 + 5 * v, tariffB = 70 + 3 * v, addB = 9 + v;
  const totalA = tariffA, totalB = tariffB + Math.max(0, need - 5) * addB;
  add(6, "tariff-table", v, "Выбор тарифа по таблице", { need, tariffA, tariffB, addB }, Math.min(totalA, totalB),
    `Таблица тарифов комнаты: A — ${tariffA} руб. за первые 15 часов, без доплаты в этом диапазоне; B — ${tariffB} руб. за первые 5 часов и ${addB} руб. за каждый последующий час. Комната нужна на ${need} целых часов, можно выбрать только один тариф. Найдите минимальную стоимость аренды.`, [
      { text: `${need} ≤ 15, поэтому тариф A стоит ${totalA} руб.` },
      { text: `По тарифу B нужно оплатить ещё ${need - 5} часов: ${tariffB} + ${need - 5} · ${addB} = ${totalB} руб.` },
      { text: `Из двух допустимых стоимостей выбираем меньшую: ${Math.min(totalA, totalB)} руб.` },
    ]);
  const demand = 30 + 3 * v, firstCapacity = 16 + v, secondCapacity = 22 + v;
  const firstPrice = 95 + 5 * v, secondPrice = 135 + 3 * v;
  const firstCost = Math.ceil(demand / firstCapacity) * firstPrice, secondCost = Math.ceil(demand / secondCapacity) * secondPrice;
  add(6, "transport-table", v, "Сравнение предложений перевозчика", { demand, firstCapacity, secondCapacity, firstPrice, secondPrice }, Math.min(firstCost, secondCost),
    `Нужно перевезти ${demand} человек за один рейс. Таблица предложений: компания 1 — автобусы на ${firstCapacity} мест по ${firstPrice} руб. за автобус; компания 2 — на ${secondCapacity} места по ${secondPrice} руб. Нельзя смешивать компании, автобусы каждой компании одинаковые. Найдите наименьшую стоимость перевозки.`, [
      { text: `Компании 1 нужно ${Math.ceil(demand / firstCapacity)} автобуса; стоимость ${firstCost} руб.` },
      { text: `Компании 2 нужно ${Math.ceil(demand / secondCapacity)} автобуса; стоимость ${secondCost} руб.` },
      { text: `Округление числа автобусов делаем вверх. Минимальная стоимость — ${Math.min(firstCost, secondCost)} руб.` },
    ]);

  const left = v, middle = v + 2, right = v + 5, peak = 8 + v;
  add(7, "piecewise-graph", v, "Изменение функции на отрезках", { left, middle, right, peak }, middle,
    `График непрерывной функции состоит из двух отрезков, соединяющих точки (${left}; 1), (${middle}; ${peak}) и (${right}; 2). Найдите абсциссу точки, в которой функция принимает наибольшее значение на данном графике.`, [
      { text: `На первом отрезке значение возрастает от 1 до ${peak}; на втором убывает от ${peak} до 2.` },
      { text: `Максимум достигается в общей вершине (${middle}; ${peak}). Нужна абсцисса: ${middle}.` },
    ]);
  const slope = 2 + v, intercept = 5 + 3 * v;
  add(7, "tangent-slope", v, "Производная по касательной", { slope, intercept }, slope,
    `К графику дифференцируемой функции в точке x = ${v} проведена касательная. Она проходит через точки (0; ${intercept}) и (2; ${intercept + 2 * slope}). Найдите значение производной функции при x = ${v}.`, [
      { text: "Значение производной равно угловому коэффициенту касательной." },
      { text: `Её угловой коэффициент: (${intercept + 2 * slope} − ${intercept}) : (2 − 0) = ${slope}.` },
    ]);

  const all = 18 + 2 * v, chess = 7 + v, both = 3 + v;
  add(8, "sets-union", v, "Два множества и их пересечение", { all, chess, both, robot: all - chess + both }, all,
    `В кружок шахмат ходят ${chess} человек, в кружок робототехники — ${all - chess + both}. В оба кружка ходят ${both} человек. Сколько всего человек ходят хотя бы в один из этих кружков?`, [
      { text: "При сложении численностей дети из пересечения посчитаны дважды. Один раз вычтем их." },
      { text: `${chess} + ${all - chess + both} − ${both} = ${all} человек.` },
    ]);
  const minimum = 10 + v, maximum = 20 + v;
  add(8, "logic-count", v, "Следствия из условия", { minimum, maximum }, 2,
    `Известно, что каждый участник группы имеет возраст от ${minimum} до ${maximum} лет включительно; известно также, что есть хотя бы один участник возраста ${minimum}. Рассмотрите утверждения: 1) всем участникам не меньше ${minimum} лет; 2) всем участникам больше ${minimum} лет; 3) в группе есть участник моложе ${maximum} лет. Сколько утверждений обязательно верны?`, [
      { text: "Утверждение 1 повторяет нижнюю границу, поэтому верно." },
      { text: `Утверждение 2 ложно: есть участник возраста ${minimum}. Утверждение 3 верно, поскольку ${minimum} < ${maximum}.` },
      { text: "Обязательно верны два утверждения: 1 и 3. Ответ: 2." },
    ]);

  const length = 8 + v, width = 5 + v, tile = 0.5;
  add(9, "floor-tiles", v, "Плитка на прямоугольном полу", { length, width, tile }, length * width / (tile * tile),
    `Прямоугольный пол имеет размеры ${length} м на ${width} м. Его покрывают квадратными плитками со стороной 50 см без промежутков и обрезки. Сколько плиток потребуется?`, [
      { text: "50 см = 0,5 м. По обеим сторонам пола укладывается целое число плиток." },
      { text: `Вдоль длины: ${length}/0,5 = ${length * 2}; вдоль ширины: ${width}/0,5 = ${width * 2}.` },
      { text: `Всего ${length * 2} · ${width * 2} = ${length * width * 4} плиток.` },
    ]);
  const ladder = 5 * v, ground = 3 * v;
  add(9, "ladder-height", v, "Высота приставленной лестницы", { ladder, ground }, 4 * v,
    `Лестницу длиной ${ladder} м прислонили к вертикальной стене. Нижний конец находится на горизонтальной площадке в ${ground} м от стены. На какой высоте над площадкой находится верхний конец лестницы? Толщиной лестницы пренебрегите.`, [
      { text: "Стена и площадка перпендикулярны; лестница является гипотенузой." },
      { text: "По теореме Пифагора найдём вертикальный катет.", latex: m`h=\sqrt{${ladder}^2-${ground}^2}=${4 * v}` },
    ]);

  const catA = 3 * (v + 1), catB = 4 * (v + 1);
  add(10, "hypotenuse", v, "Теорема Пифагора", { catA, catB }, 5 * (v + 1),
    `Катеты прямоугольного треугольника равны ${catA} и ${catB}. Найдите его гипотенузу.`, [
      { text: "Квадрат гипотенузы равен сумме квадратов катетов." },
      { text: "Берём положительный корень, так как длина положительна.", latex: m`c=\sqrt{${catA}^2+${catB}^2}=${5 * (v + 1)}` },
    ]);
  const baseA = 4 + 2 * v, baseB = 10 + 2 * v, height = 3 + v;
  add(10, "trapezoid-area", v, "Площадь трапеции", { baseA, baseB, height }, (baseA + baseB) * height / 2,
    `Параллельные основания трапеции равны ${baseA} и ${baseB}, а высота равна ${height}. Найдите её площадь.`, [
      { text: "Площадь — произведение полусуммы оснований на высоту, а не на боковую сторону." },
      { text: "Подставляем данные.", latex: m`S=\frac{${baseA}+${baseB}}{2}\cdot${height}=${(baseA + baseB) * height / 2}` },
    ]);

  const side = 2 + v;
  add(11, "cube-surface", v, "Площадь поверхности куба", { side }, 6 * side * side,
    `Ребро куба равно ${side}. Найдите площадь всей его поверхности.`, [
      { text: `У куба шесть одинаковых квадратных граней; площадь одной равна ${side * side}.` },
      { text: "Складываем площади всех граней.", latex: m`S=6a^2=6\cdot${side}^2=${6 * side * side}` },
    ]);
  const boxA = v + 2, boxB = v + 3, boxH = v + 4;
  add(11, "box-volume", v, "Объём прямоугольного параллелепипеда", { boxA, boxB, boxH }, boxA * boxB * boxH,
    `Прямоугольный параллелепипед имеет три взаимно перпендикулярных ребра длиной ${boxA}, ${boxB} и ${boxH}. Найдите его объём.`, [
      { text: `Площадь основания: ${boxA} · ${boxB} = ${boxA * boxB}.` },
      { text: `Объём равен площади основания, умноженной на высоту: ${boxA * boxB} · ${boxH} = ${boxA * boxB * boxH}.` },
    ]);

  const angle = 25 + 5 * v;
  add(12, "isosceles-angle", v, "Углы равнобедренного треугольника", { angle }, 180 - 2 * angle,
    `Угол при основании равнобедренного треугольника равен ${angle}°. Найдите угол при вершине между равными сторонами. Ответ дайте в градусах.`, [
      { text: `Оба угла при основании равны ${angle}°. Их сумма равна ${2 * angle}°.` },
      { text: `Сумма углов треугольника — 180°, поэтому искомый угол ${180 - 2 * angle}°.` },
    ]);
  const smallA = 3 + v, smallB = 5 + v, scale = 2 + v;
  add(12, "similarity-side", v, "Подобие треугольников", { smallA, smallB, scale }, smallB * scale,
    `Треугольники ABC и DEF подобны, причём A соответствует D, B — E, C — F. AB = ${smallA}, BC = ${smallB}, DE = ${smallA * scale}. Найдите EF.`, [
      { text: `Соответствующие стороны DE и AB дают коэффициент подобия: ${smallA * scale} : ${smallA} = ${scale}.` },
      { text: `Стороне BC соответствует EF. Поэтому EF = ${smallB} · ${scale} = ${smallB * scale}.` },
    ]);

  const pyramidA = 3 + v, pyramidB = 5 + v, pyramidH = 3 * v;
  add(13, "pyramid-volume", v, "Объём пирамиды", { pyramidA, pyramidB, pyramidH }, pyramidA * pyramidB * v,
    `Основание пирамиды — прямоугольник со сторонами ${pyramidA} и ${pyramidB}, а высота пирамиды равна ${pyramidH}. Найдите её объём.`, [
      { text: `Площадь основания: ${pyramidA} · ${pyramidB} = ${pyramidA * pyramidB}.` },
      { text: "Объём пирамиды составляет треть произведения площади основания на высоту.", latex: m`V=\frac{${pyramidA * pyramidB}\cdot${pyramidH}}{3}=${pyramidA * pyramidB * v}` },
    ]);
  const ax = 2 * v, by = 3 * v, cz = 6 * v;
  add(13, "box-diagonal", v, "Пространственная диагональ", { ax, by, cz }, 7 * v,
    `Рёбра прямоугольного параллелепипеда, выходящие из одной вершины, равны ${ax}, ${by} и ${cz}. Найдите его пространственную диагональ.`, [
      { text: "Дважды применяем теорему Пифагора: для диагонали грани, затем для пространственной диагонали." },
      { text: "Длина диагонали положительна.", latex: m`d=\sqrt{${ax}^2+${by}^2+${cz}^2}=${7 * v}` },
    ]);

  const numeratorA = v + 1, numeratorB = 2 * v + 1;
  add(14, "fraction-sum", v, "Действия с дробями", { numeratorA, numeratorB }, numeratorA / 4 + numeratorB / 8,
    "Вычислите значение выражения. Ответ запишите целым числом или конечной десятичной дробью.", [
      { text: "Приводим первую дробь к знаменателю 8." },
      { text: "Складываем числители при общем знаменателе.", latex: m`\frac{${2 * numeratorA}+${numeratorB}}8=\frac{${2 * numeratorA + numeratorB}}8` },
      { text: `Деление на 8 даёт ${display(numeratorA / 4 + numeratorB / 8)}.` },
    ], m`\frac{${numeratorA}}4+\frac{${numeratorB}}8`);
  const tenths = 20 + 7 * v, hundredths = 13 + 2 * v;
  add(14, "decimal-difference", v, "Вычитание десятичных дробей", { tenths, hundredths }, tenths / 10 - hundredths / 100,
    `Вычислите ${display(tenths / 10)} − ${display(hundredths / 100)}. Ответ запишите конечной десятичной дробью.`, [
      { text: `Выразим обе величины в сотых: ${tenths * 10}/100 − ${hundredths}/100.` },
      { text: `Разность: ${tenths * 10 - hundredths}/100 = ${display(tenths / 10 - hundredths / 100)}.` },
    ]);

  const original = 1000 + 200 * v, discount = 5 + 5 * v;
  add(15, "discount", v, "Стоимость после скидки", { original, discount }, original * (100 - discount) / 100,
    `Рюкзак стоил ${original} руб. На распродаже цену уменьшили на ${discount}%. Найдите новую цену в рублях.`, [
      { text: `После скидки осталось 100 − ${discount} = ${100 - discount}% исходной цены.` },
      { text: `${original} · ${100 - discount}/100 = ${original * (100 - discount) / 100} руб.` },
    ]);
  const whole = 1200 + 200 * v, percent = 10 + 5 * v, part = whole * percent / 100;
  add(15, "whole-from-percent", v, "Целое по его проценту", { part, percent }, whole,
    `За день прочитали ${part} страниц, что составляет ${percent}% всей книги. Сколько страниц в книге?`, [
      { text: `Пусть в книге N страниц. Условие означает N · ${percent}/100 = ${part}.` },
      { text: `Делим на долю: N = ${part} · 100/${percent} = ${whole}.` },
    ]);

  const root = 2 + v;
  add(16, "radical-sum", v, "Квадрат суммы с корнями", { root }, 2 * root + 1,
    "Вычислите значение выражения.", [
      { text: "Раскрываем квадрат суммы: a² + 2ab + b². Затем сокращаем два одинаковых слагаемых с корнем." },
      { text: "Остаётся сумма квадратов.", latex: m`(${root}+${root + 1})=${2 * root + 1}` },
    ], m`\left(\sqrt{${root}}+\sqrt{${root + 1}}\right)^2-2\sqrt{${root * (root + 1)}}`);
  const exponent = v + 3;
  add(16, "power-quotient", v, "Свойства степеней", { exponent }, 8,
    "Вычислите значение выражения.", [
      { text: "Представим 4 как 2². При делении степеней с одинаковым ненулевым основанием вычитаем показатели." },
      { text: "Разность показателей равна 3.", latex: m`\frac{2^{${2 * exponent + 3}}}{4^{${exponent}}}=2^{${2 * exponent + 3}-2\cdot${exponent}}=2^3=8` },
    ], m`\frac{2^{${2 * exponent + 3}}}{4^{${exponent}}}`);

  const smaller = -v, larger = v + 4;
  add(17, "quadratic-root", v, "Квадратное уравнение с отбором", { smaller, larger }, larger,
    "Решите уравнение. Если корней несколько, запишите больший корень.", [
      { text: "Разложим левую часть на два линейных множителя.", latex: m`(x+${v})(x-${larger})=0` },
      { text: `Корни: ${smaller} и ${larger}. Больший корень — ${larger}. Подстановка обращает произведение в ноль.` },
    ], m`x^2-4x-${v * larger}=0`);
  const shift = v + 2, rhsExponent = v + 1;
  add(17, "exponential-root", v, "Показательное уравнение", { shift, rhsExponent }, shift + rhsExponent,
    "Решите уравнение. Запишите значение x.", [
      { text: `Представим правую часть как степень числа 2: ${2 ** rhsExponent} = 2^${rhsExponent}.` },
      { text: `Так как функция 2^t строго возрастает, показатели равны: x − ${shift} = ${rhsExponent}. Поэтому x = ${shift + rhsExponent}.` },
    ], m`2^{x-${shift}}=${2 ** rhsExponent}`);

  const bound = v + 3;
  add(18, "integer-interval", v, "Целые решения двойного неравенства", { bound }, 4,
    `Сколько целых чисел x удовлетворяют двойному неравенству ${bound} < x ≤ ${bound + 4}?`, [
      { text: `Левая граница ${bound} не включена, правая ${bound + 4} включена.` },
      { text: `Целые решения: ${bound + 1}, ${bound + 2}, ${bound + 3}, ${bound + 4}. Всего 4.` },
    ]);
  const zero1 = v - 2, zero2 = v + 4;
  add(18, "quadratic-integers", v, "Целые решения квадратного неравенства", { zero1, zero2 }, 7,
    `Сколько целых решений имеет неравенство (x − (${zero1}))(x − ${zero2}) ≤ 0?`, [
      { text: "Произведение двух линейных множителей с положительными старшими коэффициентами неположительно между корнями включительно." },
      { text: `Получаем ${zero1} ≤ x ≤ ${zero2}. Число целых равно ${zero2} − (${zero1}) + 1 = 7.` },
    ]);

  const tens = 3 + v, units = v;
  add(19, "digits", v, "Число по сумме и разности цифр", { sum: tens + units, difference: tens - units }, tens * 10 + units,
    `В двузначном числе цифра десятков на ${tens - units} больше цифры единиц, а сумма цифр равна ${tens + units}. Найдите число.`, [
      { text: `Пусть u — цифра единиц. Тогда цифра десятков u + ${tens - units}.` },
      { text: `Имеем 2u + ${tens - units} = ${tens + units}, откуда u = ${units}, цифра десятков ${tens}.` },
      { text: `Обе цифры допустимы; единственное число — ${tens * 10 + units}.` },
    ]);
  const divisor = 5, remainder = v - 1;
  const threshold = 20 + 10 * v;
  const least = Array.from({ length: 15 }, (_, index) => threshold + index).find((n) => n % divisor === remainder && n % 3 === 0)!;
  add(19, "remainder-search", v, "Делимость и остаток", { divisor, remainder, threshold }, least,
    `Найдите наименьшее целое число не меньше ${threshold}, которое делится на 3 и при делении на ${divisor} даёт остаток ${remainder}.`, [
      { text: `Выпишем кратные 3 начиная с ${Math.ceil(threshold / 3) * 3}.` },
      { text: `Первое из них с остатком ${remainder} при делении на ${divisor} — ${least}. Проверка: ${least} = ${divisor} · ${Math.floor(least / divisor)} + ${remainder}.` },
      { text: "Все меньшие допустимые кратные 3 проверены; потому найденный ответ минимален." },
    ]);

  const speed1 = 3 + v, speed2 = 6 + v, meetingTime = 2 + v, distance = (speed1 + speed2) * meetingTime;
  add(20, "meeting", v, "Движение навстречу", { speed1, speed2, distance }, meetingTime,
    `Два велосипедиста одновременно выехали навстречу друг другу из пунктов, расстояние между которыми ${distance} км. Они едут с постоянными скоростями ${speed1} и ${speed2} км/ч. Через сколько часов после выезда они встретятся?`, [
      { text: `Скорость сближения равна сумме: ${speed1} + ${speed2} = ${speed1 + speed2} км/ч.` },
      { text: `Время до встречи: ${distance} : ${speed1 + speed2} = ${meetingTime} ч.` },
    ]);
  const first = 6 * v, second = 3 * v;
  add(20, "joint-work", v, "Совместная работа", { first, second }, 2 * v,
    `Один станок выполняет весь заказ за ${first} ч, второй — за ${second} ч. Оба начали одновременно и работают с постоянной производительностью независимо друг от друга. За сколько часов они выполнят заказ вместе?`, [
      { text: `За час они выполняют 1/${first} и 1/${second} заказа. Производительности складываются.` },
      { text: `Общее время — величина, обратная сумме: ${first} · ${second}/(${first} + ${second}) = ${2 * v} ч.` },
    ]);

  const colors = 3 + v, guarantee = 2 + v;
  add(21, "pigeonhole", v, "Гарантированный результат", { colors, guarantee }, colors * (guarantee - 1) + 1,
    `В ящике много фишек каждого из ${colors} цветов, причём фишек любого цвета больше 100. Фишки достают, не видя их цвета. Какое наименьшее число фишек нужно достать, чтобы среди них обязательно оказалось не меньше ${guarantee} фишек одного цвета?`, [
      { text: `Можно достать по ${guarantee - 1} фишек каждого цвета и ещё не получить ${guarantee} одного цвета. Это ${colors * (guarantee - 1)} фишек.` },
      { text: `Следующая фишка увеличит количество какого-то цвета до ${guarantee}. Поэтому необходимо и достаточно ${colors * (guarantee - 1) + 1}.` },
    ]);
  const totalPages = 20 + 4 * v, firstPages = 3 + v;
  const lastPages = totalPages - firstPages - (firstPages + 2);
  add(21, "three-days", v, "Последовательное распределение", { totalPages, firstPages }, lastPages,
    `Отчёт из ${totalPages} страниц прочитали за три дня. В первый день прочитали ${firstPages} страниц, во второй на 2 страницы больше, чем в первый, а в третий — оставшиеся. Сколько страниц прочитали в третий день?`, [
      { text: `Во второй день прочитали ${firstPages} + 2 = ${firstPages + 2} страниц.` },
      { text: `За первые два дня — ${2 * firstPages + 2}. Осталось ${totalPages} − ${2 * firstPages + 2} = ${lastPages} страниц.` },
      { text: `Проверка: ${firstPages} + ${firstPages + 2} + ${lastPages} = ${totalPages}.` },
    ]);
}
