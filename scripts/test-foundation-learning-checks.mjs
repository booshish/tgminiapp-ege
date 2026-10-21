import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import { createContentLoader } from "./content-source-loader.mjs";

const load = createContentLoader();
const { foundationLearningChecks: content } = load("src/lib/content/foundation-learning-checks.ts");
const ids = ["fractions", "decimals", "percentages", "linear-equations", "quadratic-equations", "powers-roots", "geometry", "probability"];
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const fraction = (a, b) => { a = BigInt(a); b = BigInt(b); assert.notEqual(b, 0n); const d = gcd(a, b); return b / d === 1n ? String(a / d) : `${a / d}/${b / d}`; };
const decimal = (value) => String(value).replace(".", ",");
const example = (topic, index, expected) => assert.equal(content[topic].examples[index].answer, expected);
const check = (topic, index, expected) => assert.equal(content[topic].checks[index].answer, expected);

// These expected values are calculated independently of the authored answers.
// No test uses the app's answer as input to the same answer checker.
test("All eight foundation enrichments have two new examples, two questions and readable original explanations", () => {
  assert.deepEqual(Object.keys(content), ids);
  const questionIds = new Set();
  const titles = new Set();
  for (const [topicId, item] of Object.entries(content)) {
    assert.ok(item.summary.length >= 90, topicId);
    assert.equal(item.algorithm.length, 4);
    assert.equal(item.examples.length, 2);
    assert.equal(item.checks.length, 2);
    for (const worked of item.examples) {
      assert.ok(!titles.has(worked.title), worked.title); titles.add(worked.title);
      assert.ok(worked.steps.length >= 3 && worked.steps.length <= 4, worked.title);
      assert.ok(worked.answer.trim());
      for (const step of worked.steps) assert.ok(step.text.length > 25);
    }
    for (const question of item.checks) {
      assert.ok(!questionIds.has(question.id)); questionIds.add(question.id);
      assert.ok(question.question.trim() && question.explanation.trim(), question.id);
      assert.ok(question.answer.length > 0);
    }
    assert.equal("examNumber" in item, false);
    assert.equal("maxPrimaryScore" in item, false);
  }
  assert.equal(questionIds.size, 16);
});

test("Fractions and decimal examples/checks agree with exact scaled-integer arithmetic", () => {
  // 3/4 minus (2/5)*(3/4), independently subtracting the used amount.
  example("fractions", 0, `${fraction(3n * 5n - 2n * 3n, 4n * 5n)} л`);
  assert.ok(-5n * 12n < -7n * 8n);
  example("fractions", 1, "−5/8 < −7/12");
  check("fractions", 0, fraction(2n * 9n, 3n * 4n));
  check("fractions", 1, fraction(5n * 3n, 4n));
  // Lengths in centimetres produce area in cm², then convert to m².
  const areaSquareCentimetres = 325 * 40;
  example("decimals", 0, `${decimal(areaSquareCentimetres / 10_000)} м²`);
  example("decimals", 1, String((-240 + 175 - (-65)) / 100));
  check("decimals", 0, String(7 * 1000 / 100));
  check("decimals", 1, String(48 / 6));
});

test("Percent changes use the right base and inverse calculations return the original price", () => {
  const initial = 800;
  const raised = initial + initial * 25 / 100;
  const discounted = raised - raised * 20 / 100;
  example("percentages", 0, `${discounted} ₽`);
  assert.equal(raised, 1000);
  const beforeDiscount = 1020 * 100 / (100 - 15);
  example("percentages", 1, `${beforeDiscount} ₽`);
  assert.equal(beforeDiscount - beforeDiscount * 15 / 100, 1020);
  check("percentages", 0, String(40 * 25 / 100));
  check("percentages", 1, String(9 * 100 / 15));
});

test("Linear examples and questions preserve solution sets, including contradiction and identity", () => {
  // Six times the original left side minus right side is 3x - 27.
  const root = 27 / 3;
  assert.equal((root - 2) / 3 + (root + 1) / 6, 4);
  example("linear-equations", 0, `x = ${root}`);
  // Both coefficients are 4 but constants are different: no root can help.
  assert.equal(4 - 4, 0); assert.notEqual(-4 - 3, 0);
  example("linear-equations", 1, "Решений нет");
  const checkedRoot = (9 - 7 + 2 * 3) / 2;
  assert.equal(7 - 2 * (3 - checkedRoot), 9);
  check("linear-equations", 0, `x = ${checkedRoot}`);
  // Polynomial coefficient equality proves the identity for every real x.
  assert.deepEqual([3, 3 * 2], [3, 6]);
  check("linear-equations", 1, "Любое действительное число");
});

test("Quadratic examples keep zero roots and reject negative geometric lengths", () => {
  const roots = [0, 12 / 3];
  roots.forEach(x => assert.equal(3 * x * x - 12 * x, 0));
  example("quadratic-equations", 0, `x = ${roots[0]} или x = ${roots[1]}`);
  // Solve by the discriminant independently of the displayed factorization.
  const discriminant = 3 ** 2 - 4 * (-40);
  const rectangleRoots = [(-3 - Math.sqrt(discriminant)) / 2, (-3 + Math.sqrt(discriminant)) / 2];
  assert.deepEqual(rectangleRoots, [-8, 5]);
  const widths = rectangleRoots.filter(x => x > 0 && x + 3 > 0);
  assert.equal(widths.length, 1); assert.equal(widths[0] * (widths[0] + 3), 40);
  example("quadratic-equations", 1, `${widths[0]} см и ${widths[0] + 3} см`);
  assert.ok(0 ** 2 - 4 * 1 * 4 < 0);
  check("quadratic-equations", 0, "0");
  const repeatedRoot = 6 / 2;
  assert.equal(repeatedRoot ** 2 - 6 * repeatedRoot + 9, 0);
  assert.equal((-6) ** 2 - 4 * 1 * 9, 0);
  check("quadratic-equations", 1, `x = ${repeatedRoot}, один различный корень`);
});

test("Power and root transformations respect signs, domains and exact coefficients", () => {
  assert.equal(50 / 2, 25); assert.equal(8 / 2, 4);
  const coefficient = Math.sqrt(25) - Math.sqrt(4);
  example("powers-roots", 0, `${coefficient}√2`);
  assert.ok(Math.abs((Math.sqrt(50) - Math.sqrt(8)) - coefficient * Math.sqrt(2)) < 1e-12);
  example("powers-roots", 1, fraction(1n + 2n, 8n));
  assert.equal(2 ** -3 + 4 ** -1, 3 / 8);
  check("powers-roots", 0, String(-(3 ** 2) + (-3) ** 2));
  check("powers-roots", 1, String(Math.sqrt((1 - 4) ** 2)));
});

test("Geometry examples satisfy metric and unit constraints; similarity uses squared scale", () => {
  const c = 17, a = 8, b = Math.sqrt(c ** 2 - a ** 2);
  assert.ok(b > 0 && b < c && a + b > c);
  assert.equal(a * a + b * b, c * c);
  // Independent Heron calculation rather than just repeating ab/2.
  const s = (a + b + c) / 2;
  const heron = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  example("geometry", 0, `${heron} см²`);
  // A valid small right triangle with sides6/8 has area24; scale both coordinates.
  const x = 8 * 3 / 2, y = 6 * 3 / 2;
  example("geometry", 1, `${x * y / 2} см²`);
  assert.ok(3 + 4 > 6); assert.notEqual(3 ** 2 + 4 ** 2, 6 ** 2);
  check("geometry", 0, "Нет");
  const areaCentimetres = 80 * 30 / 2;
  check("geometry", 1, `${decimal(areaCentimetres / 10_000)} м²`);
});

test("Probability examples and questions agree with exhaustive elementary-outcome counts", () => {
  const coins = ["О", "Р"].flatMap(a => ["О", "Р"].map(b => [a, b]));
  const oneHead = coins.filter(pair => pair.filter(face => face === "О").length === 1).length;
  example("probability", 0, fraction(oneHead, coins.length));
  const balls = ["w1", "w2", "w3", "w4", "b1", "b2"];
  const pairs = balls.flatMap(a => balls.filter(b => b !== a).map(b => [a, b]));
  const blackPairs = pairs.filter(pair => pair.every(ball => ball.startsWith("b"))).length;
  example("probability", 1, fraction(blackPairs, pairs.length));
  const die = [1, 2, 3, 4, 5, 6];
  check("probability", 0, fraction(die.filter(n => n % 3 !== 0).length, die.length));
  const replacementBalls = ["r1", "r2", "r3", "b1"];
  const replacementPairs = replacementBalls.flatMap(a => replacementBalls.map(b => [a, b]));
  const redPairs = replacementPairs.filter(pair => pair.every(ball => ball.startsWith("r"))).length;
  check("probability", 1, fraction(redPairs, replacementPairs.length));
  for (const [success, count] of [[oneHead, coins.length], [blackPairs, pairs.length], [redPairs, replacementPairs.length]]) {
    assert.ok(success >= 0 && success <= count && count > 0);
  }
});

test("All new mathematical notation renders safely in strict KaTeX", () => {
  let count = 0;
  for (const item of Object.values(content)) {
    for (const latex of [
      ...item.examples.flatMap(example => example.steps.flatMap(step => step.latex ? [step.latex] : [])),
      ...item.checks.flatMap(check => check.latex ? [check.latex] : []),
    ]) {
      assert.doesNotThrow(() => katex.renderToString(latex, { throwOnError: true, strict: "error", trust: false }), latex);
      count++;
    }
  }
  assert.ok(count >= 20);
});
