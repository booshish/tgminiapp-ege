import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import katex from "katex";

async function moduleURL(path, replacements = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
  });
  assert.equal(diagnostics.filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);
  let output = outputText;
  for (const [specifier, url] of Object.entries(replacements)) output = output.replace(`"${specifier}"`, `"${url}"`);
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}
const numberURL = await moduleURL("../src/lib/content/number-theory.ts");
const { numberTheoryTopics } = await import(numberURL);
const { theoryTopics, getTheoryTopic } = await import(await moduleURL("../src/lib/theory.ts", { "./content/number-theory": numberURL }));

test("Every supported exam number has its own original article and worked examples", () => {
  assert.equal(numberTheoryTopics.length, 44);
  assert.equal(theoryTopics.length, 52);
  assert.equal(new Set(theoryTopics.map((topic) => topic.id)).size, 52);
  assert.equal(new Set(theoryTopics.map((topic) => topic.materialId)).size, 52);
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
    ];
    for (const latex of all) {
      assert.doesNotThrow(() => katex.renderToString(latex, { throwOnError: true, strict: "error", trust: false }), `${topic.id}: ${latex}`);
      formulas += 1;
    }
  }
  assert(formulas >= 100);
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
