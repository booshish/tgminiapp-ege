import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createComponentLoader } from "./component-source-loader.mjs";

const load = createComponentLoader();
const { GameMotivation, StreakSummary } = load("src/components/game-motivation.tsx");
const { ProgressScreen } = load("src/components/screens/progress-screen.tsx");
const { CatalogScreen } = load("src/components/screens/catalog-screen.tsx");
const { emptyLearningState, parseLearningState } = load("src/lib/learning-events.ts");
const { appendCheckedAnswer } = load("src/lib/learning-mutations.ts");
const { getGameSummary } = load("src/lib/gamification.ts");
const { tasks } = load("src/lib/tasks.ts");
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));
const noop = () => {};
const first = tasks.find((task) => task.id === "triangle-sine");
const second = tasks.find((task) => task.part === 1 && task.id !== first.id && task.answerRule.type === "number");
const answer = (state, task, id) => appendCheckedAnswer(state, task, task.answerRule.value, true, id, false, "2026-10-21T12:00:00.000Z").state;

test("empty and active Home game cards show both free streak counters and their flames", () => {
  const empty = render(GameMotivation, { summary: getGameSummary(emptyLearningState.game), onHelp: noop });
  assert.equal((empty.match(/Серия верных: 0/g) ?? []).length, 2);
  let state = answer(emptyLearningState, first, "streak-visible-one");
  state = answer(state, second, "streak-visible-two");
  const html = render(GameMotivation, { summary: getGameSummary(state.game), onHelp: noop });
  assert.equal((html.match(/Серия верных: 2/g) ?? []).length, 2);
  assert.equal((html.match(/class="game-flame-slot"/g) ?? []).length, 2);
  assert.equal((html.match(/fill="#B5A09F"/g) ?? []).length, 2);
});

test("same saved game renders compact global/subject counters and a math-only catalog counter", () => {
  let state = answer(emptyLearningState, first, "streak-compact-one");
  state = answer(state, second, "streak-compact-two");
  const summary = getGameSummary(state.game);
  const both = render(StreakSummary, { summary });
  assert.match(both, /Общая серия/);
  assert.match(both, /Математика/);
  assert.equal((both.match(/Серия верных: 2/g) ?? []).length, 2);
  const math = render(StreakSummary, { summary, showOverall: false });
  assert.doesNotMatch(math, /Общая серия|XP|Точность|Всего попыток/);
  assert.equal((math.match(/Серия верных: 2/g) ?? []).length, 1);
});

test("learning-state reload, theme/size/exam settings and missing game cache preserve evidence-backed streaks", () => {
  let state = answer(emptyLearningState, first, "streak-persist-one");
  state = answer(state, second, "streak-persist-two");
  const eventsBefore = state.events;
  for (const settings of [{}, { theme: "dark", fontScale: "huge", exam: "ОГЭ", focusMode: true }]) {
    const restored = parseLearningState(JSON.stringify({ ...state, ...settings }));
    const html = render(StreakSummary, { summary: getGameSummary(restored.game) });
    assert.equal((html.match(/Серия верных: 2/g) ?? []).length, 2);
    assert.deepEqual(restored.events, eventsBefore);
    assert.equal(getGameSummary(restored.game).totalXP, getGameSummary(state.game).totalXP);
    assert.equal(getGameSummary(parseLearningState(JSON.stringify(restored)).game).winStreak, 2);
  }
  const missingCache = parseLearningState(JSON.stringify({ ...state, game: { version: 2, xpEvents: [], checks: [] } }));
  assert.equal(getGameSummary(missingCache.game).winStreak, 2);
  assert.equal(getGameSummary(parseLearningState(null).game).winStreak, 0);
});

test("Progress exposes motivation for both tariffs while keeping Free analytics closed", () => {
  const state = answer(answer(emptyLearningState, first, "progress-one"), second, "progress-two");
  const game = getGameSummary(state.game);
  for (const isPremium of [false, true]) {
    const html = render(ProgressScreen, { state, game, isPremium, onPremium: noop, onStart: noop });
    assert.equal((html.match(/Серия верных: 2/g) ?? []).length, 2);
    if (!isPremium) {
      assert.match(html, /Подробнее о Premium/);
      assert.doesNotMatch(html, /Точность ответов|Всего попыток|class="stats-grid"/);
    }
  }
});

test("both math exam catalogs display the same subject streak without personal analytics", () => {
  const state = answer(answer(emptyLearningState, first, "catalog-one"), second, "catalog-two");
  const game = getGameSummary(state.game);
  for (const exam of ["ОГЭ", "ЕГЭ"]) {
    const html = render(CatalogScreen, {
      selection: { exam, subjectId: "math", level: exam === "ЕГЭ" ? "profile" : undefined, mode: "number" },
      onChange: noop, onStart: noop, onTheory: noop, game,
    });
    assert.equal((html.match(/Серия верных: 2/g) ?? []).length, 1);
    assert.doesNotMatch(html, /Общая серия|Точность ответов|Всего попыток/);
  }
});
