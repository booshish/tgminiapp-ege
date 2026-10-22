import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import { createContentLoader } from "./content-source-loader.mjs";

const load = createContentLoader();
const { baseTheoryTopics } = load("src/lib/content/base-theory.ts");
const { theoryTopics } = load("src/lib/theory.ts");
const topicIds = new Set(theoryTopics.map(topic => topic.id));

test("База: все 21 номера имеют отдельную содержательную теорию, примеры, связи и самопроверку", () => {
  assert.equal(baseTheoryTopics.length, 21);
  assert.equal(new Set(baseTheoryTopics.map(topic => topic.id)).size, 21);
  for (let number = 1; number <= 21; number++) {
    const topic = baseTheoryTopics.find(entry => entry.id === `ege-base-number-${number}`);
    assert(topic, `Missing theory for ${number}`);
    assert.deepEqual(topic.examNumbers, [number]);
    assert.deepEqual(topic.examType, ["ЕГЭ"]);
    assert.equal(topic.level, "base"); assert.equal(topic.part, 1);
    assert.equal(topic.source.kind, "author");
    assert(topic.sections.length >= 3);
    assert(topic.sections.some(section => section.title === "Самопроверка"));
    assert(topic.sections.flatMap(section => section.body).join(" ").split(/\s+/).length > 85, topic.id);
    assert(topic.examples.length >= 2);
    for (const example of topic.examples) assert(example.title && example.answer && example.steps.length >= 2, topic.id);
    assert(topic.difficulties.length >= 2);
    assert(topic.knowledgeChecks.length >= 1);
    for (const check of topic.knowledgeChecks) assert(check.question.length > 20 && check.answer && check.explanation.length > 35, topic.id);
    for (const prerequisite of topic.prerequisites) assert(topicIds.has(prerequisite), `${topic.id}: unresolved ${prerequisite}`);
    assert(theoryTopics.some(entry => entry.id === topic.id), `Not integrated ${topic.id}`);
  }
});

test("База: числовые самопроверки пересчитаны, логические ответы сохраняют смысл и ограничения", () => {
  const answer = number => baseTheoryTopics.find(topic => topic.examNumbers[0] === number).knowledgeChecks[0].answer;
  const includes = (number, value) => assert(answer(number).includes(String(value).replace(".", ",")), `Invalid check ${number}: ${answer(number)}`);
  includes(1, Math.ceil(29 / 6));
  includes(2, 84 / 28);
  includes(3, (8 + 12 + 16 + 4) / 4);
  assert.equal(Math.min(6 * 400 + 500, 6 * 450), 2700);
  includes(4, 6 * 450); assert(answer(4).startsWith("B"));
  includes(5, 9 / 12);
  includes(6, (26 - 10) / 2);
  assert(answer(7).includes("минимум"));
  assert.equal(answer(8), "Нет.");
  includes(9, 2 * (2 + 5) * 300 / 100);
  includes(10, (180 - 44) / 2);
  includes(11, 3 ** 2);
  includes(12, 48 * 2 / 12);
  includes(13, 18 * 3);
  includes(14, 3 / 8 + 0.125);
  includes(15, 960 / (1 - 0.2));
  assert(answer(16).includes("≠ 4"));
  const quadraticRoots = [];
  for (let x = -10; x < 20; x++) if (x * x - 9 * x + 20 === 0) quadraticRoots.push(x);
  includes(17, Math.max(...quadraticRoots));
  assert(answer(18).includes("x > −3"));
  const digits = Array.from({ length: 90 }, (_, i) => i + 10).filter(n => Math.floor(n / 10) + n % 10 === 11 && Math.floor(n / 10) - n % 10 === 5);
  assert.equal(digits.length, 1); includes(19, digits[0]);
  includes(20, 1 / (1 / 5 + 1 / 20));
  const codes = [];
  for (const a of [2, 4, 6, 8]) for (const b of [2, 4, 6, 8]) if (a !== b) codes.push(`${a}${b}`);
  includes(21, codes.length);
});

test("База: все формулы теории и примеров проходят строгий рендер KaTeX", () => {
  for (const topic of baseTheoryTopics) {
    const formulas = [...topic.sections.flatMap(section => section.formulas ?? []),
      ...topic.examples.flatMap(example => example.steps.flatMap(step => step.latex ? [step.latex] : [])),
      ...topic.knowledgeChecks.flatMap(check => check.latex ? [check.latex] : [])];
    assert(formulas.length > 0, topic.id);
    for (const formula of formulas) assert.doesNotThrow(() => katex.renderToString(formula, { strict: "error", throwOnError: true }), topic.id);
  }
});
