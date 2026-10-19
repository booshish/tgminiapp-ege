import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Use the project's existing TypeScript dependency so this also runs on Node 20.9.
// No generated files, browser, or additional test dependencies are needed.
const source = await readFile(
  new URL("../src/lib/demo.ts", import.meta.url),
  "utf8",
);
const { outputText, diagnostics = [] } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
  reportDiagnostics: true,
  fileName: "demo.ts",
});
assert.equal(
  diagnostics.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  ).length,
  0,
  "Исходный модуль должен компилироваться без синтаксических ошибок",
);

const {
  tasks,
  normalizeAnswer,
  isCorrectAnswer,
  parseProgress,
  emptyProgress,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const firstTaskId = tasks[0].id;
const secondTaskId = tasks[1].id;
const freshProgress = () => ({ records: [], exam: "ЕГЭ", lastTaskIndex: 0 });

test("Пять разных задач имеют математически верные ответы", () => {
  const expectedByKind = {
    triangle: 8 / Math.hypot(6, 8),
    equation: (11 + 7) / 3,
    fraction: 1 / 4 + 3 / 8,
    probability: 3 / (3 + 7),
    percentage: 200 - (200 * 15) / 100,
  };

  assert.equal(tasks.length, 5);
  assert.equal(new Set(tasks.map((task) => task.id)).size, 5);
  assert.deepEqual(
    tasks.map((task) => task.kind).sort(),
    Object.keys(expectedByKind).sort(),
  );
  assert.equal(tasks[0].kind, "triangle");

  for (const task of tasks) {
    assert.equal(task.answer, expectedByKind[task.kind], task.title);
    assert.ok(isCorrectAnswer(String(task.answer), task.answer), task.title);
    assert.ok(task.solution.trim(), `Для «${task.title}» нужно объяснение`);
  }
});

test("Запятая, точка и эквивалентные дроби дают один ответ", () => {
  for (const input of ["0,8", "0.8", ".8", ",8", "4/5", " 4 / 5 ", "\t0,8\n"]) {
    assert.equal(normalizeAnswer(input), 0.8, input);
    assert.equal(isCorrectAnswer(input, tasks[0].answer), true, input);
  }

  assert.equal(normalizeAnswer("−3/4"), -0.75);
  assert.equal(normalizeAnswer("3/-4"), -0.75);
  assert.equal(normalizeAnswer("+6"), 6);
  assert.equal(normalizeAnswer("0/5"), 0);
  assert.equal(normalizeAnswer("0"), 0);
});

test("Пустой, неполный и неоднозначный ввод не считается числом", () => {
  const invalidInputs = [
    "",
    "   ",
    ".",
    ",",
    "-",
    "1/",
    "/2",
    "1/2/3",
    "1 2",
    "0,8.0",
    "0,8 руб.",
    "1+1",
    "0x10",
    "NaN",
    "Infinity",
    "1/0",
    "0/0",
    "4/−0",
    "9".repeat(400),
  ];

  for (const input of invalidInputs) {
    assert.equal(normalizeAnswer(input), null, JSON.stringify(input));
    assert.equal(isCorrectAnswer(input, 0), false, JSON.stringify(input));
  }
});

test("Проверка различает неверные ответы и допускает погрешность вычислений", () => {
  assert.equal(isCorrectAnswer("0,6", 0.8), false);
  assert.equal(isCorrectAnswer("8", 0.8), false);
  assert.equal(isCorrectAnswer("0.30000000000000004", 0.3), true);
  assert.equal(isCorrectAnswer("0.30001", 0.3), false);
  assert.equal(isCorrectAnswer("0", Number.NaN), false);
  assert.equal(isCorrectAnswer("0", Number.POSITIVE_INFINITY), false);
});

test("Отсутствующее, повреждённое и неподходящее сохранение открывает чистое демо", () => {
  for (const raw of [
    null,
    "",
    "{broken",
    "null",
    "[]",
    "42",
    '"строка"',
    "true",
  ]) {
    assert.deepEqual(parseProgress(raw), freshProgress(), String(raw));
  }
});

test("Сохранение переживает JSON-перезагрузку без потери попыток и настроек", () => {
  const saved = {
    records: [
      { taskId: firstTaskId, correct: true, attempts: 3 },
      { taskId: secondTaskId, correct: false, attempts: 2 },
    ],
    exam: "ОГЭ",
    lastTaskIndex: tasks.length - 1,
  };

  const restored = parseProgress(JSON.stringify(saved));
  assert.deepEqual(restored, saved);
  assert.deepEqual(parseProgress(JSON.stringify(restored)), saved);

  const solved = restored.records.filter((record) => record.correct).length;
  const attempts = restored.records.reduce(
    (total, record) => total + record.attempts,
    0,
  );
  assert.equal(
    solved,
    1,
    "Три попытки одной задачи не превращаются в три решённые задачи",
  );
  assert.equal(attempts, 5);
  assert.equal(Math.round((solved / attempts) * 100), 20);
});

test("Повреждённые записи отбрасываются, исправные записи сохраняются", () => {
  const validRecord = { taskId: firstTaskId, correct: true, attempts: 2 };
  const invalidRecords = [
    null,
    [],
    {},
    { ...validRecord, taskId: "deleted-task" },
    { ...validRecord, taskId: 1 },
    { ...validRecord, correct: "true" },
    { ...validRecord, correct: 1 },
    { ...validRecord, attempts: "2" },
    { ...validRecord, attempts: 0 },
    { ...validRecord, attempts: -1 },
    { ...validRecord, attempts: 1.5 },
    { ...validRecord, attempts: Number.MAX_SAFE_INTEGER + 1 },
  ];

  const restored = parseProgress(
    JSON.stringify({
      records: [...invalidRecords, validRecord],
      exam: "ОГЭ",
      lastTaskIndex: 1,
    }),
  );

  assert.deepEqual(restored, {
    records: [validRecord],
    exam: "ОГЭ",
    lastTaskIndex: 1,
  });
  assert.deepEqual(parseProgress('{"records":{}}').records, []);
});

test("Дубликаты не увеличивают число задач и не отменяют уже верный ответ", () => {
  const duplicates = [
    { taskId: firstTaskId, correct: true, attempts: 2 },
    { taskId: firstTaskId, correct: false, attempts: 4 },
    { taskId: firstTaskId, correct: false, attempts: 1 },
  ];
  const expected = [{ taskId: firstTaskId, correct: true, attempts: 4 }];

  for (const records of [duplicates, [...duplicates].reverse()]) {
    assert.deepEqual(
      parseProgress(JSON.stringify({ records })).records,
      expected,
    );
  }
});

test("Неизвестный экзамен и индекс за пределами пяти задач безопасно сбрасываются", () => {
  for (const lastTaskIndex of [-1, tasks.length, 1.5, "2", null]) {
    assert.deepEqual(
      parseProgress(JSON.stringify({ exam: "другой", lastTaskIndex })),
      freshProgress(),
    );
  }

  assert.equal(parseProgress('{"exam":"ОГЭ","lastTaskIndex":0}').exam, "ОГЭ");
  assert.equal(
    parseProgress('{"exam":"ЕГЭ","lastTaskIndex":4}').lastTaskIndex,
    4,
  );
});

test("Изменение одного результата чтения не меняет следующее пустое сохранение", () => {
  const first = parseProgress(null);
  first.records.push({ taskId: firstTaskId, correct: true, attempts: 1 });
  first.exam = "ОГЭ";
  first.lastTaskIndex = 3;

  assert.deepEqual(parseProgress(null), freshProgress());
  assert.deepEqual(parseProgress("broken"), freshProgress());
  assert.deepEqual(emptyProgress, freshProgress());
});
