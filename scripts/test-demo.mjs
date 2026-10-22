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

const { tasks, prototypes, getPracticeTasks, checkTaskAnswer, taskTopicLabels } = await import(
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

const { examDefinitions, getExamDefinition, getAvailableExamDefinitions } = await import(
  await loadSourceModule(new URL("src/lib/exams.ts", projectRoot))
);
const { getTaskXPScoringRule, getExamNumberXPScoringRule, configuredXPScoringRules, verifiedXPScoringRules } = await import(
  await loadSourceModule(new URL("src/lib/exam-scores.ts", projectRoot))
);
const { theoryTopics } = await import(
  await loadSourceModule(new URL("src/lib/theory.ts", projectRoot))
);
const { emptyGameState, recordSelfAssessment, getGameSummary } = await import(
  await loadSourceModule(new URL("src/lib/gamification.ts", projectRoot))
);

const {
  normalizeCatalogSelection,
  defaultCatalogSelection,
  catalogListKey,
  createPracticeSession,
  updateSessionTask,
  emptyTaskState,
  practiceTasks,
} = await import(
  await loadSourceModule(new URL("src/lib/practice.ts", projectRoot))
);

const {
  parseStoredPractice,
  parseStoredScroll,
  practiceStorageKey,
  catalogScrollStorageKey,
} = await import(
  await loadSourceModule(new URL("src/lib/practice-storage.ts", projectRoot))
);

const { parseStudyRoute } = await import(
  await loadSourceModule(new URL("src/lib/navigation.ts", projectRoot))
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

function selfAssessmentEvent(id, task, score, overrides = {}) {
  return {
    kind: "self_assessed",
    id,
    taskId: task.id,
    topicId: task.topicId,
    prototypeId: task.prototypeId,
    examType: task.examType[0],
    subjectId: task.subjectId,
    createdAt: dateOne,
    level: task.level,
    examNumber: task.examNumber,
    examVersionId: task.examVersionId,
    examYear: task.examYear,
    part: 2,
    answerFormat: "extended",
    score,
    maxScore: getTaskXPScoringRule(task)?.maxPrimaryScore,
    ...overrides,
  };
}

function stateWith(events, overrides = {}) {
  return {
    ...emptyLearningState,
    version: 3,
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

test("Банк сохраняет базовые темы и отделяет прототипы самопроверки", () => {
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
  for (const id of [...topicIds, "trigonometric-equations", "number-theory"])
    assert.ok(tasks.some((task) => task.topicId === id), `Сохранена прежняя тема: ${id}`);
  for (const topicId of topicIds) {
    assert.ok(
      tasks.filter((task) => task.topicId === topicId).length >= 3,
      topicId,
    );
  }
  for (const prototype of prototypes) {
    assert.ok(
      tasks.filter((task) => task.prototypeId === prototype.id).length >=
        (tasks.filter((task) => task.prototypeId === prototype.id)
          .every((task) => task.answerRule.type === "self") ? 1 : 2),
      `Недостаточно заданий: ${prototype.title}`,
    );
  }
  for (const task of tasks) {
    const prototype = prototypes.find((entry) => entry.id === task.prototypeId);
    assert.ok(prototype, task.id);
    assert.equal(prototype.topicId, task.topicId, task.id);
    assert.equal(task.subjectId, "math");
    assert.equal(
      task.examType.length,
      1,
      "Одна задача принадлежит одному экзамену",
    );
    assert.ok(task.examType.every((exam) => exam === "ЕГЭ" || exam === "ОГЭ"));
    assert.equal(task.level === null, task.examType[0] === "ОГЭ", task.id);
    assert.ok(task.solution.length > 0);
    assert.ok(task.solution.every((step) => step.text.trim()));
    assert.equal(
      "hint" in task,
      false,
      "Подсказка не должна выдаваться вместе с условием",
    );
    if (task.answerRule.type === "self") {
      assert.equal(task.part, 2, task.id);
      assertCheck(task.answerDisplay, task.answerRule, false, false);
    } else assertCheck(task.answerDisplay, task.answerRule, true, true);
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

test("Практика строго разделена по экзамену, уровню, номеру, теме и прототипу", () => {
  for (const definition of examDefinitions) {
    const { examType, subjectId, level } = definition;
    const all = getPracticeTasks({ examType, subjectId, level });
    if (!definition.available) {
      assert.deepEqual(all, [], "Неподтверждённый базовый уровень не открыт для практики");
      continue;
    }
    assert.ok(all.length > 0, definition.id);
    assert.deepEqual(
      all,
      tasks.filter(
        (task) =>
          task.examType[0] === examType &&
          task.level === level &&
          task.subjectId === subjectId &&
          task.availability !== "history-only",
      ),
    );
    const selected = all.find((task) => task.examNumber !== null);
    const filter = {
      examType,
      subjectId,
      level,
      examNumber: selected.examNumber,
      topicId: selected.topicId,
      prototypeId: selected.prototypeId,
    };
    assert.deepEqual(
      getPracticeTasks(filter),
      all.filter(
        (task) =>
          task.examNumber === selected.examNumber &&
          task.topicId === selected.topicId &&
          task.prototypeId === selected.prototypeId,
      ),
    );
    assert.deepEqual(
      getPracticeTasks({ examType, subjectId, level, topicId: "unknown" }),
      [],
    );
    assert.deepEqual(
      getPracticeTasks({ examType, subjectId, level, prototypeId: "unknown" }),
      [],
    );
    assert.deepEqual(
      getPracticeTasks({ examType, subjectId, level, examNumber: 99 }),
      [],
    );
    assert.deepEqual(
      getPracticeTasks({ examType, subjectId, level, examNumber: examType === "ОГЭ" ? 19 : 18, prototypeId: "not-published-prototype" }),
      [],
      "Не подставлять другой номер в пустую подборку",
    );
  }
  assert.deepEqual(
    getPracticeTasks({ examType: "ЕГЭ", level: "profile", examNumber: 21 }),
    [],
  );
  assert.deepEqual(getPracticeTasks({ examType: "ОГЭ", level: "base" }), []);
  assert.deepEqual(getPracticeTasks({ examType: "ЕГЭ", level: null }), []);
  assert.deepEqual(getPracticeTasks({ examType: "ЕГЭ", level: "wrong" }), []);
  assert.deepEqual(
    getPracticeTasks({ examType: "ОГЭ", subjectId: "physics" }),
    [],
  );
  assert.deepEqual(getPracticeTasks({ examType: "ГИА" }), []);
  assert.ok(
    getPracticeTasks({ examType: "ЕГЭ" }).every(
      (task) => task.level === "profile",
    ),
  );
  const ogeIds = new Set(
    getPracticeTasks({ examType: "ОГЭ" }).map((task) => task.id),
  );
  const baseIds = new Set(
    getPracticeTasks({ examType: "ЕГЭ", level: "base" }).map((task) => task.id),
  );
  for (const task of getPracticeTasks({ examType: "ЕГЭ", level: "profile" })) {
    assert.equal(ogeIds.has(task.id), false);
    assert.equal(baseIds.has(task.id), false);
  }
});

test("Каталоги разделены, а ограничение официальной сверки явно сохранено", () => {
  assert.deepEqual(
    examDefinitions.map((entry) => [
      entry.examType,
      entry.level,
      entry.numbers.length,
    ]),
    [
      ["ОГЭ", null, 25],
      ["ЕГЭ", "base", 21],
      ["ЕГЭ", "profile", 19],
    ],
  );
  assert.equal(getExamDefinition({ examType: "ЕГЭ" }).level, "profile");
  assert.equal(
    getExamDefinition({ examType: "ОГЭ", level: "base" }),
    undefined,
  );
  for (const definition of examDefinitions) {
    assert.deepEqual(
      definition.numbers.map((entry) => entry.number),
      Array.from(
        { length: definition.numbers.length },
        (_, index) => index + 1,
      ),
    );
    assert.equal(definition.year, 2026);
    assert.equal(definition.verificationStatus, "not-verified-online");
    assert.match(definition.verificationNote, /2027/);
    assert.match(definition.verificationNote, /не подтвержден/);
    assert.ok(definition.sources.some((source) => new URL(source.url).hostname === "fipi.ru"));
    for (const source of definition.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.ok(url.hostname === "fipi.ru" ||
        (definition.level === "base" && url.hostname === "pro-schools.ru" && source.title.includes("Копия спецификации ФИПИ 2026")),
      "Копия источника указана явно, а не представлена как оригинальный сайт ФИПИ");
    }
    for (const entry of definition.numbers) {
      const pool = getPracticeTasks({
        examType: definition.examType,
        subjectId: definition.subjectId,
        level: definition.level,
        examNumber: entry.number,
      });
      assert.ok(
        entry.part === 2 || pool.length === 0 || pool.length >= 2,
        `${definition.id} №${entry.number}: Next должен открывать другую задачу`,
      );
    }
  }
});

test("Один экзаменационный номер может содержать разные темы и прототипы", () => {
  const ogeSix = getPracticeTasks({ examType: "ОГЭ", examNumber: 6 });
  assert.ok(new Set(ogeSix.map((task) => task.topicId)).has("fractions"));
  assert.ok(new Set(ogeSix.map((task) => task.topicId)).has("decimals"));
  const ogeNine = getPracticeTasks({ examType: "ОГЭ", examNumber: 9 });
  assert.ok(
    new Set(ogeNine.map((task) => task.topicId)).has("linear-equations"),
  );
  assert.ok(
    new Set(ogeNine.map((task) => task.topicId)).has("quadratic-equations"),
  );
  assert.ok(new Set(ogeNine.map((task) => task.prototypeId)).size > 1);
  const baseThirteen = getPracticeTasks({ examType: "ЕГЭ", level: "base", examNumber: 13 });
  assert.ok(baseThirteen.length >= 5);
  assert.ok(baseThirteen.every((task) => task.examType[0] === "ЕГЭ" && task.level === "base" &&
    task.examNumber === 13 && task.topicId === "ege-base-number-13"),
  "Базовый уровень №13 содержит собственную стереометрию, а не подборку ОГЭ или профиля");
});

test("Фундаментальные упражнения без номера не выдаются за экзаменационный формат", () => {
  const fundamentalIds = [
    "fraction-subtraction",
    "fraction-signed",
    "quadratic-two-roots",
    "quadratic-opposite-roots",
    "quadratic-fractional-roots",
    "triangle-sine-five-twelve",
    "triangle-sine-eight-fifteen",
    "probability-die",
  ];
  for (const id of fundamentalIds)
    assert.equal(taskById(id).examNumber, null, id);
  for (const task of tasks) {
    const definition = getExamDefinition({
      examType: task.examType[0],
      level: task.level,
      subjectId: task.subjectId,
    });
    assert.ok(definition, task.id);
    assert.equal(task.examYear, definition.year, task.id);
    if (task.examNumber === null) continue;
    assert.ok(
      definition.numbers.some((entry) => entry.number === task.examNumber),
      task.id,
    );
    if (task.part === 2) {
      assert.equal(task.answerRule.type, "self", task.id);
      assert.equal(checkTaskAnswer("1", task.answerRule).valid, false);
      continue;
    }
    assert.equal(task.answerRule.type, "number", "Часть 1 требует один числовой ответ");
    assert.ok(
      Number.isFinite(
        Number(task.answerDisplay.replace(",", ".").replace("−", "-")),
      ),
      `Конечная десятичная запись: ${task.id}`,
    );
  }
});

test("Теория и зависимости остаются связаны с реальными темами банка", () => {
  const topicIds = new Set(theoryTopics.map((topic) => topic.id));
  assert.equal(topicIds.size, theoryTopics.length);
  for (const task of tasks) {
    if (!topicIds.has(task.topicId)) {
      assert.equal(task.part, 2, task.id);
      assert.equal(task.answerRule.type, "self", task.id);
      assert.ok(taskTopicLabels[task.topicId]?.trim(), task.id);
    }
  }
  for (const topic of theoryTopics) {
    assert.ok(topic.sections.length > 0);
    assert.ok(topic.examples.length >= 2);
    for (const prerequisite of topic.prerequisites)
      assert.ok(topicIds.has(prerequisite), prerequisite);
  }
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
    assert.equal(restored.version, 3);
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
  const expected = {
    ...saved,
    game: {
      version: 2,
      xpEvents: [],
      checks: [{
        attemptId: wrong.id,
        taskId: wrong.taskId,
        subjectId: wrong.subjectId,
        correct: false,
        createdAt: wrong.createdAt,
      }],
    },
  };
  assert.deepEqual(restored, expected);
  assert.equal(getGameSummary(restored.game).winStreak, 0,
    "Исправление ошибки сохраняется, но не восстанавливает серию");
  assert.deepEqual(parseLearningState(JSON.stringify(restored)), expected);
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
    fontScale: "oversized",
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

test("Настройки каталога нормализуются без смешивания экзаменов, уровней и режимов", () => {
  assert.deepEqual(defaultCatalogSelection(), {
    exam: "ЕГЭ",
    subjectId: "math",
    level: "profile",
    mode: "number",
  });
  const oge = normalizeCatalogSelection({
    exam: "ОГЭ",
    subjectId: "physics",
    level: "base",
    mode: "number",
    examNumber: 9,
    topicId: "fractions",
    prototypeId: "linear-basic",
  });
  assert.equal(oge.exam, "ОГЭ");
  assert.equal(oge.subjectId, "physics");
  assert.equal(oge.level, undefined);
  assert.equal(oge.examNumber, 9);
  assert.equal(oge.topicId, undefined);
  assert.equal(oge.prototypeId, "linear-basic");
  const topic = normalizeCatalogSelection({
    exam: "ЕГЭ",
    level: "base",
    mode: "topic",
    examNumber: 5,
    topicId: "probability",
  });
  assert.equal(topic.level, "base");
  assert.equal(topic.examNumber, undefined);
  assert.equal(topic.topicId, "probability");
  for (const invalid of [-1, 0, 1.5, "9", NaN, 100]) {
    assert.equal(
      normalizeCatalogSelection({ exam: "ОГЭ", examNumber: invalid })
        .examNumber,
      undefined,
    );
  }
  assert.equal(
    normalizeCatalogSelection({
      topicId: "bad id",
      prototypeId: "<script>",
      mode: "topic",
    }).topicId,
    undefined,
  );
  assert.equal(
    normalizeCatalogSelection({
      topicId: "bad id",
      prototypeId: "<script>",
      mode: "topic",
    }).prototypeId,
    undefined,
  );
  assert.equal(
    normalizeCatalogSelection({ exam: "unknown" }, "ОГЭ").exam,
    "ОГЭ",
  );
});

test("Позиция списка имеет отдельный ключ для экзамена, уровня, режима и фильтра", () => {
  const initial = {
    exam: "ОГЭ",
    subjectId: "math",
    mode: "number",
    examNumber: 6,
  };
  const key = catalogListKey(initial);
  assert.equal(
    catalogListKey({ ...initial, examNumber: 19 }),
    key,
    "Выбор карточки не сбрасывает прокрутку списка",
  );
  const topic = {
    ...initial,
    mode: "topic",
    topicId: "fractions",
    examNumber: undefined,
  };
  assert.equal(
    catalogListKey(topic),
    catalogListKey({ ...topic, topicId: "geometry" }),
  );
  for (const change of [
    { exam: "ЕГЭ", level: "profile" },
    { mode: "topic" },
    { prototypeId: "linear-basic" },
  ]) {
    assert.notEqual(catalogListKey({ ...initial, ...change }), key);
  }
  assert.notEqual(
    catalogListKey({ ...initial, exam: "ЕГЭ", level: "base" }),
    catalogListKey({ ...initial, exam: "ЕГЭ", level: "profile" }),
  );
});

test("Практика сохраняет исходную подборку, а пустой номер не подменяется другим", () => {
  const selection = {
    exam: "ОГЭ",
    subjectId: "math",
    mode: "number",
    examNumber: 9,
  };
  const expected = getPracticeTasks({ examType: "ОГЭ", examNumber: 9 });
  const initialId = expected[1].id;
  const session = createPracticeSession("session-1", selection, initialId);
  assert.deepEqual(
    session.taskIds,
    expected.map((task) => task.id),
  );
  assert.equal(session.lastPosition, 1);
  assert.deepEqual(session.selection, selection);
  assert.notEqual(session.selection, selection);
  assert.deepEqual(session.states, {});
  const empty = createPracticeSession("empty-session", {
    ...selection,
    examNumber: 19,
    prototypeId: "not-published-prototype",
  });
  assert.deepEqual(empty.taskIds, []);
  assert.equal(empty.lastPosition, 0);
  assert.equal(empty.selection.examNumber, 19);
  const filteredTopic = {
    exam: "ЕГЭ",
    level: "profile",
    subjectId: "math",
    mode: "topic",
    topicId: "probability",
    prototypeId: "classical-probability",
  };
  assert.ok(practiceTasks(filteredTopic).length > 0);
  assert.ok(
    practiceTasks(filteredTopic).every(
      (task) =>
        task.examType[0] === "ЕГЭ" &&
        task.level === "profile" &&
        task.topicId === "probability" &&
        task.prototypeId === "classical-probability",
    ),
  );
  assert.equal(
    createPracticeSession("bad-initial", selection, "not-in-bank").lastPosition,
    0,
  );
});

test("Состояния задач сессии сохраняют ответ, проверку и просмотр без новой попытки", () => {
  const original = createPracticeSession("session-state", {
    exam: "ОГЭ",
    subjectId: "math",
    mode: "number",
    examNumber: 9,
  });
  const [firstId, secondId] = original.taskIds;
  const draft = { ...emptyTaskState(), answer: "6" };
  const withDraft = updateSessionTask(original, firstId, draft);
  assert.deepEqual(original.states, {});
  const checked = {
    ...draft,
    attempt: { id: "attempt-one", correct: true },
    solutionVisible: true,
    solutionViewed: true,
  };
  const withChecked = updateSessionTask(withDraft, firstId, checked);
  assert.equal(withDraft.states[firstId].attempt, null);
  const withSecond = updateSessionTask(withChecked, secondId, {
    ...emptyTaskState(),
    answer: "-",
  });
  assert.deepEqual(withSecond.states[firstId], checked);
  assert.deepEqual(withChecked.states[firstId], checked);
  assert.equal(withSecond.states[firstId].attempt.id, "attempt-one");
  assert.equal(withSecond.states[firstId].solutionVisible, true);
  assert.equal(withSecond.states[secondId].answer, "-");
  assert.equal(withSecond.states[secondId].attempt, null);
  const viewedAgain = updateSessionTask(withSecond, firstId, {
    ...checked,
    solutionVisible: false,
  });
  assert.equal(viewedAgain.states[firstId].attempt.id, "attempt-one");
  assert.equal(viewedAgain.states[firstId].solutionViewed, true);
  assert.equal(
    "events" in viewedAgain,
    false,
    "Просмотр состояния сессии не записывает события обучения",
  );
  assert.equal(
    updateSessionTask(original, "not-in-session", checked),
    original,
  );
  const blank = emptyTaskState();
  blank.answer = "mutated";
  assert.equal(emptyTaskState().answer, "");
});

test("Старые события общих задач сохраняются, новые строго проверяют экзамен, уровень и номер", () => {
  const legacy = answerEvent("legacy-ege", triangle, "0,8", true, {
    examType: "ЕГЭ",
  });
  const legacyRestored = restore([legacy]);
  assert.equal(legacyRestored.events.length, 1);
  assert.equal(legacyRestored.events[0].examType, "ЕГЭ");
  const profileTask = taskById("ege-profile-exponential-two");
  const modern = answerEvent("modern", profileTask, "3", true, {
    level: "profile",
    examNumber: 6,
  });
  const ogeModern = answerEvent("modern-oge", triangle, "0,8", true, {
    level: null,
    examNumber: 15,
  });
  const invalid = [
    { ...modern, id: "wrong-level", level: "base" },
    { ...modern, id: "wrong-number", examNumber: 4 },
    { ...modern, id: "missing-number", examNumber: undefined },
    { ...modern, id: "missing-level", level: undefined },
    { ...ogeModern, id: "wrong-oge-level", level: "base" },
    { ...ogeModern, id: "wrong-oge-number", examNumber: 10 },
    {
      ...ogeModern,
      id: "modern-wrong-exam",
      examType: "ЕГЭ",
      level: "profile",
    },
  ];
  const state = restore([...invalid, modern, ogeModern]);
  assert.deepEqual(
    state.events.map((event) => event.id),
    ["modern", "modern-oge"],
  );
  assert.equal(state.events[0].level, "profile");
  assert.equal(state.events[0].examNumber, 6);
  assert.equal(state.events[1].level, null);
  assert.equal(state.events[1].examNumber, 15);
});

test("Прямые и прежние ссылки практики сохраняют индекс, а неверный индекс не становится первой задачей", () => {
  const legacy = parseStudyRoute("#/tasks/0", tasks.length);
  assert.equal(legacy.view, "tasks");
  assert.equal(legacy.taskIndex, 0);
  assert.equal(legacy.invalidContext, false);
  assert.equal(legacy.exam, undefined);
  assert.equal(legacy.level, undefined);
  const last = parseStudyRoute(`#/tasks/${tasks.length - 1}`, tasks.length);
  assert.equal(last.taskIndex, tasks.length - 1);
  for (const path of [
    "#/tasks/-1",
    `#/tasks/${tasks.length}`,
    "#/tasks/99999",
    "#/tasks/1.5",
    "#/tasks/not-a-number",
    "#/tasks",
  ]) {
    const route = parseStudyRoute(path, tasks.length);
    assert.equal(route.view, "tasks", path);
    assert.equal(route.taskIndex, -1, path);
  }
  assert.equal(parseStudyRoute("#/tasks/0", 0).taskIndex, -1);
  assert.equal(parseStudyRoute("#/unknown", tasks.length).view, "home");
});

test("Парсер помечает неподдерживаемые экзамен, предмет, уровень и режим вместо подмены контекста", () => {
  for (const query of [
    "exam=ГИА",
    "exam=",
    "subject=astronomy",
    "subject=",
    "level=advanced",
    "level=",
    "mode=list",
    "mode=",
    "exam=ОГЭ&level=base",
    "exam=ОГЭ&level=profile",
    "mode=number&topic=fractions",
    "mode=topic&number=6",
    "number=6&topic=fractions",
  ]) {
    const route = parseStudyRoute(`#/tasks/0?${query}`, tasks.length);
    assert.equal(route.invalidContext, true, query);
  }
  for (const query of [
    "exam=ОГЭ&subject=math&mode=number",
    "exam=ЕГЭ&level=base&subject=math",
    "exam=ЕГЭ&level=profile&mode=topic",
  ]) {
    assert.equal(
      parseStudyRoute(`#/catalog?${query}`, tasks.length).invalidContext,
      false,
      query,
    );
  }
});

test("Неверные номера и повреждённые ID фильтров отклоняются отдельно от корректных пустых подборок", () => {
  for (const value of ["-1", "0", "1.5", "100", "not-a-number", ""]) {
    assert.equal(
      parseStudyRoute(
        `#/catalog?number=${encodeURIComponent(value)}`,
        tasks.length,
      ).invalidContext,
      true,
      value,
    );
  }
  for (const field of ["topic", "prototype"]) {
    for (const value of ["", "bad id", "<script>", "bad/id", "a".repeat(101)]) {
      const route = parseStudyRoute(
        `#/tasks/0?${field}=${encodeURIComponent(value)}`,
        tasks.length,
      );
      assert.equal(route.invalidContext, true, `${field}: ${value}`);
    }
  }
  const route = parseStudyRoute(
    "#/tasks/0?exam=ОГЭ&subject=math&mode=topic&topic=not-published-topic&prototype=not-published-prototype",
    tasks.length,
  );
  assert.equal(
    route.invalidContext,
    false,
    "Корректные по форме ID не обязаны существовать в демобанке",
  );
  assert.equal(route.topicId, "not-published-topic");
  assert.equal(route.prototypeId, "not-published-prototype");
  assert.deepEqual(
    getPracticeTasks({
      examType: route.exam,
      subjectId: route.subjectId,
      topicId: route.topicId,
      prototypeId: route.prototypeId,
    }),
    [],
  );
  const emptyNumber = parseStudyRoute(
    "#/tasks/0?exam=ОГЭ&mode=number&number=19&prototype=not-published-prototype",
    tasks.length,
  );
  assert.equal(emptyNumber.invalidContext, false);
  assert.deepEqual(
    getPracticeTasks({
      examType: emptyNumber.exam,
      examNumber: emptyNumber.examNumber,
      prototypeId: emptyNumber.prototypeId,
    }),
    [],
  );
});

test("Прежняя кодированная ссылка базы сохраняет контекст, но не подменяется доступной практикой профиля", () => {
  const params = new URLSearchParams({
    exam: "ЕГЭ",
    subject: "math",
    level: "base",
    mode: "number",
    number: "13",
    prototype: "decimal-arithmetic",
    session: "Session-2026-alpha",
  });
  const route = parseStudyRoute(`#/tasks/7?${params}`, tasks.length);
  assert.equal(route.view, "tasks");
  assert.equal(route.taskIndex, 7);
  assert.equal(route.invalidContext, false);
  assert.equal(route.exam, "ЕГЭ");
  assert.equal(route.subjectId, "math");
  assert.equal(route.level, "base");
  assert.equal(route.catalogMode, "number");
  assert.equal(route.examNumber, 13);
  assert.equal(route.prototypeId, "decimal-arithmetic");
  assert.equal(route.sessionId, "Session-2026-alpha");
  const pool = getPracticeTasks({
    examType: route.exam,
    subjectId: route.subjectId,
    level: route.level,
    examNumber: route.examNumber,
    prototypeId: route.prototypeId,
  });
  assert.deepEqual(pool, [], "Старая ссылка не открывает неподтверждённую версию или другой экзамен");
  assert.equal(getExamDefinition({ examType: route.exam, level: route.level }).available, true);
  assert.ok(!pool.some((task) => task.id === "decimal-division"), "Прежняя нумерация базы остаётся только в истории");
});

test("Ссылка каталога читает режим, выбранную карточку и фильтры, небезопасный ID сессии не используется", () => {
  const byNumber = parseStudyRoute(
    "#/catalog?exam=ОГЭ&subject=math&mode=number&number=9&prototype=quadratic-roots&session=previous-session",
    tasks.length,
  );
  assert.equal(byNumber.view, "catalog");
  assert.equal(byNumber.invalidContext, false);
  assert.equal(byNumber.catalogMode, "number");
  assert.equal(byNumber.examNumber, 9);
  assert.equal(byNumber.prototypeId, "quadratic-roots");
  assert.equal(byNumber.sessionId, "previous-session");
  const byTopic = parseStudyRoute(
    "#/catalog?exam=ЕГЭ&subject=math&level=profile&mode=topic&topic=powers-roots&prototype=exponential-equation",
    tasks.length,
  );
  assert.equal(byTopic.invalidContext, false);
  assert.equal(byTopic.catalogMode, "topic");
  assert.equal(byTopic.topicId, "powers-roots");
  assert.equal(byTopic.prototypeId, "exponential-equation");
  for (const value of ["bad/session", "bad id", "<script>", "a".repeat(101)]) {
    assert.equal(
      parseStudyRoute(
        `#/tasks/0?session=${encodeURIComponent(value)}`,
        tasks.length,
      ).sessionId,
      undefined,
    );
  }
});


test("Доступны три учебных банка, прежние 16 задач базы остаются в истории без повторной аттестации", () => {
  assert.deepEqual(
    getAvailableExamDefinitions().map((definition) => definition.id),
    ["oge-math", "ege-math-base", "ege-math-profile"],
  );
  const base = getExamDefinition({ examType: "ЕГЭ", level: "base" });
  assert.equal(base.available, true);
  assert.equal(base.numbers.length, 21);
  assert.ok(base.numbers.every((number) => number.part === 1 && number.maxPrimaryScore === 1));
  const oldTask = taskById("decimal-division");
  const saved = answerEvent("base-historical", oldTask, "60", true, {
    level: "base", examNumber: 13,
  });
  assert.deepEqual(restore([saved]).events, [saved]);
  const current = getPracticeTasks({ examType: "ЕГЭ", level: "base" });
  assert.ok(current.length >= 21 * 20, "В новом банке минимум 20 задач на каждый из 21 номера");
  assert.deepEqual([...new Set(current.map((task) => task.examNumber))].sort((a, b) => a - b),
    Array.from({ length: 21 }, (_, index) => index + 1));
  assert.ok(current.every((task) => task.id.startsWith("base-2026-") && task.level === "base"));
  for (let number = 1; number <= 21; number++) {
    const pool = current.filter((task) => task.examNumber === number);
    assert.ok(pool.length >= 20, `База №${number}`);
    assert.ok(new Set(pool.map((task) => task.prototypeId)).size >= 2, `Разные подтипы базы №${number}`);
  }
  const historical = tasks.filter((task) => task.level === "base" && task.availability === "history-only");
  assert.equal(historical.length, 16);
  for (const task of historical) {
    assert.ok(!current.some((entry) => entry.id === task.id));
    assert.equal(getTaskXPScoringRule(task), null, task.id);
    assert.equal(task.scoring.maxPrimaryScore, null, task.id);
  }
});

test("Предварительные карты различают части, названия, короткие и развёрнутые ответы", () => {
  const oge = getExamDefinition({ examType: "ОГЭ" });
  const profile = getExamDefinition({ examType: "ЕГЭ", level: "profile" });
  for (const [definition, boundary] of [[oge, 19], [profile, 12]]) {
    assert.ok(definition.verificationNote.includes("Предварительная"));
    assert.match(definition.verificationNote, /не подтвержден/);
    assert.ok(definition.versionId.includes(String(definition.year)));
    for (const number of definition.numbers) {
      assert.equal(number.part, number.number <= boundary ? 1 : 2);
      assert.equal(number.answerFormat, number.part === 1 ? "short" : "extended");
      assert.ok(Number.isInteger(number.maxPrimaryScore) && number.maxPrimaryScore >= 1);
      assert.ok(number.title.trim());
      assert.equal(/^Задание №/.test(number.title), false);
      if (number.part === 2) {
        const exercises = getPracticeTasks({
          examType: definition.examType,
          level: definition.level,
          examNumber: number.number,
        });
        assert.ok(exercises.every((task) => task.answerRule.type === "self"),
          "Развёрнутые решения не выдаются за автоматически проверяемые");
      }
    }
  }
  const title = (definition, number) => definition.numbers.find((entry) => entry.number === number).title;
  for (const pair of [[1, 17], [3, 14], [6, 13]])
    assert.equal(title(profile, pair[0]), title(profile, pair[1]));
  assert.equal(title(oge, 11), title(oge, 22));
  assert.equal(new Set([23, 24, 25].map((number) => title(oge, number))).size, 3);
  assert.ok([1, 2, 3, 4, 5].every((number) => title(oge, number) === "Практические задачи"));
});

test("Каждая демозадача содержит версию, часть, формат и честное авторское происхождение", () => {
  for (const task of tasks) {
    const definition = getExamDefinition({ examType: task.examType[0], level: task.level });
    const number = definition.numbers.find((entry) => entry.number === task.examNumber);
    assert.equal(task.examVersionId, definition.versionId, task.id);
    assert.equal(task.part, number?.part ?? null, task.id);
    assert.equal(task.answerFormat, task.answerRule.type === "self" ? "extended" : task.answerRule.type, task.id);
    assert.equal(task.source.kind, "author", task.id);
    assert.match(task.source.label, /Авторск/, task.id);
    assert.ok(Number.isSafeInteger(task.source.revision) && task.source.revision >= 1);
    assert.ok(["foundation", "standard", "advanced"].includes(task.difficulty), task.id);
    if (number?.part === 2) assert.equal(task.difficulty, "advanced");
    if (!number) assert.equal(task.difficulty, "foundation");
    assert.equal(task.scoring.status, number ?
      (task.availability === "history-only" ? "pending-official-verification" : "project-config") : "not-applicable");
    assert.equal(task.scoring.maxPrimaryScore, task.availability === "history-only" ? null : number?.maxPrimaryScore ?? null);
  }
  assert.deepEqual(verifiedXPScoringRules, [], "Непрочитанная спецификация не становится проверенной балльной сеткой");
  for (const task of tasks) {
    const rule = getTaskXPScoringRule(task);
    if (task.examNumber === null || task.availability === "history-only") assert.equal(rule, null, task.id);
    else {
      assert.ok(rule, task.id);
      assert.equal(rule.status, "project-config");
      assert.equal(rule.examYear, task.examYear);
      assert.equal(rule.examVersionId, task.examVersionId);
      assert.equal(rule.examNumber, task.examNumber);
      assert.equal(rule.subjectId, task.subjectId);
      assert.equal(rule.part, task.part);
    }
  }
  assert.equal(getTaskXPScoringRule({ ...triangle, part: 2 }), null);
});

test("Сетка 2026 задаётся отдельно для каждого номера и не подставляется неизвестным версиям", () => {
  assert.equal(configuredXPScoringRules.length, 65);
  const profileScores = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 2, 2, 3, 4, 4];
  for (let number = 1; number <= 25; number++) {
    const rule = getExamNumberXPScoringRule("oge-math-2026", number);
    assert.ok(rule, `ОГЭ №${number}`);
    assert.equal(rule.maxPrimaryScore, number <= 19 ? 1 : 2);
    assert.equal(rule.part, number <= 19 ? 1 : 2);
    assert.equal(rule.examYear, 2026);
    assert.equal(rule.subjectId, "math");
    assert.equal(rule.status, "project-config");
    assert.equal(rule.verifiedAt, undefined);
  }
  for (let number = 1; number <= 19; number++) {
    const rule = getExamNumberXPScoringRule("ege-math-profile-2026", number);
    assert.equal(rule.maxPrimaryScore, profileScores[number - 1], `ЕГЭ №${number}`);
    assert.equal(rule.part, number <= 12 ? 1 : 2);
    assert.equal(rule.examYear, 2026);
    assert.equal(rule.subjectId, "math");
    assert.equal(rule.level, "profile");
  }
  for (let number = 1; number <= 21; number++) {
    const rule = getExamNumberXPScoringRule("ege-math-base-2026", number);
    assert.equal(rule.maxPrimaryScore, 1, `База №${number}`);
    assert.equal(rule.part, 1);
    assert.equal(rule.answerFormat, "short");
    assert.equal(rule.level, "base");
    assert.equal(rule.status, "project-config");
    assert.equal(rule.verifiedAt, undefined);
  }
  for (const [version, number] of [
    ["oge-math-2027", 6], ["ege-math-profile-2025", 1],
    ["ege-math-base-2027", 1], ["ege-physics-2026", 1],
    ["ege-math-base-2026", 22],
    ["oge-math-2026", 0], ["oge-math-2026", 26],
    ["ege-math-profile-2026", 20], ["oge-math-2026", 6.5],
  ]) assert.equal(getExamNumberXPScoringRule(version, number), null);
  for (const changes of [
    { examYear: 2027 }, { examVersionId: "oge-math-2027" },
    { subjectId: "physics" }, { examType: ["ЕГЭ"] },
    { level: "profile" }, { examNumber: 99 }, { part: 2 },
    { answerFormat: "extended" },
  ]) assert.equal(getTaskXPScoringRule({ ...triangle, ...changes }), null);
});

test("Схема v2 мигрирует в v3 с настройками по умолчанию без начисления опыта за историю", () => {
  const oldAnswer = answerEvent("pre-game-answer", triangle, "0,8", true);
  const oldView = solutionEvent("pre-game-view", oldAnswer);
  const v2 = {
    version: 2,
    exam: "ОГЭ",
    fontScale: "large",
    lastTaskIndex: 3,
    events: [oldAnswer, oldView],
    legacyRecords: [{ taskId: linear.id, correct: true, attempts: 4 }],
  };
  const restored = parseLearningState(JSON.stringify(v2));
  assert.equal(restored.version, 3);
  assert.equal(restored.exam, "ОГЭ");
  assert.equal(restored.fontScale, "large");
  assert.equal(restored.lastTaskIndex, 3);
  assert.equal(restored.theme, "light");
  assert.equal(restored.focusMode, false);
  assert.deepEqual(restored.events, v2.events);
  assert.deepEqual(restored.legacyRecords, v2.legacyRecords);
  assert.deepEqual(restored.game.xpEvents, [], "Старым записям без версии баллов не придумываются XP");
  assert.equal(getGameSummary(restored.game).winStreak, 1,
    "Известная первая часть получает восстановленную серию без изменения исходного события");
  assert.deepEqual(restored.game.checks, [{
    attemptId: oldAnswer.id,
    taskId: oldAnswer.taskId,
    subjectId: oldAnswer.subjectId,
    correct: true,
    createdAt: oldAnswer.createdAt,
  }]);
  assert.deepEqual(parseLearningState(JSON.stringify(restored)), restored);
});

test("Тема и концентрация сохраняются, повреждённые настройки не мешают учебной истории", () => {
  const answer = answerEvent("settings-answer", linear, "6", true);
  const baseline = restore([answer]);
  for (const theme of ["light", "dark"]) {
    const saved = { ...baseline, theme, focusMode: true, fontScale: "large" };
    assert.deepEqual(parseLearningState(JSON.stringify(saved)), saved);
  }
  const restored = restore([answer], { theme: "neon", focusMode: "true" });
  assert.equal(restored.theme, "light");
  assert.equal(restored.focusMode, false);
  assert.deepEqual(restored.events, [answer]);
  const priorAutomaticTheme = restore([answer], { theme: "system", themeExplicit: true });
  assert.equal(priorAutomaticTheme.theme, "light");
  assert.deepEqual(priorAutomaticTheme.events, [answer]);
  assert.equal(restore([answer], { theme: "dark", themeExplicit: undefined }).theme, "dark");
});

test("Три размера текста и настройки перерыва сохраняются вместе с учебным журналом и XP", () => {
  const answer = answerEvent("settings-paid-answer", triangle, "0,8", true, {
    level: triangle.level,
    examNumber: triangle.examNumber,
    examVersionId: triangle.examVersionId,
    examYear: triangle.examYear,
    part: 1,
    answerFormat: "short",
  });
  const baseline = restore([answer]);
  assert.equal(getGameSummary(baseline.game, new Date(dateOne)).totalXP, 1);
  for (const fontScale of ["standard", "large", "huge"]) {
    for (const theme of ["light", "dark"]) {
      for (const breakReminderMinutes of [0, 90, 120]) {
        const saved = { ...baseline, fontScale, theme, breakReminderMinutes, focusMode: true };
        const restored = parseLearningState(JSON.stringify(saved));
        assert.deepEqual(restored, saved);
        assert.deepEqual(restored.events, [answer]);
        assert.equal(getGameSummary(restored.game, new Date(dateOne)).totalXP, 1);
      }
    }
  }
});

test("Удалённые темы и повреждённые настройки переходят к безопасным значениям без потери событий", () => {
  const answer = answerEvent("invalid-settings-answer", linear, "6", true);
  for (const theme of ["system", "comfort", "comfortable", "neon", null, 42]) {
    const restored = restore([answer], {
      theme,
      themeExplicit: true,
      fontScale: "giant",
      breakReminderMinutes: "90",
    });
    assert.equal(restored.theme, "light", String(theme));
    assert.equal(Object.hasOwn(restored, "themeExplicit"), false);
    assert.equal(restored.fontScale, "standard");
    assert.equal(restored.breakReminderMinutes, 120);
    assert.deepEqual(restored.events, [answer]);
  }
  for (const breakReminderMinutes of [-1, 1, 60, 180, 90.5, null, false]) {
    assert.equal(restore([], { breakReminderMinutes }).breakReminderMinutes, 120);
  }
  assert.equal(parseLearningState(null).theme, "light");
  assert.equal(parseLearningState(null).fontScale, "standard");
  assert.equal(parseLearningState(null).breakReminderMinutes, 120);
});

test("Две первые верные старые проверки восстанавливают серию 2 без выдуманной версии или XP", () => {
  const first = answerEvent("legacy-streak-first", triangle, "0,8", true);
  const second = answerEvent("legacy-streak-second", linear, "6", true, { createdAt: dateTwo });
  const events = [first, second];
  const restored = restore(events);
  assert.deepEqual(restored.events, events);
  for (const event of restored.events) {
    assert.equal(Object.hasOwn(event, "part"), false);
    assert.equal(Object.hasOwn(event, "examVersionId"), false);
  }
  const summary = getGameSummary(restored.game, new Date(dateTwo));
  assert.equal(summary.winStreak, 2);
  assert.equal(summary.subjects.find((subject) => subject.subjectId === "math").winStreak, 2);
  assert.equal(summary.totalXP, 0);
  assert.deepEqual(restored.game.checks.map((entry) => entry.attemptId), [first.id, second.id]);
  assert.deepEqual(parseLearningState(JSON.stringify(restored)), restored);
});

test("Неоднозначная история другого экзамена и базовые упражнения не превращаются в серию первой части", () => {
  const ambiguous = answerEvent("ambiguous-legacy-exam", triangle, "0,8", true, { examType: "ЕГЭ" });
  const foundation = tasks.find((task) => task.part === null && task.answerRule.type === "number");
  assert.ok(foundation);
  const foundationAnswer = answerEvent("foundation-legacy", foundation, foundation.answerRule.value, true);
  const restored = restore([ambiguous, foundationAnswer]);
  assert.deepEqual(restored.events, [ambiguous, foundationAnswer]);
  assert.deepEqual(restored.game.checks, []);
  assert.deepEqual(restored.game.xpEvents, []);
  assert.equal(getGameSummary(restored.game).winStreak, 0);
});

test("Восстановленная ошибка сбрасывает серию, исправление не возвращает её, новая задача начинает следующую", () => {
  const wrong = answerEvent("legacy-streak-wrong", triangle, "0,6", false);
  const fixed = answerEvent("legacy-streak-fixed", triangle, "0,8", true);
  const next = answerEvent("legacy-streak-next", linear, "6", true);
  const afterCorrection = restore([wrong, fixed]);
  assert.equal(getGameSummary(afterCorrection.game).winStreak, 0);
  assert.deepEqual(afterCorrection.game.checks.map((entry) => entry.attemptId), [wrong.id]);
  const afterNext = restore([wrong, fixed, next]);
  assert.equal(getGameSummary(afterNext.game).winStreak, 1);
  assert.deepEqual(afterNext.events, [wrong, fixed, next]);
  assert.deepEqual(afterNext.game.checks.map((entry) => entry.attemptId), [wrong.id, next.id]);
  assert.deepEqual(afterNext.game.xpEvents, []);
});

test("Справка открывается отдельным допустимым маршрутом без подмены экрана", () => {
  for (const hash of ["#/help", "#/help?section=xp", "#/help?section=streak"]) {
    const route = parseStudyRoute(hash, tasks.length);
    assert.equal(route.view, "help");
    assert.equal(route.taskIndex, 0);
    assert.equal(route.invalidContext, false);
  }
  assert.equal(parseStudyRoute("#/profile", tasks.length).view, "profile");
  assert.equal(parseStudyRoute("#/home", tasks.length).view, "home");
  assert.equal(parseStudyRoute("#/help-unknown", tasks.length).view, "home");
});

test("Версия экзамена и формат новых событий проверяются, прежние события не теряются", () => {
  const legacy = answerEvent("old-context", triangle, "0,8", true);
  const modern = answerEvent("new-context", triangle, "0,8", true, {
    level: triangle.level,
    examNumber: triangle.examNumber,
    examVersionId: triangle.examVersionId,
    part: triangle.part,
    answerFormat: "short",
  });
  const invalid = [
    { ...modern, id: "version-wrong", examVersionId: "oge-math-2027" },
    { ...modern, id: "part-wrong", part: 2 },
    { ...modern, id: "format-wrong", answerFormat: "extended" },
    { ...modern, id: "format-number-instead-of-kind", answerFormat: "number" },
    { ...modern, id: "version-incomplete", examVersionId: undefined },
    { ...modern, id: "part-incomplete", part: undefined },
    { ...modern, id: "format-incomplete", answerFormat: undefined },
    { ...legacy, id: "legacy-spoof-version", examType: "ЕГЭ",
      examVersionId: triangle.examVersionId, part: triangle.part, answerFormat: "short" },
  ];
  assert.deepEqual(restore([...invalid, legacy, modern]).events, [legacy, modern]);
});

test("Самооценка принимается только целыми баллами в границах нужного номера", () => {
  const task = taskById("ege19-integer-pairs-self");
  const zero = selfAssessmentEvent("self-zero", task, 0);
  const full = selfAssessmentEvent("self-full", task, 4, { createdAt: dateTwo });
  assert.deepEqual(restore([zero, full]).events, [zero, full]);
  const invalid = [
    { ...full, id: "negative-score", score: -1 },
    { ...full, id: "fractional-score", score: 2.5 },
    { ...full, id: "excess-score", score: 5 },
    { ...full, id: "string-score", score: "2" },
    { ...full, id: "null-score", score: null },
    { ...full, id: "wrong-maximum", maxScore: 3 },
    { ...full, id: "wrong-year", examYear: 2027 },
    { ...full, id: "wrong-version", examVersionId: "ege-math-profile-2027" },
    { ...full, id: "wrong-part", part: 1 },
    { ...full, id: "wrong-format", answerFormat: "short" },
    { ...full, id: "wrong-number", examNumber: 18 },
    { ...full, id: "wrong-subject", subjectId: "physics" },
    selfAssessmentEvent("not-self-check-task", triangle, 1),
  ];
  assert.deepEqual(restore([...invalid, zero, full, full]).events, [zero, full]);
  assert.equal(checkTaskAnswer("4", task.answerRule).valid, false,
    "Самооценка не является объективно проверенным числовым ответом");
});

test("Самооценки и исправления XP сохраняются атомарно и не попадают в учебную точность", () => {
  const task = taskById("ege19-integer-pairs-self");
  const rule = getTaskXPScoringRule(task);
  const first = selfAssessmentEvent("self-confirm-2", task, 2);
  const raised = selfAssessmentEvent("self-confirm-3", task, 3, { createdAt: dateTwo });
  const lowered = selfAssessmentEvent("self-confirm-1", task, 1, {
    createdAt: "2026-10-22T10:00:00.000Z",
  });
  let game = emptyGameState();
  const events = [];
  for (const event of [first, raised, lowered]) {
    game = recordSelfAssessment(game, event, events, rule);
    events.push(event);
  }
  const saved = stateWith(events, { game });
  const restored = parseLearningState(JSON.stringify(saved));
  assert.deepEqual(restored.events, events);
  assert.deepEqual(restored.game, game);
  assert.deepEqual(parseLearningState(JSON.stringify(restored)), restored);
  const summary = getGameSummary(restored.game, new Date("2026-10-22T12:00:00.000Z"));
  assert.equal(summary.totalXP, 1);
  assert.equal(summary.todayXP, 0,
    "Позднее исправление меняет исходный день начисления, не создавая отрицательный новый день");
  assert.equal(getGameSummary(restored.game, new Date(dateOne)).todayXP, 1);
  assert.deepEqual(restored.game.xpEvents.map((event) => event.xp), [2, 1, -2]);
  assert.equal(summary.winStreak, 0);
  assert.equal(summary.subjects.find((subject) => subject.subjectId === "math").totalXP, 1);
  const analytics = getAnalytics(restored);
  assert.equal(analytics.attempts, 0);
  assert.equal(analytics.solved, 0);
  assert.equal(analytics.accuracy, null);
  assert.deepEqual(analytics.errors, []);
  assert.deepEqual(analytics.timeline, []);
});

test("Все 46 условий независимо пересчитаны: верные ответы принимаются, неверные отвергаются", () => {
  // These reference results were calculated from the conditions, not read from answerDisplay.
  const expected = {
    "triangle-sine": "4/5",
    "linear-equation": "6",
    "fraction-addition": "5/8",
    "probability-balls": "3/10",
    "percentage-discount": "170",
    "fraction-subtraction": "7/12",
    "fraction-signed": "1/6",
    "decimal-addition": "3.15",
    "decimal-product": "0.6",
    "decimal-division": "60",
    "percentage-jacket": "1200",
    "percentage-increase": "896",
    "linear-negative": "-3",
    "linear-brackets": "11",
    "quadratic-two-roots": "3;2",
    "quadratic-opposite-roots": "4;-4",
    "quadratic-fractional-roots": "1/2;-1",
    "powers-quotient": "4",
    "roots-sum": "16",
    "roots-product": "6",
    "triangle-sine-five-twelve": "12/13",
    "triangle-sine-eight-fifteen": "15/17",
    "probability-die": "1/3",
    "probability-cards": "1/5",
    "oge-fraction-sum-terminating": "11/20",
    "oge-quadratic-larger-root": "3",
    "oge-probability-even-die": "1/2",
    "oge-triangle-three-four": "3/5",
    "ege-base-fraction-sum": "1/2",
    "ege-base-decimal-difference": "1.15",
    "ege-base-discount": "850",
    "ege-base-linear-equation": "5",
    "ege-base-quadratic-roots": "4;3",
    "ege-base-powers-quotient": "9",
    "ege-base-triangle-sine": "3/5",
    "ege-base-probability-balls": "1/4",
    "ege-profile-triangle-twelve-nine": "3/5",
    "ege-profile-triangle-nine-twelve": "4/5",
    "ege-profile-probability-balls": "1/5",
    "ege-profile-probability-cards": "1/5",
    "ege-profile-exponential-two": "3",
    "ege-profile-exponential-three": "2",
    "ege-profile-roots-product": "8",
    "ege-profile-powers-quotient": "9",
    "ege-profile-fraction-difference": "5/8",
    "ege-profile-fraction-product": "3/4",
  };
  assert.equal(Object.keys(expected).length, 46);
  assert.deepEqual(Object.keys(expected).sort(), tasks.slice(0, 46).map((task) => task.id).sort());
  for (const task of tasks.slice(0, 46)) {
    assertCheck(expected[task.id], task.answerRule, true, true);
    assertCheck("999999", task.answerRule, true, false);
    if (task.diagram) {
      const { adjacent, opposite } = task.diagram;
      const hypotenuse = Math.sqrt(adjacent ** 2 + opposite ** 2);
      assert.ok(Number.isInteger(hypotenuse), task.id);
      assertCheck(`${opposite}/${hypotenuse}`, task.answerRule, true, true);
      assert.ok(hypotenuse > adjacent && hypotenuse > opposite, task.id);
    }
  }
});


test("Хранилище практики переживает перезагрузку с ID проверки, черновиком и открытым разбором", () => {
  assert.equal(practiceStorageKey, "tochka-practice-v1");
  assert.equal(catalogScrollStorageKey, "tochka-catalog-scroll-v1");
  assert.notEqual(practiceStorageKey, storageKey);
  const catalog = normalizeCatalogSelection({ exam: "ОГЭ", mode: "number", examNumber: 9 });
  let session = createPracticeSession("reload-session", catalog);
  const [first, second] = session.taskIds;
  session = updateSessionTask(session, first, {
    ...emptyTaskState(), answer: "6",
    attempt: { id: "checked-before-reload", correct: true },
    solutionViewed: true, solutionVisible: true,
  });
  session = updateSessionTask(session, second, { ...emptyTaskState(), answer: "-" });
  session.lastPosition = 1;
  const source = { version: 1, catalog, sessions: { [session.id]: session }, activeId: session.id };
  const restored = parseStoredPractice(JSON.stringify(source));
  assert.equal(restored.version, 2);
  assert.deepEqual(restored.taskStates, source.sessions[session.id].states);
  assert.equal(restored.sessions[session.id].lastTaskId, second);
  assert.deepEqual(parseStoredPractice(JSON.stringify(restored)), restored);
  assert.equal(restored.taskStates[first].attempt.id, "checked-before-reload");
  assert.equal(restored.taskStates[second].answer, "-");
  assert.equal("events" in restored, false, "Загрузка сессии не создаёт учебных событий");
  assert.equal("xpEvents" in restored, false, "Загрузка сессии не начисляет опыт");
});

test("Повреждённая практика не открывает чужой экзамен и не восстанавливает ложный вердикт", () => {
  const empty = parseStoredPractice(null);
  for (const raw of ["", "{broken", "null", "[]", "42", JSON.stringify({ version: 99 }), "x".repeat(8_000_001)])
    assert.deepEqual(parseStoredPractice(raw), empty);
  const selection = normalizeCatalogSelection({ exam: "ОГЭ", mode: "number", examNumber: 9 });
  const source = createPracticeSession("damaged-session", selection);
  source.lastPosition = 999;
  source.taskIds.push("ege-profile-exponential-two", source.taskIds[0], "missing-task");
  source.states[linear.id] = {
    ...emptyTaskState(), answer: "6", attempt: { id: "false-verdict", correct: false },
    solutionViewed: true, solutionVisible: true,
  };
  const restored = parseStoredPractice(JSON.stringify({
    version: 1, catalog: selection, activeId: source.id,
    sessions: { [source.id]: source },
  }));
  const session = restored.sessions[source.id];
  assert.equal(session.taskIds.includes("ege-profile-exponential-two"), false);
  assert.equal(session.taskIds.includes("missing-task"), false);
  assert.equal(session.taskIds.length, new Set(session.taskIds).size);
  assert.equal(session.lastPosition, session.taskIds.length - 1);
  assert.equal(restored.taskStates[linear.id].answer, "6");
  assert.equal(restored.taskStates[linear.id].attempt, null);
  assert.equal(restored.taskStates[linear.id].solutionViewed, false);
  assert.equal(restored.taskStates[linear.id].solutionVisible, false);
  const unavailable = createPracticeSession("old-base-session", normalizeCatalogSelection({
    exam: "ЕГЭ", level: "base", mode: "topic",
  }));
  unavailable.taskIds = ["decimal-division"];
  const baseState = parseStoredPractice(JSON.stringify({
    version: 1, catalog: unavailable.selection, activeId: unavailable.id,
    sessions: { [unavailable.id]: unavailable },
  }));
  const restoredBaseIds = baseState.sessions[unavailable.id].taskIds;
  assert.equal(restoredBaseIds.includes("decimal-division"), false);
  assert.deepEqual(restoredBaseIds, getPracticeTasks({ examType: "ЕГЭ", level: "base" }).map((task) => task.id),
    "Повреждённая подборка восстанавливается только реальным банком выбранной базы");
  const unsafe = parseStoredPractice('{"version":1,"sessions":{"__proto__":{"id":"__proto__","selection":{"exam":"ОГЭ","subjectId":"math","mode":"number"},"taskIds":[]}},"activeId":"__proto__"}');
  assert.deepEqual(Object.keys(unsafe.sessions), []);
  assert.equal(unsafe.activeId, null);
});

test("Редактирование ошибки сохраняет факт просмотра решения после перезагрузки", () => {
  const catalog = normalizeCatalogSelection({ exam: "ОГЭ", mode: "number", examNumber: 9 });
  let session = createPracticeSession("edited-wrong-session", catalog);
  session = updateSessionTask(session, linear.id, {
    ...emptyTaskState(), answer: "5", attempt: null,
    solutionViewed: true, solutionVisible: true,
  });
  const restored = parseStoredPractice(JSON.stringify({
    version: 1, catalog, sessions: { [session.id]: session }, activeId: session.id,
  })).taskStates[linear.id];
  assert.equal(restored.answer, "5");
  assert.equal(restored.attempt, null);
  assert.equal(restored.solutionViewed, true);
  assert.equal(restored.solutionVisible, false,
    "Черновик не раскрывает разбор автоматически до новой проверки");
});

test("Черновик самопроверки сохраняет работу и оценку, но не подделывает автопроверку", () => {
  const task = taskById("ege19-integer-pairs-self");
  const catalog = normalizeCatalogSelection({ exam: "ЕГЭ", level: "profile", mode: "number", examNumber: 19 });
  let session = createPracticeSession("self-draft-session", catalog);
  session = updateSessionTask(session, task.id, {
    ...emptyTaskState(), answer: "", selfWork: "Пусть x и y — натуральные числа.",
    selfDraftScore: 3, selfSolutionVisible: true,
    attempt: { id: "forged-auto-verdict", correct: true },
    solutionVisible: true, solutionViewed: true,
  });
  const serialize = (candidate) => JSON.stringify({
    version: 1, catalog, sessions: { [candidate.id]: candidate }, activeId: candidate.id,
  });
  const restored = parseStoredPractice(serialize(session)).taskStates[task.id];
  assert.equal(restored.selfWork, "Пусть x и y — натуральные числа.");
  assert.equal(restored.selfDraftScore, 3);
  assert.equal(restored.selfSolutionVisible, true);
  assert.equal(restored.attempt, null);
  assert.equal(restored.solutionViewed, false);
  assert.equal(restored.solutionVisible, false);
  for (const selfDraftScore of [-1, 2.5, 5, "3"]) {
    const invalid = updateSessionTask(session, task.id, {
      ...session.states[task.id], selfDraftScore,
    });
    const saved = parseStoredPractice(serialize(invalid)).taskStates[task.id];
    assert.equal(saved.selfDraftScore, undefined);
  }
  const oldEmpty = { ...session, states: {}, taskIds: [], lastPosition: 0 };
  const updated = parseStoredPractice(serialize(oldEmpty)).sessions[session.id];
  assert.ok(updated.taskIds.includes(task.id),
    "Старая пустая подборка получает добавленную задачу без сброса каталога");
  assert.equal(updated.states[task.id], undefined);
});

test("Точная прокрутка окна и вложенных контейнеров читается без округления и опасных локаторов", () => {
  const saved = {
    version: 1, key: "ОГЭ:math::number:",
    windowTop: 2425.125, windowLeft: 0,
    entries: [
      { locator: "id:main-content", top: 650.75, left: 0 },
      { locator: "parent:2", top: 20, left: 1.5 },
      { locator: "child:0/2/1", top: 13.25, left: 0 },
    ],
  };
  assert.deepEqual(parseStoredScroll(JSON.stringify(saved)), saved);
  const unsafe = {
    ...saved,
    entries: [...saved.entries,
      { locator: "#main;alert(1)", top: 1, left: 0 },
      { locator: "parent:1", top: -1, left: 0 },
      { locator: "child:0", top: 10_000_001, left: 0 },
    ],
  };
  assert.deepEqual(parseStoredScroll(JSON.stringify(unsafe)), saved);
  for (const raw of [null, "", "{broken", "null", "[]", "x".repeat(100_001)])
    assert.equal(parseStoredScroll(raw), null);
  for (const values of [
    { version: 2 }, { windowTop: -1 }, { windowTop: null },
    { windowTop: 10_000_001 }, { windowLeft: "0" },
  ]) assert.equal(parseStoredScroll(JSON.stringify({ ...saved, ...values })), null);
});
