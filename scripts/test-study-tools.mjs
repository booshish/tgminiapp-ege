import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/study-tools.ts", import.meta.url), "utf8");
const { outputText, diagnostics = [] } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true,
});
assert.equal(diagnostics.filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);
const {
  emptyStudyToolsState, parseStudyToolsState, canReadStudyToolsState, toggleBookmark,
  getMistakes, independentAnswers, getReviewItems, getDifficultyRecommendations,
} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

function task(id, extras = {}) {
  return { id, topicId: "fractions", prototypeId: "fraction-arithmetic", subjectId: "math",
    examType: ["ОГЭ"], examVersionId: "oge-math-2026", level: null, examNumber: 6, part: 1,
    difficulty: "standard", answerRule: { type: "number", value: "1" }, ...extras };
}
const bank = Array.from({ length: 20 }, (_, i) => task(`task-${i}`));
const topics = [{ id: "fractions", examType: ["ОГЭ", "ЕГЭ"], prerequisites: ["arithmetic"] },
  { id: "arithmetic", examType: ["ОГЭ", "ЕГЭ"], prerequisites: [] }];
const catalog = { tasks: bank, topics };
function answer(index, correct = false, date = "2026-10-01T12:00:00.000Z", extras = {}, sourceTask = bank[index]) {
  return { id: `answer-${index}`, kind: "answer_checked", taskId: sourceTask.id, correct, answer: correct ? "1" : "2",
    topicId: sourceTask.topicId, prototypeId: sourceTask.prototypeId, subjectId: sourceTask.subjectId,
    examType: sourceTask.examType[0], examVersionId: sourceTask.examVersionId, createdAt: date, ...extras };
}
function solution(index, date = "2026-10-01T11:00:00.000Z") {
  return { ...answer(index, false, date), id: `solution-${index}`, kind: "solution_viewed", attemptId: `answer-${index}` };
}

test("Bookmarks deduplicate by stable material ID, toggle, and survive serialization", () => {
  const input = { kind: "task", itemId: "task-0", examType: "ОГЭ" };
  const saved = toggleBookmark(emptyStudyToolsState(), input, catalog, new Date("2026-10-01T00:00:00Z"));
  assert.equal(saved.bookmarks.length, 1);
  assert.deepEqual(parseStudyToolsState(JSON.stringify(saved), catalog), saved);
  const duplicated = { ...saved, bookmarks: [...saved.bookmarks, ...saved.bookmarks] };
  assert.equal(parseStudyToolsState(JSON.stringify(duplicated), catalog).bookmarks.length, 1);
  assert.equal(toggleBookmark(saved, input, catalog).bookmarks.length, 0);
});

test("Shared theory has one bookmark; invalid exam, history-only base and removed links are rejected", () => {
  const shared = toggleBookmark(emptyStudyToolsState(), { kind: "theory", itemId: "fractions", examType: "ОГЭ" }, catalog);
  assert.equal(toggleBookmark(shared, { kind: "theory", itemId: "fractions", examType: "ЕГЭ" }, catalog).bookmarks.length, 0);
  const withBase = { ...catalog, tasks: [...bank, task("old-base", { level: "base", examType: ["ЕГЭ"], availability: "history-only" })] };
  for (const input of [{ kind: "task", itemId: "task-0", examType: "ЕГЭ" }, { kind: "task", itemId: "old-base", examType: "ЕГЭ" }, { kind: "theory", itemId: "removed", examType: "ОГЭ" }]) {
    assert.equal(toggleBookmark(shared, input, withBase), shared);
  }
  assert.equal(parseStudyToolsState(JSON.stringify(shared), { tasks: bank, topics: [] }).bookmarks.length, 0);
});

test("Available base tasks keep bookmarks and mistakes independently from profile", () => {
  const base = task("base-current", { level: "base", examType: ["ЕГЭ"], examVersionId: "ege-math-base-2026" });
  const baseCatalog = { ...catalog, tasks: [...bank, base] };
  const state = toggleBookmark(emptyStudyToolsState(), { kind: "task", itemId: base.id, examType: "ЕГЭ" }, baseCatalog);
  assert.equal(state.bookmarks.length, 1);
  assert.deepEqual(parseStudyToolsState(JSON.stringify(state), baseCatalog), state);
  const event = answer(0, false, undefined, {}, base);
  assert.deepEqual(getMistakes([event], baseCatalog.tasks).map((item) => item.task.id), [base.id]);
});

test("Bookmark schema migrates v1, safely reads corrupt data and preserves unknown schema detection", () => {
  const raw = JSON.stringify({ version: 1, bookmarks: [{ kind: "task", itemId: "task-0", examType: "ОГЭ" }] });
  assert.equal(canReadStudyToolsState(raw), true);
  const migrated = parseStudyToolsState(raw, catalog);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.bookmarks[0].key, "task:task-0");
  assert.equal(migrated.bookmarks[0].createdAt, "1970-01-01T00:00:00.000Z");
  for (const value of ["{broken", "null", "[]", '{"version":99}', '{"version":2,"bookmarks":null}']) {
    assert.equal(canReadStudyToolsState(value), false);
    assert.deepEqual(parseStudyToolsState(value, catalog), emptyStudyToolsState());
  }
});

test("Manual errors include only actual auto-check mistakes, with per-task correction status", () => {
  const events = [answer(0), answer(1, true), { ...answer(0, true, "2026-10-02T00:00:00Z"), id: "correction" },
    { ...answer(2), id: "self", kind: "self_assessed", score: 0, maxScore: 2 }];
  const mistakes = getMistakes(events, bank);
  assert.deepEqual(mistakes.map((item) => [item.task.id, item.corrected]), [["task-0", true]]);
  assert.equal("accuracy" in mistakes[0], false);
  assert.equal("attempts" in mistakes[0], false);
});

test("Independent evidence ignores repeated tasks, duplicate events, viewed solutions and self-assessment", () => {
  const first = answer(0);
  const events = [first, first, { ...answer(0, true), id: "repeat" }, solution(1), answer(1, true),
    answer(2, true, undefined, { solutionSeenBeforeCheck: true }), { ...answer(3), kind: "self_assessed" }, answer(4, true)];
  assert.deepEqual(independentAnswers(events, bank).map((item) => [item.taskId, item.correct]), [["task-0", false], ["task-4", true]]);
  assert.equal(independentAnswers([answer(0, true, undefined, { examVersionId: "ege-profile-2026" })], bank).length, 0);
});

test("Free cannot receive interval or adaptive recommendations", () => {
  const events = bank.slice(0, 8).map((_, i) => answer(i, false));
  assert.deepEqual(getReviewItems(events, bank, false), []);
  assert.deepEqual(getDifficultyRecommendations(events, bank, topics, false), []);
});

test("Review starts after a real error, advances on a new independent success, resets after error", () => {
  assert.deepEqual(getReviewItems([answer(0, true)], bank, true), []);
  const events = [answer(0, false), answer(1, true, "2026-10-02T12:00:00.000Z")];
  const items = getReviewItems(events, bank, true, new Date("2026-10-04T12:00:00Z"));
  assert.equal(items[0].intervalDays, 3);
  assert.equal(items[0].dueAt, "2026-10-05T12:00:00.000Z");
  assert.equal(items[0].due, false);
  const reset = getReviewItems([...events, answer(2, false, "2026-10-04T12:00:00.000Z")], bank, true, new Date("2026-10-06T00:00:00Z"))[0];
  assert.equal(reset.intervalDays, 1);
  assert.equal(reset.due, true);
});

test("Review replay is idempotent and never proposes an already seen or wrong-exam variant", () => {
  const events = [answer(0), solution(1), answer(2, true, "2026-10-02T12:00:00Z")];
  const extendedBank = [task("a-ege", { examType: ["ЕГЭ"], examVersionId: "ege-math-2026", level: "profile" }), ...bank];
  const now = new Date("2026-10-06T00:00:00Z");
  const first = getReviewItems(events, extendedBank, true, now);
  assert.deepEqual(getReviewItems([...events, ...events], extendedBank, true, now), first);
  assert.equal(first[0].nextTask.examType[0], "ОГЭ");
  assert(!["task-0", "task-1", "task-2"].includes(first[0].nextTask.id));
  assert.equal(getReviewItems(events, bank.slice(0, 3), true, now)[0].nextTask, undefined);
});

test("Intervals are based on original timestamps and capped at thirty days, not render count", () => {
  const events = Array.from({ length: 7 }, (_, i) => answer(i, i !== 0, `2026-10-${String(i + 1).padStart(2, "0")}T12:00:00Z`));
  assert.equal(getReviewItems(events, bank, true)[0].intervalDays, 30);
  const serialized = JSON.parse(JSON.stringify(events));
  assert.deepEqual(getReviewItems(events, bank, true, new Date("2026-12-01")), getReviewItems(serialized, bank, true, new Date("2026-12-01")));
});

test("Adaptive recommendations require six distinct independent tasks and a genuinely higher author difficulty", () => {
  const advanced = task("harder", { difficulty: "advanced" });
  const expanded = [...bank, advanced];
  const events = Array.from({ length: 6 }, (_, i) => answer(i, true));
  assert.deepEqual(getDifficultyRecommendations(events.slice(0, 5), expanded, topics, true), []);
  assert.deepEqual(getDifficultyRecommendations([...events.slice(0, 2), ...events.slice(0, 2)], expanded, topics, true), []);
  const recommendation = getDifficultyRecommendations(events, expanded, topics, true)[0];
  assert.equal(recommendation.kind, "advance");
  assert.equal(recommendation.nextTask.id, "harder");
  assert.deepEqual(getDifficultyRecommendations(events, bank, topics, true), []);
});

test("Repeated mistakes propose an existing prerequisite and a new variant without changing input ledgers", () => {
  const events = Array.from({ length: 6 }, (_, i) => answer(i, i >= 3));
  const snapshot = JSON.stringify(events);
  const recommendation = getDifficultyRecommendations(events, bank, topics, true)[0];
  assert.equal(recommendation.kind, "foundations");
  assert.equal(recommendation.theoryTopicId, "arithmetic");
  assert(!events.some((event) => event.taskId === recommendation.nextTask.id));
  assert.equal(JSON.stringify(events), snapshot);
});

test("Different exam versions and subjects never pool evidence into a recommendation", () => {
  const ege = Array.from({ length: 3 }, (_, i) => task(`ege-${i}`, { examType: ["ЕГЭ"], level: "profile", examVersionId: "ege-math-profile-2026" }));
  const events = [...bank.slice(0, 3).map((_, i) => answer(i)), ...ege.map((item, i) => answer(i + 30, false, undefined, {}, item))];
  assert.deepEqual(getDifficultyRecommendations(events, [...bank, ...ege], topics, true), []);
  assert.equal(getReviewItems(events, [...bank, ...ege], true).length, 2);
});

test("Available foundation exercises can be bookmarked and manually revisited without numbered XP assumptions", () => {
  const foundation = task("foundation", { examNumber: null, part: null, difficulty: "foundation" });
  const foundationCatalog = { tasks: [foundation], topics };
  const saved = toggleBookmark(emptyStudyToolsState(), { kind: "task", itemId: "foundation", examType: "ОГЭ" }, foundationCatalog);
  assert.equal(saved.bookmarks.length, 1);
  assert.equal(parseStudyToolsState(JSON.stringify(saved), foundationCatalog).bookmarks[0].itemId, "foundation");
  const events = [answer(99, false, undefined, {}, foundation)];
  assert.equal(getMistakes(events, [foundation])[0].task.id, "foundation");
  assert.deepEqual(getReviewItems(events, [foundation], true), []);
});

test("A different prototype in the same topic is not silently substituted for an exhausted scheduled skill", () => {
  const other = task("other-skill", { prototypeId: "fraction-division" });
  const review = getReviewItems([answer(0)], [bank[0], other], true)[0];
  assert.equal(review.nextTask, undefined);
});

test("Legacy theory aliases normalize to one current bookmark without changing task or event IDs", () => {
  const target = { id: "ege-profile-number-13", examType: ["ЕГЭ"], prerequisites: [] };
  const aliasCatalog = { tasks: bank, topics: [target], resolveTopic: (id) => ["trigonometric-equations", target.id].includes(id) ? target : undefined };
  const old = { kind: "theory", itemId: "trigonometric-equations", examType: "ЕГЭ" };
  const saved = toggleBookmark(emptyStudyToolsState(), old, aliasCatalog);
  assert.equal(saved.bookmarks[0].itemId, target.id);
  const restored = parseStudyToolsState(JSON.stringify({ version: 1, bookmarks: [old, saved.bookmarks[0]] }), aliasCatalog);
  assert.equal(restored.bookmarks.length, 1);
  assert.equal(restored.bookmarks[0].key, `theory:${target.id}`);
});
