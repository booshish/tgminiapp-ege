import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader } from "./content-source-loader.mjs";
const load = createContentLoader();
const { createPracticeSession, normalizeCatalogSelection, practiceContextKey, findRecentPracticeSession,
  rememberPracticePosition, getSessionTaskId, emptyTaskState } = load("src/lib/practice.ts");
const { parseStoredPractice, serializeStoredPractice, isReadablePracticeStorage } = load("src/lib/practice-storage.ts");
const { parseStudyRoute } = load("src/lib/navigation.ts");
const { tasks } = load("src/lib/tasks.ts");
const selected = (exam, number) => normalizeCatalogSelection({ exam, subjectId: "math", mode: "number", examNumber: number });
const opened = (id, exam, number, position, order) => {
  const session = createPracticeSession(id, selected(exam, number));
  return rememberPracticePosition(session, session.taskIds[position], order);
};
const store = (sessions, activeId, extra = {}) => ({ version: 2, catalog: selected("ОГЭ", 7), sessions,
  activeId, taskStates: {}, ...extra });

test("resume keeps independent number 7/12 and OGE/EGE positions; a changed subject cannot resume math", () => {
  const a = opened("oge7", "ОГЭ", 7, 2, 4), b = opened("oge12", "ОГЭ", 12, 1, 5), c = opened("ege7", "ЕГЭ", 7, 3, 6);
  const sessions = { a, b, c };
  assert.equal(findRecentPracticeSession(sessions, selected("ОГЭ", 7), true, c.id).id, a.id);
  assert.equal(findRecentPracticeSession(sessions, selected("ОГЭ", 12), true, c.id).id, b.id);
  assert.equal(findRecentPracticeSession(sessions, selected("ОГЭ", 7), false, c.id).id, b.id);
  assert.equal(findRecentPracticeSession(sessions, selected("ЕГЭ", 7), false, a.id).id, c.id);
  assert.equal(findRecentPracticeSession(sessions, { ...selected("ОГЭ", 7), subjectId: "physics" }), undefined);
  assert.equal(findRecentPracticeSession(sessions, selected("ОГЭ", 18), true), undefined);
});

test("context identity is semantic and includes exam, level, part, mode, number/topic and prototype", () => {
  const normal = selected("ЕГЭ", 7);
  const reordered = Object.fromEntries(Object.entries(normal).reverse());
  assert.equal(practiceContextKey(normal), practiceContextKey(reordered));
  for (const changed of [{ ...normal, exam: "ОГЭ", level: undefined }, { ...normal, level: "base" },
    { ...normal, examNumber: 12 }, { ...normal, prototypeId: "another" },
    { ...normal, mode: "topic", topicId: "fractions", examNumber: undefined }]) {
    assert.notEqual(practiceContextKey(normal), practiceContextKey(changed));
  }
  assert.equal(selected("ОГЭ", 7).part, 1);
  assert.equal(selected("ОГЭ", 20).part, 2);
  assert.equal(normalizeCatalogSelection({ ...selected("ОГЭ", 20), examNumber: 7 }).part, 1);
});

test("v2 reload preserves the last stable ID even if stored array order changes", () => {
  const session = opened("stable", "ОГЭ", 7, 2, 9);
  const id = session.lastTaskId;
  const originalIndex = session.lastPosition;
  session.taskIds.reverse();
  assert.notEqual(session.taskIds[originalIndex], id);
  const restored = parseStoredPractice(serializeStoredPractice(store({ [session.id]: session }, session.id)));
  assert.equal(getSessionTaskId(restored.sessions[session.id]), id);
  assert.equal(restored.sessions[session.id].taskIds[restored.sessions[session.id].lastPosition], id);
  assert.deepEqual(parseStoredPractice(serializeStoredPractice(restored)), restored);
});

test("removed task IDs fall back inside the same exam/number; new bank items append without clearing drafts", () => {
  const session = opened("deleted", "ОГЭ", 12, 2, 4);
  session.taskIds.splice(2, 0, "removed-author-task");
  session.lastTaskId = "removed-author-task";
  session.lastPosition = 2;
  const goodId = session.taskIds[0];
  const restored = parseStoredPractice(serializeStoredPractice(store({ [session.id]: session }, session.id,
    { taskStates: { [goodId]: { ...emptyTaskState(), answer: "-" } } })));
  const returned = restored.sessions[session.id];
  assert.ok(getSessionTaskId(returned));
  assert.ok(!returned.taskIds.includes("removed-author-task"));
  assert.equal(tasks.find((task) => task.id === getSessionTaskId(returned)).examNumber, 12);
  assert.equal(restored.taskStates[goodId].answer, "-");
  assert.equal(restored.taskStates[goodId].attempt, null);
});

test("v1 migration uses active draft and unions viewed-solution flag across old number/topic sessions", () => {
  const number = opened("number", "ОГЭ", 7, 0, 1);
  const task = tasks.find((candidate) => candidate.id === number.taskIds[0]);
  const topic = createPracticeSession("topic", normalizeCatalogSelection({ exam: "ОГЭ", mode: "topic", topicId: task.topicId }), task.id);
  number.states[task.id] = { ...emptyTaskState(), answer: "-", solutionViewed: true };
  topic.states[task.id] = { ...emptyTaskState(), answer: "2,5" };
  const restored = parseStoredPractice(JSON.stringify({ version: 1, catalog: number.selection,
    sessions: { [topic.id]: topic, [number.id]: number }, activeId: topic.id }));
  assert.equal(restored.version, 2);
  assert.equal(restored.taskStates[task.id].answer, "2,5");
  assert.equal(restored.taskStates[task.id].attempt, null);
  assert.equal(restored.taskStates[task.id].solutionViewed, true);
  assert.deepEqual(restored.sessions[number.id].states, {});
  assert.deepEqual(restored.sessions[topic.id].states, {});
  const persisted = JSON.parse(serializeStoredPractice(restored));
  assert.equal("states" in persisted.sessions[number.id], false);
  assert.equal("states" in persisted.sessions[topic.id], false);
  assert.equal("events" in persisted, false);
  assert.equal("xpEvents" in persisted, false);
});

test("legacy migration derives stable cursor from its own saved order and preserves validated check ID", () => {
  const session = createPracticeSession("legacy", selected("ОГЭ", 9));
  const task = tasks.find((candidate) => candidate.id === session.taskIds[1]);
  session.lastPosition = 1;
  session.states[task.id] = { ...emptyTaskState(), answer: task.answerDisplay,
    attempt: { id: "legacy-attempt", correct: true }, solutionViewed: true, solutionVisible: true };
  const restored = parseStoredPractice(JSON.stringify({ version: 1, catalog: session.selection,
    sessions: { [session.id]: session }, activeId: session.id }));
  assert.equal(restored.sessions[session.id].lastTaskId, task.id);
  assert.equal(restored.taskStates[task.id].attempt.id, "legacy-attempt");
  assert.equal(restored.taskStates[task.id].solutionVisible, true);
});

test("unreadable/unknown storage is recognized before persistence; unsupported subjects are not converted", () => {
  for (const raw of ["", "{", "null", "[]", '{"version":99}', '{"version":2}',
    JSON.stringify({ ...store({}, null), taskStates: [] }), "x".repeat(8_000_001)]) assert.equal(isReadablePracticeStorage(raw), false);
  assert.equal(isReadablePracticeStorage(null), true);
  assert.equal(isReadablePracticeStorage(JSON.stringify({ ...store({}, null), version: 1 })), true);
  assert.equal(isReadablePracticeStorage(JSON.stringify(store({}, null))), true);
  const session = opened("unsupported", "ОГЭ", 7, 1, 1);
  session.selection.subjectId = "physics";
  const restored = parseStoredPractice(JSON.stringify(store({ [session.id]: session }, session.id)));
  assert.deepEqual(restored.sessions, {});
  assert.equal(restored.activeId, null);
});

test("stable task and part survive URL parsing while legacy links remain usable", () => {
  const task = tasks.find((candidate) => candidate.examType[0] === "ОГЭ" && candidate.examNumber === 7);
  const parsed = parseStudyRoute(`#/tasks/0?task=${task.id}&exam=ОГЭ&subject=math&mode=number&number=7&part=1`, tasks.length);
  assert.equal(parsed.taskId, task.id);
  assert.equal(parsed.part, 1);
  assert.equal(parsed.invalidContext, false);
  assert.equal(parseStudyRoute("#/tasks/0?exam=ОГЭ", tasks.length).taskIndex, 0);
  assert.equal(parseStudyRoute("#/tasks/0?task=%3Cscript%3E", tasks.length).invalidContext, true);
  assert.equal(parseStudyRoute("#/tasks/0?part=3", tasks.length).invalidContext, true);
});
