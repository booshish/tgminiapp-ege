export type Task = {
  id: string;
  topic: string;
  title: string;
  prompt: string;
  kind: "triangle" | "equation" | "fraction" | "probability" | "percentage";
  formula?: string;
  answer: number;
  solution: string;
  hint: string;
};

export const tasks: Task[] = [
  {
    id: "triangle-sine",
    topic: "Геометрия",
    title: "Синус острого угла",
    prompt:
      "В прямоугольном треугольнике ABC угол B равен 90°, AB = 6, BC = 8. Найдите sin A.",
    kind: "triangle",
    formula: "sin A = BC / AC",
    answer: 0.8,
    solution:
      "По теореме Пифагора AC = √(6² + 8²) = √100 = 10. Синус угла равен отношению противолежащего катета к гипотенузе: sin A = BC / AC = 8 / 10 = 0,8.",
    hint: "Сначала найдите гипотенузу. Напротив угла A лежит катет BC = 8.",
  },
  {
    id: "linear-equation",
    topic: "Уравнения",
    title: "Найдите неизвестное",
    prompt: "Решите уравнение и запишите значение x.",
    kind: "equation",
    formula: "3x − 7 = 11",
    answer: 6,
    solution:
      "Прибавим 7 к обеим частям: 3x = 18. Разделим обе части на 3: x = 6. Проверка: 3 · 6 − 7 = 11.",
    hint: "Перенесите −7 в правую часть, поменяв знак, затем разделите на коэффициент при x.",
  },
  {
    id: "fraction-addition",
    topic: "Дроби",
    title: "Сложение дробей",
    prompt:
      "Вычислите значение выражения. Ответ можно записать десятичной или обыкновенной дробью.",
    kind: "fraction",
    formula: "1/4 + 3/8",
    answer: 0.625,
    solution:
      "Приведём дроби к общему знаменателю 8: 1/4 = 2/8. Теперь 2/8 + 3/8 = 5/8 = 0,625.",
    hint: "Общий знаменатель для 4 и 8 — число 8.",
  },
  {
    id: "probability-balls",
    topic: "Вероятность",
    title: "Случайный выбор",
    prompt:
      "В мешке 3 зелёных и 7 белых шаров. Наугад вынимают один шар. Какова вероятность, что он зелёный? Все шары одинаковы на ощупь.",
    kind: "probability",
    formula: "P = m / n",
    answer: 0.3,
    solution:
      "Всего шаров 3 + 7 = 10. Благоприятных исходов 3 — столько зелёных шаров. Поэтому P = 3 / 10 = 0,3.",
    hint: "Разделите число зелёных шаров на общее число шаров.",
  },
  {
    id: "percentage-discount",
    topic: "Проценты",
    title: "Цена со скидкой",
    prompt:
      "Тетрадь стоила 200 рублей. Магазин снизил цену на 15%. Сколько рублей теперь стоит тетрадь?",
    kind: "percentage",
    formula: "200 · (1 − 15/100)",
    answer: 170,
    solution:
      "Скидка составляет 200 · 15 / 100 = 30 рублей. Новая цена: 200 − 30 = 170 рублей.",
    hint: "Найдите 15% от 200 и вычтите эту сумму из начальной цены.",
  },
];

export const theoryNotes: {
  id: string;
  title: string;
  topic: string;
  summary: string;
  formula: string;
  body: string;
  example: string;
}[] = [
  {
    id: "right-triangle",
    title: "Прямоугольный треугольник",
    topic: "Геометрия",
    summary: "Теорема Пифагора и синус острого угла.",
    formula: "a² + b² = c²; sin A = a / c",
    body: "В прямоугольном треугольнике a и b — катеты, c — гипотенуза. Квадрат гипотенузы равен сумме квадратов катетов. Синус острого угла — отношение противолежащего этому углу катета к гипотенузе; в формуле a лежит напротив A.",
    example:
      "При катетах 6 и 8 гипотенуза равна √(36 + 64) = 10. Синус угла напротив катета 8 равен 8/10 = 0,8.",
  },
  {
    id: "linear-equations",
    title: "Линейные уравнения",
    topic: "Уравнения",
    summary: "Как найти x, выполняя одинаковые действия с обеими частями.",
    formula: "ax + b = c → x = (c − b) / a, a ≠ 0",
    body: "К обеим частям уравнения можно прибавить или из них вычесть одно и то же число. Также обе части можно умножить или разделить на одно и то же ненулевое число. После решения подставьте найденное значение в исходное уравнение.",
    example: "2x + 5 = 13 → 2x = 8 → x = 4. Проверка: 2 · 4 + 5 = 13.",
  },
  {
    id: "fractions",
    title: "Действия с дробями",
    topic: "Дроби",
    summary: "Общий знаменатель помогает складывать и вычитать дроби.",
    formula: "a/c + b/c = (a + b)/c, c ≠ 0",
    body: "Чтобы сложить дроби с разными знаменателями, приведите их к общему знаменателю. Умножайте числитель и знаменатель каждой дроби на одно и то же ненулевое число. Затем сложите числители, сохранив общий знаменатель, и сократите результат, если возможно.",
    example: "1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2 = 0,5.",
  },
  {
    id: "percentages",
    title: "Проценты без сложностей",
    topic: "Проценты",
    summary: "Один процент — одна сотая часть числа.",
    formula: "p% от N = N · p / 100",
    body: "Чтобы найти p процентов от числа, умножьте число на p и разделите на 100. При скидке вычтите полученную сумму из исходной цены. При увеличении на p процентов прибавьте её к исходному значению.",
    example:
      "20% от 500 = 500 · 20 / 100 = 100. После скидки 20% цена будет 500 − 100 = 400.",
  },
];

/** Пример для интерфейса тренера, не результат анализа ответов пользователя. */
export const topicStats: {
  label: string;
  value: number;
  description: string;
}[] = [
  { label: "Дроби", value: 38, description: "Стоит повторить основы" },
  { label: "Уравнения", value: 52, description: "Есть куда расти" },
  { label: "Геометрия", value: 60, description: "Хорошая опора для старта" },
];

/** Принимает десятичные числа с точкой/запятой и простые дроби. */
export function normalizeAnswer(input: string): number | null {
  const normalized = input.trim().replace(/−/g, "-").replace(/,/g, ".");
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  const parts = normalized.split("/").map((part) => part.trim());

  if (parts.length === 1 && decimal.test(parts[0])) {
    const value = Number(parts[0]);
    return Number.isFinite(value) ? value : null;
  }

  if (parts.length === 2 && parts.every((part) => decimal.test(part))) {
    const numerator = Number(parts[0]);
    const denominator = Number(parts[1]);
    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator === 0
    ) {
      return null;
    }
    const value = numerator / denominator;
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

export function isCorrectAnswer(input: string, expected: number): boolean {
  const answer = normalizeAnswer(input);
  return (
    answer !== null &&
    Number.isFinite(expected) &&
    Math.abs(answer - expected) < 1e-9
  );
}

export type ProgressRecord = {
  taskId: string;
  correct: boolean;
  attempts: number;
};

export type DemoProgress = {
  records: ProgressRecord[];
  exam: "ЕГЭ" | "ОГЭ";
  lastTaskIndex: number;
};

export const storageKey = "tochka-demo-progress-v1";

export const emptyProgress: DemoProgress = {
  records: [],
  exam: "ЕГЭ",
  lastTaskIndex: 0,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Повреждённое или устаревшее сохранение не должно мешать открытию демо. */
export function parseProgress(raw: string | null): DemoProgress {
  const fallback: DemoProgress = { ...emptyProgress, records: [] };
  if (!raw) return fallback;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return fallback;

    const recordsByTask = new Map<string, ProgressRecord>();
    if (Array.isArray(parsed.records)) {
      for (const record of parsed.records) {
        if (
          !isObject(record) ||
          typeof record.taskId !== "string" ||
          !tasks.some((task) => task.id === record.taskId) ||
          typeof record.correct !== "boolean" ||
          typeof record.attempts !== "number" ||
          !Number.isSafeInteger(record.attempts) ||
          record.attempts < 1
        ) {
          continue;
        }

        const previous = recordsByTask.get(record.taskId);
        recordsByTask.set(record.taskId, {
          taskId: record.taskId,
          correct: record.correct || Boolean(previous?.correct),
          attempts: Math.max(record.attempts, previous?.attempts ?? 0),
        });
      }
    }

    const lastTaskIndex =
      typeof parsed.lastTaskIndex === "number" &&
      Number.isInteger(parsed.lastTaskIndex) &&
      parsed.lastTaskIndex >= 0 &&
      parsed.lastTaskIndex < tasks.length
        ? parsed.lastTaskIndex
        : 0;

    return {
      records: Array.from(recordsByTask.values()),
      exam: parsed.exam === "ОГЭ" ? "ОГЭ" : "ЕГЭ",
      lastTaskIndex,
    };
  } catch {
    return fallback;
  }
}
