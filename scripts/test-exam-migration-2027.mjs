import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";
import { examMigrationReport } from "./exam-migration-report.mjs";
const load=createContentLoader(),old=createContentLoader({revision:"bb955610022931b4210e8f133c0a17137813ae76"});
const source=load("src/lib/tasks.ts"),{getTaskView,getTaskOrigin}=load("src/lib/task-placement.ts");
const exams=load("src/lib/exams.ts"),engine=load("src/lib/mock-exam.ts");
const current=(level="profile",examType="ЕГЭ")=>exams.getExamDefinition({examType,subjectId:"math",level:examType==="ОГЭ"?null:level});
const start=Date.parse("2026-10-27T12:00:00Z");

test("all 30 active draft models: 825 consecutive slots, parts, formats, durations and exact primary totals",()=>{
  const report=examMigrationReport();assert.equal(report.directions.length,30);assert.equal(report.totals.positions,825);assert.equal(report.totals.officiallyChanged,6);
  assert.equal(report.totals.newlyHeld,5);assert.equal(report.newTasks,0);
  for(const d of report.directions){assert.ok(d.version.includes("2027-draft"));assert.ok(d.durationMinutes||d.sessions.length);assert.equal(d.status,"2027-draft-numbered-plan-reviewed-not-full-rubric-certification");}
  const p=current();assert.equal(p.numbers.length,20);assert.equal(p.maxPrimaryScore,33);assert.equal(p.durationMinutes,235);
  assert.deepEqual(p.numbers.map(n=>n.part),[...Array(13).fill(1),...Array(7).fill(2)]);
  assert.deepEqual(p.numbers.map(n=>n.maxPrimaryScore),[...Array(13).fill(1),2,3,2,2,3,4,4]);
});
test("all authored task bodies, IDs, order, answer keys and 124 immutable shards match the previous release",()=>{
  assert.equal(source.practiceBank.length,1816);
  const previous=old("src/lib/tasks.ts").practiceBank;
  assert.deepEqual(source.practiceBank.map(t=>t.id),previous.map(t=>t.id));
  source.practiceBank.forEach((t,i)=>assert.equal(contentFingerprint(t),contentFingerprint(previous[i]),t.id));
  const index=load("src/lib/task-package-index.ts").taskPackageIndex;
  const priorIndex=old("src/lib/task-package-index.ts").taskPackageIndex;
  assert.deepEqual(index.slice(0,priorIndex.length),priorIndex);
  assert.equal(priorIndex.length,124);let count=0;
  for(const p of priorIndex){const bytes=readFileSync(resolve(projectRoot,"public/task-packages",p.file));assert.equal(createHash("sha256").update(bytes).digest("hex"),p.sha256);count+=JSON.parse(bytes).length;}
  assert.equal(count,151);
});
test("profile placement uses skills: extrema→9, functions→12; extended finance never masquerades as short №13",()=>{
  for(const t of source.tasks.filter(t=>t.level==="profile"&&t.examNumber!==null)){
    const view=getTaskView(t);assert.equal(view.id,t.id);assert.equal(view.prompt,t.prompt);assert.equal(getTaskOrigin(view).examNumber,t.examNumber);
    if(t.examNumber===12)assert.equal(view.examNumber,9,t.id);
    if(t.examNumber===11)assert.equal(view.examNumber,12,t.id);
    if(t.examNumber===16){assert.equal(view.examNumber,null);assert.equal(view.availability,"history-only");}
  }
  for(const number of [6,13,17])assert.equal(source.getPracticeTasks({examType:"ЕГЭ",level:"profile",examNumber:number}).length,0);
  assert.equal(source.getPracticeTasks({examType:"ЕГЭ",level:"profile"}).some(t=>t.availability==="history-only"),false);
});
test("base source families, not blind numbering: formulas→4, applied→2, fraction calculations→1",()=>{
  const cases=load("src/lib/content/base-bank.ts").baseGeneratorCases;
  for(const c of cases){const t=source.tasks.find(t=>t.id===c.taskId),view=getTaskView(t);
    if(t.examNumber===2)assert.equal(view.examNumber,4);
    if(t.examNumber===4||t.examNumber===1&&["signed-change","packages","time-units"].includes(c.family))assert.equal(view.examNumber,2);
    if(t.examNumber===1&&c.family==="fraction-product"){assert.equal(view.examNumber,1);assert.equal(view.activeTheoryTopicId,"ege-base-number-14");}
  }
});
test("XP/journal retain the original identity and deduplicate checks despite presentation renumbering",()=>{
  const {appendCheckedAnswer}=load("src/lib/learning-mutations.ts"),{emptyLearningState,parseLearningState}=load("src/lib/learning-events.ts");
  const {getTaskXPScoringRule}=load("src/lib/exam-scores.ts");
  for(const t of source.tasks.filter(t=>getTaskView(t).examNumber!==t.examNumber&&t.answerRule.type==="number").slice(0,25)){
    const view=getTaskView(t),id=`migration-${t.id}`;
    assert.deepEqual(getTaskXPScoringRule(view),getTaskXPScoringRule(t));
    const a=appendCheckedAnswer(emptyLearningState,t,t.answerRule.value,true,id,false,new Date(start).toISOString());
    const b=appendCheckedAnswer(emptyLearningState,view,t.answerRule.value,true,id,false,new Date(start).toISOString());
    assert.deepEqual(b,a);assert.equal(b.state.events[0].examNumber,t.examNumber);
    assert.equal(appendCheckedAnswer(b.state,view,t.answerRule.value,true,id).xpAwarded,0);
    assert.deepEqual(parseLearningState(JSON.stringify(b.state)),b.state);
  }
});
test("numbered drafts migrate by stable ID once; archived finance drafts remain accessible but not current practice",()=>{
  const {parseStoredPractice,serializeStoredPractice}=load("src/lib/practice-storage.ts"),{emptyTaskState,findRecentPracticeSession}=load("src/lib/practice.ts");
  for(const number of [6,12,16,19]){
    const t=source.tasks.find(t=>t.level==="profile"&&t.examNumber===number),view=getTaskView(t);
    const selection={exam:"ЕГЭ",subjectId:"math",level:"profile",mode:"number",examNumber:number,part:t.part};
    const draft={...emptyTaskState(),answer:t.answerRule.type==="self"?"":"-",selfWork:"Сохранённое решение",selfDraftScore:1};
    const session={id:`saved-${number}`,selection,taskIds:[t.id],lastTaskId:t.id,lastPosition:0,states:{}};
    const parsed=parseStoredPractice(JSON.stringify({version:2,catalog:selection,sessions:{[session.id]:session},activeId:session.id,taskStates:{[t.id]:draft}}));
    assert.equal(parsed.sessions[session.id].lastTaskId,t.id);assert.equal(parsed.taskStates[t.id].answer,draft.answer);
    if(number===16){assert.equal(parsed.sessions[session.id].historicalContext,true);assert.equal(parsed.taskStates[t.id].selfWork,draft.selfWork);assert.equal(findRecentPracticeSession(parsed.sessions,selection),undefined);}
    else {assert.equal(parsed.sessions[session.id].selection.examNumber,view.examNumber);assert.equal(parsed.catalog.examNumber,view.examNumber);}
    assert.deepEqual(parseStoredPractice(serializeStoredPractice(parsed)),parsed);
  }
});
test("historical 19-question attempt preserves IDs, deadline, answers and self-score after active migration",()=>{
  const d=exams.getLegacyExamDefinition({examType:"ЕГЭ",subjectId:"math",level:"profile"});
  let session=engine.createMockSession("historical-profile",d,source.tasks,[],start,1);
  session=engine.updateMockAnswer(session,session.taskIds[0],"3",start+100);
  const restored=engine.parseMockState(JSON.stringify({version:1,activeId:session.id,sessions:[session]}),source.tasks,exams.historicalExamDefinitions).sessions[0];
  assert.deepEqual(restored.taskIds,session.taskIds);assert.equal(restored.taskIds.length,19);assert.equal(restored.deadline,session.deadline);assert.deepEqual(restored.answers,session.answers);
  const finished=engine.finishMockSession(restored,source.tasks,start+1000);
  const extended=source.tasks.find(t=>t.id===finished.taskIds[15]);
  const graded=engine.setMockSelfScore({...finished,revealedTaskIds:[extended.id]},extended,1);
  const reloaded=engine.parseMockState(JSON.stringify({version:1,activeId:graded.id,sessions:[graded]}),source.tasks,exams.historicalExamDefinitions).sessions[0];
  assert.deepEqual(reloaded.selfScores,graded.selfScores);assert.equal(reloaded.examVersionId,d.versionId);
});
test("current base has five complete 21-task/180-minute variants; incomplete profile/OGE cannot start as full 2027 exams",()=>{
  const base=current("base"),variants=engine.getMockVariants(base,source.tasks);
  assert.equal(variants.length,5);
  const session=engine.createMockSession("current-base",base,source.tasks,[],start,1);
  assert.equal(session.taskIds.length,21);assert.equal(session.durationMinutes,180);
  const view=source.getPracticeBankView();assert.deepEqual(session.taskIds.map(id=>view.find(t=>t.id===id).examNumber),Array.from({length:21},(_,i)=>i+1));
  const restored=engine.parseMockState(JSON.stringify({version:1,activeId:session.id,sessions:[session]}),source.tasks,exams.historicalExamDefinitions).sessions[0];assert.deepEqual(restored,session);
  let answered=session;for(const id of session.taskIds)answered=engine.updateMockAnswer(answered,id,view.find(t=>t.id===id).answerRule.value,start+1);
  const finished=engine.finishMockSession(answered,source.tasks,start+100);
  assert.equal(engine.mockScoreSummary(finished,source.tasks).total,21);
  for(const d of [current(),current(null,"ОГЭ")]){assert.equal(engine.getMockCoverage(d,source.tasks).canStart,false);assert.equal(engine.getMockVariants(d,source.tasks).length,0);assert.throws(()=>engine.createMockSession("incomplete",d,source.tasks,[],start));}
});
test("theory keeps bookmark/material IDs and bodies but moves number bindings; no fake random-variable article",()=>{
  const theory=load("src/lib/theory.ts"),prior=old("src/lib/theory.ts");
  assert.deepEqual(theory.allTheoryTopics,prior.allTheoryTopics);
  for(const [id,number]of [["ege-profile-number-12",9],["ege-profile-number-11",12],["ege-profile-number-19",20],["ege-base-number-2",4]]){
    const topic=theory.getTheoryTopic(id),raw=theory.allTheoryTopics.find(t=>t.id===id);assert.equal(topic.id,id);assert.ok(topic.examNumbers.includes(number));assert.deepEqual(topic.sections,raw.sections);assert.equal(topic.materialId,raw.materialId);
  }
  assert.equal(theory.getPublishedTheoryTopics().some(t=>t.level==="profile"&&t.examNumbers?.includes(6)),false);
});
test("bookmarks to newly held finance survive; they do not become current recommendation candidates",()=>{
  const {resolveBookmark,isAvailableTask}=load("src/lib/study-tools.ts");
  const task=source.tasks.find(t=>t.level==="profile"&&t.examNumber===16),view=getTaskView(task);
  assert.equal(isAvailableTask(view),false);
  assert.equal(resolveBookmark({kind:"task",itemId:task.id,examType:"ЕГЭ"},{tasks:[view],topics:[]}).id,task.id);
  const {createPracticeSession}=load("src/lib/practice.ts");
  assert.deepEqual(createPracticeSession("archived-open",{exam:"ЕГЭ",subjectId:"math",level:"profile",mode:"topic",topicId:task.topicId},task.id).taskIds,[task.id]);
});
test("new 2027 metadata is supported; unreviewed legacy IDs cannot bypass the crosswalk",()=>{
  const {getMetadataPlacement}=load("src/lib/task-placement.ts");
  assert.equal(getMetadataPlacement({id:"unreviewed-legacy",subjectId:"math",examNumber:16}).available,false);
  assert.deepEqual(getMetadataPlacement({id:"future-reviewed-2027",subjectId:"math",examNumber:6,examYear:2027,examVersionId:"ege-math-profile-2027-draft"}),{number:6,available:true});
});
test("lazy loading selects relocated package by current number and still validates the original immutable bytes",async()=>{
  const fresh=createContentLoader(),bank=fresh("src/lib/tasks.ts"),{ensureTaskPackages}=fresh("src/lib/task-packages.ts");
  const original=globalThis.fetch,requests=[];
  globalThis.fetch=async url=>{requests.push(url);return new Response(readFileSync(resolve(projectRoot,"public",String(url).replace(/^\//,"")),"utf8"));};
  try {
    const filter={examType:"ЕГЭ",subjectId:"informatics",examNumber:13};
    const count=bank.getPracticeTaskCount(filter);await ensureTaskPackages(filter);
    const raw=bank.practiceBank.find(t=>t.id==="multi-subject-20261026-25");assert.ok(raw);assert.equal(raw.examNumber,23);
    assert.equal(bank.getPracticeTasks(filter).find(t=>t.id===raw.id).examNumber,13);assert.equal(bank.getPracticeTasks({...filter,examNumber:23}).some(t=>t.id===raw.id),false);
    assert.equal(bank.getPracticeTaskCount(filter),count);assert.equal(bank.getPracticeTasks(filter).length,count);const before=requests.length;await ensureTaskPackages(filter);assert.equal(requests.length,before);
    const firstMathRequest=requests.length;await ensureTaskPackages({examType:"ЕГЭ",subjectId:"math",level:"profile",examNumber:7});
    const profilePackages=fresh("src/lib/task-package-index.ts").taskPackageIndex.filter(p=>requests.slice(firstMathRequest).some(url=>String(url).endsWith(p.file)));
    assert.ok(profilePackages.length>0);assert.ok(profilePackages.every(p=>p.tasks.every(t=>t.subjectId==="math"&&t.level==="profile")));
    assert.ok(bank.getPracticeTasks({examType:"ЕГЭ",subjectId:"math",level:"profile",examNumber:7}).some(t=>t.originExam?.examNumber===6));
  }finally{globalThis.fetch=original;}
});
