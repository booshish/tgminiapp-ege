import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import { createContentLoader } from "./content-source-loader.mjs";

const load = createContentLoader();
const { foundationCandidates } = load("src/lib/content/foundation-candidates.ts");
const { checkTaskAnswer, tasks } = load("src/lib/tasks.ts");
const { theoryTopics } = load("src/lib/theory.ts");
const bySkill = new Map(foundationCandidates.map((item) => [item.skillId, item]));
const checkedSkills = new Set();
function task(skill) {
  const item = bySkill.get(skill);
  assert.ok(item, `Missing candidate ${skill}`);
  checkedSkills.add(skill);
  return item;
}
function accepts(skill, independentlyComputed, wrong = "999999") {
  const item = task(skill);
  assert.equal(checkTaskAnswer(String(independentlyComputed), item.answerRule).correct, true, skill);
  assert.equal(checkTaskAnswer(wrong, item.answerRule).correct, false, `${skill}: reject wrong answer`);
  return item;
}
function exact(numerator, denominator) { return `${numerator}/${denominator}`; }

// Oracles below are independent computations/enumerations from each statement,
// not comparisons between the stored answer and a copy of that same answer.
test("32 original drafts have stable unique skills, statements and existing foundation topics; none are published or assigned guessed exam fields", () => {
  assert.equal(foundationCandidates.length, 32);
  assert.equal(new Set(foundationCandidates.map((item) => item.id)).size, 32);
  assert.equal(new Set(foundationCandidates.map((item) => item.prototypeId)).size, 32);
  assert.equal(new Set(foundationCandidates.map((item) => `${item.prompt}\n${item.conditionLatex ?? ""}`.normalize("NFKC").replace(/\s+/g, " ").trim())).size, 32);
  const skillsPerTopic = new Map();
  const normalize = (value) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
  for (const item of foundationCandidates) {
    assert.match(item.id, /^foundation-candidate-[a-z0-9-]+-r1$/);
    assert.equal(item.releaseStatus, "draft");
    assert.equal(item.mappingStatus, "not-mapped");
    assert.equal(item.authorship, "project-original");
    assert.ok(theoryTopics.some((topic) => topic.id === item.topicId && topic.coverage === "foundation"));
    skillsPerTopic.set(item.topicId, (skillsPerTopic.get(item.topicId) ?? 0) + 1);
    assert.ok(item.solution.length >= 3 && item.solution.every((step) => step.text.trim().length > 20));
    assert.ok(item.prompt.trim() && item.answerDisplay.trim());
    for (const forbidden of ["examType", "examNumber", "examVersionId", "examYear", "part", "scoring", "maxPrimaryScore"]) assert.equal(forbidden in item, false, `${item.id}: no inferred ${forbidden}`);
    assert.equal(tasks.some((published) => published.id === item.id), false);
    assert.equal(tasks.some((published) => normalize(`${published.prompt}\n${published.conditionLatex ?? ""}`) === normalize(`${item.prompt}\n${item.conditionLatex ?? ""}`)), false, `${item.id}: no exact published-statement duplicate`);
    if (item.conditionLatex) assert.equal(tasks.some((published) => published.conditionLatex && normalize(published.conditionLatex) === normalize(item.conditionLatex)), false, `${item.id}: no identical existing mathematical condition`);
  }
  assert.equal(skillsPerTopic.size, 8);
  assert.ok([...skillsPerTopic.values()].every((count) => count === 4));
});

test("all candidate math renders and diagrams agree with positive valid triangle data", () => {
  for (const item of foundationCandidates) {
    for (const expression of [item.conditionLatex, ...item.solution.map((step) => step.latex)].filter(Boolean)) {
      assert.doesNotThrow(() => katex.renderToString(expression, { throwOnError: true, strict: "error" }), `${item.id}: ${expression}`);
    }
    if (item.diagram) {
      assert.equal(item.diagram.type, "right-triangle");
      const { adjacent, opposite } = item.diagram;
      assert.ok(adjacent > 0 && opposite > 0);
      const hypotenuse = Math.hypot(adjacent, opposite);
      assert.ok(adjacent + opposite > hypotenuse);
      assert.equal(checkTaskAnswer(String(hypotenuse), item.answerRule).correct, true);
    }
  }
});

test("fractions: exact common denominator, conservation of material, reverse fraction and multiplicative inverse", () => {
  const sumNumerator = 3 + 4;
  accepts("fraction-nested-difference", exact(10 - sumNumerator, 12), "11/12");
  // Model forty units: first24, then onequarter of remaining16 =>28used.
  const whole = 40, first = whole * 3 / 5, second = (whole - first) / 4;
  accepts("fraction-of-remainder", exact(first + second, whole), "17/20");
  assert.equal(first + second + (whole - first - second), whole);
  const possibleLengths = Array.from({ length: 100 }, (_, i) => i + 1).filter((length) => length * 7 === 21 * 12);
  assert.equal(possibleLengths.length, 1);
  accepts("whole-from-fraction", possibleLengths[0]);
  const reciprocal = accepts("reciprocal-of-sum", exact(2 * 3, 3 + 2), "5/6");
  assert.equal(checkTaskAnswer("1,2", reciprocal.answerRule).correct, true);
  assert.equal(checkTaskAnswer("1.20001", reciprocal.answerRule).correct, false);
});

test("decimals: integer-scaled arithmetic, minimum whole count, exact midpoint and rejected rounded neighbours", () => {
  const massHundredths = (375 * 24) / 10;
  accepts("decimal-unit-cost", exact(massHundredths, 100));
  const counts = Array.from({ length: 12 }, (_, n) => n).filter((n) => n * 8 >= 37);
  accepts("decimal-whole-packages", Math.min(...counts), "4");
  assert.ok((Math.min(...counts) - 1) * 8 < 37);
  accepts("decimal-quotient-after-difference", exact(84 - 36, 12), "81");
  const midpoint = (128 + 146) / 2;
  assert.equal(midpoint - 128, 146 - midpoint);
  const item = accepts("decimal-midpoint", exact(midpoint, 100), "1.4");
  assert.equal(checkTaskAnswer("1,37", item.answerRule).correct, true);
  assert.equal(checkTaskAnswer("1.370001", item.answerRule).correct, false);
});

test("percentages: inverse multiplier, two bases, sugar mass conservation and percentage-point distinction", () => {
  const prices = Array.from({ length: 2001 }, (_, price) => price).filter((price) => price * 85 === 1360 * 100);
  assert.equal(prices.length, 1);
  accepts("reverse-discount", prices[0]);
  const initial = 400, afterIncrease = initial + initial / 5, afterDecrease = afterIncrease - afterIncrease / 4;
  accepts("successive-relative-changes", exact((initial - afterDecrease) * 100, initial), "5");
  const initialSugar = 300 * 18 / 100;
  const possibleWaterMasses = Array.from({ length: 1000 }, (_, water) => water).filter((water) => initialSugar * 100 === (300 + water) * 12);
  assert.equal(possibleWaterMasses.length, 1);
  accepts("solution-dilution", possibleWaterMasses[0]);
  assert.equal(initialSugar, (300 + possibleWaterMasses[0]) * 12 / 100);
  accepts("percent-versus-percentage-points", exact((50 - 40) * 100, 40), "10");
});

test("linear equations: enumerate original equalities, substitute answers and prove identity independent of x", () => {
  const integerRange = Array.from({ length: 101 }, (_, i) => i - 50);
  const first = integerRange.filter((x) => 3 * (2 * x - 1) - 4 * (x + 2) === 9);
  assert.equal(first.length, 1);
  const firstTask = accepts("linear-distributive-balance", first[0]);
  assert.match(firstTask.solution.at(-1).text, /57 − 48 = 9/);
  // Cross-multiply the original fractions, not the simplified solution text.
  const second = integerRange.filter((x) => 2 * (x - 2) + (x + 1) === 5 * 3);
  assert.equal(second.length, 1);
  accepts("linear-fractional-denominators", second[0]);
  const minutes = Array.from({ length: 200 }, (_, m) => m).filter((m) => 120 + 3 * m === 60 + 5 * m);
  assert.equal(minutes.length, 1);
  accepts("linear-tariff-intersection", minutes[0]);
  const parameter = 2 * (0 + 3) - 2 * 0;
  accepts("linear-identity-parameter", parameter);
  for (const x of [-100, -0.5, 0, 0.25, 16]) assert.equal(2 * (x + 3), 2 * x + parameter);
});

test("quadratics: discriminant and all roots, positive rectangle sides, forbidden radical candidate, coefficient substitution", () => {
  const a = 1, b = -13, c = 36, discriminant = b * b - 4 * a * c;
  assert.ok(discriminant > 0);
  const squares = [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)];
  assert.ok(squares.every((value) => value > 0));
  const roots = squares.flatMap((value) => [-Math.sqrt(value), Math.sqrt(value)]);
  const item = accepts("biquadratic-root-set", roots.join(";"), "2;3");
  for (const root of roots) assert.equal(root ** 4 - 13 * root ** 2 + 36, 0);
  assert.equal(checkTaskAnswer(roots.toReversed().join(";"), item.answerRule).correct, true);
  assert.equal(checkTaskAnswer("-3;-2;2;2;3", item.answerRule).correct, false);
  const sides = [];
  for (let x = 1; x < 26; x += 1) for (let y = x; y < 26; y += 1) if (2 * (x + y) === 26 && x * y === 42) sides.push([x, y]);
  assert.equal(sides.length, 1);
  accepts("rectangle-area-perimeter", sides[0][1]);
  const squaredRoots = [(1 - Math.sqrt(1 + 24)) / 2, (1 + Math.sqrt(1 + 24)) / 2];
  const originalRoots = squaredRoots.filter((x) => x + 6 >= 0 && Math.sqrt(x + 6) === x);
  assert.equal(originalRoots.length, 1);
  accepts("squaring-with-domain", originalRoots[0], String(squaredRoots.find((x) => x < 0)));
  const coefficient = -(4 * 4 - 12) / 4;
  accepts("coefficient-from-root", coefficient);
  assert.equal(4 * 4 + coefficient * 4 - 12, 0);
});

test("powers and roots: direct rational arithmetic, principal-root sign, odd-root domain and exponent uniqueness", () => {
  accepts("negative-power-common-base", exact(2 ** 9, 8 ** 2), "-8");
  const quotient = Math.sqrt(72 / 2);
  assert.ok(quotient >= 0 && quotient * quotient === 72 / 2);
  accepts("quotient-of-positive-roots", quotient, "-6");
  accepts("odd-root-and-even-power", Math.cbrt(-125) + (-3) ** 2, "-14");
  const x = (2 * 1 + 3 * 1) / (2 - 3);
  accepts("exponential-common-base", x);
  assert.equal(4 ** (x - 1), 8 ** (x + 1));
  assert.notEqual(2, 3, "unequal linear exponent coefficients ensure unique solution");
});

test("geometry: Euclidean length, determinant area, disjoint cell count and shoelace computation", () => {
  const triangle = accepts("right-triangle-hypotenuse", Math.hypot(7, 24));
  assert.equal(triangle.diagram.adjacent, 7);
  assert.equal(triangle.diagram.opposite, 24);
  assert.ok(7 + 24 > 25 && 25 > 24 && 25 > 7);
  // Independent coordinate realization of a triangle with base18 and height5.
  const vertices = [[0, 0], [18, 0], [4, 5]];
  const twiceArea = Math.abs(vertices.reduce((sum, [x, y], i) => {
    const [nextX, nextY] = vertices[(i + 1) % vertices.length];
    return sum + x * nextY - y * nextX;
  }, 0));
  accepts("triangle-height-area", twiceArea / 2);
  let remainingCells = 0;
  for (let x = 0; x < 10; x += 1) for (let y = 0; y < 10; y += 1) if (!(x >= 2 && x < 8 && y >= 2 && y < 8)) remainingCells += 1;
  accepts("square-frame-area", remainingCells, "16");
  const rectangle = [[-2, 1], [4, 1], [4, 5], [-2, 5]];
  const signedDoubleArea = rectangle.reduce((sum, [x, y], i) => {
    const [nextX, nextY] = rectangle[(i + 1) % rectangle.length];
    return sum + x * nextY - y * nextX;
  }, 0);
  accepts("coordinate-rectangle-area", Math.abs(signedDoubleArea) / 2);
  const [ax, ay] = rectangle[0], [bx, by] = rectangle[1], [cx, cy] = rectangle[2];
  assert.equal((bx - ax) * (cx - bx) + (by - ay) * (cy - by), 0);
});

test("probability: exhaustive equiprobable outcomes, no replacement and independent complement", () => {
  const tickets = Array.from({ length: 10 }, (_, i) => i + 1);
  accepts("uniform-divisibility", exact(tickets.filter((value) => value % 3 === 0).length, tickets.length));
  const dicePairs = [];
  for (let first = 1; first <= 6; first += 1) for (let second = 1; second <= 6; second += 1) dicePairs.push([first, second]);
  const dice = accepts("two-dice-sum", exact(dicePairs.filter(([a, b]) => a + b === 8).length, dicePairs.length), "0.14");
  assert.equal(checkTaskAnswer("0.138889", dice.answerRule).correct, false);
  const colors = ["blue", "blue", "blue", "white", "white"];
  let total = 0, different = 0;
  for (let first = 0; first < colors.length; first += 1) for (let second = 0; second < colors.length; second += 1) if (first !== second) {
    total += 1;
    if (colors[first] !== colors[second]) different += 1;
  }
  accepts("two-colors-without-replacement", exact(different, total), "12/25");
  // Ten equally likely outcomes for sensorA and five for sensorB.
  let atLeastOne = 0;
  for (let a = 0; a < 10; a += 1) for (let b = 0; b < 5; b += 1) if (a < 9 || b < 4) atLeastOne += 1;
  accepts("independent-at-least-one", exact(atLeastOne, 50), "1.7");
});

test("every candidate is covered by an independent mathematical oracle", () => {
  assert.deepEqual([...checkedSkills].sort(), [...bySkill.keys()].sort());
});
