import type { AnswerRule, Task } from "../tasks";
import type { PublicationCandidate } from "../content-publication";

/** Independent school-mathematics material awaiting curriculum mapping.
 * These records are deliberately NOT imported by tasks.ts or any public route.
 * No exam number, version, score or official alignment is inferred here. */
export type FoundationCandidate = {
  id: string;
  topicId: string;
  skillId: string;
  prototypeId: string;
  difficulty: "foundation" | "standard";
  title: string;
  prompt: string;
  conditionLatex?: string;
  answerRule: Exclude<AnswerRule, { type: "self" }>;
  answerDisplay: string;
  solution: Task["solution"];
  diagram?: Task["diagram"];
  releaseStatus: "draft";
  mappingStatus: "not-mapped";
  authorship: "project-original";
  publication: PublicationCandidate;
};

const m = String.raw;
const step = (text: string, latex?: string): Task["solution"][number] => ({ text, ...(latex ? { latex } : {}) });
function candidate(
  topicId: string,
  skillId: string,
  content: Omit<FoundationCandidate, "id" | "topicId" | "skillId" | "prototypeId" | "releaseStatus" | "mappingStatus" | "authorship" | "publication">,
): FoundationCandidate {
  const id = `foundation-candidate-${skillId}-r1`;
  return {
    id, topicId, skillId,
    prototypeId: `foundation-${skillId}`, releaseStatus: "draft",
    mappingStatus: "not-mapped", authorship: "project-original", ...content,
    publication: {
      id, releaseStatus: "draft",
      provenance: {
        authorship: "project-original", sourceIds: ["tochka-project-original"],
        sourceFiles: ["src/lib/content/foundation-candidates.ts"],
        attribution: ["Авторский материал проекта «Точка»"],
      },
      validation: { status: "automated-reviewed", checkedAt: "2026-10-21", evidence: ["scripts/test-foundation-candidates.mjs"] },
    },
  };
}

export const foundationCandidates: FoundationCandidate[] = [
  candidate("fractions", "fraction-nested-difference", {
    difficulty: "foundation", title: "Вычитание суммы дробей",
    prompt: "Вычислите значение выражения. Ответ можно записать обыкновенной или конечной десятичной дробью.",
    conditionLatex: m`\frac56-\left(\frac14+\frac13\right)`,
    answerRule: { type: "number", value: "1/4" }, answerDisplay: "1/4",
    solution: [
      step("Сначала складываем дроби внутри скобок. Общий знаменатель 4 и 3 равен 12.", m`\frac14+\frac13=\frac3{12}+\frac4{12}=\frac7{12}`),
      step("Приводим уменьшаемое к тому же знаменателю.", m`\frac56=\frac{10}{12}`),
      step("Вычитаем числители и сокращаем результат.", m`\frac{10}{12}-\frac7{12}=\frac3{12}=\frac14`),
    ],
  }),
  candidate("fractions", "fraction-of-remainder", {
    difficulty: "standard", title: "Доля оставшегося запаса",
    prompt: "На изготовление первой партии деталей ушло 3/5 всего запаса материала. На вторую партию потратили 1/4 оставшегося запаса. Какая доля первоначального запаса израсходована на обе партии?",
    answerRule: { type: "number", value: "7/10" }, answerDisplay: "7/10",
    solution: [
      step("После первой партии осталось две пятых исходного запаса.", m`1-\frac35=\frac25`),
      step("Во второй партии использовали четверть именно остатка, а не четверть всего первоначального запаса.", m`\frac14\cdot\frac25=\frac1{10}`),
      step("Складываем расходы относительно одного и того же целого — первоначального запаса.", m`\frac35+\frac1{10}=\frac6{10}+\frac1{10}=\frac7{10}`),
    ],
  }),
  candidate("fractions", "whole-from-fraction", {
    difficulty: "foundation", title: "Целое по известной части",
    prompt: "От рулона отрезали 21 м ткани, что составило 7/12 его первоначальной длины. Какова первоначальная длина рулона в метрах?",
    answerRule: { type: "number", value: "36" }, answerDisplay: "36 м",
    solution: [
      step("Семь двенадцатых длины — это семь равных частей по одной двенадцатой."),
      step("Находим длину одной двенадцатой: 21 : 7 = 3 м."),
      step("В целом рулоне двенадцать таких частей: 3 · 12 = 36 м."),
      step("Проверяем долю от результата: 36 · 7/12 = 21 м, как в условии."),
    ],
  }),
  candidate("fractions", "reciprocal-of-sum", {
    difficulty: "standard", title: "Обратное число к сумме",
    prompt: "Найдите число, обратное сумме 1/2 и 1/3. Ответ запишите числом или обыкновенной дробью.",
    answerRule: { type: "number", value: "6/5" }, answerDisplay: "6/5",
    solution: [
      step("Находим исходную сумму, приведя дроби к знаменателю 6.", m`\frac12+\frac13=\frac36+\frac26=\frac56`),
      step("Сумма не равна нулю, поэтому обратное число существует."),
      step("Для получения обратной дроби меняем местами числитель и знаменатель.", m`1:\frac56=\frac65`),
      step("Проверка: произведение взаимно обратных чисел равно единице.", m`\frac56\cdot\frac65=1`),
    ],
  }),
  candidate("decimals", "decimal-unit-cost", {
    difficulty: "foundation", title: "Расход по длине",
    prompt: "Для одного метра декоративной полосы требуется 3,75 г краски. Сколько граммов краски нужно для полосы длиной 2,4 м, если расход постоянный и потерь краски нет?",
    answerRule: { type: "number", value: "9" }, answerDisplay: "9 г",
    solution: [
      step("Общий расход равен расходу на один метр, умноженному на длину."),
      step("Временно умножаем целые числа: 375 · 24 = 9000."),
      step("В множителях всего три знака после запятой, поэтому 3,75 · 2,4 = 9,000 = 9 г."),
    ],
  }),
  candidate("decimals", "decimal-whole-packages", {
    difficulty: "standard", title: "Покупка целых заготовок",
    prompt: "Нужно изготовить декоративную линию длиной 3,7 м. В продаже есть только рейки длиной 0,8 м; их можно соединять и обрезать без потерь на стыках. Какое наименьшее целое количество реек нужно купить?",
    answerRule: { type: "number", value: "5" }, answerDisplay: "5 реек",
    solution: [
      step("Четыре рейки дают 4 · 0,8 = 3,2 м. Этого меньше требуемых 3,7 м."),
      step("Пять реек дают 5 · 0,8 = 4 м. Их длины достаточно, избыток можно обрезать."),
      step("Покупаются только целые рейки. Минимальное подходящее количество — 5; округлять частное 3,7 : 0,8 до ближайшего целого здесь нельзя."),
    ],
  }),
  candidate("decimals", "decimal-quotient-after-difference", {
    difficulty: "foundation", title: "Разность перед делением",
    prompt: "Вычислите значение выражения, выполняя действия в указанном порядке.",
    conditionLatex: m`(0{,}84-0{,}36):0{,}12`,
    answerRule: { type: "number", value: "4" }, answerDisplay: "4",
    solution: [
      step("Сначала выполняем вычитание в скобках: 0,84 − 0,36 = 0,48."),
      step("Умножаем делимое и делитель на 100, чтобы убрать десятичные запятые: 0,48 : 0,12 = 48 : 12."),
      step("48 : 12 = 4. Проверка умножением: 4 · 0,12 = 0,48."),
    ],
  }),
  candidate("decimals", "decimal-midpoint", {
    difficulty: "foundation", title: "Середина числового промежутка",
    prompt: "На числовой прямой отмечены числа 1,28 и 1,46. Какое число находится точно посередине между ними?",
    answerRule: { type: "number", value: "1.37" }, answerDisplay: "1,37",
    solution: [
      step("Расстояние между отмеченными числами равно 1,46 − 1,28 = 0,18."),
      step("Половина этого расстояния: 0,18 : 2 = 0,09."),
      step("Прибавляем половину расстояния к меньшему числу: 1,28 + 0,09 = 1,37. До большего числа также остаётся 0,09."),
    ],
  }),
  candidate("percentages", "reverse-discount", {
    difficulty: "standard", title: "Цена до скидки",
    prompt: "После скидки 15% настольная лампа стоит 1360 рублей. Сколько рублей она стоила до скидки?",
    answerRule: { type: "number", value: "1600" }, answerDisplay: "1600 ₽",
    solution: [
      step("После скидки покупатель платит 100% − 15% = 85% первоначальной цены."),
      step("Обозначаем первоначальную цену x. Тогда 0,85x = 1360."),
      step("Делим на 0,85: x = 1600 рублей. Проверка: скидка равна 240 рублям, 1600 − 240 = 1360."),
    ],
  }),
  candidate("percentages", "successive-relative-changes", {
    difficulty: "standard", title: "Два последовательных изменения",
    prompt: "Производительность установки сначала увеличили на 20%, а затем уменьшили на 25% от полученного значения. На сколько процентов итоговая производительность ниже первоначальной?",
    answerRule: { type: "number", value: "10" }, answerDisplay: "10%",
    solution: [
      step("Пусть исходная производительность равна x. После увеличения она составляет 1,2x."),
      step("Уменьшение на 25% оставляет 75% текущего значения: 1,2x · 0,75 = 0,9x."),
      step("Осталось 90% исходного значения, то есть уменьшение относительно начала составляет 10%. Складывать 20% и −25% нельзя: проценты взяты от разных величин."),
    ],
  }),
  candidate("percentages", "solution-dilution", {
    difficulty: "standard", title: "Разбавление раствора",
    prompt: "В 300 г раствора сахар составляет 18% массы. Сколько граммов чистой воды нужно добавить, чтобы сахар составлял 12% массы нового раствора? Потери вещества отсутствуют.",
    answerRule: { type: "number", value: "150" }, answerDisplay: "150 г",
    solution: [
      step("Первоначальная масса сахара: 300 · 0,18 = 54 г."),
      step("При добавлении чистой воды масса сахара остаётся равной 54 г. В новом растворе это 12% всей массы."),
      step("Новая масса раствора: 54 : 0,12 = 450 г."),
      step("Добавленная вода составляет 450 − 300 = 150 г. Проверка: 54 : 450 = 0,12."),
    ],
  }),
  candidate("percentages", "percent-versus-percentage-points", {
    difficulty: "standard", title: "Проценты и процентные пункты",
    prompt: "Доля заказов, оплаченных онлайн, выросла с 40% до 50%. На сколько процентов выросла сама доля по отношению к её прежнему значению? В ответе требуется относительное изменение, а не число процентных пунктов.",
    answerRule: { type: "number", value: "25" }, answerDisplay: "25%",
    solution: [
      step("Разница между новой и старой долей равна 50 − 40 = 10 процентным пунктам."),
      step("Для относительного изменения делим эту разницу на прежнее значение доли: 10 : 40 = 0,25."),
      step("Переводим отношение в проценты: 0,25 · 100% = 25%. Рост на 10 процентных пунктов здесь равен росту самой доли на 25%."),
    ],
  }),
  candidate("linear-equations", "linear-distributive-balance", {
    difficulty: "foundation", title: "Раскрытие двух скобок",
    prompt: "Решите уравнение.", conditionLatex: m`3(2x-1)-4(x+2)=9`,
    answerRule: { type: "number", value: "10" }, answerDisplay: "10",
    solution: [
      step("Раскрываем скобки с учётом знаков.", m`6x-3-4x-8=9`),
      step("Приводим подобные слагаемые: 2x − 11 = 9. Переносим −11 вправо: 2x = 20."),
      step("Получаем x = 10. Проверяем в исходном уравнении: 3 · 19 − 4 · 12 = 57 − 48 = 9."),
    ],
  }),
  candidate("linear-equations", "linear-fractional-denominators", {
    difficulty: "standard", title: "Уравнение с дробными коэффициентами",
    prompt: "Найдите корень уравнения.", conditionLatex: m`\frac{x-2}{3}+\frac{x+1}{6}=\frac52`,
    answerRule: { type: "number", value: "6" }, answerDisplay: "6",
    solution: [
      step("Все знаменатели — ненулевые числа. Умножаем обе части уравнения на 6.", m`2(x-2)+(x+1)=15`),
      step("Раскрываем скобки и приводим подобные: 2x − 4 + x + 1 = 15, откуда 3x − 3 = 15."),
      step("Следовательно, 3x = 18 и x = 6."),
      step("Подстановка: 4/3 + 7/6 = 8/6 + 7/6 = 15/6 = 5/2."),
    ],
  }),
  candidate("linear-equations", "linear-tariff-intersection", {
    difficulty: "standard", title: "Одинаковая стоимость тарифов",
    prompt: "Тариф A стоит 120 рублей в месяц и ещё 3 рубля за каждую минуту разговора. Тариф B стоит 60 рублей в месяц и ещё 5 рублей за каждую минуту. При каком количестве минут месячная стоимость тарифов одинакова? Дополнительных платежей нет.",
    answerRule: { type: "number", value: "30" }, answerDisplay: "30 минут",
    solution: [
      step("Пусть разговоры заняли m минут. Стоимость тарифов: 120 + 3m и 60 + 5m."),
      step("Приравниваем стоимости и переносим слагаемые: 120 + 3m = 60 + 5m, значит 60 = 2m."),
      step("Получаем m = 30 минут. Обе стоимости равны 210 рублям: 120 + 90 = 60 + 150."),
    ],
  }),
  candidate("linear-equations", "linear-identity-parameter", {
    difficulty: "standard", title: "Равенство при любом значении",
    prompt: "При каком значении k равенство верно для любого действительного x?",
    conditionLatex: m`2(x+3)=2x+k`,
    answerRule: { type: "number", value: "6" }, answerDisplay: "6",
    solution: [
      step("Раскрываем скобку в левой части: 2x + 6 = 2x + k."),
      step("Вычитаем 2x из обеих частей. Остаётся равенство 6 = k, не зависящее от x."),
      step("При k = 6 обе части исходного равенства имеют вид 2x + 6. При другом k равенство не выполняется ни для одного x."),
    ],
  }),
  candidate("quadratic-equations", "biquadratic-root-set", {
    difficulty: "standard", title: "Квадратное уравнение после замены",
    prompt: "Найдите все действительные корни уравнения. Запишите их через точку с запятой.",
    conditionLatex: m`x^4-13x^2+36=0`,
    answerRule: { type: "set", values: ["-3", "-2", "2", "3"] }, answerDisplay: "−3; −2; 2; 3",
    solution: [
      step("Вводим новую переменную y = x². Для действительного x значение y неотрицательно."),
      step("Получаем квадратное уравнение y² − 13y + 36 = 0. Его левая часть раскладывается в произведение.", m`(y-4)(y-9)=0`),
      step("Следовательно, y = 4 или y = 9. Оба значения удовлетворяют ограничению y ≥ 0."),
      step("Возвращаемся к x: из x² = 4 получаем x = −2 и x = 2; из x² = 9 получаем x = −3 и x = 3."),
      step("Все четыре числа подходят исходному уравнению. Других значений y, а значит и других действительных корней x, нет."),
    ],
  }),
  candidate("quadratic-equations", "rectangle-area-perimeter", {
    difficulty: "standard", title: "Стороны по площади и периметру",
    prompt: "Периметр прямоугольника равен 26 см, а площадь — 42 см². Найдите длину большей стороны в сантиметрах.",
    answerRule: { type: "number", value: "7" }, answerDisplay: "7 см",
    solution: [
      step("Сумма двух разных сторон равна половине периметра: 26 : 2 = 13 см."),
      step("Обозначаем одну сторону x, другую 13 − x. По площади x(13 − x) = 42, то есть x² − 13x + 42 = 0."),
      step("Раскладываем: (x − 6)(x − 7) = 0. Стороны равны 6 и 7 см; обе положительны."),
      step("Большая сторона — 7 см. Проверка: 2(6 + 7) = 26 см и 6 · 7 = 42 см²."),
    ],
  }),
  candidate("quadratic-equations", "squaring-with-domain", {
    difficulty: "standard", title: "Проверка после возведения в квадрат",
    prompt: "Решите уравнение. Укажите только корень исходного уравнения.",
    conditionLatex: m`\sqrt{x+6}=x`,
    answerRule: { type: "number", value: "3" }, answerDisplay: "3",
    solution: [
      step("Левая часть неотрицательна, поэтому x ≥ 0. При этом подкоренное выражение также допустимо."),
      step("Возводим обе части в квадрат: x + 6 = x², или x² − x − 6 = 0."),
      step("Разложение (x − 3)(x + 2) = 0 даёт кандидатов 3 и −2. Число −2 нарушает условие x ≥ 0."),
      step("Проверяем оставшееся число: √(3 + 6) = 3. Ответ: 3; посторонний корень −2 не подходит."),
    ],
  }),
  candidate("quadratic-equations", "coefficient-from-root", {
    difficulty: "standard", title: "Коэффициент по известному корню",
    prompt: "Известно, что число 4 является корнем уравнения. Найдите коэффициент b.",
    conditionLatex: m`x^2+bx-12=0`,
    answerRule: { type: "number", value: "-1" }, answerDisplay: "−1",
    solution: [
      step("Корень обращает левую часть в ноль. Подставляем x = 4: 16 + 4b − 12 = 0."),
      step("Получаем 4b + 4 = 0, поэтому b = −1."),
      step("Проверка: x² − x − 12 = (x − 4)(x + 3). Число 4 действительно является корнем."),
    ],
  }),
  candidate("powers-roots", "negative-power-common-base", {
    difficulty: "standard", title: "Отрицательная степень",
    prompt: "Вычислите значение выражения.", conditionLatex: m`8^{-2}\cdot2^9`,
    answerRule: { type: "number", value: "8" }, answerDisplay: "8",
    solution: [
      step("Отрицательная степень обозначает обратное число, а не отрицательное значение: 8⁻² = 1/8²."),
      step("Представим 8 как 2³, тогда 8⁻² = 2⁻⁶."),
      step("При умножении степеней с одинаковым основанием складываем показатели.", m`2^{-6}\cdot2^9=2^3=8`),
    ],
  }),
  candidate("powers-roots", "quotient-of-positive-roots", {
    difficulty: "foundation", title: "Частное квадратных корней",
    prompt: "Найдите значение выражения.", conditionLatex: m`\frac{\sqrt{72}}{\sqrt2}`,
    answerRule: { type: "number", value: "6" }, answerDisplay: "6",
    solution: [
      step("Оба подкоренных числа положительны, знаменатель не равен нулю."),
      step("Используем свойство частного квадратных корней.", m`\frac{\sqrt{72}}{\sqrt2}=\sqrt{\frac{72}{2}}=\sqrt{36}`),
      step("Квадратный корень — неотрицательное число. Поэтому √36 = 6, а не ±6."),
    ],
  }),
  candidate("powers-roots", "odd-root-and-even-power", {
    difficulty: "foundation", title: "Знаки корней и степеней",
    prompt: "Вычислите значение выражения.", conditionLatex: m`\sqrt[3]{-125}+(-3)^2`,
    answerRule: { type: "number", value: "4" }, answerDisplay: "4",
    solution: [
      step("Кубический корень отрицательного числа отрицателен: (−5)³ = −125, значит ∛(−125) = −5."),
      step("В квадрат возводится всё число −3, заключённое в скобки: (−3)² = 9."),
      step("Складываем результаты: −5 + 9 = 4."),
    ],
  }),
  candidate("powers-roots", "exponential-common-base", {
    difficulty: "standard", title: "Приведение к одному основанию",
    prompt: "Найдите действительный корень уравнения.", conditionLatex: m`4^{x-1}=8^{x+1}`,
    answerRule: { type: "number", value: "-5" }, answerDisplay: "−5",
    solution: [
      step("Представим основания как степени двойки: 4 = 2², 8 = 2³."),
      step("Получаем 2^(2x − 2) = 2^(3x + 3). Показательная функция с основанием 2 строго возрастает, значит показатели равны."),
      step("Решаем 2x − 2 = 3x + 3, откуда x = −5."),
      step("Проверка: при x = −5 обе части равны 2⁻¹². Ограничений на действительный x у исходных степеней нет."),
    ],
  }),
  candidate("geometry", "right-triangle-hypotenuse", {
    difficulty: "foundation", title: "Гипотенуза по двум катетам",
    prompt: "В прямоугольном треугольнике ABC угол B равен 90°, AB = 7 см, BC = 24 см. Найдите длину гипотенузы AC в сантиметрах.",
    diagram: { type: "right-triangle", adjacent: 7, opposite: 24 },
    answerRule: { type: "number", value: "25" }, answerDisplay: "25 см",
    solution: [
      step("Сторона AC лежит против прямого угла, поэтому это гипотенуза."),
      step("По теореме Пифагора квадрат гипотенузы равен сумме квадратов катетов.", m`AC^2=7^2+24^2=49+576=625`),
      step("Длина положительна, поэтому AC = √625 = 25 см. Гипотенуза длиннее каждого катета, как и должно быть."),
    ],
  }),
  candidate("geometry", "triangle-height-area", {
    difficulty: "foundation", title: "Основание и высота треугольника",
    prompt: "Сторона треугольника имеет длину 18 см. Высота, проведённая к этой стороне, равна 5 см. Найдите площадь треугольника в квадратных сантиметрах.",
    answerRule: { type: "number", value: "45" }, answerDisplay: "45 см²",
    solution: [
      step("Для площади нужна высота именно к выбранной стороне. Это соответствие прямо задано в условии."),
      step("Площадь треугольника равна половине произведения основания и высоты.", m`S=\frac12 ah`),
      step("Подставляем длины в сантиметрах: S = 18 · 5 : 2 = 45 см². Деление на 2 отличает площадь треугольника от площади соответствующего параллелограмма."),
    ],
  }),
  candidate("geometry", "square-frame-area", {
    difficulty: "standard", title: "Площадь квадратной рамки",
    prompt: "Из квадратной пластины со стороной 10 см вырезали квадрат со стороной 6 см. Вырез целиком находится внутри пластины. Найдите площадь оставшейся части в квадратных сантиметрах.",
    answerRule: { type: "number", value: "64" }, answerDisplay: "64 см²",
    solution: [
      step("Площадь первоначального квадрата равна 10² = 100 см²."),
      step("Площадь вырезанного квадрата равна 6² = 36 см²."),
      step("Вырез полностью внутри пластины, поэтому вычитаем его площадь: 100 − 36 = 64 см². Возводить в квадрат разность сторон нельзя."),
    ],
  }),
  candidate("geometry", "coordinate-rectangle-area", {
    difficulty: "standard", title: "Прямоугольник на координатной плоскости",
    prompt: "Вершины прямоугольника заданы по порядку: A(−2; 1), B(4; 1), C(4; 5), D(−2; 5). Найдите его площадь. Единичный отрезок на обеих координатных осях одинаковый.",
    answerRule: { type: "number", value: "24" }, answerDisplay: "24",
    solution: [
      step("Отрезок AB горизонтален, потому что ординаты его концов равны. Его длина: 4 − (−2) = 6."),
      step("Отрезок BC вертикален, потому что абсциссы его концов равны. Его длина: 5 − 1 = 4."),
      step("Соседние стороны перпендикулярны. Площадь прямоугольника равна произведению их длин: 6 · 4 = 24 квадратные единицы."),
    ],
  }),
  candidate("probability", "uniform-divisibility", {
    difficulty: "foundation", title: "Равновозможные номера",
    prompt: "В мешке лежат 10 одинаковых на ощупь жетонов с номерами от 1 до 10, каждый номер встречается один раз. Наугад выбирают один жетон. Найдите вероятность того, что его номер делится на 3 без остатка.",
    answerRule: { type: "number", value: "3/10" }, answerDisplay: "0,3",
    solution: [
      step("Всего 10 равновозможных исходов — по одному для каждого жетона."),
      step("Подходят номера 3, 6 и 9. Благоприятных исходов три."),
      step("Вероятность равна отношению числа благоприятных исходов к общему числу: 3/10 = 0,3."),
    ],
  }),
  candidate("probability", "two-dice-sum", {
    difficulty: "standard", title: "Сумма двух бросков",
    prompt: "Честный шестигранный кубик бросают дважды независимо. Найдите вероятность того, что сумма выпавших очков равна 8. Ответ запишите точной обыкновенной дробью, без округления.",
    answerRule: { type: "number", value: "5/36" }, answerDisplay: "5/36",
    solution: [
      step("Результат — упорядоченная пара чисел. Всего 6 · 6 = 36 равновозможных пар."),
      step("Сумму 8 дают пять пар: (2; 6), (3; 5), (4; 4), (5; 3), (6; 2)."),
      step("Делим число подходящих пар на общее число исходов: 5/36. Десятичная запись бесконечна, поэтому сохраняем точную дробь."),
    ],
  }),
  candidate("probability", "two-colors-without-replacement", {
    difficulty: "standard", title: "Два жетона без возвращения",
    prompt: "В мешке 3 синих и 2 белых жетона, одинаковых на ощупь. Последовательно выбирают наугад два жетона, первый обратно не возвращают. Найдите вероятность того, что цвета выбранных жетонов различаются.",
    answerRule: { type: "number", value: "3/5" }, answerDisplay: "0,6",
    solution: [
      step("Разные цвета получаются в двух несовместных случаях: сначала синий, затем белый; или сначала белый, затем синий."),
      step("Вероятность первого случая равна (3/5) · (2/4) = 3/10: после первого выбора остаётся четыре жетона."),
      step("Вероятность второго случая равна (2/5) · (3/4) = 3/10."),
      step("Складываем вероятности несовместных случаев: 3/10 + 3/10 = 3/5 = 0,6. Возвращение первого жетона изменило бы расчёт."),
    ],
  }),
  candidate("probability", "independent-at-least-one", {
    difficulty: "standard", title: "Хотя бы один датчик",
    prompt: "Два датчика независимо обнаруживают неисправность. Вероятность обнаружения первым датчиком равна 0,9, вторым — 0,8. Найдите вероятность того, что неисправность обнаружит хотя бы один датчик.",
    answerRule: { type: "number", value: "0.98" }, answerDisplay: "0,98",
    solution: [
      step("Противоположное событие — ни один датчик не обнаружит неисправность."),
      step("Вероятности пропуска: 1 − 0,9 = 0,1 и 1 − 0,8 = 0,2."),
      step("Из независимости следует: вероятность двух пропусков равна 0,1 · 0,2 = 0,02."),
      step("Искомая вероятность равна 1 − 0,02 = 0,98. Простое сложение 0,9 + 0,8 неверно: случаи могут происходить одновременно."),
    ],
  }),
];
