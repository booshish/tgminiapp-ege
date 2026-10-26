import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContentLoader } from "./content-source-loader.mjs";
import { buildScienceTasks,scienceEntries,verifyScience,ohmTemplate,carbonateTemplate,solutionTemplate,remainingDirectionsProgress } from "./release-science-stage-a.mjs";
import { structuralIssues } from "./import-tasks.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";

test("three reviewed-copy models have exact contiguous numbers, confirmed draft totals and expert/resource boundaries",()=>{
  const {scienceModels}=createContentLoader()("src/lib/content/science-models.ts");
  assert.equal(scienceModels.length,3);
  for(const [id,count,max,short] of [["oge-physics",22,39,16],["oge-chemistry",23,38,19],["ege-chemistry",34,56,28]]){
    const m=scienceModels.find(x=>x.id===id);assert.ok(m.available);assert.equal(m.verificationStatus,"draft-source-reviewed");
    assert.equal(m.numbers.length,count);assert.deepEqual(m.numbers.map(n=>n.number),Array.from({length:count},(_,i)=>i+1));
    assert.equal(m.numbers.reduce((n,x)=>n+x.maxPrimaryScore,0),max);assert.equal(m.maxPrimaryScore,max);
    assert.equal(m.numbers.filter(n=>n.evaluation.mode==="automatic").length,short);
    assert.ok(m.numbers.filter(n=>n.number>short).every(n=>n.answerFormat==="extended"&&n.answerRuleTypes[0]==="self"&&n.pendingReason));
    assert.ok(m.numbers.every(n=>n.sourceReference.pdfPage>0&&n.evaluation.criteriaPdfPage>0));
  }
  assert.ok(scienceModels[0].numbers[16].requiredResources.length);
  assert.ok(scienceModels[1].numbers[22].requiredResources.length);
});
test("15 actual exercises independently satisfy unit/balance constraints; no fake seed needed, unknown formats still fail",()=>{
  const tasks=buildScienceTasks();assert.equal(tasks.length,15);
  const load=createContentLoader(), {checkTaskAnswer}=load("src/lib/tasks.ts"), {getTaskXPScoringRule}=load("src/lib/exam-scores.ts");
  tasks.forEach((t,i)=>{
    verifyScience(t,scienceEntries[i]);assert.deepEqual(structuralIssues(t),[]);
    assert.equal(checkTaskAnswer(t.answerDisplay,t.answerRule).correct,true);assert.equal(checkTaskAnswer("99999999",t.answerRule).correct,false);
    assert.equal(getTaskXPScoringRule(t),null); // Do not invent XP rates for new exam versions.
  });
  for(const patch of [{examNumber:99},{examType:{0:"ОГЭ",length:1}},{examVersionId:"invented"},{topicId:"unknown"},{scoring:{status:"verified",maxPrimaryScore:9}},{answerRule:{type:"text",value:"7"},answerFormat:"text"}]) assert.ok(structuralIssues({...tasks[0],...patch}).length);
  for(const [u,r] of [[12,8],[24,16],[9,3]]){
    const entry=ohmTemplate(u,r), changed={...tasks[3],answerDisplay:entry[3]};verifyScience(changed,entry);
  }
  assert.throws(()=>ohmTemplate(12,0));
  for(const entry of [carbonateTemplate(250),carbonateTemplate(500),solutionTemplate(100,5,100,15),solutionTemplate(150,10,50,18)])verifyScience({id:"parameter-check",answerDisplay:entry[3]},entry);
  assert.throws(()=>carbonateTemplate(-10));assert.throws(()=>solutionTemplate(100,120,100,5));assert.throws(()=>solutionTemplate(100,90,100,5));assert.throws(()=>ohmTemplate(1,3));
  const inventory=remainingDirectionsProgress();assert.equal(inventory.length,22);assert.equal(inventory.filter(r=>r.newReleaseTasks===5).length,3);assert.equal(inventory.filter(r=>r.modelStatus==="not-reviewed").length,19);
  // Parse the actual published reaction strings, rather than compare hand-entered equal vectors.
  const totals=side=>side.split("+").reduce((total,term)=>{
    const normalized=term.replace(/[₀-₉]/g,c=>String("₀₁₂₃₄₅₆₇₈₉".indexOf(c))).replace(/\((г|ж|тв)\)/g,"").replace(/\s/g,"");
    const [,coefficient="",formula]=normalized.match(/^(\d*)([A-Z].*)$/);
    const atoms=[...formula.matchAll(/([A-Z][a-z]?)(\d*)/g)];assert.equal(atoms.map(a=>a[0]).join(""),formula);
    for(const [,element,n] of atoms)total[element]=(total[element]??0)+Number(coefficient||1)*Number(n||1);
    return total;
  },{});
  const reactions=[scienceEntries[12][2].split("уравнению ")[1].split(" + 572")[0],scienceEntries[13][2].split("уравнению ")[1].split(" требуется")[0],scienceEntries[14][2].split("Реакция: ")[1].split(". M")[0]];
  for(const reaction of reactions){const [left,right]=reaction.split(/[=→]/);assert.deepEqual(totals(left),totals(right));}
});
test("science shards load by number, preserve existing bank, bookmarks and checked state after reload",async()=>{
  const load=createContentLoader(), {ensureTaskPackages}=load("src/lib/task-packages.ts"), bank=load("src/lib/tasks.ts");
  const before=bank.practiceBank.map(t=>t.id), fetchOriginal=globalThis.fetch;
  const {taskPackageIndex}=load("src/lib/task-package-index.ts");
  const ids=taskPackageIndex.flatMap(p=>p.tasks.map(t=>t.id));assert.equal(ids.length,67);assert.equal(new Set(ids).size,67);
  const target=buildScienceTasks().find(t=>t.subjectId==="chemistry"&&t.examType[0]==="ЕГЭ");
  globalThis.fetch=async(url)=>new Response(readFileSync(new URL(`../public${url}`,import.meta.url),"utf8"));
  try{
    await ensureTaskPackages({examType:target.examType[0],subjectId:target.subjectId,examNumber:target.examNumber});
    const loaded=bank.getPracticeTasks({examType:"ЕГЭ",subjectId:"chemistry",examNumber:26});assert.equal(loaded.length,2);
    assert.deepEqual(bank.practiceBank.slice(0,before.length).map(t=>t.id),before);
    assert.equal(bank.getPracticeTasks({examType:"ОГЭ",subjectId:"chemistry",examNumber:18}).length,0);
    const {isAvailableTask}=load("src/lib/study-tools.ts");assert.equal(isAvailableTask(loaded[0]),true);
    const {emptyLearningState,parseLearningState}=load("src/lib/learning-events.ts"), {appendCheckedAnswer}=load("src/lib/learning-mutations.ts");
    const saved=appendCheckedAnswer(emptyLearningState,loaded[0],loaded[0].answerDisplay,true,"science-check").state;
    const restored=parseLearningState(JSON.stringify(saved));assert.equal(restored.events[0].subjectId,"chemistry");assert.deepEqual(restored.game,saved.game);
    const expected=buildScienceTasks().find(t=>t.id===loaded[0].id);assert.equal(contentFingerprint(expected),contentFingerprint(loaded[0]));
  }finally{globalThis.fetch=fetchOriginal;}
});
