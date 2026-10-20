import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Compile the existing source in memory. This also works on Node 20.9,
// without native TypeScript support, build output, or extra dependencies.
const projectRoot = new URL("../", import.meta.url);
const moduleUrls = new Map();

async function loadSourceModule(fileUrl) {
  const key = fileUrl.href;
  if (moduleUrls.has(key)) return moduleUrls.get(key);
  const loading = (async () => {
    const source = await readFile(fileUrl, "utf8");
    const { outputText, diagnostics = [] } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
      },
      reportDiagnostics: true,
      fileName: fileUrl.pathname,
    });
    assert.equal(
      diagnostics.filter(
        (entry) => entry.category === ts.DiagnosticCategory.Error,
      ).length,
      0,
      `Синтаксические ошибки в ${fileUrl.pathname}`,
    );

    const parsed = ts.createSourceFile(
      "module.js",
      outputText,
      ts.ScriptTarget.ES2020,
      true,
    );
    const replacements = [];
    for (const statement of parsed.statements) {
      if (
        !ts.isImportDeclaration(statement) &&
        !ts.isExportDeclaration(statement)
      )
        continue;
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      const path = specifier.text;
      if (!path.startsWith(".") && !path.startsWith("@/")) continue;
      const sourcePath = /\.[cm]?[jt]s$/.test(path) ? path : `${path}.ts`;
      const dependency = path.startsWith("@/")
        ? new URL(`src/${sourcePath.slice(2)}`, projectRoot)
        : new URL(sourcePath, fileUrl);
      replacements.push({
        start: specifier.getStart(parsed),
        end: specifier.end,
        value: JSON.stringify(await loadSourceModule(dependency)),
      });
    }
    let output = outputText;
    for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
      output =
        output.slice(0, replacement.start) +
        replacement.value +
        output.slice(replacement.end);
    }
    return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  })();
  moduleUrls.set(key, loading);
  return loading;
}

const { tasks, prototypes, getPracticeTasks, checkTaskAnswer } = await import(
  await loadSourceModule(new URL("src/lib/tasks.ts", projectRoot))
);
const {
  storageKey,
  legacyStorageKey,
  emptyLearningState,
  parseLearningState,
  getAnalytics,
} = await import(
  await loadSourceModule(new URL("src/lib/learning-events.ts", projectRoot))
);

const taskById = (id) => {
  const task = tasks.find((entry) => entry.id === id);
  assert.ok(task, `В банке отсутствует ${id}`);
  return task;
};
const triangle = taskById("triangle-sine");
const linear = taskById("linear-equation");
const dateOne = "2026-10-20T10:00:00.000Z";
const dateTwo = "2026-10-21T10:00:00.000Z";
const numberRule = (value) => ({ type: "number", value });
const setRule = (...values) => ({ type: "set", values });

function answerEvent(id, task, answer, correct, overrides = {}) {
  return {
    kind: "answer_checked",
    id,
    taskId: task.id,
    topicId: task.topicId,
    prototypeId: task.prototypeId,
    examType: task.examType.includes("ЕГЭ") ? "ЕГЭ" : task.examType[0],
    subjectId: "math",
    createdAt: dateOne,
    answer,
    correct,
    ...overrides,
  };
}

function solutionEvent(id, answer, overrides = {}) {
  const { taskId, topicId, prototypeId, examType, subjectId, createdAt } =
    answer;
  return {
    kind: "solution_viewed",
    id,
    taskId,
    topicId,
    prototypeId,
    examType,
    subjectId,
    createdAt,
    attemptId: answer.id,
    ...overrides,
  };
}

function stateWith(events, overrides = {}) {
  return {
    version: 2,
    exam: "ЕГЭ",
    lastTaskIndex: 0,
    events,
    legacyRecords: [],
    fontScale: "standard",
    ...overrides,
  };
}

function restore(events, overrides = {}) {
  return parseLearningState(JSON.stringify(stateWith(events, overrides)));
}

function assertCheck(input, rule, valid, correct) {
  const result = checkTaskAnswer(input, rule);
  assert.equal(result.valid, valid, `Валидность ${JSON.stringify(input)}`);
  assert.equal(
    result.correct,
    correct,
    `Правильность ${JSON.stringify(input)}`,
  );
}

test("Банк покрывает восемь тем и даёт несколько задач каждого прототипа", () => {
  const topicIds = [
    "fractions",
    "decimals",
    "percentages",
    "linear-equations",
    "quadratic-equations",
    "powers-roots",
    "geometry",
    "probability",
  ];
  assert.ok(tasks.length >= 24);
  assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);
  assert.equal(
    new Set(prototypes.map((prototype) => prototype.id)).size,
    prototypes.length,
  );
  assert.deepEqual(
    [...new Set(tasks.map((task) => task.topicId))].sort(),
    topicIds.sort(),
  );
  for (const topicId of topicIds) {
    assert.ok(
      tasks.filter((task) => task.topicId === topicId).length >= 3,
      topicId,
    );
  }
  for (const prototype of prototypes) {
    assert.ok(
      tasks.filter((task) => task.prototypeId === prototype.id).length >= 2,
      `Недостаточно заданий: ${prototype.title}`,
    );
  }
  for (const task of tasks) {
    const prototype = prototypes.find((entry) => entry.id === task.prototypeId);
    assert.ok(prototype, task.id);
    assert.equal(prototype.topicId, task.topicId, task.id);
    assert.equal(task.subjectId, "math");
    assert.ok(task.examType.length > 0);
    assert.ok(task.examType.every((exam) => exam === "ЕГЭ" || exam === "ОГЭ"));
    assert.ok(task.solution.length > 0);
    assert.ok(task.solution.every((step) => step.text.trim()));
    assert.equal(
      "hint" in task,
      false,
      "Подсказка не должна выдаваться вместе с условием",
    );
    assertCheck(task.answerDisplay, task.answerRule, true, true);
  }
});

test("Старые пять задач сохраняют идентификаторы и верные ответы", () => {
  const expectedAnswers = {
    "triangle-sine": "4/5",
    "linear-equation": "6",
    "fraction-addition": "5/8",
    "probability-balls": "3/10",
    "percentage-discount": "170",
  };
  for (const [id, answer] of Object.entries(expectedAnswers)) {
    assertCheck(answer, taskById(id).answerRule, true, true);
  }
  assert.equal(triangle.diagram.type, "right-triangle");
  assert.equal(triangle.diagram.adjacent, 6);
  assert.equal(triangle.diagram.opposite, 8);
  assert.equal("conditionLatex" in taskById("percentage-discount"), false);
  assert.equal("conditionLatex" in taskById("probability-balls"), false);
});

test("Практика фильтруется по экзамену, теме и прототипу одновременно", () => {
  for (const examType of ["ЕГЭ", "ОГЭ"]) {
    const all = getPracticeTasks({ examType });
    assert.ok(all.length > 0);
    assert.deepEqual(
      all,
      tasks.filter((task) => task.examType.includes(examType)),
    );
    const filtered = getPracticeTasks({
      examType,
      topicId: triangle.topicId,
      prototypeId: triangle.prototypeId,
    });
    assert.ok(filtered.length >= 2);
    assert.ok(
      filtered.every(
        (task) =>
          task.examType.includes(examType) &&
          task.topicId === triangle.topicId &&
          task.prototypeId === triangle.prototypeId,
      ),
    );
  }
  assert.deepEqual(
    getPracticeTasks({ examType: "ЕГЭ", topicId: "unknown" }),
    [],
  );
  assert.deepEqual(
    getPracticeTasks({ examType: "ЕГЭ", prototypeId: "unknown" }),
    [],
  );
  assert.deepEqual(
    getPracticeTasks({
      examType: "ЕГЭ",
      topicId: linear.topicId,
      prototypeId: triangle.prototypeId,
    }),
    [],
  );
});

test("Рациональные числа принимают запятую, точку, дробь и знак минуса", () => {
  for (const input of ["0,8", "0.8", ".8", ",8", "4/5", " 4 / 5 ", "\t0,8\n"]) {
    assertCheck(input, numberRule("0.8"), true, true);
  }
  assertCheck("−3/4", numberRule("-0.75"), true, true);
  assertCheck("3/-4", numberRule("-0.75"), true, true);
  assertCheck("+6", numberRule("6"), true, true);
  assertCheck("0/5", numberRule("0"), true, true);
  assertCheck("-0", numberRule("0"), true, true);
  assertCheck("2/6", numberRule("1/3"), true, true);
});

test("Проверка точная: близкое число и округлённая периодическая дробь неверны", () => {
  assertCheck("0.30000000000000004", numberRule("0.3"), true, false);
  assertCheck(
    "0.799999999999999999999999999999",
    numberRule("0.8"),
    true,
    false,
  );
  assertCheck("0.3333333333", numberRule("1/3"), true, false);
  assertCheck("9007199254740993", numberRule("9007199254740992"), true, false);
  assertCheck("9007199254740993/3", numberRule("3002399751580331"), true, true);
});

test("Пустой, смешанный и неполный ввод не записывается как проверенный ответ", () => {
  for (const input of [
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
    "1;2",
  ]) {
    assertCheck(input, numberRule("0"), false, false);
  }
});

test("Набор корней проверяется независимо от порядка с десятичной запятой", () => {
  const rule = setRule("-0.5", "2");
  assertCheck("2; −0,5", rule, true, true);
  assertCheck("-1/2; 2,0", rule, true, true);
  assertCheck("2; -0.4", rule, true, false);
  assertCheck("2", rule, true, false);
  assertCheck("2; -0.5; 3", rule, true, false);
  assertCheck("2; 2", rule, false, false);
  assertCheck("2; 4/2", rule, false, false);
  assertCheck("2;", rule, false, false);
  assertCheck(";2", rule, false, false);
  assertCheck("2;;-0.5", rule, false, false);
});

test("Новый ключ хранения отделён от старого, пустые данные безопасны", () => {
  assert.equal(storageKey, "tochka-learning-v2");
  assert.equal(legacyStorageKey, "tochka-demo-progress-v1");
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
    const restored = parseLearningState(raw);
    assert.equal(restored.version, 2);
    assert.deepEqual(restored.events, []);
    assert.deepEqual(restored.legacyRecords, []);
  }
  const stats = getAnalytics(parseLearningState(null));
  assert.equal(stats.solved, 0);
  assert.equal(stats.attempts, 0);
  assert.equal(stats.correctAnswers, 0);
  assert.equal(stats.accuracy, null);
  assert.equal(stats.solutionViews, 0);
  assert.deepEqual(stats.timeline, []);
});

test("История и настройки переживают JSON-перезагрузку", () => {
  const wrong = answerEvent("a1", triangle, "0.6", false);
  const right = answerEvent("a2", triangle, "4/5", true, {
    createdAt: dateTwo,
  });
  const saved = stateWith([wrong, right], {
    exam: "ОГЭ",
    fontScale: "large",
    lastTaskIndex: tasks.length - 1,
  });
  const restored = parseLearningState(JSON.stringify(saved));
  assert.deepEqual(restored, saved);
  assert.deepEqual(parseLearningState(JSON.stringify(restored)), saved);
});

test("Новые попытки одной задачи остаются отдельными событиями", () => {
  const events = [
    answerEvent("a1", triangle, "0.6", false),
    answerEvent("a2", triangle, "0.8", true),
    answerEvent("a3", triangle, "4/5", true),
    answerEvent("a4", linear, "7", false),
  ];
  const state = restore(events);
  assert.equal(state.events.length, 4);
  const stats = getAnalytics(state);
  assert.equal(stats.solved, 1);
  assert.equal(stats.attempts, 4);
  assert.equal(stats.correctAnswers, 2);
  assert.equal(stats.accuracy, 50);
  assert.deepEqual(stats.errors.map((event) => event.id).sort(), ["a1", "a4"]);
  const geometry = stats.topics.find(
    (topic) => topic.topicId === triangle.topicId,
  );
  assert.equal(geometry.attempts, 3);
  assert.equal(geometry.correctAnswers, 2);
  assert.equal(geometry.accuracy, 67);
});

test("Разбор связан с конкретной попыткой и не улучшает точность ответа", () => {
  const wrong = answerEvent("a1", triangle, "0.6", false);
  const view = solutionEvent("s1", wrong);
  const state = restore([wrong, view]);
  assert.equal(state.events.length, 2);
  const stats = getAnalytics(state);
  assert.equal(stats.solved, 0);
  assert.equal(stats.attempts, 1);
  assert.equal(stats.correctAnswers, 0);
  assert.equal(stats.accuracy, 0);
  assert.equal(stats.solutionViews, 1);
  const secondView = solutionEvent("s2", wrong);
  const repeated = getAnalytics(
    restore([wrong, view, { ...view }, secondView]),
  );
  assert.equal(
    repeated.solutionViews,
    2,
    "Два открытия — два события; повторный ID не удваивает их",
  );
  assert.equal(repeated.attempts, 1);
});

test("События с неизвестными ID, неверной темой, форматом и датой отбрасываются", () => {
  const good = answerEvent("good", triangle, "0.8", true);
  const invalid = [
    null,
    [],
    {},
    { ...good, id: "" },
    { ...good, kind: "unknown" },
    { ...good, taskId: "deleted-task" },
    { ...good, topicId: linear.topicId },
    { ...good, prototypeId: "unknown" },
    { ...good, examType: "ГИА" },
    { ...good, subjectId: "physics" },
    { ...good, createdAt: "not-a-date" },
    { ...good, createdAt: "2026-99-99T10:00:00.000Z" },
    { ...good, createdAt: "2026-02-30T10:00:00.000Z" },
    { ...good, createdAt: 123 },
    { ...good, answer: 0.8 },
    { ...good, answer: "not-a-number" },
    { ...good, correct: "true" },
    { ...good, correct: false },
  ];
  const restored = restore([...invalid, good]);
  assert.deepEqual(restored.events, [good]);
});

test("Повторный ID события не увеличивает статистику", () => {
  const answer = answerEvent("a1", triangle, "0.8", true);
  const restored = restore([answer, { ...answer }, { ...answer }]);
  assert.deepEqual(restored.events, [answer]);
  assert.equal(getAnalytics(restored).attempts, 1);
});

test("Отвергнутый разбор не занимает ID последующего корректного события", () => {
  const answer = answerEvent("a1", triangle, "0.8", true);
  const orphan = solutionEvent("a1", answer, { attemptId: "missing" });
  const invalidView = solutionEvent("v1", answer, { attemptId: "missing" });
  const validView = solutionEvent("v1", answer);
  const restored = restore([orphan, answer, invalidView, validView]);

  assert.deepEqual(restored.events, [answer, validView]);
  const stats = getAnalytics(restored);
  assert.equal(stats.attempts, 1);
  assert.equal(stats.correctAnswers, 1);
  assert.equal(stats.solutionViews, 1);
});

test("Разбор без существующей попытки или для другой задачи отбрасывается", () => {
  const answer = answerEvent("a1", triangle, "0.8", true);
  const orphan = solutionEvent("s1", answer, { attemptId: "missing" });
  const otherTask = solutionEvent("s2", answer, {
    taskId: linear.id,
    topicId: linear.topicId,
    prototypeId: linear.prototypeId,
  });
  const beforeAttempt = solutionEvent("s3", answer, {
    createdAt: "2026-10-19T10:00:00.000Z",
  });
  assert.deepEqual(restore([answer, orphan, otherTask, beforeAttempt]).events, [
    answer,
  ]);
  const linked = solutionEvent("linked", answer);
  assert.equal(
    getAnalytics(restore([linked, answer])).solutionViews,
    1,
    "Ссылка определяется ID попытки, а не порядком объектов в JSON",
  );
});

test("Старый прогресс мигрирует отдельно без выдуманной истории", () => {
  const legacy = {
    exam: "ОГЭ",
    lastTaskIndex: 3,
    records: [
      { taskId: triangle.id, correct: true, attempts: 3 },
      { taskId: linear.id, correct: false, attempts: 2 },
    ],
  };
  const restored = parseLearningState(null, JSON.stringify(legacy));
  assert.equal(restored.exam, "ОГЭ");
  assert.deepEqual(restored.events, []);
  assert.deepEqual(restored.legacyRecords, legacy.records);
  const stats = getAnalytics(restored);
  assert.equal(stats.solved, 1);
  assert.equal(stats.attempts, 5);
  assert.equal(stats.correctAnswers, 1);
  assert.equal(stats.accuracy, 20);
  assert.deepEqual(stats.timeline, []);
  assert.deepEqual(stats.errors, []);
  assert.equal(stats.solutionViews, 0);
  assert.deepEqual(
    parseLearningState(JSON.stringify(restored), JSON.stringify(legacy)),
    restored,
  );
});

test("Миграция убирает испорченные дубликаты и не отменяет прежний успех", () => {
  const legacy = {
    exam: "ОГЭ",
    records: [
      { taskId: triangle.id, correct: true, attempts: 2 },
      { taskId: triangle.id, correct: false, attempts: 4 },
      { taskId: "removed", correct: true, attempts: 1 },
      { taskId: linear.id, correct: "true", attempts: 1 },
      { taskId: linear.id, correct: true, attempts: 0 },
      { taskId: linear.id, correct: true, attempts: 1.5 },
    ],
  };
  const state = parseLearningState(null, JSON.stringify(legacy));
  assert.deepEqual(state.legacyRecords, [
    { taskId: triangle.id, correct: true, attempts: 4 },
  ]);
  assert.equal(state.exam, "ОГЭ");
  assert.deepEqual(state.events, []);
});

test("Сброс нового прогресса не воскрешает оставшийся старый ключ", () => {
  const legacy = JSON.stringify({
    exam: "ОГЭ",
    records: [{ taskId: triangle.id, correct: true, attempts: 2 }],
  });
  const reset = parseLearningState(JSON.stringify(stateWith([])), legacy);
  assert.deepEqual(reset.events, []);
  assert.deepEqual(reset.legacyRecords, []);
  assert.equal(
    reset.exam,
    "ЕГЭ",
    "Новые настройки имеют приоритет перед старым ключом",
  );
  const recovered = parseLearningState("{broken", legacy);
  assert.equal(recovered.exam, "ОГЭ");
  assert.equal(getAnalytics(recovered).solved, 1);
});

test("Старый и новый успех одной задачи считаются одной решённой задачей", () => {
  const legacyRecords = [{ taskId: triangle.id, correct: true, attempts: 2 }];
  const answer = answerEvent("new", triangle, "0.8", true);
  const stats = getAnalytics(restore([answer], { legacyRecords }));
  assert.equal(stats.solved, 1);
  assert.equal(stats.attempts, 3);
  assert.equal(stats.correctAnswers, 2);
  assert.equal(stats.accuracy, 67);
});

test("График группирует только настоящие попытки по календарной дате", () => {
  const events = [
    answerEvent("d1-wrong", triangle, "0.6", false),
    answerEvent("d1-right", triangle, "0.8", true),
    answerEvent("d2-right", linear, "6", true, { createdAt: dateTwo }),
  ];
  const stats = getAnalytics(restore(events));
  assert.deepEqual(stats.timeline, [
    { date: "2026-10-20", attempts: 2, correctAnswers: 1 },
    { date: "2026-10-21", attempts: 1, correctAnswers: 1 },
  ]);
});

test("Повреждённые настройки сбрасываются, а пустые состояния не разделяют массивы", () => {
  const restored = restore([], {
    exam: "другой",
    fontScale: "huge",
    lastTaskIndex: -1,
  });
  assert.equal(restored.exam, "ЕГЭ");
  assert.equal(restored.fontScale, "standard");
  assert.equal(restored.lastTaskIndex, 0);
  const first = parseLearningState(null);
  first.events.push(answerEvent("mutated", triangle, "0.8", true));
  first.legacyRecords.push({ taskId: triangle.id, correct: true, attempts: 1 });
  assert.deepEqual(parseLearningState(null).events, []);
  assert.deepEqual(parseLearningState(null).legacyRecords, []);
  assert.deepEqual(emptyLearningState.events, []);
  assert.deepEqual(emptyLearningState.legacyRecords, []);
});
