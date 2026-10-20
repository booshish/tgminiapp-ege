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
const { emptyGameState, recordGameAttempt, parseGameState, getGameSummary, localDayKey, recordSelfAssessment, getSelfAssessment, getAttemptXPAward, reconcileUnrewardedAttempts } = await import(await loadModule(new URL("src/lib/gamification.ts", root)));
const date = "2026-10-20T12:00:00.000Z";
// Deliberately synthetic verified fixtures; these are NOT production FIPI confirmations.
function rule(overrides = {}) {
  return { status: "verified", examYear: 2026, ruleId: "fixture-only", examVersionId: "oge-math-2026",
    examType: "ОГЭ", subjectId: "math", examNumber: 6, level: null, part: 1, answerFormat: "short",
    maxPrimaryScore: 1, sourceUrl: "https://fipi.ru/fixture-only-not-an-actual-source",
    verifiedAt: "2026-10-19T12:00:00.000Z", ...overrides };
}
function attempt(id, overrides = {}) {
  return { kind: "answer_checked", id, taskId: `task-${id}`, subjectId: "math", createdAt: date,
    correct: true, examYear: 2026, examType: "ОГЭ", examNumber: 6, level: null, examVersionId: "oge-math-2026",
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

test("viewing a solution blocks later XP, and an ordinary new check does not re-award an already-correct variant", () => {
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
  for (const value of [null, "broken", "[]", { version: 0, xpEvents: game.xpEvents }, { version: 99, xpEvents: game.xpEvents }]) {
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

function projectRule(overrides = {}) {
  const configured = rule({ status: "project-config" });
  delete configured.verifiedAt;
  return { ...configured, ...overrides };
}
function selfRule(overrides = {}) {
  return projectRule({ examVersionId: "ege-math-profile-2026", examType: "ЕГЭ", level: "profile",
    examNumber: 19, part: 2, answerFormat: "extended", maxPrimaryScore: 4, ...overrides });
}
function selfAssessment(id, score, overrides = {}) {
  const context = attempt(id, { examVersionId: "ege-math-profile-2026",
    examType: "ЕГЭ", examNumber: 19, level: "profile", part: 2, answerFormat: "extended" });
  delete context.correct;
  return { ...context, kind: "self_assessed", score, maxScore: 4, ...overrides };
}
function recordSelf(game, event, history = [], scoring = selfRule()) {
  return recordSelfAssessment(game, event, history, scoring, { timezoneOffsetMinutes: 0 });
}

test("A: the supplied project scoring policy enables real automatic awards without claiming online verification", () => {
  const answer = attempt("project-config");
  const game = record(emptyGameState(), answer, [], projectRule());
  assert.equal(summary(game).totalXP, 1);
  assert.equal(getAttemptXPAward(game, answer.id), 1);
  assert.equal(game.xpEvents[0].scoring.status, "project-config");
  assert.equal(summary(record(emptyGameState(), answer, [], projectRule({ examYear: 2027 }))).totalXP, 0);
  assert.equal(summary(record(emptyGameState(), answer, [], null)).totalXP, 0);
});

test("B: a genuine wrong answer earns zero, a corrected independent answer earns once and restores the streak", () => {
  const wrong = attempt("correctable-wrong", { correct: false });
  const corrected = attempt("corrected-right", { taskId: wrong.taskId });
  const start = record(emptyGameState(), wrong, [], projectRule());
  assert.equal(summary(start).totalXP, 0);
  assert.equal(summary(start).winStreak, 0);
  const won = record(start, corrected, [wrong], projectRule());
  assert.equal(summary(won).totalXP, 1);
  assert.equal(summary(won).winStreak, 1);
  assert.equal(won.checks.length, 2);
  assert.deepEqual(parseGameState(won, [wrong, corrected]), won);
  const view = { kind: "solution_viewed", id: "seen-before-correction", taskId: wrong.taskId,
    subjectId: "math", createdAt: date, attemptId: wrong.id };
  assert.equal(summary(record(start, corrected, [wrong, view], projectRule())).totalXP, 0);
});

test("C: the same unique variant in another mode never receives a second award or false positive confirmation", () => {
  const first = attempt("number-mode");
  const won = record(emptyGameState(), first, [], projectRule());
  const thematic = attempt("topic-mode", { taskId: first.taskId });
  const revisited = record(won, thematic, [first], projectRule());
  assert.equal(summary(revisited).totalXP, 1);
  assert.equal(getAttemptXPAward(revisited, thematic.id), 0);
  assert.equal(record(revisited, first, [first, thematic], projectRule()), revisited);
  assert.equal(summary(parseGameState(revisited, [first, thematic])).totalXP, 1);
});

test("D: all self-assessment scores 0..maximum are valid; out-of-range and fractional scores cannot mint XP", () => {
  for (let score = 0; score <= 4; score++) {
    const event = selfAssessment(`score-${score}`, score);
    const game = recordSelf(emptyGameState(), event);
    assert.equal(summary(game).totalXP, score);
    assert.equal(getSelfAssessment(game, event.taskId).score, score);
    assert.equal(getSelfAssessment(game, event.taskId).maxScore, 4);
    assert.deepEqual(parseGameState(game, [event]), game);
  }
  for (const score of [-1, 5, 1.5, NaN, Infinity]) {
    assert.deepEqual(recordSelf(emptyGameState(), selfAssessment("invalid-score", score)), emptyGameState());
  }
  const mismatch = selfAssessment("wrong-max", 2, { maxScore: 3 });
  assert.deepEqual(recordSelf(emptyGameState(), mismatch), emptyGameState());
});

test("D: editing self-assessment 2→3→1 commits +2,+1,-2, never the whole amount again", () => {
  const first = selfAssessment("self-2", 2);
  const up = selfAssessment("self-3", 3, { taskId: first.taskId });
  const down = selfAssessment("self-1", 1, { taskId: first.taskId });
  let game = recordSelf(emptyGameState(), first);
  game = recordSelf(game, up, [first]);
  game = recordSelf(game, down, [first, up]);
  assert.deepEqual(game.xpEvents.map((event) => event.xp), [2, 1, -2]);
  assert.equal(summary(game).totalXP, 1);
  assert.equal(summary(game).todayXP, 1);
  assert.equal(summary(game).subjects[0].todayXP, 1);
  assert.equal(getSelfAssessment(game, first.taskId).score, 1);
  const restored = parseGameState(JSON.stringify(game), [first, up, down]);
  assert.deepEqual(restored, game);
  assert.equal(recordSelf(restored, down, [first, up, down]), restored);
  assert.equal(recordSelf(restored, { ...down, id: "new-request-same-score" }, [first, up, down]), restored);
});

test("E/H: mixed subjects share one balance, and self-assessment does not alter any confirmed streak", () => {
  const math = attempt("confirmed-math");
  const other = attempt("confirmed-future", { subjectId: "future-subject" });
  let game = record(emptyGameState(), math, [], projectRule());
  game = record(game, other, [math], projectRule({ subjectId: "future-subject" }));
  const self = selfAssessment("voluntary-self", 4);
  const before = summary(game);
  game = recordSelf(game, self, [math, other]);
  const after = summary(game);
  assert.equal(after.totalXP, 6);
  assert.equal(after.totalXP, after.subjects.reduce((sum, subject) => sum + subject.totalXP, 0));
  assert.equal(after.todayXP, after.subjects.reduce((sum, subject) => sum + subject.todayXP, 0));
  assert.equal(after.winStreak, before.winStreak);
  for (const subject of before.subjects) {
    assert.equal(after.subjects.find((item) => item.subjectId === subject.subjectId).winStreak, subject.winStreak);
  }
  const zero = selfAssessment("self-to-zero", 0, { taskId: self.taskId });
  game = recordSelf(game, zero, [math, other, self]);
  assert.equal(summary(game).winStreak, before.winStreak);
});

test("F: 149→150→151 reaches rainbow while the counter and actual balance continue growing", () => {
  let game = emptyGameState();
  const history = [];
  for (let index = 0; index < 151; index++) {
    const event = attempt(`threshold-${index}`);
    game = record(game, event, history, projectRule());
    history.push(event);
    if (index === 148) {
      assert.equal(summary(game).todayXP, 149);
      assert.equal(summary(game).rank.id, "gold");
    }
    if (index === 149) assert.equal(summary(game).rank.id, "rainbow");
  }
  assert.equal(summary(game).totalXP, 151);
  assert.equal(summary(game).todayXP, 151);
  assert.equal(summary(game).dailyScaleValue, 150);
});

test("G: a later-day self-assessment correction edits the original earning day without a negative new-day counter", () => {
  const first = selfAssessment("day-one-self", 3, { createdAt: "2026-10-20T23:59:59.000Z" });
  const correction = selfAssessment("day-two-edit", 1, { taskId: first.taskId, createdAt: "2026-10-21T00:00:01.000Z" });
  let game = recordSelf(emptyGameState(), first);
  game = recordSelf(game, correction, [first]);
  assert.equal(summary(game, "2026-10-20T23:59:59.000Z").todayXP, 1);
  assert.equal(summary(game, "2026-10-21T00:00:02.000Z").todayXP, 0);
  assert.equal(summary(game, "2026-10-21T00:00:02.000Z").totalXP, 1);
  assert.deepEqual(parseGameState(game, [first, correction]), game);
});

test("G: an initial zero does not backdate the first actual positive self-assessment credit", () => {
  const zero = selfAssessment("zero-yesterday", 0, { createdAt: "2026-10-20T23:59:59.000Z" });
  const positive = selfAssessment("positive-today", 2, { taskId: zero.taskId, createdAt: "2026-10-21T00:00:01.000Z" });
  const game = recordSelf(recordSelf(emptyGameState(), zero), positive, [zero]);
  assert.equal(summary(game, "2026-10-20T23:59:59.000Z").todayXP, 0);
  assert.equal(summary(game, "2026-10-21T00:00:02.000Z").todayXP, 2);
  assert.deepEqual(parseGameState(game, [zero, positive]), game);
});

test("I: Free and Premium use exactly the same award policy and color configuration", () => {
  const event = attempt("same-entitlement-independent-input");
  const free = record(emptyGameState(), event, [], projectRule());
  const premium = record(emptyGameState(), event, [], projectRule());
  assert.deepEqual(free, premium);
  assert.deepEqual(summary(free), summary(premium));
  assert.equal("subscription" in gameConfig, false);
});

test("self-assessment corrections reject corrupted deltas, orphan links and repeated confirmation IDs", () => {
  const first = selfAssessment("corrupt-self-first", 2);
  const next = selfAssessment("corrupt-self-next", 3, { taskId: first.taskId });
  const game = recordSelf(recordSelf(emptyGameState(), first), next, [first]);
  for (const change of [{ xp: 3 }, { previousScore: 0 }, { score: 4 }, { localDay: "2026-10-21" }, { attemptId: "missing" }]) {
    const broken = { ...game, xpEvents: [game.xpEvents[0], { ...game.xpEvents[1], ...change }] };
    const restored = parseGameState(broken, [first, next]);
    assert.equal(summary(restored).totalXP, 2, JSON.stringify(change));
    assert.equal(restored.xpEvents.length, 1);
  }
  const duplicate = { ...game, xpEvents: [...game.xpEvents, game.xpEvents[1]] };
  assert.deepEqual(parseGameState(duplicate, [first, next]), game);
});

test("v1 award journals migrate in place without losing balances or giving duplicate points", () => {
  const event = attempt("v1-earning");
  const current = record(emptyGameState(), event);
  const oldAward = { ...current.xpEvents[0] };
  delete oldAward.kind;
  const oldRule = { ...oldAward.scoring };
  delete oldRule.examYear;
  const old = { version: 1, checks: current.checks, xpEvents: [{ ...oldAward, scoring: oldRule }] };
  const restored = parseGameState(old, [event]);
  assert.equal(restored.version, 2);
  assert.equal(summary(restored).totalXP, 1);
  assert.equal(getAttemptXPAward(restored, event.id), 1);
  assert.equal(summary(record(restored, { ...event, id: "recheck-v1" }, [event])).totalXP, 1);
});

test("the explicit repair recovers formerly blocked eligible awards once, with their original date", () => {
  const wrong = attempt("old-wrong", { correct: false });
  const right = attempt("old-right", { taskId: wrong.taskId });
  const view = { kind: "solution_viewed", id: "later-view", taskId: right.taskId,
    subjectId: "math", createdAt: date, attemptId: right.id };
  const historical = record(record(emptyGameState(), wrong, [], null), right, [wrong], null);
  const fixed = reconcileUnrewardedAttempts(historical, [wrong, right, view], () => projectRule());
  assert.equal(summary(fixed).totalXP, 1);
  assert.equal(summary(fixed).winStreak, 1);
  assert.equal(fixed.xpEvents[0].createdAt, right.createdAt);
  assert.deepEqual(reconcileUnrewardedAttempts(fixed, [wrong, right, view], () => projectRule()), fixed);
  assert.equal(summary(reconcileUnrewardedAttempts(historical, [wrong, view, right], () => projectRule())).totalXP, 0);
  const incomplete = attempt("ambiguous-old", { part: undefined, examVersionId: undefined });
  assert.equal(summary(reconcileUnrewardedAttempts(emptyGameState(), [incomplete], () => projectRule())).totalXP, 0);
});

test("a persisted solution-seen flag prevents a partial-storage loss from re-enabling independent XP", () => {
  const copied = attempt("solution-fact-survived", { solutionSeenBeforeCheck: true });
  assert.equal(summary(record(emptyGameState(), copied, [], projectRule())).totalXP, 0);
  assert.equal(summary(reconcileUnrewardedAttempts(emptyGameState(), [copied], () => projectRule())).totalXP, 0);
  const original = attempt("original-without-flag");
  const fake = record(emptyGameState(), original, [], projectRule());
  assert.equal(parseGameState(fake, [{ ...original, solutionSeenBeforeCheck: true }]).xpEvents.length, 0);
});


test("the repair reconstructs missing or interrupted self-assessment ledgers from saved confirmations without duplicate full awards", () => {
  const first = selfAssessment("saved-self-2", 2);
  const up = selfAssessment("saved-self-3", 3, { taskId: first.taskId });
  const down = selfAssessment("saved-self-1", 1, { taskId: first.taskId });
  const history = [first, up, down];
  const complete = recordSelf(recordSelf(recordSelf(emptyGameState(), first), up, [first]), down, [first, up]);
  const rebuilt = reconcileUnrewardedAttempts(emptyGameState(), history, () => selfRule());
  assert.deepEqual(rebuilt, complete);
  const damaged = { ...complete, xpEvents: [complete.xpEvents[0], complete.xpEvents[2]] };
  const parsed = parseGameState(damaged, history);
  assert.equal(summary(parsed).totalXP, 2);
  const recovered = reconcileUnrewardedAttempts(parsed, history, () => selfRule());
  assert.equal(summary(recovered).totalXP, 1);
  assert.deepEqual(recovered, complete);
  assert.deepEqual(reconcileUnrewardedAttempts(recovered, history, () => selfRule()), recovered);
  assert.equal(summary(reconcileUnrewardedAttempts(emptyGameState(), history, () => null)).totalXP, 0);
});
