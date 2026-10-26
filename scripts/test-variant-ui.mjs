import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createComponentLoader } from "./component-source-loader.mjs";

const load = createComponentLoader();
const layout = load("src/hooks/use-phone-layout.ts");
const { CatalogScreen } = load("src/components/screens/catalog-screen.tsx");
const { VariantLaunchCard } = load("src/components/variant-launch-card.tsx");
const { MockExamScreen } = load("src/components/screens/mock-exam-screen.tsx");
const { emptyLearningState } = load("src/lib/learning-events.ts");
const { getGameSummary } = load("src/lib/gamification.ts");
const { examDefinitions } = load("src/lib/exams.ts");
const { tasks, getPracticeTaskCount } = load("src/lib/tasks.ts");
const engine = load("src/lib/mock-exam.ts");
const noop = () => {};
const game = getGameSummary(emptyLearningState.game);
const oge = examDefinitions.find((entry) => entry.examType === "ОГЭ");
const profile = examDefinitions.find((entry) => entry.level === "profile");
const now = Date.parse("2026-10-22T12:00:00Z");
const render = (Component, props, phone = false) => {
  layout.usePhoneLayout = () => phone;
  return renderToStaticMarkup(createElement(Component, props));
};
const stateOf = (...sessions) => ({ version: 1, activeId: sessions[0]?.id ?? null, sessions });
const sessionFor = (definition, id = "ui-attempt") => engine.createMockSession(id, definition, tasks, [], now, 1);
const controller = (state) => ({
  state, active: state.sessions.find((entry) => entry.id === state.activeId) ?? null,
  ready: true, now, storageWarning: false, actionError: "", start: noop, open: noop, answer: noop,
  position: noop, skip: noop, reset: noop, finish: noop, retryPublish: noop, reveal: noop, assess: noop,
});

test("catalogue puts the working full-variant entry after selection and before individual numbers on phone and tablet", () => {
  for (const definition of examDefinitions.filter((entry) => entry.available)) {
    const selection = { exam: definition.examType, subjectId: "math", level: definition.level ?? undefined, mode: "number" };
    for (const phone of [true, false]) {
      const html = render(CatalogScreen, { selection, onChange: noop, onStart: noop, onTheory: noop,
        onVariant: noop, onResumeVariant: noop, mockReady: true, mockState: engine.emptyMockState(), game }, phone);
      assert.ok(html.indexOf('class="course-picker"') < html.indexOf('class="variant-launch-card"'));
      assert.ok(html.indexOf('class="variant-launch-card"') < html.indexOf('class="segmented catalog-mode-switch"'));
      assert.ok(html.indexOf('class="variant-launch-card"') < html.indexOf('data-catalog-number="1"'));
      assert.match(html, /Начать вариант/);
      assert.equal((html.match(/<option value="[1-5]"/g) ?? []).length, engine.getMockVariants(definition, tasks).length);
      const firstCount = getPracticeTaskCount({ examType: definition.examType, subjectId: "math", level: definition.level, examNumber: 1 });
      assert.ok(html.includes(`Задач: ${firstCount} ·`));
      if (definition.level === "base") assert.doesNotMatch(html, /id="catalog-part-2"|часть 2 — самопроверка/);
    }
  }
});

test("resume card names the selected exam's saved variant and never resumes another exam", () => {
  let attempt = sessionFor(profile);
  attempt = engine.updateMockAnswer(attempt, attempt.taskIds[0], "3", now + 1);
  const state = stateOf(attempt);
  const own = render(VariantLaunchCard, { definition: profile, state, onStart: noop, onResume: noop });
  assert.match(own, /Решить вариант ЕГЭ \(профиль\)/);
  assert.match(own, /Вариант №1 · ответов 1 из 19/);
  assert.match(own, /Продолжить вариант/);
  assert.match(own, /Начать новый вариант/);
  const other = render(VariantLaunchCard, { definition: oge, state, onStart: noop, onResume: noop });
  assert.match(other, /Решить вариант ОГЭ/);
  assert.doesNotMatch(other, /Продолжить вариант|ответов 1 из 19/);
});

test("missing subject and unavailable exams offer an honest state without another exam's tasks", () => {
  const unknown = render(VariantLaunchCard, { state: engine.emptyMockState(), onStart: noop });
  assert.match(unknown, /Для выбранного экзамена пока нет полного учебного варианта/);
  assert.doesNotMatch(unknown, /Начать вариант|Решить вариант ОГЭ|Решить вариант ЕГЭ/);
  const unavailable = render(VariantLaunchCard, { definition: { ...profile, available: false }, state: engine.emptyMockState(), onStart: noop });
  assert.doesNotMatch(unavailable, />Начать вариант/);
});

test("full-variant screen restores draft and skipped status with navigation to every number", () => {
  let attempt = sessionFor(oge);
  attempt = engine.updateMockAnswer(attempt, attempt.taskIds[0], "4", now + 1);
  attempt = engine.skipMockTask(attempt, attempt.taskIds[1], now + 2);
  const mock = controller(stateOf(attempt));
  for (const phone of [true, false]) {
    const html = render(MockExamScreen, { mock, exam: "ОГЭ", onBack: noop, onOpenTheory: noop }, phone);
    assert.match(html, /Вариант №1/);
    assert.match(html, /value="4"/);
    assert.match(html, /пропущено: 1/);
    assert.match(html, /is-skipped/);
    assert.match(html, />Пропустить</);
    const navigation = html.split('aria-label="Номера учебного варианта"')[1].split("</nav>")[0];
    assert.equal((navigation.match(/<button /g) ?? []).length, oge.numbers.length);
    for (const number of oge.numbers) assert.ok(navigation.includes(`№${number.number}<`));
    assert.equal(html.includes("mock-number-disclosure"), phone);
    assert.doesNotMatch(html, /Авторский образец решения|Подтвердить самооценку/);
  }
});

test("finished extended tasks show explicit self-check points and the complete permitted scale", () => {
  let attempt = sessionFor(profile);
  const position = attempt.taskIds.findIndex((id) => tasks.find((task) => task.id === id).part === 2);
  const task = tasks.find((entry) => entry.id === attempt.taskIds[position]);
  attempt = engine.finishMockSession({ ...attempt, position }, tasks, now + 60_000);
  attempt = { ...attempt, revealedTaskIds: [task.id] };
  const html = render(MockExamScreen, { mock: controller(stateOf(attempt)), exam: "ЕГЭ", level: "profile", onBack: noop, onOpenTheory: noop }, true);
  assert.match(html, /баллы самопроверки второй части/);
  assert.match(html, /Баллы самопроверки/);
  assert.match(html, /Авторские ориентиры/);
  assert.equal((html.match(/type="radio"/g) ?? []).length, task.scoring.maxPrimaryScore + 1);
  assert.match(html, /не тестовые баллы и не прогноз экзамена/);
  assert.doesNotMatch(html, />Пропустить</);
});

test("variant list preserves earlier unfinished attempts when a new attempt exists", () => {
  const first = sessionFor(oge, "ui-old-attempt");
  const second = { ...sessionFor(profile, "ui-new-attempt"), startedAt: now + 1000, deadline: now + 1000 + 235 * 60_000 };
  const state = { ...stateOf(first, second), activeId: null };
  const html = render(MockExamScreen, { mock: controller(state), exam: "ОГЭ", onBack: noop, onOpenTheory: noop });
  assert.match(html, /Начатые варианты/);
  assert.match(html, /Ответов 0 из 25/);
  assert.match(html, /Ответов 0 из 19/);
  assert.match(html, /История вариантов/);
});

test("application renders the existing exam mode with one shared attempt controller and rejects an unknown subject route", () => {
  const appLoad = createComponentLoader();
  const navigation = appLoad("src/hooks/use-study-navigation.ts");
  const progress = appLoad("src/hooks/use-demo-progress.ts");
  const mockHook = appLoad("src/hooks/use-mock-exam.ts");
  const originalProgress = progress.useDemoProgress;
  const attempt = sessionFor(profile);
  let hookCalls = 0;
  progress.useDemoProgress = (...args) => ({ ...originalProgress(...args), ready: true });
  mockHook.useMockExam = () => { hookCalls++; return controller(stateOf(attempt)); };
  let route = { view: "mock", taskIndex: 0, exam: "ЕГЭ", level: "profile" };
  navigation.useStudyNavigation = () => ({ route, navigate: noop, back: noop });
  const { StudyApp } = appLoad("src/components/study-app.tsx");
  const html = renderToStaticMarkup(createElement(StudyApp));
  assert.equal(hookCalls, 1);
  assert.match(html, /class="mock-page"/);
  assert.match(html, /id="mock-answer"/);
  assert.match(html, /Вариант №1/);
  route = { ...route, invalidContext: true };
  const unsupported = renderToStaticMarkup(createElement(StudyApp));
  assert.match(unsupported, /Вариант недоступен/);
  assert.doesNotMatch(unsupported, /class="mock-page"|id="mock-answer"/);
});
