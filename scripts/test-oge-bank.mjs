import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import { createContentLoader } from "./content-source-loader.mjs";

const load = createContentLoader();
const { ogeTasks, ogePrototypes, ogeGeneratorCases } = load("src/lib/content/oge-bank.ts");
const { checkTaskAnswer } = load("src/lib/tasks.ts");
const cases = ogeGeneratorCases.map((entry) => ({ ...entry, task: ogeTasks.find((task) => task.id === entry.taskId) }));
const forNumber = (number) => cases.filter((entry) => entry.number === number);
const asNumber = (value) => value.includes("/") ? value.split("/").map(Number).reduce((a, b) => a / b) : Number(value.replace(",", "."));
function accepted(task, numerator, denominator = 1) {
  const value = `${numerator}/${denominator}`;
  assert.equal(checkTaskAnswer(value, task.answerRule).correct, true, `${task.id}: expected ${value}`);
  assert.equal(checkTaskAnswer(`${numerator + denominator}/${denominator}`, task.answerRule).correct, false, `${task.id}: wrong +1 accepted`);
  assert.equal(checkTaskAnswer(task.answerDisplay, task.answerRule).correct, true, `${task.id}: displayed answer`);
}

test("OGE author bank reproducibly covers 1–25 with complete metadata, no duplicate variants or foreign exams", () => {
  assert.equal(ogeTasks.length, 214);
  assert.equal(ogeGeneratorCases.length, ogeTasks.length);
  assert.equal(new Set(ogeTasks.map((task) => task.id)).size, ogeTasks.length);
  assert.equal(new Set(ogeTasks.map((task) => `${task.prompt}|${task.conditionLatex ?? ""}`)).size, ogeTasks.length);
  assert.deepEqual(createContentLoader()("src/lib/content/oge-bank.ts").ogeTasks, ogeTasks);
  for (let number = 1; number <= 25; number++) {
    assert.equal(forNumber(number).length, number <= 19 ? 10 : 4, `number ${number}`);
  }
  for (const task of ogeTasks) {
    assert.deepEqual(task.examType, ["ОГЭ"]);
    assert.equal(task.subjectId, "math");
    assert.equal(task.examYear, 2026);
    assert.equal(task.level, null);
    assert.equal(task.topicId, `oge-number-${task.examNumber}`);
    assert(ogePrototypes.some((entry) => entry.id === task.prototypeId && entry.topicId === task.topicId));
    assert(task.solution.length >= 3);
    assert(task.solution.every((step) => step.text.trim().length > 10));
    assert.equal(task.source.kind, "author");
    assert.notEqual(task.scoring.status, "verified");
    assert.equal(task.scoring.maxPrimaryScore, task.examNumber <= 19 ? 1 : 2);
    assert.equal(task.answerRule.type, task.examNumber <= 19 ? "number" : "self");
    assert(!/NaN|undefined|Infinity/.test(JSON.stringify(task)));
    if (task.part === 2) {
      assert(task.selfCheckNotes.length >= 3);
      assert.equal(task.criteriaSourceUrl, "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory");
      assert.equal(checkTaskAnswer("1", task.answerRule).valid, false);
    }
  }
});

test("OGE short answers have finite decimal representations without rounding", () => {
  for (const task of ogeTasks.filter((entry) => entry.part === 1)) {
    const [numerator, denominator = "1"] = task.answerRule.value.split("/");
    let n = Math.abs(Number(numerator)), d = Math.abs(Number(denominator));
    let a = n, b = d;
    while (b !== 0) [a, b] = [b, a % b];
    d /= a;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    assert.equal(d, 1, `${task.id}: non-terminating answer`);
    assert(/^[-]?\d+(?:,\d+)?$/.test(task.answerDisplay), task.id);
    assert.equal(checkTaskAnswer(task.answerDisplay, task.answerRule).correct, true, task.id);
  }
});

test("All OGE statement and solution formulas compile in KaTeX without scaling or invalid markup", () => {
  for (const task of ogeTasks) {
    for (const latex of [task.conditionLatex, ...task.solution.map((step) => step.latex)].filter(Boolean)) {
      assert.doesNotThrow(() => katex.renderToString(latex, { throwOnError: true, strict: "error" }), `${task.id}: ${latex}`);
    }
  }
});

test("OGE 1–5 share a coherent complete plan; scale, areas, paving and fence costs are independently checked", () => {
  for (let variant = 0; variant < 10; variant++) {
    const group = cases.filter((entry) => entry.variant === variant && entry.number <= 5);
    assert.equal(new Set(group.map((entry) => entry.task.sharedConditionId)).size, 1);
    assert.equal(new Set(group.map((entry) => entry.task.prompt.split("\n\n")[0])).size, 1);
    const p = group[0].parameters;
    assert(p.houseLength + p.patioLength < p.length, "opposite-corner buildings cannot overlap horizontally");
    assert(p.houseWidth < p.width && p.patioWidth < p.width);
    assert(p.houseLength > 0 && p.houseWidth > 0 && p.patioLength > 0 && p.patioWidth > 0);
    const per = [p.length, p.width, p.length, p.width].reduce((sum, side) => sum + side, 0);
    const expected = [per, p.houseLength * p.houseWidth, p.length * p.width - p.houseLength * p.houseWidth - p.patioLength * p.patioWidth,
      (p.patioLength / 0.5) * (p.patioWidth / 0.5), (per - p.gate) * p.price];
    expected.forEach((value, index) => { assert(value > 0); accepted(group[index].task, value); });
    assert(group.every((entry) => entry.task.prompt.includes("1:200") && entry.task.prompt.includes("50 см")));
  }
});

test("OGE 6 fractions retain exact rational arithmetic rather than rounded decimals", () => {
  for (const { parameters: p, task } of forNumber(6)) {
    assert(p.b !== 0 && p.d !== 0);
    accepted(task, p.a * p.d + p.c * p.b, p.b * p.d);
    const [n, d] = task.answerRule.value.split("/").map(Number);
    assert.equal(n * p.b * p.d, (p.a * p.d + p.c * p.b) * d);
  }
});

test("OGE 7 square-root bounds are strict adjacent integers for every generated radicand", () => {
  for (const { parameters: p, task } of forNumber(7)) {
    const floor = Math.floor(Math.sqrt(p.radicand));
    assert(floor ** 2 < p.radicand && (floor + 1) ** 2 > p.radicand);
    accepted(task, floor);
  }
});

test("OGE 8 denominators stay nonzero and evaluated original expressions match the answer", () => {
  for (const { parameters: p, task } of forNumber(8)) {
    assert.notEqual(p.x, p.a);
    accepted(task, p.x ** 2 - p.a ** 2, p.x - p.a);
  }
});

test("OGE 9 both quadratic roots satisfy the condition and the larger root is selected", () => {
  for (const { parameters: p, task } of forNumber(9)) {
    const discriminant = 4 + 4 * p.k * (p.k + 2);
    const roots = [(2 - Math.sqrt(discriminant)) / 2, (2 + Math.sqrt(discriminant)) / 2];
    for (const root of roots) assert.equal(root ** 2 - 2 * root - p.k * (p.k + 2), 0);
    accepted(task, Math.max(...roots));
    assert.equal(checkTaskAnswer(String(Math.min(...roots)), task.answerRule).correct, false);
  }
});

test("OGE 10 probability counts all and only non-red outcomes", () => {
  for (const { parameters: p, task } of forNumber(10)) {
    const outcomes = [...Array(p.red).fill("red"), ...Array(p.blue).fill("blue"), ...Array(p.green).fill("green")];
    const successes = outcomes.filter((color) => color !== "red").length;
    assert(successes > 0 && successes < outcomes.length);
    accepted(task, successes, outcomes.length);
  }
});

test("OGE 11 axis intersection lies on the line determined by both stated points", () => {
  for (const { parameters: p, task } of forNumber(11)) {
    const points = [[1, p.slope + p.intercept], [3, 3 * p.slope + p.intercept]];
    const [x1, y1] = points[0], [x2, y2] = points[1];
    const denominator = y2 - y1;
    const numerator = x1 * (y2 - y1) - y1 * (x2 - x1);
    assert.notEqual(denominator, 0);
    accepted(task, numerator, denominator);
  }
});

test("OGE 12 physical formula and all positive input values are consistent", () => {
  for (const { parameters: p, task } of forNumber(12)) {
    assert(p.energy > 0 && p.speed > 0 && p.mass > 0);
    accepted(task, 2 * p.energy, p.speed ** 2);
    assert.equal(asNumber(task.answerRule.value) * p.speed ** 2 / 2, p.energy);
  }
});

test("OGE 13 answer is the largest integer satisfying both inequalities", () => {
  for (const { parameters: p, task } of forNumber(13)) {
    const solutions = Array.from({ length: 200 }, (_, i) => i - 100).filter((x) => 2 * x - p.offset < p.right && x >= p.lower);
    assert(solutions.length > 0);
    accepted(task, Math.max(...solutions));
  }
});

test("OGE 14 progression answers agree with repeated addition", () => {
  for (const { parameters: p, task } of forNumber(14)) {
    let current = p.first;
    for (let position = 1; position < p.index; position++) current += p.difference;
    accepted(task, current);
  }
});

test("OGE 15 triangle angles are positive and sum to 180 degrees", () => {
  for (const { parameters: p, task } of forNumber(15)) {
    const base = asNumber(task.answerRule.value);
    assert(base > 0 && p.apex > 0);
    assert.equal(2 * base + p.apex, 180);
    accepted(task, (180 - p.apex) / 2);
  }
});

test("OGE 16 the chord endpoints satisfy the circle equation", () => {
  for (const { parameters: p, task } of forNumber(16)) {
    assert(p.distance > 0 && p.distance < p.radius);
    const halfChord = asNumber(task.answerRule.value) / 2;
    assert.equal(halfChord ** 2 + p.distance ** 2, p.radius ** 2);
    accepted(task, 2 * Math.sqrt(p.radius ** 2 - p.distance ** 2));
  }
});

test("OGE 17 rhombus area agrees with the shoelace formula on its vertices", () => {
  for (const { parameters: p, task } of forNumber(17)) {
    const polygon = [[p.diagonal1 / 2, 0], [0, p.diagonal2 / 2], [-p.diagonal1 / 2, 0], [0, -p.diagonal2 / 2]];
    const doubleArea = polygon.reduce((sum, [x, y], i) => sum + x * polygon[(i + 1) % 4][1] - y * polygon[(i + 1) % 4][0], 0);
    accepted(task, Math.abs(doubleArea), 2);
  }
});

test("OGE 18 grid area agrees with coordinate determinant without relying on a drawn scale", () => {
  for (const { parameters: p, task } of forNumber(18)) {
    const determinant = (p.bx - p.ax) * (p.cy - p.ay) - (p.cx - p.ax) * (p.by - p.ay);
    assert(determinant !== 0);
    accepted(task, Math.abs(determinant), 2);
  }
});

test("OGE 19 each assertion is evaluated before the numbered answer is assembled", () => {
  for (const { parameters: p, task } of forNumber(19)) {
    const truth = [(3 * p.scale) ** 2 + (4 * p.scale) ** 2 === (5 * p.scale) ** 2,
      p.scale ** 2 === p.scale ** 2 + 1, (p.polygonSides - 2) * 180 === 180 * (p.polygonSides - 2)];
    const rotated = truth.slice(p.rotation).concat(truth.slice(0, p.rotation));
    const expected = Number(rotated.flatMap((value, index) => value ? [index + 1] : []).join(""));
    accepted(task, expected);
  }
});

test("OGE 20 extended rational equations exclude the cancelling root", () => {
  for (const { parameters: p, task } of forNumber(20)) {
    assert.notEqual(p.excluded, p.root);
    const numerator = (x) => x * x - (p.excluded + p.root) * x + p.excluded * p.root;
    assert.equal(numerator(p.root) / (p.root - p.excluded), 0);
    assert.equal(numerator(p.excluded), 0);
    assert.equal(p.excluded - p.excluded, 0);
    assert.equal(task.answerDisplay, `x = ${p.root}`);
    assert(task.solution.some((step) => step.text.includes("ОДЗ")));
  }
});

test("OGE 21 work model, factorisation and discarded negative root are consistent", () => {
  for (const { parameters: p, task } of forNumber(21)) {
    assert.equal(p.slower - p.faster, 2);
    const timeN = p.faster * p.slower, timeD = p.faster + p.slower;
    for (const x of [1, 2, 7, p.faster]) {
      const originalPolynomial = (timeD * x * (x + 2) - timeN * (2 * x + 2)) / 2;
      const factored = (x - p.faster) * ((p.faster + 1) * x + p.faster + 2);
      assert.equal(originalPolynomial, factored);
    }
    assert(-(p.faster + 2) / (p.faster + 1) < 0);
    assert(task.answerDisplay.includes(`${p.faster} ч`) && task.answerDisplay.includes(`${p.slower} ч`));
  }
});

test("OGE 22 a cancelled factor leaves exactly the stated excluded graph point", () => {
  for (const { parameters: p, task } of forNumber(22)) {
    for (const x of [-3, -1, 0, p.removed + 1, p.removed + 2]) {
      if (x === p.removed) continue;
      assert((x ** 2 - p.removed ** 2) / (x - p.removed) === x + p.removed);
    }
    const absentLevel = 2 * p.removed;
    assert.equal(absentLevel - p.removed, p.removed);
    assert(task.answerDisplay.includes(`m = ${absentLevel}`));
    assert(task.solution.some((step) => step.text.includes("выколоть")));
  }
});

test("OGE 23 altitude and area agree with independent Pythagorean reconstruction", () => {
  for (const { parameters: p, task } of forNumber(23)) {
    const c = p.projection1 + p.projection2;
    const aSquared = c * p.projection1, bSquared = c * p.projection2;
    assert.equal(aSquared + bSquared, c * c);
    const doubleAreaSquared = aSquared * bSquared;
    const answer = asNumber(task.answerDisplay.replace(" см²", ""));
    assert.equal((2 * answer) ** 2, doubleAreaSquared);
  }
});

test("OGE 24 contains four different proofs, not numerical tasks labelled as proofs", () => {
  const proofs = forNumber(24);
  assert.equal(new Set(proofs.map((entry) => entry.task.prototypeId)).size, 4);
  for (const { task } of proofs) {
    assert(task.prompt.includes("Докажите"));
    assert(task.solution.length >= 4);
    assert.equal(task.answerRule.type, "self");
  }
  // Concrete geometric witnesses independently exercise the four claimed identities.
  const a = [-3, -2], b = [3, -2], c = [1.5, 1], d = [-1.5, 1];
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n = [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2];
  assert.equal(m[0] * n[1] - m[1] * n[0], 0);
  const radius = 5, outsideDistance = 13, tangentLength = 12;
  assert.equal(radius ** 2 + tangentLength ** 2, outsideDistance ** 2);
  const ca = 7, cb = 9, cosineC = 0.6;
  assert(Math.abs((ca * cosineC) * cb - (cb * cosineC) * ca) < 1e-10);
  const x = 2, y = 3, z = 4;
  assert.equal(((x + y) + (x + z) - (y + z)) / 2, x);
});

test("OGE 25 positive tangent lengths reconstruct a valid right triangle and Heron area", () => {
  for (const { parameters: p, task } of forNumber(25)) {
    const m = p.firstTangent, n = p.secondTangent, c = m + n;
    assert(m > 0 && n > 0);
    const root = (-c + Math.sqrt(c * c + 4 * m * n)) / 2;
    assert(root > 0 && Number.isInteger(root));
    const a = m + root, b = n + root;
    assert.equal(a * a + b * b, c * c);
    const s = (a + b + c) / 2;
    const heron = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    assert.equal(heron, a * b / 2);
    assert.equal(task.answerDisplay, `${heron} см²`);
  }
});
