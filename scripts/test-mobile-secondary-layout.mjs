import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createComponentLoader } from "./component-source-loader.mjs";

const load = createComponentLoader();
const layout = load("src/hooks/use-phone-layout.ts");
const { PremiumScreen } = load("src/components/screens/premium-screen.tsx");
const { TrainerScreen } = load("src/components/screens/trainer-screen.tsx");
const { StudyToolsScreen } = load("src/components/screens/study-tools-screen.tsx");
const { emptyLearningState } = load("src/lib/learning-events.ts");
const noop = () => {};
const render = (Component, props, phone) => {
  // Width is a presentation input; this does not change saved learning data.
  layout.usePhoneLayout = () => phone;
  return renderToStaticMarkup(createElement(Component, props));
};
const before = (html, first, second) => {
  assert.ok(html.includes(first), first);
  assert.ok(html.includes(second), second);
  assert.ok(html.indexOf(first) < html.indexOf(second), `${first} precedes ${second}`);
};
const tools = { bookmarks: [], ready: true, storageWarning: false, removeBookmark: noop };

test("phone Premium puts actual terms and prices before explanations without enabling payment", () => {
  const props = { onBack: noop, previewNow: new Date("2026-10-21T12:00:00Z") };
  const mobile = render(PremiumScreen, props, true);
  before(mobile, 'class="premium-period-options"', 'class="premium-plan-grid"');
  before(mobile, 'class="premium-plan-grid"', 'class="premium-feature-section"');
  before(mobile, 'class="premium-plan-grid"', 'class="premium-period-note"');
  assert.equal((mobile.match(/<button[^>]*disabled=""/g) ?? []).length, 4);
  for (const price of [199, 299, 499]) assert.ok(mobile.includes(`${price} ₽`));
  const desktop = render(PremiumScreen, props, false);
  before(desktop, 'class="premium-feature-section"', 'class="premium-pricing"');
  before(desktop, 'class="premium-period-note"', 'class="premium-plan-grid"');
});

test("phone mistakes prioritizes filters and real empty state while preserving storage warnings", () => {
  const props = { mode: "mistakes", events: [], tools: { ...tools, storageWarning: true }, isPremium: false, onTask: noop, onTheory: noop, onPremium: noop };
  const mobile = render(StudyToolsScreen, props, true);
  before(mobile, 'class="study-tools-filters"', 'class="study-tools-checkbox"');
  before(mobile, "Подходящих ошибок пока нет", "Сохраняется только в этом браузере");
  assert.match(mobile, /role="alert"/);
  assert.doesNotMatch(mobile, /Точность ответов|Всего попыток/);
  const desktop = render(StudyToolsScreen, props, false);
  before(desktop, "Сохраняется только в этом браузере", 'class="study-tools-filters"');
});

test("phone review puts existing recommendations before collapsed method and keeps Free gated", () => {
  const props = { mode: "review", events: [], tools, isPremium: true, onTask: noop, onTheory: noop, onPremium: noop };
  const mobile = render(StudyToolsScreen, props, true);
  before(mobile, "Что повторить", '<details class="study-review-details">');
  assert.match(mobile, /Пока нет навыков с ошибками/);
  const free = render(StudyToolsScreen, { ...props, isPremium: false }, true);
  assert.match(free, /Новые похожие задачи — в Premium/);
  assert.doesNotMatch(free, /Что повторить|study-review-details/);
});

test("phone trainer leads with evidence-backed empty state, preserves explanatory content and Free gate", () => {
  const props = { state: emptyLearningState, isPremium: true, onStart: noop, onTheory: noop, onReview: noop, onPremium: noop };
  const mobile = render(TrainerScreen, props, true);
  before(mobile, "Что стоит повторить", '<details class="trainer-method-details">');
  assert.match(mobile, /Сначала немного практики/);
  assert.match(mobile, /после шести разных самостоятельных задач/);
  const desktop = render(TrainerScreen, props, false);
  before(desktop, 'class="premium-panel trainer-overview"', 'class="analytics-section"');
  assert.doesNotMatch(desktop, /trainer-method-details/);
  const free = render(TrainerScreen, { ...props, isPremium: false }, true);
  assert.match(free, /Подробнее о Premium/);
  assert.doesNotMatch(free, /Что стоит повторить|topic-results/);
});
