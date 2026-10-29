// Reproducible read-only model benchmark; no generated/imported educational tasks.
import {performance} from 'node:perf_hooks';
import {readFileSync,writeFileSync} from 'node:fs';
import {createContentLoader} from './content-source-loader.mjs';
const load=createContentLoader(),bank=load('src/lib/tasks.ts'),taxonomy=load('src/lib/task-taxonomy.ts');
const practice=load('src/lib/practice.ts'),storage=load('src/lib/practice-storage.ts');
const filter={examType:'ОГЭ',subjectId:'math',examNumber:9};
const selection=practice.normalizeCatalogSelection({...filter,exam:filter.examType,mode:'number'});
const state={version:2,catalog:selection,activeId:'measurement',sessions:{},taskStates:{}};
for(let i=0;i<20;i++){
 const session=practice.createPracticeSession(`measurement-${i}`,selection);
 state.sessions[session.id]=session;
}
state.activeId='measurement-0';
const ids=bank.getPracticeTaskIds(filter);
for(const id of ids.slice(0,40))state.taskStates[id]={...practice.emptyTaskState(),answer:'1234567890'};
function measure(fn,n=100){for(let i=0;i<5;i++)fn();const samples=[];for(let i=0;i<n;i++){const s=performance.now();fn();samples.push(performance.now()-s);}samples.sort((a,b)=>a-b);return {n,medianMs:samples[Math.floor(n*.5)],p95Ms:samples[Math.floor(n*.95)],totalMs:samples.reduce((a,b)=>a+b,0)};}
const result={node:process.version,bankRecords:bank.practiceBank.length,metadataRecords:load('src/lib/task-package-index.ts').taskPackageIndex.reduce((n,p)=>n+p.tasks.length,0),candidateIds:ids.length,
 candidates:measure(()=>bank.getPracticeTaskIds(filter)),facets:measure(()=>taxonomy.getNumberTaxonomyOptions(filter)),
 catalogueCounts:measure(()=>Array.from({length:25},(_,i)=>bank.getPracticeTaskCount({...filter,examNumber:i+1})),30),
 serialization:measure(()=>storage.serializeStoredPractice(state),100),serializedBytes:Buffer.byteLength(storage.serializeStoredPractice(state))};
// Conditions/order must not depend on which verified shard arrives afterwards.
const index=load('src/lib/task-package-index.ts').taskPackageIndex;
const shard=index.find(p=>p.tasks.some(t=>t.examType[0]==='ОГЭ'&&t.subjectId==='math'&&t.examNumber===9));
bank.registerTaskPackage(JSON.parse(readFileSync('public/task-packages/'+shard.file,'utf8')));
result.candidateOrderPreserved=JSON.stringify(bank.getPracticeTaskIds(filter))===JSON.stringify(ids);
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
