import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {roundCycleRows} from './round-cycle-originals.mjs';
import {publishedCorpus,structuralIssues} from './import-tasks.mjs';
import {releasePilot} from './release-task-pilot.mjs';
import {createContentLoader} from './content-source-loader.mjs';
import {contentFingerprint} from './content-review-evidence.mjs';
const l=createContentLoader(),view=l('src/lib/task-placement.ts').getTaskView,subjects=l('src/lib/subjects.ts'),exams=l('src/lib/exams.ts'),taxonomy=JSON.parse(readFileSync('docs/task-classification-map.json')),byId=new Map(taxonomy.records.map(r=>[r.taskId,r]));
export function cycleInventory(corpus=publishedCorpus()){
 return ['ОГЭ','ЕГЭ'].flatMap(exam=>subjects.getActiveSubjects(exam).flatMap(([subject])=>(exam==='ЕГЭ'&&subject==='math'?['base','profile']:[null]).map(level=>{
  const model=exams.getExamDefinition({examType:exam,subjectId:subject,level}),tasks=corpus.map(view).filter(t=>t.examType[0]===exam&&t.subjectId===subject&&t.level===level&&t.availability!=='history-only'&&t.examNumber!==null);
  return {id:model.id,tasks:tasks.length,model:model.versionId,fullMock:l('src/lib/mock-exam.ts').getMockCoverage(model,corpus).canStart,numbers:model.numbers.map(n=>{const ts=tasks.filter(t=>t.examNumber===n.number);return {number:n.number,count:ts.length,subtypes:[...new Set(ts.map(t=>byId.get(t.id)?.subtypeId).filter(Boolean))],topics:[...new Set(ts.map(t=>byId.get(t.id)?.topicId).filter(Boolean))],difficulty:Object.fromEntries([...Map.groupBy(ts,t=>t.difficulty)].map(([k,v])=>[k,v.length])),withAnswersAndSolutions:ts.filter(t=>t.answerDisplay&&t.solution.length).length,expertReviewed:0,criteriaStatus:n.evaluation?.mode==='automatic'?'exact-item-key-not-expert':'task-specific-review-required',validationStatuses:Object.fromEntries([...Map.groupBy(ts,t=>t.publication.validation.status)].map(([k,v])=>[k,v.length])),missingAnswersOrSolutions:ts.filter(t=>!t.answerDisplay||!t.solution.length).length,extendedWithoutConfirmedRubric:ts.filter(t=>t.answerRule.type==='self'&&t.placementReview?.criteriaCompatible!==true).length,missingDeclaredResource:ts.filter(t=>n.requiredResources?.length&&!t.resources?.length).length,resourceReview:'Resource presence is structural only; not certification of every required format'};})};
 })));
}
export function checkRoundRows(rows){
 const v=spawnSync('python',['scripts/verify-round-cycle.py'],{input:rows.map(JSON.stringify).join('\n')+'\n',encoding:'utf8'});assert.equal(v.status,0,v.stderr);return JSON.parse(v.stdout);
}
export async function releaseRoundCycle(){
 const rows=roundCycleRows(),corpus=publishedCorpus();
 for(const r of rows)assert.deepEqual(structuralIssues(r.task,corpus),[],r.task.id);
 const controls=[];for(let i=0;i<rows.length;i+=50)controls.push(checkRoundRows(rows.slice(i,i+50)));
 const verification={date:'2026-10-28',controls,expertReviewed:false,editorialScope:'Only these 10 grammar and 3 biology items: targeted author review of all options and key; not independent expert certification. Numeric checks use separate Python calculations.',records:rows.map(r=>({id:r.task.id,sha256:contentFingerprint(r.task),family:r.family,triple:r.triple,proof:r.proof,method:r.proof.review??'independent-python',expertReviewed:false}))};
 const file='docs/round-cycle-release.json';
 if(existsSync(file)){
  const prior=JSON.parse(readFileSync(file));assert.ok(prior.approvedIds.every(id=>corpus.some(t=>t.id===id)));
  if(process.argv.includes('--extension')&&!prior.extraReleased){
   writeFileSync('docs/round-cycle-verification.json',JSON.stringify(verification,null,2)+'\n');
   const extra=rows.filter(r=>r.family==='posterior-from-two-groups');
   const result=await releasePilot({tasks:extra.map(r=>r.task),batchId:'round-cycle-20261028-r2',batchSize:50,allowDuplicates:true,reviewFile:'docs/round-cycle-extension-review.json',reviewedAt:'2026-10-28',evidence:['scripts/verify-round-cycle.py','docs/round-cycle-verification.json']});
   prior.approvedIds.push(...result.approvedIds);for(const k of Object.keys(prior.counts))prior.counts[k]+=result.counts[k];prior.extraReleased=true;prior.after=cycleInventory(publishedCorpus());writeFileSync(file,JSON.stringify(prior,null,2)+'\n');
  }
  if(process.argv.includes('--files')&&!prior.filesReleased){
   writeFileSync('docs/round-cycle-verification.json',JSON.stringify(verification,null,2)+'\n');
   const extra=rows.filter(r=>r.family==='spreadsheet-one-pair-sum');
   const result=await releasePilot({tasks:extra.map(r=>r.task),batchId:'round-cycle-20261028-r3',batchSize:50,allowDuplicates:true,reviewFile:'docs/round-cycle-files-review.json',reviewedAt:'2026-10-28',evidence:['scripts/verify-round-cycle.py','docs/round-cycle-verification.json']});
   prior.approvedIds.push(...result.approvedIds);for(const k of Object.keys(prior.counts))prior.counts[k]+=result.counts[k];prior.filesReleased=true;prior.after=cycleInventory(publishedCorpus());writeFileSync(file,JSON.stringify(prior,null,2)+'\n');
  }
  console.log(JSON.stringify({alreadyReleased:prior.approvedIds.length}));return prior;
 }
 writeFileSync('docs/round-cycle-before.json',JSON.stringify(cycleInventory(corpus),null,2)+'\n');
 writeFileSync('docs/round-cycle-verification.json',JSON.stringify(verification,null,2)+'\n');
 const result=await releasePilot({tasks:rows.map(r=>r.task),batchId:'round-cycle-20261028-r1',batchSize:50,allowDuplicates:true,reviewFile:'docs/round-cycle-review.json',reviewedAt:'2026-10-28',reviewMethod:'source-answer-and-solution',evidence:['scripts/verify-round-cycle.py','docs/round-cycle-verification.json']});
 const report={date:'2026-10-28',counts:result.counts,approvedIds:result.approvedIds,after:cycleInventory(publishedCorpus()),stagingOnly:0,limitations:['Draft 2027 models, not final','No external expert review','No new audio, image or file-based formats; empty slots not disguised','Semantic duplicate gate remains the existing lexical near-match gate; not an embedding-based semantic certification']};
 writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(result.counts));return report;
}
if(process.argv[1]?.endsWith('release-round-cycle.mjs'))await releaseRoundCycle();
