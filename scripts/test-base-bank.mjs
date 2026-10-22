import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import { createContentLoader } from "./content-source-loader.mjs";

const load = createContentLoader();
const { baseTasks, basePrototypes, baseGeneratorCases } = load("src/lib/content/base-bank.ts");
const { checkTaskAnswer, tasks } = load("src/lib/tasks.ts");
const { getExamDefinition } = load("src/lib/exams.ts");
const definition = getExamDefinition({ examType: "ЕГЭ", level: "base" });
const byId = new Map(baseTasks.map(task => [task.id, task]));
const near = (left, right) => assert(Math.abs(left - right) < 1e-7, `${left} != ${right}`);
const firstInteger = (predicate, start = 0, end = 100000) => {
  for (let n = start; n <= end; n++) if (predicate(n)) return n;
  throw new Error("No expected integer found");
};

/** Independent substitutions, finite searches and direct definitions, not stored answer replay. */
function expected(family, p) {
  switch (family) {
    case "packages": return firstInteger(n => n * p.capacity >= p.items);
    case "time-units": return Array.from({ length: p.hours }, () => 60).reduce((a, b) => a + b, p.minutes);
    case "tariff-formula": return firstInteger(d => p.fixed + d * p.rate === p.cost);
    case "power-time": return firstInteger(t => p.power * t === p.energy);
    case "table-maximum": return [p.row1, p.row2, p.row3, p.row4].indexOf(Math.max(p.row1, p.row2, p.row3, p.row4)) + 1;
    case "table-mean": return (p.q1 + p.q2 + p.q3 + p.q4) / 4;
    case "roll-cost": return firstInteger(n => n * p.roll >= p.metres) * p.rollPrice;
    case "maximum-purchase": return firstInteger(n => n * p.notebook > p.balance) - 1;
    case "one-draw": return Array.from({ length: p.total }, (_, i) => i < p.favorable).filter(Boolean).length / p.total;
    case "complement": return Array.from({ length: p.total }, (_, i) => i >= p.defective).filter(Boolean).length / p.total;
    case "tariff-table": {
      let b = p.tariffB;
      for (let hour = 6; hour <= p.need; hour++) b += p.addB;
      assert(p.need <= 15);
      return Math.min(p.tariffA, b);
    }
    case "transport-table": {
      const first = firstInteger(n => n * p.firstCapacity >= p.demand);
      const second = firstInteger(n => n * p.secondCapacity >= p.demand);
      return Math.min(first * p.firstPrice, second * p.secondPrice);
    }
    case "piecewise-graph": {
      const points = [[p.left, 1], [p.middle, p.peak], [p.right, 2]];
      const max = Math.max(...points.map(point => point[1]));
      assert.equal(points.filter(point => point[1] === max).length, 1);
      return points.find(point => point[1] === max)[0];
    }
    case "tangent-slope": {
      const y = x => p.intercept + p.slope * x;
      return (y(2) - y(0)) / 2;
    }
    case "sets-union": {
      const chess = new Set(Array.from({ length: p.chess }, (_, i) => i));
      const robot = new Set([...Array.from(chess).slice(0, p.both), ...Array.from({ length: p.robot - p.both }, (_, i) => p.chess + i)]);
      return new Set([...chess, ...robot]).size;
    }
    case "logic-count": {
      const ages = [p.minimum, p.maximum];
      return [ages.every(age => age >= p.minimum), ages.every(age => age > p.minimum), ages.some(age => age < p.maximum)].filter(Boolean).length;
    }
    case "floor-tiles": return firstInteger(n => n * p.tile === p.length) * firstInteger(n => n * p.tile === p.width);
    case "ladder-height": return firstInteger(h => h > 0 && h * h + p.ground * p.ground === p.ladder * p.ladder);
    case "hypotenuse": return firstInteger(h => h > 0 && h * h === p.catA ** 2 + p.catB ** 2);
    case "trapezoid-area": return p.baseA * p.height + (p.baseB - p.baseA) * p.height / 2;
    case "cube-surface": return [1, 2, 3, 4, 5, 6].map(() => p.side * p.side).reduce((a, b) => a + b);
    case "box-volume": return Array.from({ length: p.boxH }, () => p.boxA * p.boxB).reduce((a, b) => a + b);
    case "isosceles-angle": return firstInteger(a => a > 0 && a + p.angle + p.angle === 180);
    case "similarity-side": return firstInteger(a => a * p.smallA === p.smallB * (p.smallA * p.scale));
    case "pyramid-volume": return p.pyramidA * p.pyramidB * p.pyramidH / 3;
    case "box-diagonal": return firstInteger(d => d > 0 && d * d === p.ax * p.ax + p.by * p.by + p.cz * p.cz);
    case "fraction-sum": return (2 * p.numeratorA + p.numeratorB) / 8;
    case "decimal-difference": return (10 * p.tenths - p.hundredths) / 100;
    case "discount": return p.original - p.original * p.discount / 100;
    case "whole-from-percent": return firstInteger(n => n * p.percent === p.part * 100);
    case "radical-sum": return (Math.sqrt(p.root) + Math.sqrt(p.root + 1)) ** 2 - 2 * Math.sqrt(p.root * (p.root + 1));
    case "power-quotient": return 2 ** (2 * p.exponent + 3) / 4 ** p.exponent;
    case "quadratic-root": {
      const roots = [];
      for (let x = -30; x <= 30; x++) if (x * x - (p.smaller + p.larger) * x + p.smaller * p.larger === 0) roots.push(x);
      assert.equal(roots.length, 2);
      return Math.max(...roots);
    }
    case "exponential-root": return firstInteger(x => 2 ** (x - p.shift) === 2 ** p.rhsExponent);
    case "integer-interval": return Array.from({ length: 50 }, (_, i) => i - 10).filter(x => p.bound < x && x <= p.bound + 4).length;
    case "quadratic-integers": return Array.from({ length: 50 }, (_, i) => i - 10).filter(x => (x - p.zero1) * (x - p.zero2) <= 0).length;
    case "digits": {
      const valid = [];
      for (let n = 10; n < 100; n++) {
        const [a, b] = String(n).split("").map(Number);
        if (a + b === p.sum && a - b === p.difference) valid.push(n);
      }
      assert.equal(valid.length, 1);
      return valid[0];
    }
    case "remainder-search": return firstInteger(n => n % 3 === 0 && n % p.divisor === p.remainder, p.threshold);
    case "meeting": return firstInteger(t => t * p.speed1 + t * p.speed2 === p.distance);
    case "joint-work": return firstInteger(t => t * p.second + t * p.first === p.first * p.second);
    case "pigeonhole": {
      const worst = Array(p.colors).fill(p.guarantee - 1);
      assert(worst.every(n => n < p.guarantee));
      for (let color = 0; color < p.colors; color++) {
        const next = [...worst]; next[color]++;
        assert(next.some(n => n >= p.guarantee));
      }
      return worst.reduce((a, b) => a + b) + 1;
    }
    case "three-days": return firstInteger(n => p.firstPages + p.firstPages + 2 + n === p.totalPages);
    case "fraction-product": return p.numerator / (p.denominator / p.multiplier);
    case "signed-change": return p.start + (-p.fall) + p.rise;
    case "braking-formula": return firstInteger(u => u * u === 2 * p.acceleration * p.path);
    case "temperature-formula": return firstInteger(c => c * 9 + 32 * 5 === p.fahrenheit * 5);
    case "table-ratio": return p.leftCount / (p.leftCount + p.rightCount) * 100;
    case "frequency-table": {
      const orders = [...Array(p.single).fill(1), ...Array(p.double).fill(2), ...Array(p.triple).fill(3)];
      return orders.reduce((a, b) => a + b);
    }
    case "mixed-vehicles": {
      const costs = [];
      for (let a = 0; a < 30; a++) for (let b = 0; b < 30; b++) {
        if (a * p.smallSeats + b * p.bigSeats >= p.passengers) costs.push(a * p.smallCost + b * p.bigCost);
      }
      return Math.min(...costs);
    }
    case "cutting-count": return firstInteger(n => n * p.piece > p.totalLength - p.leftover) - 1;
    case "exactly-one-success": {
      let count = 0;
      for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) if ((a < p.chanceA) !== (b < p.chanceB)) count++;
      return count / 100;
    }
    case "at-least-one-success": {
      let count = 0;
      for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) if (a < p.chance || b < p.chance) count++;
      return count / 100;
    }
    case "conditions-table": {
      const prices = [p.maxPrice - 5, p.maxPrice + 2, p.maxPrice - 3, p.maxPrice - 1];
      const memories = [p.requiredMemory - 1, p.requiredMemory + 3, p.requiredMemory + 1, p.requiredMemory + 2];
      const valid = prices.flatMap((price, i) => price <= p.maxPrice && memories[i] >= p.requiredMemory ? [i + 1] : []);
      return Number(valid.join(""));
    }
    case "billing-table": {
      let cost = p.baseFee;
      for (let u = 0; u < p.usage; u++) if (u >= p.included) cost += p.perUnit;
      return cost;
    }
    case "derivative-signs": {
      const derivative = x => (x - p.stationary1) * (x - p.stationary2);
      const roots = [p.stationary1, p.stationary2];
      const minima = roots.filter(x => derivative(x - 0.1) < 0 && derivative(x + 0.1) > 0);
      assert.equal(minima.length, 1);
      return minima[0];
    }
    case "line-value": {
      const firstY = p.offset, secondY = p.offset + 2 * p.gradient;
      return firstY + p.xPoint * (secondY - firstY) / 2;
    }
    case "sets-neither": return Array.from({ length: p.totalPeople }, (_, i) => i).slice(p.onlyFirst + p.onlySecond + p.overlap).length;
    case "logical-counterexample": {
      assert(p.firstBound > 0);
      const sample = Array.from({ length: 101 }, (_, i) => p.firstBound + (p.secondBound - p.firstBound) * (i + 1) / 102);
      const conditions = [x => Number.isInteger(x), x => x * x > p.firstBound ** 2, x => x > p.secondBound - 1, x => x === (p.firstBound + p.secondBound) / 2];
      const always = conditions.flatMap((condition, i) => sample.every(condition) ? [i + 1] : []);
      assert.equal(always.length, 1);
      return always[0];
    }
    case "paint-wall": return firstInteger(n => n * p.coverage >= p.wallL * p.wallH - p.windowArea);
    case "map-scale": return p.planCm * p.scale * 0.01;
    case "circle-area": return (2 * Math.PI * p.radius) ** 2 / (4 * Math.PI ** 2);
    case "triangle-area": return p.triangleBase * p.triangleHeight / 2;
    case "cylinder-volume": return Math.PI * p.cylRadius ** 2 * p.cylHeight / Math.PI;
    case "cone-volume": return Math.PI * p.coneRadius ** 2 * p.coneHeight / (3 * Math.PI);
    case "cyclic-quadrilateral": return firstInteger(a => a > 0 && a + p.oppositeAngle === 180);
    case "similarity-area": {
      const base = 2, height = p.originalArea;
      return (base * p.factor) * (height * p.factor) / 2;
    }
    case "cube-cutting": {
      let count = 0;
      for (let x = 0; x < p.cubeSide; x += p.smallSide)
        for (let y = 0; y < p.cubeSide; y += p.smallSide)
          for (let z = 0; z < p.cubeSide; z += p.smallSide) count++;
      return count;
    }
    case "liquid-height": return firstInteger(h => h * p.vesselA * p.vesselB === p.waterVolume);
    case "fraction-division": return (p.n / p.d) / (p.divisorTop / p.d);
    case "operation-order": return p.negative * p.multiply + p.positive;
    case "sequential-percent": {
      const raised = p.oldPrice + p.oldPrice * p.increase / 100;
      return raised - raised * p.reduction / 100;
    }
    case "percent-comparison": return (p.secondAmount / p.firstAmount - 1) * 100;
    case "logarithm-value": return Math.log(p.logBase ** p.logExponent) / Math.log(p.logBase);
    case "algebraic-fraction": return (p.x * p.x - p.a * p.a) / (p.x - p.a);
    case "radical-root": return firstInteger(x => x >= p.radicalShift && Math.sqrt(x - p.radicalShift) === p.squareRoot);
    case "rational-root": {
      const answer = p.singular + p.numeratorConst / p.ratio;
      assert.notEqual(answer, p.singular);
      near(p.numeratorConst / (answer - p.singular), p.ratio);
      return answer;
    }
    case "linear-largest": {
      const solutions = Array.from({ length: 100 }, (_, i) => i - 50).filter(x => p.inequalityMultiplier * x < p.inequalityMultiplier * p.upper);
      return Math.max(...solutions);
    }
    case "exponential-count": return Array.from({ length: 30 }, (_, i) => i + 1).filter(x => 2 ** x <= 2 ** p.expBound).length;
    case "least-common-multiple": return firstInteger(t => t % p.divA === 0 && t % p.divB === 0, 1);
    case "last-digit": return Number((2n ** BigInt(p.powerN)) % 10n);
    case "catch-up": {
      const time = p.slow * p.delay / (p.fast - p.slow);
      near(p.fast * time, p.slow * (time + p.delay));
      return time;
    }
    case "mixture": {
      const total = p.massA + p.massB;
      const substance = p.massA * p.concA + p.massB * p.concB;
      return substance / total;
    }
    case "coin-search": {
      for (let count = 1; count < 100; count++) {
        for (let a = 0; a <= count; a++) if (a * p.coinA + (count - a) * p.coinB === p.target) return count;
      }
      throw new Error("No valid coin payment");
    }
    case "counting-paths": {
      const paths = (right, up) => !right || !up ? 1 : paths(right - 1, up) + paths(right, up - 1);
      return paths(p.horizontal, p.vertical);
    }
    default: throw new Error(`Unverified base family: ${family}`);
  }
}

test("База: 420 новых ID, 20 задач и 4 авторских семейства на каждый из 21 номера", () => {
  assert(definition.available);
  assert.equal(baseTasks.length, 420);
  assert.equal(baseGeneratorCases.length, baseTasks.length);
  assert.equal(basePrototypes.length, 84);
  assert.equal(new Set(baseTasks.map(t => t.id)).size, 420);
  assert.equal(new Set(baseTasks.map(t => `${t.prompt}|${t.conditionLatex ?? ""}`)).size, 420);
  for (const number of definition.numbers) {
    const group = baseTasks.filter(task => task.examNumber === number.number);
    assert.equal(group.length, 20);
    assert.equal(new Set(group.map(task => task.prototypeId)).size, 4);
    for (const task of group) {
      assert.equal(task.examVersionId, "ege-math-base-2026");
      assert.equal(task.level, "base"); assert.equal(task.part, 1);
      assert.equal(task.answerRule.type, "number");
      assert.equal(task.scoring.maxPrimaryScore, 1);
      assert.equal(task.topicId, `ege-base-number-${number.number}`);
      assert(task.solution.length >= 2);
    }
  }
  for (const task of baseTasks) assert(tasks.some(entry => entry.id === task.id), `Not integrated: ${task.id}`);
});

test("База: все 420 ответов проверены независимыми вычислениями, перебором и подстановкой", () => {
  for (const entry of baseGeneratorCases) {
    const task = byId.get(entry.taskId);
    const answer = expected(entry.family, entry.parameters);
    assert(Number.isFinite(answer), task.id);
    near(Number(task.answerRule.value), answer);
    const input = String(Number(answer.toFixed(7)));
    assert.equal(checkTaskAnswer(input, task.answerRule).correct, true, task.id);
    assert.equal(checkTaskAnswer(input.replace(".", ","), task.answerRule).correct, true, task.id);
    assert.equal(checkTaskAnswer(String(answer + 1), task.answerRule).correct, false, task.id);
  }
});

test("База: формулы условий и решений корректно рендерятся KaTeX", () => {
  for (const task of baseTasks) {
    for (const formula of [task.conditionLatex, ...task.solution.map(step => step.latex)].filter(Boolean)) {
      assert.doesNotThrow(() => katex.renderToString(formula, { throwOnError: true, strict: "error" }), task.id);
    }
  }
});
