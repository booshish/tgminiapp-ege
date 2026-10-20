import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Fix the test clock zone; explicit offset cases below cover local-day boundaries.
process.env.TZ = "UTC";

const root = new URL("../", import.meta.url);
const moduleUrls = new Map();
async function loadModule(fileUrl) {
  if (moduleUrls.has(fileUrl.href)) return moduleUrls.get(fileUrl.href);
  const loading = (async () => {
    const source = await readFile(fileUrl, "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020,
    } });
    const parsed = ts.createSourceFile("module.js", outputText, ts.ScriptTarget.ES2020, true);
    const replacements = [];
    for (const statement of parsed.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const path = statement.moduleSpecifier.text;
      if (!path.startsWith(".")) continue;
      replacements.push({ start: statement.moduleSpecifier.getStart(parsed), end: statement.moduleSpecifier.end,
        value: JSON.stringify(await loadModule(new URL(`${path}.ts`, fileUrl))) });
    }
    let output = outputText;
    for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
      output = output.slice(0, replacement.start) + replacement.value + output.slice(replacement.end);
    }
    return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  })();
  moduleUrls.set(fileUrl.href, loading);
  return loading;
}
const { gameConfig, getGameLevel, getGameRank } = await import(await loadModule(new URL("src/lib/game-config.ts", root)));
const { emptyGameState, recordGameAttempt, parseGameState, getGameSummary, localDayKey } = await import(await loadModule(new URL("src/lib/gamification.ts", root)));
const date = "2026-10-20T12:00:00.000Z";
// Deliberately synthetic verified fixtures; these are NOT production FIPI confirmations.
function rule(overrides = {}) {
  return { status: "verified", ruleId: "fixture-only", examVersionId: "oge-math-2026",
    examType: "ОГЭ", subjectId: "math", examNumber: 6, level: null, part: 1, answerFormat: "short",
    maxPrimaryScore: 1, sourceUrl: "https://fipi.ru/fixture-only-not-an-actual-source",
    verifiedAt: "2026-10-19T12:00:00.000Z", ...overrides };
}
function attempt(id, overrides = {}) {
  return { kind: "answer_checked", id, taskId: `task-${id}`, subjectId: "math", createdAt: date,
    correct: true, examType: "ОГЭ", examNumber: 6, level: null, examVersionId: "oge-math-2026",
    part: 1, answerFormat: "short", ...overrides };
}
function record(game, answer, previous = [], scoring = rule()) {
  return recordGameAttempt(game, answer, previous, scoring, { timezoneOffsetMinutes: 0 });
}
function summary(game, today = date) { return getGameSummary(game, new Date(today)); }

test("game policy has no subscription multiplier or earning cap; thresholds are proposals", () => {
  assert.equal(gameConfig.dailyVisualMaxXP, 150);
  assert.equal(gameConfig.levelsStatus, "proposed");
  assert.equal(gameConfig.streak.status, "proposed");
  assert.equal("freeLimitXP" in gameConfig, false);
  assert.equal("premiumMultiplier" in gameConfig, false);
  assert.deepEqual(gameConfig.ranks.map((rank) => rank.minXP), [0, 5, 10, 15, 20, 30, 50, 80, 110, 150]);
});

test("only a new independent correct answer with explicitly verified matching scoring earns XP", () => {
  const answer = attempt("first");
  const initial = emptyGameState();
  assert.equal(summary(record(initial, answer)).totalXP, 1);
  assert.equal(summary(record(initial, attempt("wrong", { correct: false }))).totalXP, 0);
  assert.equal(summary(record(initial, answer, [], null)).totalXP, 0);
  assert.equal(summary(record(initial, answer, [], { ...rule(), status: "pending-official-verification" })).totalXP, 0);
  for (const change of [
    { examType: "ЕГЭ" }, { examNumber: 7 }, { level: "profile" },
    { examVersionId: "oge-math-2027" }, { subjectId: "wrong-subject" }, { verifiedAt: "2026-10-21T12:00:00.000Z" }, { part: 2 }, { answerFormat: "extended" },
    { maxPrimaryScore: 0 }, { sourceUrl: "https://example.com/score" }, { verifiedAt: "2026-02-30T12:00:00.000Z" },
  ]) assert.equal(summary(record(initial, answer, [], rule(change))).totalXP, 0, JSON.stringify(change));
  assert.equal(summary(record(initial, attempt("missing", { part: undefined }))).totalXP, 0);
  assert.equal(summary(record(initial, attempt("fundamental", { part: null, examNumber: null }))).totalXP, 0);
});

test("wrong answers never remove accrued XP", () => {
  const first = attempt("good");
  const won = record(emptyGameState(), first);
  const afterWrong = record(won, attempt("wrong", { correct: false }), [first]);
  assert.equal(summary(afterWrong).totalXP, 1);
  assert.equal(summary(afterWrong).winStreak, 0);
});

test("reload, repeated checking and previous/next navigation cannot duplicate XP", () => {
  const first = attempt("first");
  const state = record(emptyGameState(), first);
  assert.equal(record(state, first), state);
  const restored = parseGameState(JSON.stringify(state), [first]);
  assert.deepEqual(restored, state);
  assert.equal(record(restored, first, [first]), restored);
  const repeat = attempt("repeat", { taskId: first.taskId });
  assert.equal(summary(record(restored, repeat, [first])).totalXP, 1);
  assert.equal(summary(record(restored, repeat, [first])).winStreak, 1);
  assert.equal(summary(record(emptyGameState(), repeat, [first])).totalXP, 0);
});

test("viewing a solution before a later correct answer makes it ineligible; old answers are never backfilled", () => {
  const first = attempt("wrong", { correct: false });
  const view = { kind: "solution_viewed", id: "view", taskId: first.taskId, subjectId: "math", createdAt: date, attemptId: first.id };
  const later = attempt("later", { taskId: first.taskId });
  assert.equal(summary(record(emptyGameState(), later, [first, view])).totalXP, 0);
  const pending = record(emptyGameState(), attempt("old"), [], null);
  assert.equal(summary(record(pending, attempt("new", { taskId: "task-old" }), [attempt("old")])).totalXP, 0);
});

test("187 XP remains 187, even though the visual daily scale ends at 150", () => {
  let game = emptyGameState();
  const history = [];
  for (let i = 0; i < 187; i++) {
    const answer = attempt(`xp-${i}`);
    game = record(game, answer, history);
    history.push(answer);
  }
  const view = summary(game);
  assert.equal(view.todayXP, 187);
  assert.equal(view.totalXP, 187);
  assert.equal(view.dailyScaleValue, 150);
  assert.equal(view.rank.id, "rainbow");
  assert.equal(view.level.number, 2);
  assert.equal(view.level.xpIntoLevel, 87);
  assert.equal(view.subjects[0].totalXP, 187);
  assert.equal(view.subjects[0].todayXP, 187);
  assert.deepEqual(parseGameState(game, history), game);
});

test("overall XP is exactly the sum of subjects, with separate daily scales and streaks", () => {
  const math = attempt("math");
  const second = attempt("other", { subjectId: "future-subject" });
  const game = record(record(emptyGameState(), math), second, [math], rule({ subjectId: "future-subject" }));
  const view = summary(game);
  assert.equal(view.totalXP, 2);
  assert.equal(view.todayXP, 2);
  assert.equal(view.totalXP, view.subjects.reduce((sum, subject) => sum + subject.totalXP, 0));
  assert.equal(view.todayXP, view.subjects.reduce((sum, subject) => sum + subject.todayXP, 0));
  assert.equal(view.winStreak, 2);
  const afterWrong = summary(record(game, attempt("wrong", { correct: false }), [math, second]));
  assert.equal(afterWrong.winStreak, 0);
  assert.equal(afterWrong.subjects.find((subject) => subject.subjectId === "math").winStreak, 0);
  assert.equal(afterWrong.subjects.find((subject) => subject.subjectId === "future-subject").winStreak, 1);
});

test("local midnight resets only daily display; stored total XP and earned local day remain intact", () => {
  const answer = attempt("midnight", { createdAt: "2026-10-20T23:59:59.000Z" });
  const game = record(emptyGameState(), answer);
  assert.equal(summary(game, "2026-10-20T23:59:59.000Z").todayXP, 1);
  assert.equal(summary(game, "2026-10-21T00:00:01.000Z").todayXP, 0);
  assert.equal(summary(game, "2026-10-21T00:00:01.000Z").totalXP, 1);
  assert.equal(game.xpEvents[0].localDay, "2026-10-20");
  assert.equal(localDayKey(new Date("2026-10-20T21:30:00.000Z"), -180), "2026-10-21");
  assert.equal(localDayKey(new Date("2026-10-20T02:00:00.000Z"), 300), "2026-10-19");
  assert.equal(localDayKey(new Date("invalid")), "");
  assert.equal(localDayKey(new Date(date), Infinity), "");
});

test("corrupt ledgers cannot mint points or orphan awards, unsupported schemas reset without migration awards", () => {
  const answer = attempt("verified");
  const game = record(emptyGameState(), answer);
  for (const value of [null, "broken", "[]", { version: 0, xpEvents: game.xpEvents }, { version: 2, xpEvents: game.xpEvents }]) {
    assert.deepEqual(parseGameState(value, [answer]), emptyGameState());
  }
  assert.deepEqual(parseGameState(game, []), emptyGameState());
  for (const change of [
    { xp: 1000 }, { taskId: "other" }, { subjectId: "other" }, { attemptId: "missing" },
    { createdAt: "2026-10-21T12:00:00.000Z" }, { localDay: "2026-10-21" },
    { timezoneOffsetMinutes: Infinity, localDay: "" },
    { scoring: { ...rule(), part: 2 } },
  ]) {
    const damaged = { ...game, xpEvents: [{ ...game.xpEvents[0], ...change }] };
    assert.equal(parseGameState(damaged, [answer]).xpEvents.length, 0, JSON.stringify(change));
  }
  const duplicate = { ...game, xpEvents: [...game.xpEvents, game.xpEvents[0]], checks: [...game.checks, game.checks[0]] };
  assert.deepEqual(parseGameState(duplicate, [answer]), game);
});

test("historical awards keep their original score snapshot and rank/level config is separate", () => {
  const answer = attempt("score-snapshot");
  const state = record(emptyGameState(), answer, [], rule({ maxPrimaryScore: 2 }));
  const restored = parseGameState(JSON.stringify(state), [answer]);
  assert.equal(restored.xpEvents[0].xp, 2);
  assert.equal(restored.xpEvents[0].scoring.maxPrimaryScore, 2);
  assert.equal(summary(restored).totalXP, 2);
  assert.equal(getGameLevel(0).number, 1);
  assert.equal(getGameLevel(100).number, 2);
  assert.equal(getGameRank(149).id, "gold");
  assert.equal(getGameRank(150).id, "rainbow");
  assert.equal(getGameRank(999).id, "rainbow");
});
