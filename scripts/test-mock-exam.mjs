import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader } from "./content-source-loader.mjs";
const load = createContentLoader();
const {
  createMockSession, getMockCoverage, finishMockSession, updateMockAnswer,
  selectMockPosition, remainingMockMilliseconds, elapsedMockMilliseconds,
  parseMockState, setMockSelfScore, mockScoreSummary, mockDurationMinutes,
  clearMockStorage, mockStorageKey,
} = load("src/lib/mock-exam.ts");
const { getAvailableExamDefinitions } = load("src/lib/exams.ts");
const definitions = getAvailableExamDefinitions();
const oge = definitions.find((definition) => definition.examType === "ОГЭ");
const ege = definitions.find((definition) => definition.examType === "ЕГЭ");
const start = Date.parse("2026-10-21T10:00:00Z");

function fixtures(definition) {
  return definition.numbers.flatMap((number) => [1, 2].map((variant) => ({
    id: `${definition.id}-${number.number}-${variant}`,
    publication: {
      id: `${definition.id}-${number.number}-${variant}`,
      provenance: { sourceIds: ["tochka-project-original"], authorship: "project-original",
        sourceFiles: ["scripts/test-mock-exam.mjs"], attribution: ["Авторский материал проекта «Точка»"] },
      validation: { status: "automated-reviewed", checkedAt: "2026-10-21",
        evidence: ["scripts/test-mock-exam.mjs — synthetic fixture, not published course content"] },
      releaseStatus: "ready",
    },
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
const bank = [...fixtures(oge), ...fixtures(ege)];
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
