import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createComponentLoader } from "./component-source-loader.mjs";

const load = createComponentLoader();
const layout = load("src/hooks/use-phone-layout.ts");
const { ProfileScreen } = load("src/components/screens/profile-screen.tsx");
const { TheoryScreen } = load("src/components/screens/theory-screen.tsx");
const { TaskScreen } = load("src/components/task-screen.tsx");
const { StudyApp } = load("src/components/study-app.tsx");
const { emptyLearningState } = load("src/lib/learning-events.ts");
const { emptyTaskState } = load("src/lib/practice.ts");
const { tasks } = load("src/lib/tasks.ts");
const noop = () => {};
function render(Component, props, phone = true) {
  layout.usePhoneLayout = () => phone;
  return renderToStaticMarkup(createElement(Component, props));
}
function ordered(html, labels) {
  let previous = -1;
  for (const label of labels) {
    const position = html.indexOf(label, previous + 1);
    assert.ok(position > previous, `Expected ${label} after previous item`);
    previous = position;
  }
}

test("phone More keeps study tools; workspace has eight core sections and no standalone review", () => {
  const menu = (phone) => render(StudyApp, {}, phone).split('aria-label="Дополнительные разделы"')[1].split('</nav>')[0];
  ordered(menu(true), ["Мои ошибки", "Избранное", "Учебный вариант", "Профиль", "Мой тренер", "Помощь и объяснения", "Плюс"]);
  ordered(menu(false), ["Мой тренер", "Профиль", "Избранное", "Мои ошибки", "Учебный вариант", "Помощь и объяснения", "Плюс"]);
  assert.equal((menu(true).match(/class="menu-premium-label"/g) ?? []).length, 1);
  const html = render(StudyApp, {}, false);
  const desktop = html.split('aria-label="Основная навигация"')[1].split('</nav>')[0];
  ordered(desktop, ["Главная", "Задания", "Теория", "Конспекты", "Мой тренер", "Мои ошибки", "Профиль", "Плюс"]);
  assert.equal((desktop.match(/<button /g) ?? []).length, 8);
  assert.doesNotMatch(desktop + menu(true), /Умное повторение/);
});

test("phone profile settings precede subscription and help with exactly two theme choices", () => {
  const props = { state: emptyLearningState, isPremium: false, demoAllowed: false, onToggleDemo: noop, onExamChange: noop, onFontScale: noop, onThemeChange: noop, onFocusModeChange: noop, onBreakReminderChange: noop, onHelp: noop, onClear: noop, onPremium: noop };
  const phone = render(ProfileScreen, props);
  ordered(phone, ["Гостевой профиль", ">Настройки<", ">Оформление<", "Режим концентрации", "Напоминания о перерыве", ">Подписка «Плюс»<", "Помощь и объяснения", "Данные на устройстве"]);
  const themes = phone.split('aria-label="Тема оформления"')[1].split('</div>')[0];
  assert.equal((themes.match(/<button/g) ?? []).length, 2);
  assert.match(themes, /Светлая/);
  assert.match(themes, /Тёмная/);
  ordered(render(ProfileScreen, props, false), ["Помощь и объяснения", "Гостевой профиль", ">Настройки<"]);
});

test("phone theory search precedes exam choices without changing the tablet hierarchy", () => {
  const props = { exam: "ЕГЭ", onExamChange: noop, onOpenTopic: noop, onOpenMaterial: noop, onPractice: noop, onBack: noop };
  ordered(render(TheoryScreen, props), ['type="search"', 'class="course-picker"', "Часть 1"]);
  ordered(render(TheoryScreen, props, false), ['class="course-picker"', 'type="search"', "Часть 1"]);
});

test("phone task keeps solutions private until requested and moves navigation below the opened answer", () => {
  const task = tasks.find((item) => item.id === "ege-profile-triangle-twelve-nine");
  assert.ok(task);
  const props = { task, exam: "ЕГЭ", levelLabel: "Профиль", examNumber: 1, topicTitle: "Геометрия", value: emptyTaskState(), onChange: noop, onAnswer: noop, onSolutionViewed: noop, onNext: noop, canNext: true, onPrevious: noop, canPrevious: false, onBack: noop, maxPrimaryScore: 1 };
  const fresh = render(TaskScreen, props);
  assert.doesNotMatch(fresh, /Посмотреть решение|task-final-answer|task-solution-panel|Решить заново|Подсказка/);
  const checked = { ...props, value: { ...props.value, answer: "99", attempt: { id: "check-1", correct: false } } };
  const incorrect = render(TaskScreen, checked);
  assert.match(incorrect, /button-primary task-solution-button/);
  assert.doesNotMatch(incorrect, /task-final-answer/);
  const opened = { ...checked, value: { ...checked.value, solutionViewed: true, solutionVisible: true } };
  const mobile = render(TaskScreen, opened);
  ordered(mobile, ['class="task-final-answer"', "Следующее задание", "Предыдущее задание"]);
  assert.equal((mobile.match(/Следующее задание/g) ?? []).length, 1);
  ordered(render(TaskScreen, opened, false), ["Следующее задание", "Предыдущее задание", 'class="task-final-answer"']);
});
