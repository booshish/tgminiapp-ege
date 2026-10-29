import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {createContentLoader,projectRoot} from './content-source-loader.mjs';
import {generateProfileBatch,profileFamilies} from './profile-math-generators.mjs';
import {verifyProfileRows,profileInventory,profilePrefix} from './release-profile-math.mjs';
import {publishedCorpus,structuralIssues} from './import-tasks.mjs';
import {contentFingerprint} from './content-review-evidence.mjs';
import {generationAudit,planSubtypeGeneration} from './exam-generation-audit.mjs';

const read=file=>JSON.parse(readFileSync(resolve(projectRoot,file),'utf8'));
const release=read('docs/profile-math-release.json'),receipt=read('docs/profile-math-verification.json');
const rows=generateProfileBatch(),byId=new Map(rows.map(r=>[r.task.id,r])),all=publishedCorpus(),tasks=all.filter(t=>t.id.startsWith(profilePrefix));
test('all 2840 actual original candidates pass a separate Python/SymPy answer and bounded-proof verifier',()=>{
  assert.equal(rows.length,2840);assert.equal(profileFamilies.length,41);
  assert.deepEqual(verifyProfileRows(rows),receipt.independent);
  for(const [file,sha]of Object.entries(receipt.implementationSha256))assert.equal(createHash('sha256').update(readFileSync(resolve(projectRoot,file))).digest('hex'),sha,file);
});
test('control verifier rejects corrupted short keys and extended answers, rather than trusting generator flags',()=>{
  const short=structuredClone(rows.find(r=>r.task.examNumber===6));short.task.answerRule.value='999999';
  assert.throws(()=>verifyProfileRows([short]),/Independent QA failed/);
  const long=structuredClone(rows.find(r=>r.task.examNumber===17));long.task.answerDisplay='Wrong answer';
  assert.throws(()=>verifyProfileRows([long]),/Independent QA failed/);
  assert.throws(()=>generateProfileBatch({perFamily:0}));assert.throws(()=>generateProfileBatch({number:6,subtype:'loan'}));
});
test('the existing importer published exactly the accepted 2036 rows and excluded 804 duplicates without weakening gates',()=>{
  assert.deepEqual(release.counts,{found:2840,rightsAllowed:2036,staged:2036,duplicates:804,rejected:0,review:0});
  assert.equal(tasks.length,2036);assert.equal(new Set(tasks.map(t=>t.id)).size,2036);
  assert.equal(release.stagingOnly,0);assert.deepEqual(tasks.map(t=>t.id).sort(),[...release.approvedIds].sort());
  const statements=new Set();
  for(const t of tasks){
    assert.equal(contentFingerprint(t),contentFingerprint(byId.get(t.id).task));
    assert.deepEqual(structuralIssues(t,all),[]);
    assert.equal(receipt.records.find(r=>r.id===t.id)?.sha256,contentFingerprint(t));
    const key=[t.prompt,t.conditionLatex??''].join('|');assert.equal(statements.has(key),false);statements.add(key);
  }
});
test('every 2027 profile number has original new conditions, solutions and semantic classification, including 6/13/17',()=>{
  const map=read('docs/task-classification-map.json'),classification=new Map(map.records.map(r=>[r.taskId,r]));
  const inventory=profileInventory(all);
  assert.equal(release.before.reduce((n,r)=>n+r.count,0),198);
  const refill=read('docs/priority-refill-release.json');
  const cycle=read('docs/round-cycle-release.json'),beforeCycle=read('docs/round-cycle-before.json');
  const delta=cycle.after.find(d=>d.id==='ege-math-profile').tasks-beforeCycle.find(d=>d.id==='ege-math-profile').tasks;
  assert.equal(inventory.reduce((n,r)=>n+r.count,0),2234+refill.stats.filter(s=>s.exam==='ЕГЭ').reduce((n,s)=>n+s.added,0)+delta);
  const newCounts={6:278,13:25,17:20};
  for(let number=1;number<=20;number++){
    const current=tasks.filter(t=>t.examNumber===number);assert.ok(current.length>0);
    if(newCounts[number])assert.equal(current.length,newCounts[number]);
    for(const t of current){assert.ok(t.solution.length>=2);assert.equal(t.scoring.maxPrimaryScore,number<=13?1:({14:2,15:3,16:2,17:2,18:3,19:4,20:4})[number]);
      assert.equal(t.answerFormat,number<=13?'number':'extended');assert.equal(t.part,number<=13?1:2);
      const c=classification.get(t.id);assert.ok(c.subtypeId&&c.topicId&&c.subtopicId);assert.equal(c.source.category,'tochka-original');assert.equal(c.number,number);
    }
  }
  assert.equal(new Set(tasks.map(t=>classification.get(t.id).subtypeId)).size,41);
});
test('all old IDs, conditions, answers and 124 immutable shards remain unchanged',()=>{
  const old=createContentLoader({revision:'e9cbd8193a84f608fa67216082ee24f4a9b1f8c9'}),current=createContentLoader();
  assert.deepEqual(current('src/lib/tasks.ts').practiceBank,old('src/lib/tasks.ts').practiceBank);
  const prior=old('src/lib/task-package-index.ts').taskPackageIndex,index=current('src/lib/task-package-index.ts').taskPackageIndex;
  assert.deepEqual(index.slice(0,prior.length),prior);assert.equal(prior.length,124);
  for(const p of prior)assert.equal(createHash('sha256').update(readFileSync(resolve(projectRoot,'public/task-packages',p.file))).digest('hex'),p.sha256);
});
test('exact READY subtype orders use the existing capability registry; unreviewed extended criteria cannot unlock mocks',()=>{
  const audit=generationAudit();
  assert.throws(()=>planSubtypeGeneration(audit,{modelId:'ege-math-profile',number:6,subtype:'two-point-variance',count:75}),/Content expansion paused/);
  assert.throws(()=>planSubtypeGeneration(audit,{modelId:'ege-math-profile',number:17,subtype:'quadratic-profit-optimization',count:75}));
  const l=createContentLoader(),definition=l('src/lib/exams.ts').getExamDefinition({examType:'ЕГЭ',subjectId:'math',level:'profile'}),mock=l('src/lib/mock-exam.ts');
  assert.deepEqual(mock.getMockCoverage(definition,all).missingNumbers,[14,15,16,17,18,19,20]);
  assert.equal(mock.getMockCoverage(definition,all).canStart,false);
});
test('lazy loading filters before fetching and new results preserve drafts, bookmarks and XP deduplication',async()=>{
  const l=createContentLoader(),bank=l('src/lib/tasks.ts'),tax=l('src/lib/task-taxonomy.ts'),packages=l('src/lib/task-packages.ts');
  const sample=tasks.find(t=>t.examNumber===6&&byId.get(t.id).proof.family==='two-point-variance');
  const classification=tax.getTaskClassification(sample.id),filter={examType:'ЕГЭ',subjectId:'math',level:'profile',examNumber:6,subtypeId:classification.subtypeId};
  const expected=tasks.filter(t=>tax.getTaskClassification(t.id).subtypeId===classification.subtypeId).length;
  assert.equal(bank.getPracticeTasks(filter).length,0);assert.equal(bank.getPracticeTaskCount(filter),expected);
  const original=globalThis.fetch,requests=[];
  globalThis.fetch=async url=>{requests.push(String(url));return new Response(readFileSync(resolve(projectRoot,'public',String(url).replace(/^\//,'')),'utf8'));};
  try{
    await packages.ensureTaskPackages(filter);assert.equal(bank.getPracticeTasks(filter).length,expected);assert.equal(requests.length,1);assert.ok(requests[0].includes('n6-'));
    assert.equal(bank.checkTaskAnswer(sample.answerDisplay,sample.answerRule).correct,true);
    assert.equal(bank.checkTaskAnswer('999999',sample.answerRule).correct,false);
    const {emptyLearningState,parseLearningState}=l('src/lib/learning-events.ts'),{appendCheckedAnswer}=l('src/lib/learning-mutations.ts');
    const result=appendCheckedAnswer(emptyLearningState,sample,sample.answerDisplay,true,'profile-mass-qa');
    assert.equal(result.state.events.length,1);assert.equal(appendCheckedAnswer(result.state,sample,sample.answerDisplay,true,'profile-mass-qa').xpAwarded,0);
    assert.deepEqual(parseLearningState(JSON.stringify(result.state)),result.state);
    const practice=l('src/lib/practice.ts'),storage=l('src/lib/practice-storage.ts');
    const selection={exam:'ЕГЭ',subjectId:'math',level:'profile',mode:'number',examNumber:6,subtypeId:classification.subtypeId};
    const session=practice.createPracticeSession('mass-qa',selection,sample.id),state={version:2,catalog:selection,sessions:{[session.id]:session},activeId:session.id,taskStates:{[sample.id]:{...practice.emptyTaskState(),answer:sample.answerDisplay}}};
    const restored=storage.parseStoredPractice(storage.serializeStoredPractice(state));assert.equal(restored.sessions[session.id].lastTaskId,sample.id);assert.equal(restored.taskStates[sample.id].answer,sample.answerDisplay);
  }finally{globalThis.fetch=original;}
});
