import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContentLoader,projectRoot } from "./content-source-loader.mjs";
const load=createContentLoader(),view=load("src/lib/practice-view.ts"),bank=load("src/lib/tasks.ts"),practice=load("src/lib/practice.ts");
const {emptyLearningState}=load("src/lib/learning-events.ts"),{emptyGameState,recordSelfAssessment}=load("src/lib/gamification.ts");
const {appendCheckedAnswer}=load("src/lib/learning-mutations.ts"),{getTaskXPScoringRule}=load("src/lib/exam-scores.ts");
const fresh=()=>({...emptyLearningState,events:[],legacyRecords:[],game:emptyGameState()});
const task=bank.tasks.find(t=>t.id==="triangle-sine");

test("viewing, skipping, drafts and wrong answers do not complete tasks or mutate learning/XP",()=>{
  const state=fresh(),before=JSON.stringify(state);
  const draft={...practice.emptyTaskState(),answer:"-"};
  assert.equal(view.practiceStatus(view.practiceStatuses(state),task.id).completed,false);
  assert.equal(view.practiceStatus(view.practiceStatuses(state,{[task.id]:draft}),task.id).kind,"draft");
  assert.equal(JSON.stringify(state),before);
  const wrong=appendCheckedAnswer(state,task,"99",false,"view-wrong",false,"2026-10-28T12:00:00.000Z").state;
  assert.equal(view.practiceStatus(view.practiceStatuses(wrong),task.id).kind,"incorrect");
  assert.deepEqual(view.visiblePracticeIds([task.id],view.practiceStatuses(wrong),true),[task.id]);
  const correct=appendCheckedAnswer(wrong,task,"0.8",true,"view-correct",false,"2026-10-28T12:01:00.000Z").state;
  assert.deepEqual(view.visiblePracticeIds([task.id],view.practiceStatuses(correct),true),[]);
  assert.deepEqual(view.visiblePracticeIds([task.id],view.practiceStatuses(correct),false),[task.id]);
  assert.equal(appendCheckedAnswer(correct,task,"0.8",true,"view-correct").xpAwarded,0);
});
test("legacy correct results survive filtering; an unchecked form never invents a completion",()=>{
  const state={...fresh(),legacyRecords:[{taskId:task.id,correct:true,attempts:1}]};
  assert.equal(view.practiceStatus(view.practiceStatuses(state),task.id).completed,true);
  const forged={...practice.emptyTaskState(),answer:"99",attempt:{id:"forged",correct:true}};
  assert.equal(view.practiceStatus(view.practiceStatuses(fresh(),{[task.id]:forged}),task.id).completed,false);
});
test("only a committed self-assessment, including zero, completes a self-check without claiming expert correctness",()=>{
  const self=load("src/lib/task-placement.ts").getTaskOrigin(bank.getPracticeBankView().find(t=>t.answerRule.type==="self"&&getTaskXPScoringRule(t)));
  assert.ok(self);
  const draft={...practice.emptyTaskState(),selfWork:"Мой черновик",selfDraftScore:1,selfSolutionVisible:true};
  assert.equal(view.practiceStatus(view.practiceStatuses(fresh(),{[self.id]:draft}),self.id).completed,false);
  const rule=getTaskXPScoringRule(self);
  const event={kind:"self_assessed",id:"view-self-zero",taskId:self.id,subjectId:self.subjectId,examType:self.examType[0],level:self.level,examNumber:self.examNumber,examVersionId:self.examVersionId,examYear:self.examYear,part:2,answerFormat:"extended",createdAt:"2026-10-28T12:00:00.000Z",score:0,maxScore:rule.maxPrimaryScore};
  const state=fresh();state.game=recordSelfAssessment(state.game,event,[],rule);
  const status=view.practiceStatus(view.practiceStatuses(state),self.id);
  assert.equal(status.completed,true);assert.equal(status.kind,"self-assessed");assert.match(status.label,/Самопроверка: 0/);
  assert.equal(state.game.xpEvents[0].xp,0);assert.deepEqual(state.game.checks,[]);
});
test("view preferences are bounded, lossless and separate from drafts/events; defaults hide solved",()=>{
  assert.deepEqual(view.parsePracticeView(null),{version:1,mode:"one",hideSolved:true,positions:{}});
  const value={version:1,mode:"feed",hideSolved:false,positions:{number9:{page:2,top:356,ancestors:[0,456]}}};
  assert.deepEqual(view.parsePracticeView(JSON.stringify(value)),value);
  assert.throws(()=>view.parsePracticeView('{"version":99,"positions":{}}'));
  const invalid={...value,positions:{bad:{page:-1,top:Infinity,ancestors:[]}}};
  assert.deepEqual(view.parsePracticeView(JSON.stringify(invalid)).positions,{});
});
test("feed renders bounded pages without duplicate/wrapping IDs or loops at an empty result",()=>{
  const ids=Array.from({length:35},(_,i)=>`task-${i}`);
  assert.equal(view.practicePage(ids,0).ids.length,12);
  assert.equal(view.practicePage(ids,1).ids.length,12);
  assert.equal(view.practicePage(ids,2).ids.length,11);
  assert.deepEqual(view.practicePage(ids,999).ids,ids.slice(24));
  assert.deepEqual(view.practicePage([],999),{page:0,ids:[],previous:false,next:false});
});
test("saved candidate lists do not preload every condition; real v1/v2 drafts, anchors, bookmarks and mock IDs still hydrate",()=>{
  const {savedTaskIds}=load("src/lib/task-packages.ts");
  const input={version:2,sessions:{a:{selection:{mode:"number"},taskIds:["candidate-one","anchor","candidate-three"],lastPosition:1,states:{"legacy-draft":{answer:"1"}}}},taskStates:{"shared-draft":{answer:"2"}},events:[{taskId:"checked-task"}],bookmarks:[{kind:"task",itemId:"bookmarked-task"}],mock:{taskIds:["mock-task"]}};
  assert.deepEqual(new Set(savedTaskIds([JSON.stringify(input)])),new Set(["anchor","legacy-draft","shared-draft","checked-task","bookmarked-task","mock-task"]));
});
test("metadata candidates, session order and reload remain stable while only the requested immutable shards load",async()=>{
  const freshLoad=createContentLoader(),b=freshLoad("src/lib/tasks.ts"),p=freshLoad("src/lib/practice.ts"),storage=freshLoad("src/lib/practice-storage.ts"),packages=freshLoad("src/lib/task-packages.ts");
  const selected=p.normalizeCatalogSelection({exam:"ЕГЭ",subjectId:"math",level:"profile",mode:"number",examNumber:13});
  const ids=p.practiceTaskIds(selected),first=ids.slice(0,12);
  assert.equal(ids.length,b.getPracticeTaskCount({...selected,examType:selected.exam}));
  assert.ok(ids.length>12);
  const session=p.createPracticeSession("metadata-view",selected);
  assert.deepEqual(session.taskIds,ids);
  const previousFetch=globalThis.fetch,requested=[];
  globalThis.fetch=async url=>{requested.push(String(url));return new Response(readFileSync(resolve(projectRoot,"public",String(url).replace(/^\//,"")),"utf8"));};
  try{
    await packages.ensureTaskIds(first);
    assert.deepEqual(p.practiceTaskIds(selected),ids);
    const index=freshLoad("src/lib/task-package-index.ts").taskPackageIndex;
    assert.equal(requested.length,index.filter(entry=>entry.tasks.some(t=>first.includes(t.id))).length);
    assert.ok(requested.length<index.filter(entry=>entry.tasks.some(t=>ids.includes(t.id))).length);
    const stored={version:2,catalog:selected,sessions:{[session.id]:session},activeId:session.id,taskStates:{}};
    assert.deepEqual(storage.parseStoredPractice(storage.serializeStoredPractice(stored)).sessions[session.id].taskIds,ids);
  }finally{globalThis.fetch=previousFetch;}
});
