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
const { challengeTasks, challengePrototypes, challengeGeneratorCases } = await import(await load(new URL("src/lib/content/challenge-bank.ts", root)));
const { checkTaskAnswer } = await import(await load(new URL("src/lib/tasks.ts", root)));
const byId = new Map(challengeTasks.map(t=>[t.id,t]));
const fixed=(value)=>String(Number(value.toFixed(9)));

test("Усложнённые задания: 12 стабильных уникальных вариантов, 4 существующие темы и тот же максимум 1 XP",()=>{
  assert.equal(challengeTasks.length,12);
  assert.equal(challengePrototypes.length,4);
  assert.equal(new Set(challengeTasks.map(t=>t.id)).size,12);
  assert.equal(new Set(challengeTasks.map(t=>t.prompt+t.conditionLatex)).size,12);
  for(const prototype of challengePrototypes) assert.equal(challengeTasks.filter(t=>t.prototypeId===prototype.id).length,3);
  for(const t of challengeTasks){
    assert.equal(t.part,1);assert.equal(t.difficulty,"advanced");assert.equal(t.scoring.maxPrimaryScore,1);
    assert.equal(t.answerRule.type,"number");assert.equal(t.source.kind,"author");
    assert.match(t.source.label,/без калибровки/);
    assert(t.solution.length>=3);
    assert.equal(t.topicId,`${t.examType[0]==="ОГЭ"?"oge":"ege-profile"}-number-${t.examNumber}`);
  }
});

test("Сложные дроби: независимое рациональное вычисление и проверка неправильного порядка действий",()=>{
  for(const c of challengeGeneratorCases.filter(c=>c.family==="oge-6-multi-step-fractions")){
    const {k}=c.parameters,t=byId.get(c.taskId);
    // Rational arithmetic through common denominators, without the generator's answer formula.
    const firstNumerator=k*3+2, firstDenominator=6;
    const quotientNumerator=firstNumerator*6, quotientDenominator=firstDenominator*5;
    const resultNumerator=quotientNumerator*4-k*quotientDenominator, resultDenominator=quotientDenominator*4;
    assert.equal(checkTaskAnswer(`${resultNumerator}/${resultDenominator}`,t.answerRule).correct,true);
    assert.equal(checkTaskAnswer(fixed(resultNumerator/resultDenominator).replace(".",","),t.answerRule).correct,true);
    const wrong=k/2+(1/3)/(5/6)-k/4;
    assert.equal(checkTaskAnswer(fixed(wrong),t.answerRule).correct,false);
  }
});

test("Рациональное уравнение: найден правильный корень, запрещённый корень отвергнут",()=>{
  for(const c of challengeGeneratorCases.filter(c=>c.family==="oge-9-rational-domain")){
    const {sum,product,forbidden}=c.parameters,t=byId.get(c.taskId);
    const D=sum**2-4*product;
    assert(D>0);
    const roots=[(sum-Math.sqrt(D))/2,(sum+Math.sqrt(D))/2];
    const accepted=roots.filter(x=>x!==forbidden);
    assert.equal(accepted.length,1);
    assert.equal((accepted[0]**2-sum*accepted[0]+product)/(accepted[0]-forbidden),0);
    assert.equal(checkTaskAnswer(String(accepted[0]),t.answerRule).correct,true);
    assert.equal(checkTaskAnswer(String(forbidden),t.answerRule).correct,false);
  }
});

test("Логарифмическое уравнение: корни вычислены независимо и проверены в исходных логарифмах",()=>{
  for(const c of challengeGeneratorCases.filter(c=>c.family==="ege-6-logarithm-domain")){
    const {firstShift:a,secondShift:b,argument:m}=c.parameters,t=byId.get(c.taskId);
    const sum=a+b,constant=a*b-m,D=sum**2-4*constant;
    const roots=[(sum-Math.sqrt(D))/2,(sum+Math.sqrt(D))/2];
    const valid=roots.filter(x=>x>a&&x>b);
    assert.equal(valid.length,1);
    const x=valid[0];
    assert(Math.abs(Math.log2(x-a)+Math.log2(x-b)-Math.log2(m))<1e-10);
    assert.equal(checkTaskAnswer(String(x),t.answerRule).correct,true);
    const invalid=roots.find(x=>x<=Math.max(a,b));
    assert.equal(checkTaskAnswer(String(invalid),t.answerRule).correct,false);
  }
});

test("Сопряжённые выражения: непосредственное вычисление и все формулы проходят проверку",()=>{
  for(const c of challengeGeneratorCases.filter(c=>c.family==="ege-7-conjugate-fractions")){
    const {firstRadicand:a,secondRadicand:b,exponent:k}=c.parameters,t=byId.get(c.taskId);
    assert(a>0&&b>0&&a!==b);
    const u=Math.sqrt(a),v=Math.sqrt(b);
    const expected=(u+v)/(u-v)+(u-v)/(u+v)+(1/2)**(-k);
    assert.equal(checkTaskAnswer(fixed(expected),t.answerRule).correct,true);
    assert.equal(checkTaskAnswer(fixed(expected+1),t.answerRule).correct,false);
  }
  for(const t of challengeTasks)for(const formula of[t.conditionLatex,...t.solution.map(s=>s.latex)].filter(Boolean)){
    assert.doesNotThrow(()=>katex.renderToString(formula,{throwOnError:true,strict:"error"}),t.id);
  }
});
