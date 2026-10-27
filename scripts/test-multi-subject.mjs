import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildMultiSubjectTasks, subjectInventory } from "./release-multi-subject.mjs";
import { structuralIssues } from "./import-tasks.mjs";
import { createContentLoader } from "./content-source-loader.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";

test("all 30 offered subject/exam/level pairs inventoried, eight supported batches have five reviewed items each",()=>{
  const tasks=buildMultiSubjectTasks(), inventory=subjectInventory(tasks);
  assert.equal(tasks.length,40);assert.equal(inventory.length,30);
  assert.equal(inventory.filter(r=>r.newTasks===5).length,8);
  assert.equal(inventory.filter(r=>r.readiness==="blocked-no-reviewed-exam-model").length,0);
  assert.equal(inventory.filter(r=>r.readiness==="reviewed-model-other-batch").length,22);
  const {checkTaskAnswer}=createContentLoader()("src/lib/tasks.ts");
  for(const t of tasks){
    assert.deepEqual(structuralIssues(t),[]);
    assert.equal(checkTaskAnswer(t.answerDisplay,t.answerRule).correct,true);
    assert.equal(checkTaskAnswer(t.answerRule.type==="text"?"неверныйответ":"999999999",t.answerRule).correct,false);
  }
  assert.ok(tasks.some(t=>t.conditionLatex));assert.ok(tasks.some(t=>t.answerRule.type==="choices"));assert.ok(tasks.some(t=>t.answerRule.type==="text"));
});
test("frozen 52-task pilot survives additional releases; all public IDs remain unique",()=>{
  const load=createContentLoader(), {taskPackageIndex}=load("src/lib/task-package-index.ts");
  const all=taskPackageIndex.flatMap(p=>{
    const body=readFileSync(new URL(`../public/task-packages/${p.file}`,import.meta.url),"utf8");
    assert.equal(createHash("sha256").update(body).digest("hex"),p.sha256);
    const tasks=JSON.parse(body);assert.deepEqual(tasks.map(t=>t.id),p.tasks.map(t=>t.id));return tasks;
  });
  const frozen=all.filter(t=>t.id.startsWith("multi-subject-")||t.id.startsWith("oge-informatics-pilot-"));
  assert.equal(frozen.length,52);assert.equal(new Set(all.map(t=>t.id)).size,all.length);
  assert.equal(all.filter(t=>t.id.startsWith("oge-informatics-pilot-")).length,12);
  for(const t of buildMultiSubjectTasks())assert.equal(contentFingerprint(all.find(x=>x.id===t.id)),contentFingerprint(t));
});
test("OGE Russian short answers belong to part two, not extended scoring; answers and solution views survive reload",()=>{
  const load=createContentLoader(), {registerTaskPackage}=load("src/lib/tasks.ts");
  const tasks=buildMultiSubjectTasks();registerTaskPackage(tasks);
  const task=tasks.find(t=>t.subjectId==="russian"&&t.examType[0]==="ОГЭ");
  assert.equal(task.part,2);
  const {appendCheckedAnswer}=load("src/lib/learning-mutations.ts");
  const {emptyLearningState,parseLearningState}=load("src/lib/learning-events.ts");
  const checked=appendCheckedAnswer(emptyLearningState,task,task.answerDisplay,true,"multi-russian-check");
  const view={...checked.state.events[0],kind:"solution_viewed",id:"multi-view",attemptId:"multi-russian-check"};delete view.answer;delete view.correct;
  const restored=parseLearningState(JSON.stringify({...checked.state,events:[...checked.state.events,view]}));
  assert.equal(restored.events.length,2);assert.equal(restored.events[0].answerFormat,"short");assert.equal(restored.events[1].subjectId,"russian");
});
