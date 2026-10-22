import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import { createContentLoader } from "./content-source-loader.mjs";

const load = createContentLoader();
const { numberTheoryTopics } = load("src/lib/content/number-theory.ts");
const { theoryTopics, getTheoryTopic } = load("src/lib/theory.ts");
const { knowledgeChecks } = load("src/lib/content/knowledge-checks.ts");

test("Every supported exam number has its own original article and worked examples", () => {
  assert.equal(numberTheoryTopics.length, 44);
  const baseTopics = theoryTopics.filter((topic) => topic.id.startsWith("ege-base-number-"));
  assert.equal(theoryTopics.length - baseTopics.length, 52);
  assert.equal(new Set(theoryTopics.map((topic) => topic.id)).size, theoryTopics.length);
  assert.equal(new Set(theoryTopics.map((topic) => topic.materialId)).size, theoryTopics.length);
  for (const [exam, prefix, count, firstEnd] of [["ОГЭ", "oge", 25, 19], ["ЕГЭ", "ege-profile", 19, 12]]) {
    for (let n = 1; n <= count; n += 1) {
      const topic = getTheoryTopic(`${prefix}-number-${n}`);
      assert(topic, `${exam} №${n}`);
      assert.deepEqual(topic.examType, [exam]);
      assert.deepEqual(topic.examNumbers, [n]);
      assert.equal(topic.part, n <= firstEnd ? 1 : 2);
      assert.equal(topic.coverage, "exam-topic");
      assert.equal(topic.source.kind, "author");
      assert(topic.sections.length >= 2);
      assert(topic.examples.length >= 2);
      for (const section of topic.sections) assert(section.body.join(" ").length > 70, `${topic.id}: ${section.title}`);
      for (const example of topic.examples) {
        assert(example.steps.length >= 2, `${topic.id}: ${example.title}`);
        assert(example.answer.length > 0);
      }
      assert(topic.difficulties.length >= 2);
    }
  }
});

test("Theory prerequisites are resolvable, acyclic and legacy topics remain linked", () => {
  for (const root of theoryTopics) {
    function visit(topic, ancestors) {
      assert(!ancestors.has(topic.id), `Cycle at ${topic.id}`);
      const next = new Set([...ancestors, topic.id]);
      for (const id of topic.prerequisites) {
        const related = getTheoryTopic(id);
        assert(related, `${topic.id} -> ${id}`);
        visit(related, next);
      }
    }
    visit(root, new Set());
  }
  assert.equal(getTheoryTopic("trigonometric-equations").id, "ege-profile-number-13");
  assert.equal(getTheoryTopic("number-theory").id, "ege-profile-number-19");
  assert.equal(getTheoryTopic("unknown"), undefined);
});

test("Every formula in all articles renders with strict KaTeX without unsafe HTML", () => {
  let formulas = 0;
  for (const topic of theoryTopics) {
    const all = [
      ...topic.sections.flatMap((section) => section.formulas ?? []),
      ...topic.examples.flatMap((example) => example.steps.flatMap((step) => step.latex ? [step.latex] : [])),
      ...(topic.knowledgeChecks ?? []).flatMap((check) => check.latex ? [check.latex] : []),
    ];
    for (const latex of all) {
      assert.doesNotThrow(() => katex.renderToString(latex, { throwOnError: true, strict: "error", trust: false }), `${topic.id}: ${latex}`);
      formulas += 1;
    }
  }
  assert(formulas >= 100);
});

test("All 52 foundational, OGE and profile articles have substantive original self-check questions", () => {
  assert.equal(Object.keys(knowledgeChecks).length, 52);
  for (const [id, checks] of Object.entries(knowledgeChecks)) {
    const topic = getTheoryTopic(id);
    assert(topic, `Self-check points at a missing article: ${id}`);
    assert.deepEqual(topic.knowledgeChecks, checks, `Self-check was not attached to ${id}`);
    assert(checks.length >= 1);
    for (const check of checks) {
      assert(check.question.trim().length >= 25, `${id}: short question`);
      assert(check.answer.trim().length > 0, `${id}: empty answer`);
      assert(check.explanation.trim().length >= 25, `${id}: missing reasoning`);
      assert.notEqual(check.explanation.trim(), check.answer.trim(), `${id}: explanation only repeats the answer`);
      assert(!/заглушка|TODO|будет добавлено/i.test(JSON.stringify(check)), id);
    }
  }
});

test("Self-check mathematics: independent counting, geometry and percentage calculations match the answers", () => {
  const answer = (id) => knowledgeChecks[id][0].answer;
  assert.equal(125 * 0.8, 100); // Follow changes from an actual 100-unit starting price.
  assert.equal(answer("percentages"), "Вернулась к начальной цене.");
  assert.equal((6 + 2) / 6, 4 / 3);
  assert.equal(answer("fractions"), "Нет; 4/3.");
  assert.equal(4 * 250 / 100, 10);
  assert.equal(answer("oge-number-1"), "10 м.");
  assert.equal((3 * 2) * (5 * 2), 60);
  assert.equal(answer("oge-number-2"), "60 м².");
  assert.equal(14 * 20 - 70 - 18, 192);
  assert.equal(answer("oge-number-3"), "192 м².");
  const multiples = Array.from({ length: 20 }, (_, index) => index + 1).filter((value) => value % 4 === 0);
  assert.equal(multiples.length / 20, 0.25);
  assert.equal(answer("oge-number-10"), "0,25.");
  assert.equal(Math.hypot(5, 12), 13);
  assert.equal(answer("geometry"), "5/13.");
  const outcomes = [];
  for (let first = 0; first < 10; first++) for (let second = 0; second < 10; second++)
    outcomes.push((first < 4) !== (second < 5));
  assert.equal(outcomes.filter(Boolean).length / outcomes.length, 0.5);
  assert.equal(answer("ege-profile-number-5"), "0,5.");
  assert.equal((180 + 120) / (180 / 60 + 120 / 40), 50);
  assert.equal(answer("ege-profile-number-10"), "50 км/ч.");
  const squareResidues = new Set(Array.from({ length: 8 }, (_, value) => (value * value) % 4));
  assert.deepEqual([...squareResidues].sort(), [0, 1]);
  for (const a of squareResidues) for (const b of squareResidues) assert.notEqual((a + b) % 4, 3);
  assert.equal(answer("ege-profile-number-19"), "Нет.");
});

test("Numerical examples and advanced boundary cases agree with independent calculations", () => {
  const exact = (id, index, expected) => assert.equal(getTheoryTopic(id).examples[index].answer, expected);
  exact("oge-number-2", 0, `Путь ${6 + 8} км; расстояние ${Math.hypot(6, 8)} км`);
  exact("oge-number-3", 1, `${Math.ceil(10 * 1.1 / 2)} упаковок`);
  exact("oge-number-4", 1, `${6000 * 0.85 + 400} ₽`);
  exact("oge-number-5", 1, `На ${Math.ceil(7000 / 600)}-м месяце`);
  exact("oge-number-14", 0, String(3 + 7 * 4));
  exact("oge-number-14", 1, String(2 * 3 ** 4));
  exact("oge-number-16", 1, String(Math.sqrt(13 ** 2 - 5 ** 2)));
  exact("oge-number-17", 0, String((6 + 10) / 2 * 4));
  exact("oge-number-18", 0, String(Math.hypot(4 - 1, 6 - 2)));
  exact("oge-number-21", 1, `${1 / (1 / 6 + 1 / 3)} ч`);
  exact("oge-number-25", 0, String((9 * 12 / 2) / ((9 + 12 + 15) / 2)));
  exact("ege-profile-number-1", 0, String(5 * 8 * 0.5 / 2));
  exact("ege-profile-number-2", 1, String(2 * 3 - 4));
  exact("ege-profile-number-3", 0, `Объём ${18 * 5 / 3}`);
  exact("ege-profile-number-5", 0, String(1 - 0.1 * 0.2).replace(".", ","));
  exact("ege-profile-number-9", 0, String(Math.sqrt(20 * 45)));
  exact("ege-profile-number-10", 1, `${1 / (1 / 12 + 1 / 6)} ч`);
  exact("ege-profile-number-17", 0, `PD = ${3 * 8 / 4}`);
  exact("ege-profile-number-17", 1, `PT = ${Math.sqrt(4 * (4 + 5))}`);
  // Check the full integer solution set, not just one convenient pair.
  const pairs = [];
  for (let x = 1; x <= 8; x += 1) for (let y = 1; y <= 8; y += 1) if (x * y - x - y === 5) pairs.push(`(${x};${y})`);
  exact("ege-profile-number-19", 0, pairs.join(", "));
  for (let x = -10; x <= 10; x += 1) for (let y = -10; y <= 10; y += 1) assert.notEqual(x * x + y * y, 7);
  // One-root parameter example: linear degeneration and the double-root case are both included.
  const oneRootParameters = [];
  for (let a = -8; a <= 8; a += 1) if (a === 1 || 8 - 4 * a === 0) oneRootParameters.push(a);
  assert.deepEqual(oneRootParameters, [1, 2]);
  exact("ege-profile-number-18", 1, "a = 1 или a = 2");
  // Interval boundary must exclude the pole and include the numerator zero.
  for (const x of [-5, -2.1, -1.5, 0, 1, 1.1, 5]) assert.equal((x - 1) / (x + 2) <= 0, x > -2 && x <= 1);
  exact("oge-number-20", 1, "(−2; 1]");
});
