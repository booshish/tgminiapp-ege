import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createComponentLoader } from "./component-source-loader.mjs";

const load = createComponentLoader();
const { HomeScreen } = load("src/components/screens/home-screen.tsx");
const { emptyLearningState } = load("src/lib/learning-events.ts");
const { getGameSummary } = load("src/lib/gamification.ts");
const noop = () => {};
const game = getGameSummary(emptyLearningState.game);
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));

test("home offers a named saved task only when a resumable position exists", () => {
  const props = { exam: "ОГЭ", game, onExamChange: noop, onStart: noop, onNavigate: noop, onHelp: noop };
  const empty = render(HomeScreen, props);
  assert.match(empty, /Выбрать задания/);
  assert.doesNotMatch(empty, /Продолжить решение/);
  const active = render(HomeScreen, { ...props, resumeLabel: "ОГЭ · Математика · №7 · Числовые промежутки" });
  assert.match(active, /Продолжить решение/);
  assert.match(active, /ОГЭ · Математика · №7 · Числовые промежутки/);
  assert.equal((active.match(/Серия верных: 0/g) ?? []).length, 2);
});
