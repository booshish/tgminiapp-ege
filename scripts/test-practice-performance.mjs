import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContentLoader} from './content-source-loader.mjs';

test('indexed queries preserve pre-optimization task order/counts for every active exam number and part',()=>{
 const load=createContentLoader(),old=createContentLoader({revision:'49a1fd7'}),now=load('src/lib/tasks.ts'),before=old('src/lib/tasks.ts');
 const {getAvailableExamDefinitions}=load('src/lib/exams.ts');
 assert.deepEqual(now.practiceBank,before.practiceBank);
 for(const model of getAvailableExamDefinitions()){
  const selection={examType:model.examType,subjectId:model.subjectId,level:model.level};
  for(const examNumber of [undefined,...model.numbers.map(n=>n.number),99])for(const part of [undefined,1,2,3]){
   const filter={...selection,examNumber,part};
   assert.deepEqual(now.getPracticeTaskIds(filter),before.getPracticeTaskIds(filter),JSON.stringify(filter));
   assert.equal(now.getPracticeTaskCount(filter),before.getPracticeTaskCount(filter));
   assert.deepEqual(now.getPracticeTasks(filter),before.getPracticeTasks(filter));
  }
 }
});

test('query cache composes all taxonomy/source/prototype constraints, bounds churn, and never shares a mutable session array',()=>{
 const load=createContentLoader(),old=createContentLoader({revision:'49a1fd7'}),now=load('src/lib/tasks.ts'),before=old('src/lib/tasks.ts');
 const {taskTaxonomyData}=load('src/lib/content/task-taxonomy-data.ts');
 const {getExamDefinition}=load('src/lib/exams.ts');
 const definitions=['ОГЭ','ЕГЭ'].flatMap(examType=>load('src/lib/subjects.ts').getActiveSubjects(examType).flatMap(([subjectId])=>(examType==='ЕГЭ'&&subjectId==='math'?['base','profile']:[null]).map(level=>getExamDefinition({examType,subjectId,level}))));
 for(const model of definitions){
  const group=Object.entries(taskTaxonomyData.assignments).filter(([,c])=>c[0]===model.id&&c[1]&&c[4]);
  for(const [,c]of group.filter((_,i)=>i%Math.max(1,Math.floor(group.length/8))===0)){
   const filter={examType:model.examType,subjectId:model.subjectId,level:model.level,examNumber:c[1],taxonomyTopicId:c[2],subtopicId:c[3],subtypeId:c[4],sourceCategoryId:c[5]};
   for(const variant of [filter,{...filter,sourceCategoryId:'fipi-demo'},{...filter,prototypeId:'unavailable-prototype'}]){
    assert.deepEqual(now.getPracticeTaskIds(variant),before.getPracticeTaskIds(variant));
    assert.equal(now.getPracticeTaskCount(variant),before.getPracticeTaskCount(variant));
   }
  }
 }
 const filter={examType:'ОГЭ',subjectId:'math',examNumber:9};
 const expected=before.getPracticeTaskIds(filter),mutable=now.getPracticeTaskIds(filter);
 mutable.reverse();mutable.push('not-a-task');assert.deepEqual(now.getPracticeTaskIds(filter),expected);
 for(let i=0;i<800;i++)assert.deepEqual(now.getPracticeTaskIds({...filter,prototypeId:`cache-churn-${i}`}),[]);
 assert.deepEqual(now.getPracticeTaskIds(filter),expected);
 // Availability is still checked before using a previously populated query.
 const model=getExamDefinition(filter),available=model.available;
 try{model.available=false;assert.equal(now.getPracticeTaskCount(filter),0);assert.deepEqual(now.getPracticeTasks(filter),[]);}
 finally{model.available=available;}
 assert.deepEqual(now.getPracticeTaskIds(filter),expected);
});

test('verified append invalidates loaded indexes without changing candidate IDs, drafts or lazy integrity gates',()=>{
 const load=createContentLoader(),now=load('src/lib/tasks.ts'),old=createContentLoader({revision:'49a1fd7'})('src/lib/tasks.ts');
 const index=load('src/lib/task-package-index.ts').taskPackageIndex;
 const filter={examType:'ОГЭ',subjectId:'math',examNumber:9};
 const initial=now.getPracticeTaskIds(filter),loaded=now.getPracticeTasks(filter).length;
 const shard=index.find(p=>p.tasks.some(t=>t.examType[0]==='ОГЭ'&&t.subjectId==='math'&&t.examNumber===9));
 const tasks=JSON.parse(readFileSync(`public/task-packages/${shard.file}`,'utf8'));
 assert.throws(()=>now.registerTaskPackage([{...tasks[0],id:'unapproved-id'}]),/Unapproved/);
 assert.equal(now.getPracticeTasks(filter).length,loaded);
 now.registerTaskPackage(tasks);old.registerTaskPackage(tasks);
 assert.deepEqual(now.getPracticeTasks(filter),old.getPracticeTasks(filter));
 assert.ok(now.getPracticeTasks(filter).length>loaded);
 assert.deepEqual(now.getPracticeTaskIds(filter),initial);
 const {createPracticeSession,rememberPracticePosition,normalizeCatalogSelection,emptyTaskState}=load('src/lib/practice.ts');
 const {parseStoredPractice,serializeStoredPractice}=load('src/lib/practice-storage.ts');
 const selection=normalizeCatalogSelection({...filter,exam:filter.examType,mode:'number'}),session=rememberPracticePosition(createPracticeSession('perf-preserved',selection,initial[0]),initial[0],1);
 session.taskIds.reverse();assert.deepEqual(now.getPracticeTaskIds(filter),initial);
 const data={version:2,catalog:selection,sessions:{[session.id]:session},activeId:session.id,taskStates:{[initial[0]]:{...emptyTaskState(),answer:'неотправленный черновик'}}};
 const restored=parseStoredPractice(serializeStoredPractice(data));
 assert.equal(restored.sessions[session.id].lastTaskId,initial[0]);
 assert.equal(restored.taskStates[initial[0]].answer,data.taskStates[initial[0]].answer);
});
