import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createComponentLoader } from "./component-source-loader.mjs";

const load = createComponentLoader();
const { getPublishedTheoryTopics, getTheoryTopic, getTheoryMetadata, theoryAppliesTo, parseTheoryList } = load("src/lib/theory.ts");
const { parseStoredScroll } = load("src/lib/practice-storage.ts");
const { TheoryScreen } = load("src/components/screens/theory-screen.tsx");
const noop = () => {};
const topics = getPublishedTheoryTopics();

test("one theory record keeps its body, IDs and applicable exam levels without duplicates", () => {
  assert.equal(topics.length, 108);
  assert.equal(new Set(topics.map(t => t.id)).size, topics.length);
  assert.equal(new Set(topics.map(t => t.materialId)).size, topics.length);
  for (const topic of topics) {
    const before = JSON.stringify(topic);
    const meta = getTheoryMetadata(topic);
    assert.strictEqual(meta.commonSections, topic.sections);
    assert.equal(meta.relatedPracticeTopicId, topic.id);
    assert.equal(meta.subsection.id, topic.id);
    assert(meta.section.id && meta.section.title);
    for (const exam of ["ОГЭ", "ЕГЭ"]) for (const subject of ["math", "russian", "informatics", "biology", "chemistry", "social-studies"]) {
      for (const level of ["base", "profile"]) {
        const expected = topic.subjectId === subject && topic.examType.includes(exam) &&
          (exam !== "ЕГЭ" || subject !== "math" || topic.coverage === "foundation" || (topic.level ?? "profile") === level);
        assert.equal(theoryAppliesTo(topic, exam, subject, level), expected, `${topic.id}/${exam}/${subject}/${level}`);
      }
    }
    assert.equal(JSON.stringify(topic), before, "metadata must not mutate approved content");
  }
  const shared = getTheoryMetadata(getTheoryTopic("quadratic-equations"));
  assert.equal(shared.section.id, "algebra");
  assert.deepEqual(shared.applications.map(a => [a.exam, a.level]), [["ОГЭ", undefined], ["ЕГЭ", "base"], ["ЕГЭ", "profile"]]);
  assert.equal(shared.examSections.length, 3);
  assert.equal(getTheoryTopic("trigonometric-equations").id, "ege-profile-number-13");
  assert.equal(getTheoryTopic("number-theory").id, "ege-profile-number-19");
});

test("theory list cache validates versions, bounds and independent contexts without changing progress", () => {
  assert.deepEqual(parseTheoryList(null), { query: "", part: 1, number: "", section: "" });
  const filters = { query: "уравнения", part: 2, number: "14", section: "algebra" };
  assert.deepEqual(parseTheoryList(JSON.stringify({ version: 1, ...filters })), filters);
  for (const raw of ['{"version":2}', "null", "broken", "x".repeat(5001)]) assert.throws(() => parseTheoryList(raw));
  const bounded = parseTheoryList(JSON.stringify({ version: 1, query: '"'.repeat(500), part: 3, number: "NaN", section: "<invalid>" }));
  assert.equal(bounded.query.length, 120);
  assert.equal(bounded.part, 1);
  assert.equal(bounded.number, "");
  assert.equal(bounded.section, "");
  const key = ["tochka-theory-list-v1:ЕГЭ:informatics:all", bounded.query, 1, "100", "a".repeat(32)].join("\u001f");
  assert(key.length < 250);
  const scroll = { version: 1, key, windowTop: 500, windowLeft: 0, entries: [] };
  assert.equal(parseStoredScroll(JSON.stringify(scroll)).key, key);
});

test("semantic breadcrumbs omit exam labels and shared full articles show only current exam guidance", () => {
  const topic = getTheoryTopic("quadratic-equations");
  for (const exam of ["ОГЭ", "ЕГЭ"]) for (const level of ["base", "profile"]) {
    const html = renderToStaticMarkup(createElement(TheoryScreen, {
      exam, level, subjectId: "math", topicId: topic.id, materialId: topic.materialId,
      onExamChange: noop, onOpenTopic: noop, onOpenMaterial: noop, onPractice: noop, onBack: noop, onBrowse: noop,
    }));
    const nav = html.match(/<nav class="lesson-breadcrumbs"[^>]*>(.*?)<\/nav>/s)?.[1];
    assert(nav);
    assert.match(nav, /<ol>/);
    assert.equal((nav.match(/<button/g) ?? []).length, 3);
    assert.match(nav, /aria-current="page"/);
    assert.match(nav, /Алгебра/);
    assert.doesNotMatch(nav, /ОГЭ|ЕГЭ/);
    assert.equal((html.match(/Особенности применения:/g) ?? []).length, 1);
    const selectedLabel = exam === "ОГЭ" ? "ОГЭ" : level === "base" ? "ЕГЭ база" : "ЕГЭ профиль";
    assert(html.includes(`Особенности применения: ${selectedLabel}`));
    assert.equal((html.match(/class="lesson-example"/g) ?? []).length, topic.examples.length);
    assert.doesNotMatch(html, /Подключить Плюс|premium-paywall/);
  }
});
