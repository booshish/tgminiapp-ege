import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {refillRows} from './refill-priority-generators.mjs';
import {releasePilot} from './release-task-pilot.mjs';
import {publishedCorpus,structuralIssues} from './import-tasks.mjs';
import {contentFingerprint} from './content-review-evidence.mjs';
import {createContentLoader} from './content-source-loader.mjs';
const rows=refillRows(),load=createContentLoader(),view=load('src/lib/task-placement.ts').getTaskView;
const reportFile='docs/priority-refill-release.json',corpus=publishedCorpus();
for(const row of rows)assert.deepEqual(structuralIssues(row.task,corpus),[],row.task.id);
const controls=[];
for(let i=0;i<rows.length;i+=50){const group=rows.slice(i,i+50),v=spawnSync('python',['scripts/verify-priority-refill.py'],{input:group.map(JSON.stringify).join('\n')+'\n',encoding:'utf8'});assert.equal(v.status,0,v.stderr);controls.push(JSON.parse(v.stdout));}
const verification={date:'2026-10-28',kind:'original-training-not-official-KIM',controls,records:rows.map(r=>({id:r.task.id,sha256:contentFingerprint(r.task),family:r.family,triple:r.triple,proof:r.proof,method:'independent-python-enumeration-rational-arithmetic',expertReviewed:false}))};
writeFileSync('docs/priority-refill-verification.json',JSON.stringify(verification,null,2)+'\n');
if(existsSync(reportFile)){
 const prior=JSON.parse(readFileSync(reportFile));assert.ok(prior.approvedIds.every(id=>corpus.some(t=>t.id===id)));
 if(process.argv.includes('--extend')&&!prior.extension){
  const extra=rows.filter(r=>r.family==='three-trials-exactly-two');
  const result=await releasePilot({tasks:extra.map(r=>r.task),batchId:'priority-refill-20261028-r2',batchSize:50,allowDuplicates:true,reviewFile:'docs/priority-refill-extension-review.json',reviewedAt:'2026-10-28',evidence:['scripts/verify-priority-refill.py','docs/priority-refill-verification.json']});
  prior.extension={counts:result.counts,approvedIds:result.approvedIds};prior.approvedIds.push(...result.approvedIds);
  for(const k of Object.keys(prior.counts))prior.counts[k]+=result.counts[k];
  const stat=prior.stats.find(s=>s.exam==='ЕГЭ'&&s.number===5);stat.added+=result.approvedIds.length;stat.after+=result.approvedIds.length;stat.families.push('three-trials-exactly-two');
  writeFileSync(reportFile,JSON.stringify(prior,null,2)+'\n');
 }
 console.log(JSON.stringify({alreadyReleased:prior.approvedIds.length}));
}else{
 const before=corpus.map(view).filter(t=>t.availability!=='history-only');
 const result=await releasePilot({tasks:rows.map(r=>r.task),batchId:'priority-refill-20261028-r1',batchSize:50,allowDuplicates:true,reviewFile:'docs/priority-refill-review.json',reviewedAt:'2026-10-28',evidence:['scripts/verify-priority-refill.py','docs/priority-refill-verification.json']});
 const targets=[...[4,5,11,13].map(number=>({exam:'ЕГЭ',subject:'math',number})),...['math','informatics','chemistry','russian','biology','social-studies'].map(subject=>({exam:'ОГЭ',subject,number:null}))];
 const stats=targets.map(s=>{const match=t=>t.examType[0]===s.exam&&t.subjectId===s.subject&&(s.number===null||t.examNumber===s.number)&&(s.exam!=='ЕГЭ'||t.level==='profile');const added=rows.filter(r=>result.approvedIds.includes(r.task.id)&&match(r.task));return {...s,before:before.filter(match).length,added:added.length,after:before.filter(match).length+added.length,families:[...new Set(added.map(r=>r.family))]};});
 writeFileSync(reportFile,JSON.stringify({date:'2026-10-28',counts:result.counts,approvedIds:result.approvedIds,stats,stagingOnly:0,limitations:['2027 draft model, not final','Russian, biology and social studies: no new verified editorial packets in this release; prior gaps preserved in release-directions-readiness.json','No new extended tasks or expert evaluation; full mock criteria remain unresolved']},null,2)+'\n');
 console.log(JSON.stringify(stats));
}
