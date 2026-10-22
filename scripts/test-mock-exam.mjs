import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader } from "./content-source-loader.mjs";
const load = createContentLoader();
const {
  createMockSession, getMockCoverage, finishMockSession, updateMockAnswer,
  selectMockPosition, remainingMockMilliseconds, elapsedMockMilliseconds,
  parseMockState, setMockSelfScore, mockScoreSummary, mockDurationMinutes,
  clearMockStorage, mockStorageKey,
  getMockVariants, getMockDurationMinutes, getUnfinishedMockSession,
  getMockTaskStatus, skipMockTask, startMockAttempt,
  checkMockAnswer,
} = load("src/lib/mock-exam.ts");
const { getAvailableExamDefinitions, examDefinitions } = load("src/lib/exams.ts");
const definitions = getAvailableExamDefinitions();
const oge = definitions.find((definition) => definition.examType === "ОГЭ");
const ege = definitions.find((definition) => definition.examType === "ЕГЭ" && definition.level === "profile");
const start = Date.parse("2026-10-21T10:00:00Z");

function fixtures(definition) {
  return definition.numbers.flatMap((number) => [1, 2].map((variant) => ({
    id: `${definition.id}-${number.number}-${variant}`,
    topicId: `fixture-${number.number}`, prototypeId: `fixture-${number.number}`,
    examType: [definition.examType], subjectId: "math", level: definition.level,
    examNumber: number.number, examYear: definition.year, examVersionId: definition.versionId,
    part: number.part, difficulty: number.part === 1 ? "standard" : "advanced",
    answerFormat: number.part === 1 ? "number" : "extended",
    source: { kind: "author", label: "Только тестовая задача", revision: 1 },
    scoring: { status: "project-config", maxPrimaryScore: number.maxPrimaryScore },
    title: `Задание ${number.number}`, prompt: "Вычислите сумму двух данных чисел.",
    answerRule: number.part === 1 ? { type: "number", value: `${number.number + variant}` } : { type: "self" },
    solution: [{ text: "Сложим данные значения." }], answerDisplay: `${number.number + variant}`,
    ...(definition.examType === "ОГЭ" && number.number <= 5 ? { sharedConditionId: `group-${variant}` } : {}),
  })));
}
const bank = definitions.flatMap(fixtures);
const make = (id = "mock-fixture", definition = oge) => createMockSession(id, definition, bank, [], start);
const wrap = (session) => JSON.stringify({ version: 1, activeId: session.id, sessions: [session] });

test("учебный вариант требует все номера и одну общую группу ОГЭ 1–5", () => {
  assert.equal(getMockCoverage(oge, bank).canStart, true);
  const missing = bank.filter((task) => task.examVersionId !== oge.versionId || task.examNumber !== 24);
  assert.deepEqual(getMockCoverage(oge, missing).missingNumbers, [24]);
  assert.throws(() => createMockSession("missing", oge, missing, [], start));
  const mixed = bank.map((task) => task.examVersionId === oge.versionId && task.examNumber <= 5 ? { ...task, sharedConditionId: `${task.sharedConditionId}-${task.examNumber}` } : task);
  assert.equal(getMockCoverage(oge, mixed).missingSharedCondition, true);
  assert.throws(() => createMockSession("mixed", oge, mixed, [], start));
});

test("вариант детерминирован, номера и экзамены не смешиваются, условия группы совпадают", () => {
  for (const definition of definitions) {
    const session = make("deterministic", definition);
    assert.deepEqual(session, make("deterministic", definition));
    const chosen = session.taskIds.map((id) => bank.find((task) => task.id === id));
    assert.deepEqual(chosen.map((task) => task.examNumber), definition.numbers.map((number) => number.number));
    assert.ok(chosen.every((task) => task.examVersionId === definition.versionId));
    assert.equal(new Set(session.taskIds).size, session.taskIds.length);
    if (definition.examType === "ОГЭ") assert.equal(new Set(chosen.slice(0, 5).map((task) => task.sharedConditionId)).size, 1);
  }
});

test("новый вариант предпочитает не использованные недавно задачи и другую общую группу", () => {
  const first = make("first");
  const next = createMockSession("next", oge, bank, [first], start + 1);
  assert.ok(next.taskIds.every((id) => !first.taskIds.includes(id)));
});

test("до завершения нет проверок и баллов, навигация и перезагрузка сохраняют ввод", () => {
  let session = make();
  const first = session.taskIds[0];
  session = updateMockAnswer(session, first, "0,8", start + 1000);
  session = selectMockPosition(session, 6);
  const restored = parseMockState(wrap(session), bank, definitions).sessions[0];
  assert.equal(restored.answers[first], "0,8");
  assert.equal(restored.position, 6);
  assert.deepEqual(restored.results, {});
  assert.deepEqual(restored.selfScores, {});
  assert.deepEqual(restored.revealedTaskIds, []);
});

test("автопроверка использует математический валидатор; пропущенные/нечисловые ответы дают 0 без фальшивых попыток", () => {
  let session = make("check");
  const first = bank.find((task) => task.id === session.taskIds[0]);
  session = updateMockAnswer(session, first.id, `${first.answerRule.value},0`, start + 1);
  session = updateMockAnswer(session, session.taskIds[1], "-1000", start + 2);
  session = updateMockAnswer(session, session.taskIds[2], "abc", start + 3);
  session = finishMockSession(session, bank, start + 1000);
  assert.equal(session.results[first.id].correct, true);
  assert.equal(session.results[first.id].primaryScore, 1);
  assert.equal(session.results[session.taskIds[1]].valid, true);
  assert.equal(session.results[session.taskIds[1]].correct, false);
  assert.equal(session.results[session.taskIds[2]].requestId, null);
  assert.equal(session.results[session.taskIds[3]].requestId, null);
  assert.equal(mockScoreSummary(session, bank).automatic, 1);
});

test("завершение идемпотентно, идентификаторы проверок стабильны после восстановления", () => {
  let session = make("idempotent");
  session = updateMockAnswer(session, session.taskIds[0], "2", start + 1);
  const finished = finishMockSession(session, bank, start + 2000);
  assert.strictEqual(finishMockSession(finished, bank, start + 3000), finished);
  const restored = parseMockState(wrap(finished), bank, definitions).sessions[0];
  assert.deepEqual(restored.results, finished.results);
  assert.equal(restored.results[session.taskIds[0]].requestId, "idempotent-answer-1");
  assert.strictEqual(updateMockAnswer(finished, session.taskIds[0], "3", start + 3000), finished);
});

test("таймер использует абсолютный срок, истечение блокирует ввод и не зависит от числа тиков", () => {
  const session = make("timer");
  const duration = mockDurationMinutes * 60_000;
  assert.equal(remainingMockMilliseconds(session, start + duration - 1000), 1000);
  assert.equal(remainingMockMilliseconds(session, start + duration + 1000), 0);
  assert.strictEqual(updateMockAnswer(session, session.taskIds[0], "2", session.deadline), session);
  const finished = finishMockSession(session, bank, session.deadline + 600_000);
  assert.equal(finished.finishedAt, session.deadline);
  assert.equal(finished.finishReason, "timeout");
  assert.equal(elapsedMockMilliseconds(finished, session.deadline + 1_000_000), duration);
  assert.equal(parseMockState(wrap(finished), bank, definitions).sessions[0].finishReason, "timeout");
});

test("самооценка только после завершения и просмотра образца; изменения сохраняют текущую сумму", () => {
  let session = make("self", ege);
  const task = bank.find((entry) => entry.id === session.taskIds[18]);
  assert.strictEqual(setMockSelfScore(session, task, 3), session);
  session = finishMockSession(session, bank, start + 1000);
  assert.strictEqual(setMockSelfScore(session, task, 3), session);
  session = { ...session, revealedTaskIds: [task.id] };
  for (const score of [2, 3, 1]) {
    session = setMockSelfScore(session, task, score);
    assert.equal(mockScoreSummary(session, bank).self, score);
    assert.equal(mockScoreSummary(session, bank).automatic, 0);
  }
  for (const invalid of [-1, 1.5, 5, NaN]) assert.strictEqual(setMockSelfScore(session, task, invalid), session);
  const restored = parseMockState(wrap(session), bank, definitions).sessions[0];
  assert.equal(restored.selfScores[task.id], 1);
  assert.equal(mockScoreSummary(restored, bank).pendingSelf, 6);
});

test("испорченные схемы/смешанные группы отклоняются; вердикт пересчитывается из сохранённого ответа", () => {
  assert.throws(() => parseMockState('{"version":9}', bank, definitions));
  assert.throws(() => parseMockState('broken', bank, definitions));
  let session = make("corrupt");
  const changed = { ...session, taskIds: [...session.taskIds] };
  changed.taskIds[1] = bank.find((task) => task.examNumber === 2 && task.examVersionId === oge.versionId && task.sharedConditionId !== bank.find((item) => item.id === session.taskIds[0]).sharedConditionId).id;
  assert.throws(() => parseMockState(wrap(changed), bank, definitions));
  session = finishMockSession(session, bank, start + 1000);
  session.results[session.taskIds[0]] = { taskId: session.taskIds[0], valid: true, correct: true, primaryScore: 999, requestId: "fake" };
  const restored = parseMockState(wrap(session), bank, definitions).sessions[0];
  assert.equal(restored.results[session.taskIds[0]].primaryScore, 0);
  assert.equal(restored.results[session.taskIds[0]].requestId, null);
});

test("история не обрезается миграцией, явная очистка затрагивает только ключ пробников", () => {
  const sessions = Array.from({ length: 40 }, (_, index) => finishMockSession(make(`history-${index}`), bank, start + 1000));
  const raw = JSON.stringify({ version: 1, activeId: sessions[30].id, sessions });
  const restored = parseMockState(raw, bank, definitions);
  assert.equal(restored.sessions.length, 40);
  assert.equal(restored.activeId, sessions[30].id);
  const removed = [];
  assert.equal(clearMockStorage({ removeItem: (key) => removed.push(key) }), true);
  assert.deepEqual(removed, [mockStorageKey]);
  assert.equal(clearMockStorage({ removeItem() { throw new Error("denied"); } }), false);
});

test("номерные варианты покрывают каждый номер и сохраняют состав при перестановке банка", () => {
  for (const definition of definitions) {
    const variants = getMockVariants(definition, bank);
    assert.equal(variants.length, 2, "тестовый банк содержит ровно две задачи на номер");
    assert.deepEqual(getMockVariants(definition, [...bank].reverse()), variants);
    for (const variant of variants) {
      const chosen = variant.taskIds.map((id) => bank.find((task) => task.id === id));
      assert.deepEqual(chosen.map((task) => task.examNumber), definition.numbers.map((number) => number.number));
      assert.equal(variant.maxPrimaryScore, chosen.reduce((sum, task) => sum + task.scoring.maxPrimaryScore, 0));
      assert.equal(variant.durationMinutes, getMockDurationMinutes(definition));
      const attempt = createMockSession(`named-${definition.id}-${variant.number}`, definition, bank, [], start, variant.number);
      assert.deepEqual(attempt.taskIds, variant.taskIds);
      assert.equal(attempt.variantId, variant.id);
      assert.equal(attempt.variantNumber, variant.number);
      const restored = parseMockState(wrap(attempt), bank, definitions).sessions[0];
      assert.deepEqual(restored, attempt);
    }
    assert.ok(variants[0].taskIds.every((id) => !variants[1].taskIds.includes(id)));
    assert.throws(() => createMockSession("unknown-number", definition, bank, [], start, 3));
  }
});

test("реальный банк предлагает пять полных вариантов без повторения задач между номерами вариантов", () => {
  const { tasks: realBank } = load("src/lib/tasks.ts");
  for (const definition of definitions) {
    const variants = getMockVariants(definition, realBank);
    assert.equal(variants.length, 5, definition.id);
    assert.equal(new Set(variants.flatMap((variant) => variant.taskIds)).size, 5 * definition.numbers.length);
    const coverage = getMockCoverage(definition, realBank);
    for (const number of definition.numbers) {
      if (definition.examType === "ОГЭ" && number.number <= 5) continue;
      const availableFamilies = new Set(coverage.available.filter((task) => task.examNumber === number.number).map((task) => task.prototypeId));
      const variantFamilies = new Set(variants.map((variant) => realBank.find((task) => task.id === variant.taskIds[number.number - 1]).prototypeId));
      if (availableFamilies.size > 1) assert.ok(variantFamilies.size >= 2, `${definition.id} №${number.number}: разные подтипы в вариантах`);
    }
    for (const variant of variants) {
      assert.equal(variant.taskIds.length, definition.numbers.length);
      assert.equal(new Set(variant.taskIds).size, definition.numbers.length);
      const attempt = createMockSession(`real-${definition.id}-${variant.number}`, definition, realBank, [], start, variant.number);
      assert.deepEqual(parseMockState(wrap(attempt), realBank, definitions).sessions[0].taskIds, variant.taskIds);
    }
  }
});

test("старт и продолжение привязаны к экзамену; новый запуск сохраняет старую попытку без скрытой проверки", () => {
  let state = { version: 1, activeId: null, sessions: [] };
  state = startMockAttempt(state, oge, bank, "oge-first", start, 1);
  state = startMockAttempt(state, ege, bank, "ege-first", start + 1, 2);
  assert.equal(state.sessions.length, 2);
  assert.equal(state.activeId, "ege-first");
  assert.equal(getUnfinishedMockSession(state, oge).id, "oge-first");
  assert.equal(getUnfinishedMockSession(state, ege).id, "ege-first");
  state = startMockAttempt(state, oge, bank, "not-created", start + 2, 2);
  assert.equal(state.activeId, "oge-first");
  assert.equal(state.sessions.length, 2, "продолжение не создаёт дубликат попытки");
  const before = state.sessions[0];
  state = startMockAttempt(state, oge, bank, "oge-new", start + 3, 2, true);
  assert.equal(state.sessions.length, 3);
  assert.strictEqual(state.sessions[0], before);
  assert.equal(before.finishedAt, null);
  assert.deepEqual(before.results, {});
  assert.deepEqual(before.publishedTaskIds, []);
  assert.equal(getUnfinishedMockSession(state, oge).id, "oge-new");
  const restored = parseMockState(JSON.stringify(state), bank, definitions);
  assert.equal(restored.sessions.length, 3, "reload восстанавливает сохранённые попытки без создания новой");
  assert.equal(restored.activeId, "oge-new");
  assert.throws(() => startMockAttempt(state, oge, bank, "oge-new", start + 4, 1, true));
});

test("пропуск и черновик восстанавливаются после reload; новый ввод снимает флаг пропуска", () => {
  let session = make("skip");
  const taskId = session.taskIds[0];
  assert.equal(getMockTaskStatus(session, taskId), "unanswered");
  session = updateMockAnswer(session, taskId, "12", start + 1);
  assert.equal(getMockTaskStatus(session, taskId), "answered");
  session = skipMockTask(session, taskId, start + 2);
  assert.equal(getMockTaskStatus(session, taskId), "skipped");
  session = parseMockState(wrap(session), bank, definitions).sessions[0];
  assert.equal(getMockTaskStatus(session, taskId), "skipped");
  assert.equal(session.answers[taskId], "12", "пропуск сохраняет черновик");
  session = updateMockAnswer(session, taskId, "13", start + 3);
  assert.equal(getMockTaskStatus(session, taskId), "answered");
  const finished = finishMockSession(session, bank, start + 4);
  assert.strictEqual(skipMockTask(finished, taskId, start + 5), finished);
  assert.strictEqual(skipMockTask(session, "unknown", start + 5), session);
});

test("аддитивная миграция сохраняет старые дедлайны и не требует метаданных номерного варианта", () => {
  const legacy = make("legacy");
  delete legacy.durationMinutes;
  delete legacy.skippedTaskIds;
  const restored = parseMockState(wrap(legacy), bank, definitions).sessions[0];
  assert.equal(restored.deadline, legacy.deadline);
  assert.equal(restored.durationMinutes, 235);
  assert.deepEqual(restored.skippedTaskIds, []);
  assert.equal(restored.variantNumber, undefined);
  assert.throws(() => parseMockState(wrap({ ...legacy, durationMinutes: 180 }), bank, definitions));
  assert.throws(() => parseMockState(wrap({ ...legacy, variantNumber: 1, variantId: "fake" }), bank, definitions));
});

test("ЕГЭ база использует отдельный учебный таймер, старые базовые попытки с 235 минутами сохраняются", () => {
  const base = { ...examDefinitions.find((definition) => definition.level === "base"), available: true };
  const baseBank = fixtures(base);
  const session = createMockSession("base-duration", base, baseBank, [], start, 1);
  assert.equal(getMockDurationMinutes(base), 180);
  assert.equal(session.deadline - session.startedAt, 180 * 60_000);
  assert.deepEqual(parseMockState(wrap(session), baseBank, [base]).sessions[0], session);
  const legacy = { ...session, deadline: session.startedAt + 235 * 60_000 };
  delete legacy.durationMinutes;
  const restored = parseMockState(wrap(legacy), baseBank, [{ ...base, available: false }]).sessions[0];
  assert.equal(restored.deadline, legacy.deadline);
  assert.equal(restored.durationMinutes, 235);
});

test("снятые с новой практики задачи не попадают в каталог, но начатые попытки с ними восстанавливаются", () => {
  const session = make("retired-task");
  const retiredId = session.taskIds[0];
  const retiredBank = bank.map((task) => task.id === retiredId ? { ...task, availability: "history-only" } : task);
  assert.ok(!getMockCoverage(oge, retiredBank).available.some((task) => task.id === retiredId));
  assert.ok(getMockVariants(oge, retiredBank).every((variant) => !variant.taskIds.includes(retiredId)));
  const restored = parseMockState(wrap(session), retiredBank, definitions).sessions[0];
  assert.deepEqual(restored.taskIds, session.taskIds);
});

test("повреждённые длительности, небезопасные дедлайны и нечисловые часы отклоняются", () => {
  const session = make("malformed-timer");
  for (const value of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => createMockSession("bad-clock", oge, bank, [], value));
  }
  for (const value of [NaN, Infinity, -1, start - 1]) {
    assert.throws(() => finishMockSession(session, bank, value));
    assert.strictEqual(updateMockAnswer(session, session.taskIds[0], "12", value), session);
    assert.strictEqual(skipMockTask(session, session.taskIds[0], value), session);
  }
  for (const durationMinutes of [1, 180, 236, -235, 0, 1000]) {
    assert.throws(() => parseMockState(wrap({ ...session, durationMinutes, deadline: start + durationMinutes * 60_000 }), bank, definitions));
  }
  assert.throws(() => parseMockState(wrap({ ...session, deadline: session.deadline + 1 }), bank, definitions));
});

test("повтор полного номерного варианта не начисляет XP или серию повторно ни в одном экзамене", () => {
  const { tasks: realBank } = load("src/lib/tasks.ts");
  const { appendCheckedAnswer } = load("src/lib/learning-mutations.ts");
  const { emptyLearningState, parseLearningState } = load("src/lib/learning-events.ts");
  const { emptyGameState, getGameSummary } = load("src/lib/gamification.ts");
  for (const definition of definitions) {
    let learning = { ...emptyLearningState, events: [], legacyRecords: [], game: emptyGameState() };
    let awardedFirst = 0;
    let firstStreak = 0;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let session = createMockSession(`xp-${definition.id}-${attempt}`, definition, realBank, [], start, 1);
      for (const taskId of session.taskIds) {
        const task = realBank.find((entry) => entry.id === taskId);
        if (task.part !== 1) continue;
        const answer = task.answerDisplay;
        assert.equal(checkMockAnswer(answer, task).correct, true, task.id);
        session = updateMockAnswer(session, taskId, answer, start + 1);
      }
      session = finishMockSession(session, realBank, start + 2);
      let awardedThisAttempt = 0;
      for (const result of Object.values(session.results)) {
        const task = realBank.find((entry) => entry.id === result.taskId);
        const recorded = appendCheckedAnswer(learning, task, session.answers[task.id], result.correct, result.requestId, false, "2026-10-22T12:00:00.000Z");
        learning = recorded.state;
        awardedThisAttempt += recorded.xpAwarded;
      }
      if (attempt === 0) {
        awardedFirst = awardedThisAttempt;
        firstStreak = getGameSummary(learning.game).winStreak;
        assert.equal(awardedFirst, definition.numbers.filter((number) => number.part === 1).length, definition.id);
      } else {
        assert.equal(awardedThisAttempt, 0, definition.id);
        assert.equal(getGameSummary(learning.game).totalXP, awardedFirst);
        assert.equal(getGameSummary(learning.game).winStreak, firstStreak);
      }
      learning = parseLearningState(JSON.stringify(learning));
    }
  }
});

test("новые номерные варианты требуют десятичный формат, историческая практика сохраняет приём дробей", () => {
  const { checkTaskAnswer } = load("src/lib/tasks.ts");
  let session = createMockSession("strict-format", oge, bank, [], start, 1);
  assert.equal(session.answerFormatVersion, 1);
  const task = bank.find((entry) => entry.id === session.taskIds[0]);
  const value = task.answerRule.value;
  for (const input of [value, `${value},0`, `${value}.0`, `+${value}`]) {
    assert.equal(checkMockAnswer(input, task).valid, true);
    assert.equal(checkMockAnswer(input, task).correct, true);
  }
  const fraction = `${Number(value) * 2}/2`;
  for (const input of [fraction, `${value};0`, `{${value}}`, `${value} см`, `${value}e0`, `${value}.`]) {
    assert.equal(checkMockAnswer(input, task).valid, false, input);
  }
  assert.equal(checkTaskAnswer(fraction, task.answerRule).correct, true, "Обычная практика сохраняет гибкий математический ввод");
  session = updateMockAnswer(session, task.id, fraction, start + 1);
  const strictFinished = finishMockSession(session, bank, start + 2);
  assert.equal(strictFinished.results[task.id].primaryScore, 0);
  assert.equal(strictFinished.results[task.id].requestId, null);
  assert.match(strictFinished.results[task.id].message, /конечную десятичную/);
  const restored = parseMockState(wrap(strictFinished), bank, definitions).sessions[0];
  assert.deepEqual(restored.results[task.id], strictFinished.results[task.id]);
  const legacy = { ...session };
  delete legacy.answerFormatVersion;
  const legacyFinished = finishMockSession(legacy, bank, start + 2);
  assert.equal(legacyFinished.results[task.id].correct, true);
  assert.equal(parseMockState(wrap(legacyFinished), bank, definitions).sessions[0].results[task.id].correct, true);
  assert.throws(() => parseMockState(wrap({ ...session, answerFormatVersion: 2 }), bank, definitions));
});

test("последовательность цифр в ОГЭ №19 проверяется как строка без числовой нормализации", () => {
  const { tasks: realBank, checkTaskAnswer } = load("src/lib/tasks.ts");
  const task = realBank.find((entry) => entry.examType[0] === "ОГЭ" && entry.examNumber === 19 && entry.examEntryFormat === "digit-sequence");
  assert.ok(task);
  const expected = task.answerRule.value;
  assert.equal(checkMockAnswer(expected, task).correct, true);
  for (const answer of [`+${expected}`, `${expected}.0`, `${expected},0`, `${expected}/1`, `${expected[0]} ${expected.slice(1)}`]) {
    assert.equal(checkMockAnswer(answer, task).valid, false, answer);
    assert.equal(checkMockAnswer(answer, task).correct, false, answer);
  }
  assert.equal(checkMockAnswer(`0${expected}`, task).correct, false, "Ведущий ноль меняет последовательность");
  const reversed = [...expected].reverse().join("");
  if (reversed !== expected) {
    assert.equal(checkMockAnswer(reversed, task).valid, true);
    assert.equal(checkMockAnswer(reversed, task).correct, false);
  }
  assert.equal(checkTaskAnswer(`${expected}.0`, task.answerRule).correct, true, "Старая практика не меняет математический ввод");
  assert.equal(checkMockAnswer(`${expected}.0`, task, false).correct, true, "Прежние варианты без флага сохраняют оценку");
});
