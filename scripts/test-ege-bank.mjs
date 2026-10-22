import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import katex from "katex";

const root = new URL("../", import.meta.url);
const modules = new Map();
async function load(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  const pending = (async () => {
    const source = await readFile(url, "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020,
    }});
    const parsed = ts.createSourceFile("module.js", outputText, ts.ScriptTarget.ES2020, true);
    const replacements = [];
    for (const node of parsed.statements) {
      if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
      const s = node.moduleSpecifier;
      if (!s || !ts.isStringLiteral(s) || (!s.text.startsWith(".") && !s.text.startsWith("@/"))) continue;
      const path = /\.[cm]?[jt]s$/.test(s.text) ? s.text : `${s.text}.ts`;
      const dependency = path.startsWith("@/") ? new URL(`src/${path.slice(2)}`, root) : new URL(path, url);
      replacements.push({ start: s.getStart(parsed), end: s.end, text: JSON.stringify(await load(dependency)) });
    }
    let output = outputText;
    for (const item of replacements.sort((a, b) => b.start - a.start)) output = output.slice(0, item.start) + item.text + output.slice(item.end);
    return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  })();
  modules.set(url.href, pending);
  return pending;
}
const { egeTasks, egePrototypes, egeGeneratorCases, egeSupplementIds } = await import(await load(new URL("src/lib/content/ege-bank.ts", root)));
const { checkTaskAnswer } = await import(await load(new URL("src/lib/tasks.ts", root)));
const byId = new Map(egeTasks.map((task) => [task.id, task]));
const fixed = (value) => String(Number(value.toFixed(9)));
const close = (a, b, epsilon = 1e-8) => assert(Math.abs(a - b) < epsilon, `${a} != ${b}`);

function expectedShort(family, p) {
  switch (family) {
    case "right-triangle-area": return p.a * p.b / 2;
    case "trapezoid-area": return (p.base1 + p.base2) * p.height / 2;
    case "dot-product": return p.ux * p.vx + p.uy * p.vy;
    case "vector-length": return Math.hypot(p.bx - p.ax, p.by - p.ay);
    case "prism-diagonal": return Math.hypot(p.side1, p.side2, p.side3);
    case "pyramid-volume": return p.length * p.width * p.height / 3;
    case "one-draw": return p.red / p.total;
    case "complement": return (p.total - p.defective) / p.total;
    case "exactly-one": {
      let successes = 0;
      for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++)
        if ((a < p.p10) !== (b < p.q10)) successes++;
      return successes / 100;
    }
    case "at-least-one": {
      let successes = 0;
      for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++)
        if (a < p.chance10 || b < p.chance10) successes++;
      return successes / 100;
    }
    case "exponential": return Math.log2(8) + p.shift;
    case "logarithmic": return p.base ** p.exponent + p.shift;
    case "radical-identity": return (Math.sqrt(p.r1) + Math.sqrt(p.r2)) ** 2 - 2 * Math.sqrt(p.r1 * p.r2);
    case "power-rules": return 2 ** (p.k + 4) * 8 / 4 ** (p.k + 1);
    case "derivative-point": return 3 * p.point ** 2 - 2 * p.a * p.point + p.b;
    case "parallel-tangent": return (p.slope - p.b) / (2 * p.a);
    case "accelerated-motion": return (-p.v0 + Math.sqrt(p.v0 ** 2 + 2 * p.acceleration * p.distance)) / p.acceleration;
    case "joule-law": return Math.sqrt(p.heat / (p.resistance * p.seconds));
    case "catch-up": return p.slow * p.delay / (p.fast - p.slow);
    case "joint-work": return 1 / (1 / p.first + 1 / p.second);
    case "linear-function": return p.y2 + (p.y2 - p.y1);
    case "inverse-function": return p.xPoint * p.yPoint / p.targetY;
    case "quadratic-maximum": {
      const values = [p.left, p.vertex, p.right].map(x => -((x - p.vertex) ** 2) + p.peak);
      return Math.max(...values);
    }
    case "cubic-minimum": {
      const values = [p.left, p.stationary, p.right].map(x => x ** 3 - 3 * p.stationary ** 2 * x);
      return Math.min(...values);
    }
    default: throw new Error(`Unknown family ${family}`);
  }
}

test("ЕГЭ: воспроизводимые 179 задач покрывают каждый номер; ID и условия уникальны", () => {
  assert.equal(egeTasks.length, 179);
  assert.equal(egeGeneratorCases.length, 172);
  assert.equal(egeSupplementIds.length, 7);
  assert.equal(egeGeneratorCases.length + egeSupplementIds.length, egeTasks.length);
  assert.equal(new Set(egeTasks.map(t => t.id)).size, egeTasks.length);
  assert.equal(new Set(egeTasks.map(t => `${t.examNumber}|${t.prompt}|${t.conditionLatex ?? ""}`)).size, egeTasks.length);
  assert.equal(new Set(egePrototypes.map(p => p.id)).size, egePrototypes.length);
  for (let n = 1; n <= 19; n++) assert.equal(egeTasks.filter(t => t.examNumber === n).length, n <= 12 ? 12 : 5);
  for (const t of egeTasks) {
    assert.deepEqual(t.examType, ["ЕГЭ"]); assert.equal(t.level, "profile"); assert.equal(t.examYear, 2026);
    assert.equal(t.topicId, `ege-profile-number-${t.examNumber}`);
    assert(egePrototypes.some(p => p.id === t.prototypeId && p.topicId === t.topicId));
    assert(t.prompt.length > 15 && t.answerDisplay.length && t.solution.length >= 2);
    assert.equal(t.source.kind, "author"); assert.notEqual(t.scoring.status, "verified");
    assert.equal(t.provenance.creation_method, egeSupplementIds.includes(t.id) ? "original-individual-task" : "original-deterministic-family");
    assert.equal("creationMethod" in t, false);
    if (t.examNumber <= 12) { assert.equal(t.part, 1); assert.equal(t.answerRule.type, "number"); assert.equal(t.scoring.maxPrimaryScore, 1); }
    else {
      assert.equal(t.part, 2); assert.equal(t.answerRule.type, "self"); assert(t.selfCheckNotes.length >= 3);
      assert.equal(t.scoring.maxPrimaryScore, ({13:2,14:3,15:2,16:2,17:3,18:4,19:4})[t.examNumber]);
      assert.equal(checkTaskAnswer(t.answerDisplay, t.answerRule).valid, false);
    }
  }
});

test("ЕГЭ: все 144 коротких ответа независимо вычислены, принимаются с точкой/запятой, неверные отвергаются", () => {
  for (const c of egeGeneratorCases) {
    const task = byId.get(c.taskId);
    if (task.part !== 1) continue;
    const expected = expectedShort(c.family, c.parameters);
    assert(Number.isFinite(expected), task.id);
    const answer = fixed(expected);
    assert.equal(checkTaskAnswer(answer, task.answerRule).correct, true, task.id);
    assert.equal(checkTaskAnswer(answer.replace(".", ","), task.answerRule).correct, true, task.id);
    assert.equal(checkTaskAnswer(fixed(expected + 1), task.answerRule).correct, false, task.id);
    assert.equal(task.answerDisplay, answer.replace(".", ","), task.id);
    const p = c.parameters;
    if (task.examNumber === 4 || task.examNumber === 5) assert(expected >= 0 && expected <= 1);
    if (c.family === "logarithmic") assert(expected > p.shift);
    if (c.family === "accelerated-motion") close(p.v0 * expected + p.acceleration * expected ** 2 / 2, p.distance);
    if (c.family === "parallel-tangent") close(2 * p.a * expected + p.b, p.slope);
  }
});

test("ЕГЭ: все формулы условий и пошаговых решений рендерятся KaTeX без ошибок", () => {
  for (const task of egeTasks) for (const formula of [task.conditionLatex, ...task.solution.map(s => s.latex)].filter(Boolean)) {
    assert.doesNotThrow(() => katex.renderToString(formula, { throwOnError: true, strict: "error" }), `${task.id}: ${formula}`);
  }
});

test("ЕГЭ №13: все выбранные корни удовлетворяют уравнению и отрезку, других корней в периоде нет", () => {
  for (const c of egeGeneratorCases.filter(c => byId.get(c.taskId).examNumber === 13)) {
    const n = c.parameters.period;
    const roots = [Math.PI / 6, Math.PI / 2, 5 * Math.PI / 6].map(x => x + 2 * Math.PI * n);
    const task = byId.get(c.taskId);
    for (const x of roots) { close(2 * Math.sin(x) ** 2 - 3 * Math.sin(x) + 1, 0); assert(x >= 2 * Math.PI * n && x <= 2 * Math.PI * (n + 1)); }
    assert(task.answerDisplay.includes(`${12 * n + 1}π/6`));
    assert(task.answerDisplay.includes(`${4 * n + 1}π/2`));
    assert(task.answerDisplay.includes(`${12 * n + 5}π/6`));
    // Polynomial in sin has precisely 1/2 and 1 as its roots.
    close((2 * 0.5 - 1) * (0.5 - 1), 0); close((2 * 1 - 1) * (1 - 1), 0);
  }
});

test("ЕГЭ №14: координаты подтверждают перпендикулярность и угол, без случайной подмены угла к нормали", () => {
  for (const c of egeGeneratorCases.filter(c => byId.get(c.taskId).examNumber === 14)) {
    const {side: a, height: h} = c.parameters;
    const ac = [a,a,0], bd = [-a,a,0], vertical = [0,0,h];
    const dot=(u,v)=>u.reduce((sum,x,i)=>sum+x*v[i],0);
    close(dot(ac,bd),0); close(dot(ac,vertical),0);
    const line = [a,a,-h], normal = [1/Math.SQRT2,1/Math.SQRT2,0];
    const normalLength=Math.abs(dot(line,normal));
    const parallelLength=Math.sqrt(dot(line,line)-normalLength**2);
    close(normalLength/parallelLength,a*Math.SQRT2/h);
    assert(byId.get(c.taskId).answerDisplay.includes(`${a}√2/${h}`));
  }
});

test("ЕГЭ №15: интервалы и включение границ проверены подстановкой; полюс исключён", () => {
  for (const c of egeGeneratorCases.filter(c => byId.get(c.taskId).examNumber === 15)) {
    const {root1:a,root2:b,pole:d}=c.parameters;
    for(let x=a-3;x<=d+3;x+=0.25){
      if(x===d)continue;
      const result=(x-a)*(x-b)/(x-d)>=0;
      assert.equal(result,(x>=a&&x<=b)||x>d,`${c.taskId}, x=${x}`);
    }
    assert.equal(byId.get(c.taskId).answerDisplay,`[${a}; ${b}] ∪ (${d}; +∞)`);
  }
});

test("ЕГЭ №16: независимый график долга подтверждает все платежи и итог", () => {
  for (const c of egeGeneratorCases.filter(c => byId.get(c.taskId).examNumber === 16)) {
    const {principal,rate,years}=c.parameters;
    let debt=principal; const payments=[];
    for(let year=0;year<years;year++){
      const desired=principal*(years-year-1)/years;
      const payment=debt*(1+rate/100)-desired;
      payments.push(payment); debt=desired;
    }
    close(debt,0);
    const task=byId.get(c.taskId);
    assert(task.answerDisplay.includes(fixed(payments.reduce((a,b)=>a+b,0))));
    assert(task.answerDisplay.includes(fixed(payments[2])));
    for(const value of payments) assert(task.solution.some(s=>s.latex?.includes(fixed(value))));
  }
});

test("ЕГЭ №17: координаты точек касания и определитель подтверждают площадь", () => {
  for (const c of egeGeneratorCases.filter(c => byId.get(c.taskId).examNumber === 17)) {
    const {radius:r,centerDistance:d}=c.parameters;
    assert(d>r&&r>0);
    const x=r*r/d, y=r*Math.sqrt(d*d-r*r)/d;
    close(x*x+y*y,r*r);
    close(x*(d-x)+y*(-y),0);
    const area=Math.abs((x-d)*(-y)-(x-d)*y)/2;
    assert(byId.get(c.taskId).answerDisplay.includes(fixed(area).replace(".",",")));
  }
});

test("ЕГЭ №18: область параметра проверена прямым вычислением корней и граничных случаев", () => {
  for (const c of egeGeneratorCases.filter(c => byId.get(c.taskId).examNumber === 18)) {
    const m=c.parameters.coefficient;
    for(let a=-6;a<=12;a+=0.125){
      const discriminant=4*a*a-4*(m*a+m+1);
      const roots=discriminant>0?[a-Math.sqrt(discriminant)/2,a+Math.sqrt(discriminant)/2]:[];
      const valid=roots.length===2&&roots.every(x=>x>0);
      assert.equal(valid,a>m+1,`${c.taskId}, a=${a}`);
    }
    assert.equal(byId.get(c.taskId).answerDisplay,`a > ${m+1}`);
  }
});

test("ЕГЭ №19: полный перебор натуральных решений подтверждает список, минимум и максимум", () => {
  for (const c of egeGeneratorCases.filter(c => byId.get(c.taskId).examNumber === 19)) {
    const m=c.parameters.multiplier, bound=m*m+m;
    const pairs=[];
    for(let x=1;x<=bound;x++)for(let y=x;y<=bound;y++)if(x*y===m*(x+y))pairs.push([x,y]);
    const task=byId.get(c.taskId);
    const displayPairs=[...task.answerDisplay.matchAll(/\((\d+); (\d+)\)/g)].map(match=>[Number(match[1]),Number(match[2])]);
    assert.deepEqual(displayPairs,pairs);
    const sums=pairs.map(([x,y])=>x+y);
    assert(task.answerDisplay.includes(`Минимальная сумма: ${Math.min(...sums)}`));
    assert(task.answerDisplay.includes(`максимальная: ${Math.max(...sums)}`));
  }
});

const supplementary = (number) => {
  const task = egeTasks.find((entry) => egeSupplementIds.includes(entry.id) && entry.examNumber === number);
  assert(task, `Missing individually written EGE ${number}`);
  return task;
};

test("ЕГЭ: семь новых подтипов, отдельное решение и ориентиры для каждого развёрнутого номера", () => {
  assert.equal(new Set(egeSupplementIds).size, 7);
  assert.deepEqual(egeSupplementIds.map((id) => byId.get(id).examNumber), [13, 14, 15, 16, 17, 18, 19]);
  for (const id of egeSupplementIds) {
    const task = byId.get(id);
    assert.equal(task.answerRule.type, "self");
    assert(task.solution.length >= 4 && task.selfCheckNotes.length >= 3);
    assert.equal(egeTasks.filter((entry) => entry.prototypeId === task.prototypeId).length, 1);
  }
});

test("ЕГЭ новый №13: все серии, отбор и корень на левом конце проверены подстановкой", () => {
  const roots = new Set();
  for (let n = -3; n <= 3; n++) for (const root of [Math.PI / 2 + Math.PI * n, Math.PI / 6 + 2 * Math.PI * n, 5 * Math.PI / 6 + 2 * Math.PI * n]) {
    close(Math.sin(2 * root), Math.cos(root));
    if (root >= -Math.PI / 2 - 1e-10 && root <= Math.PI + 1e-10) roots.add(fixed(root));
  }
  const selected = [...roots].map(Number).sort((a, b) => a - b);
  assert.equal(selected.length, 4);
  selected.forEach((x, index) => close(x, [-Math.PI / 2, Math.PI / 6, Math.PI / 2, 5 * Math.PI / 6][index]));
  assert.notEqual(Math.sin(2 * Math.PI), Math.cos(Math.PI));
  assert.match(supplementary(13).answerDisplay, /−π\/2; π\/6; π\/2; 5π\/6/);
});

test("ЕГЭ новый №14: расстояние до плоскости независимо вычислено через объём и векторное произведение", () => {
  const b = [6, 0, -4], c = [0, 6, -4]; // Vectors SB, SC, with A=(0,0,0), S=(0,0,4).
  const cross = [b[1] * c[2] - b[2] * c[1], b[2] * c[0] - b[0] * c[2], b[0] * c[1] - b[1] * c[0]];
  const sideFaceArea = Math.hypot(...cross) / 2;
  const volume = 6 * 6 / 2 * 4 / 3;
  const distance = 3 * volume / sideFaceArea;
  close(distance, 12 / Math.sqrt(17));
  close(12 / Math.hypot(2, 2, 3), distance); // Plane 2x+2y+3z=12.
  const bc = [-6, 6, 0], am = [3, 3, 0];
  close(bc.reduce((sum, value, index) => sum + value * am[index], 0), 0);
  assert.match(supplementary(14).answerDisplay, /12\/√17/);
});

test("ЕГЭ новый №15: исходные логарифмы проверены по допустимым аргументам и границам", () => {
  for (let x = -5; x <= 8; x += 0.125) {
    const valid = x - 1 > 0 && x + 1 > 0;
    const satisfies = valid && Math.log2(x - 1) + Math.log2(x + 1) <= 3 + 1e-12;
    assert.equal(satisfies, x > 1 && x <= 3);
  }
  assert.equal(Math.log2(2) + Math.log2(4), 3);
  assert.equal(supplementary(15).answerDisplay, "(1; 3]");
});

test("ЕГЭ новый №16: последовательное начисление и снятие подтверждает оба остатка", () => {
  const p = 20, q = 1 + p / 100;
  let balance = 200000;
  const balances = [];
  for (let year = 0; year < 2; year++) {
    balance *= q;
    assert(balance >= 50000);
    balance -= 50000;
    balances.push(balance);
  }
  assert.deepEqual(balances, [190000, 178000]);
  const D = 25 ** 2 + 4 * 100 * 114;
  const roots = [(25 - Math.sqrt(D)) / 200, (25 + Math.sqrt(D)) / 200];
  assert.deepEqual(roots.filter((root) => root >= 1), [1.2]);
  assert.match(supplementary(16).answerDisplay, /20%.*190 000.*178 000/);
});

test("ЕГЭ новый №17: проекции в координатах подтверждают окружность и длину хорды", () => {
  const a = [0, 12], b = [-5, 0], c = [9, 0], d = [0, 0];
  const project = (point, start, end) => {
    const direction = end.map((value, index) => value - start[index]);
    const t = direction.reduce((sum, value, index) => sum + value * (point[index] - start[index]), 0) / direction.reduce((sum, value) => sum + value * value, 0);
    assert(t > 0 && t < 1);
    return start.map((value, index) => value + t * direction[index]);
  };
  const p = project(d, a, b), q = project(d, a, c), circleCenter = [0, 6];
  for (const point of [a, p, d, q]) close(Math.hypot(point[0] - circleCenter[0], point[1] - circleCenter[1]), 6);
  close(Math.hypot(p[0] - q[0], p[1] - q[1]), 672 / 65);
  assert.match(supplementary(17).answerDisplay, /672\/65/);
});

test("ЕГЭ новый №18: независимое пересечение линейных участков проверяет число корней и слияние на границе", () => {
  const intervalRoots = (a) => {
    const f = (x) => Math.abs(x - 2) + Math.abs(x + 1) - a * x;
    const boundaries = [-1e6, -1, 2, 1e6];
    const roots = [];
    for (let index = 0; index < boundaries.length - 1; index++) {
      const left = boundaries[index], right = boundaries[index + 1], fLeft = f(left), fRight = f(right);
      if (fLeft === 0) roots.push(left);
      if (fRight === 0) roots.push(right);
      if (fLeft * fRight < 0) roots.push(left - fLeft * (right - left) / (fRight - fLeft));
    }
    return roots.sort((x, y) => x - y).filter((x, index, all) => index === 0 || Math.abs(x - all[index - 1]) > 1e-6);
  };
  for (let a = -5; a <= 5; a += 0.125) {
    const roots = intervalRoots(a);
    assert.equal(roots.length === 2, a > 1.5 && a < 2, `a=${a}, roots=${roots}`);
  }
  assert.equal(intervalRoots(1.5).length, 1);
  assert.equal(intervalRoots(2).length, 1);
  assert.equal(intervalRoots(-2).length, 0);
  assert.equal(supplementary(18).answerDisplay, "3/2 < a < 2");
});

test("ЕГЭ новый №19: полный конечный перебор подтверждает достижимость и оба экстремума", () => {
  const pairs = [];
  for (let x = 1; x < 37; x++) for (let y = 1; y < 37; y++) if (x + 2 * y === 37) pairs.push([x, y]);
  assert.equal(pairs.length, 18);
  assert(pairs.some(([x, y]) => x * y === 168));
  assert.equal(Math.max(...pairs.map(([x, y]) => x * y)), 171);
  assert.equal(Math.min(...pairs.map(([x, y]) => Math.abs(x - y))), 1);
  const t = supplementary(19);
  for (const part of ["(21; 8)", "171", "(19; 9)", "(13; 12)"]) assert(t.answerDisplay.includes(part));
});
