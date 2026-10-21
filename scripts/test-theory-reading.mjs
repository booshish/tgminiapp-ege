import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createComponentLoader } from "./component-source-loader.mjs";

const load = createComponentLoader();
const { TheoryScreen } = load("src/components/screens/theory-screen.tsx");
const { BookmarkButton } = load("src/components/bookmark-button.tsx");
const { getTheoryTopic } = load("src/lib/theory.ts");
const noop = () => {};
function renderTheory({ full = false, saved = false, focusMode = false, id = "ege-profile-number-13" } = {}) {
  const topic = getTheoryTopic(id);
  return renderToStaticMarkup(createElement(TheoryScreen, {
    exam: "ЕГЭ", topicId: topic.id, materialId: full ? topic.materialId : undefined,
    focusMode, bookmarked: saved, onBookmark: noop,
    onExamChange: noop, onOpenTopic: noop, onOpenMaterial: noop, onPractice: noop, onBack: noop,
  }));
}

test("theory bookmark belongs to the reading card header, not back navigation, in both material views", () => {
  for (const full of [false, true]) {
    const html = renderTheory({ full });
    const card = html.indexOf(`class="${full ? "topic-lesson" : "topic-overview-card"}"`);
    const header = html.indexOf('class="theory-card-header"');
    const bookmark = html.indexOf('class="bookmark-button"');
    const headerEnd = html.indexOf("</header>", header);
    assert.ok(card > html.indexOf('class="back-link"'));
    assert.ok(header > card && bookmark > header && bookmark < headerEnd);
    assert.equal((html.match(/class="bookmark-button"/g) ?? []).length, 1);
    assert.match(html.slice(header, headerEnd), /Сохранить в избранное/);
    assert.match(html.slice(header, headerEnd), /aria-pressed="false"/);
  }
});

test("saved theory exposes pressed state, a filled bookmark and removal action without renaming task bookmarks", () => {
  for (const full of [false, true]) {
    const html = renderTheory({ full, saved: true });
    assert.match(html, /aria-pressed="true"/);
    assert.match(html, /Сохранено — убрать из избранного/);
    assert.match(html, /fill="currentColor"/);
    assert.match(html, /<span>Сохранено<\/span>/);
  }
  const taskBookmark = renderToStaticMarkup(createElement(BookmarkButton, { active: true, onClick: noop }));
  assert.match(taskBookmark, /В избранном — убрать/);
});

test("compact source disclosure retains authorship and part-two caveats; full theory still renders math and examples", () => {
  const topic = getTheoryTopic("ege-profile-number-13");
  for (const focusMode of [false, true]) {
    const html = renderTheory({ full: true, focusMode });
    assert.match(html, /<details class="lesson-intro-note lesson-source-details">/);
    assert.doesNotMatch(html, /<details[^>]*open/);
    assert.match(html, /Это не официальный материал ФИПИ/);
    assert.match(html, /официальные критерии здесь не воспроизводятся/);
    assert.match(html, /class="katex-mathml"/);
    assert.doesNotMatch(html, /class="katex-error"/);
    assert.equal((html.match(/class="lesson-example"/g) ?? []).length, topic.examples.length);
    for (const section of topic.sections) assert.ok(html.includes(section.title));
  }
});
