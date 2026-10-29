import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildCoverageRows,verifyCoverageRows,coverageGapReport,releaseCoverageCycle} from './release-coverage-cycle.mjs';
import {publishedCorpus,structuralIssues} from './import-tasks.mjs';
import {createContentLoader} from './content-source-loader.mjs';
import {contentFingerprint} from './content-review-evidence.mjs';

test('bounded coverage packet closes reviewed empty formats, with full original conditions and no profile candidates',()=>{
 const rows=buildCoverageRows(),corpus=publishedCorpus();assert.equal(rows.length,70);
 assert.equal(new Set(rows.map(r=>r.task.id)).size,70);
 assert.ok(rows.every(r=>r.task.level!=="profile"&&r.task.publication.provenance.authorship==='project-original'));
 for(const row of rows)assert.deepEqual(structuralIssues(row.task,corpus),[],row.task.id);
 const qa=verifyCoverageRows(rows);assert.equal(qa.fileChecks.verified,6);assert.equal(qa.editorial,64);assert.equal(qa.externalExpertReviewed,0);
 for(const subject of ['chemistry','biology','social-studies','informatics']){
  const row=structuredClone(rows.find(r=>r.task.subjectId===subject));row.task.answerDisplay='99999';row.task.answerRule.value='99999';
  assert.throws(()=>verifyCoverageRows([row]));
 }
 const file=structuredClone(rows.find(r=>r.proof.kind==='process-file'));file.task.resources[0].content=file.task.resources[0].content.replace('duration_ms','wrong_column');
 assert.throws(()=>verifyCoverageRows([file]));
});

test('coverage release preserves all prior bodies, profile count, metadata ordering and exact taxonomy assignments',()=>{
 const current=createContentLoader(),old=createContentLoader({revision:'e27458f'}),index=current('src/lib/task-package-index.ts').taskPackageIndex,prior=old('src/lib/task-package-index.ts').taskPackageIndex;
 assert.deepEqual(index.slice(0,prior.length),prior);
 for(const shard of prior)assert.equal(createHash('sha256').update(readFileSync(`public/task-packages/${shard.file}`)).digest('hex'),shard.sha256);
 assert.deepEqual(current('src/lib/tasks.ts').practiceBank,old('src/lib/tasks.ts').practiceBank);
 const placements=old('src/lib/content/task-taxonomy-data.ts').taskTaxonomyData;
 const taxonomy=current('src/lib/content/task-taxonomy-data.ts').taskTaxonomyData;
 for(const [id,assignment] of Object.entries(placements.assignments))assert.deepEqual(taxonomy.assignments[id],assignment,id);
 const corpus=publishedCorpus(),views=corpus.map(current('src/lib/task-placement.ts').getTaskView);
 assert.equal(views.filter(t=>t.level==='profile'&&t.availability!=='history-only'&&t.examNumber!==null).length,3603);
 const report=JSON.parse(readFileSync('docs/coverage-cycle-release.json','utf8'));
 for(const id of report.approvedIds){const task=corpus.find(t=>t.id===id),c=current('src/lib/task-taxonomy.ts').getTaskClassification(id);assert.ok(task&&c.topicId&&c.subtopicId&&c.subtypeId);assert.equal(c.sourceCategoryId,'tochka-original');assert.ok(report.after.find(d=>d.id===c.modelId).numbers.find(n=>n.number===task.examNumber).count>0);}
 assert.equal(report.profileAdded,0);assert.equal(report.stagingOnly,0);
});

test('every accepted row has real metadata facets, an exact answer and a stable draft after bounded lazy loading',async()=>{
 const l=createContentLoader(),b=l('src/lib/tasks.ts'),packages=l('src/lib/task-packages.ts'),taxonomy=l('src/lib/task-taxonomy.ts'),practice=l('src/lib/practice.ts'),storage=l('src/lib/practice-storage.ts');
 const report=JSON.parse(readFileSync('docs/coverage-cycle-release.json','utf8')),corpus=new Map(publishedCorpus().map(t=>[t.id,t]));
 const previous=globalThis.fetch;
 globalThis.fetch=async url=>new Response(readFileSync(`public${url}`,'utf8'));
 try{for(const id of report.approvedIds){
  const t=corpus.get(id),c=taxonomy.getTaskClassification(id),filter={examType:t.examType[0],subjectId:t.subjectId,examNumber:t.examNumber,subtypeId:c.subtypeId,taxonomyTopicId:c.topicId,subtopicId:c.subtopicId,sourceCategoryId:'tochka-original'};
  assert.ok(b.getPracticeTaskIds(filter).includes(id));await packages.ensureTaskIds([id]);
  assert.ok(b.getPracticeTasks(filter).some(t=>t.id===id));assert.equal(b.checkTaskAnswer(t.answerDisplay,t.answerRule).correct,true);
  const selection=practice.normalizeCatalogSelection({...filter,exam:filter.examType,mode:'number'}),session=practice.createPracticeSession('coverage-draft',selection,id),draft={...practice.emptyTaskState(),answer:'неотправленный черновик'};
  const restored=storage.parseStoredPractice(storage.serializeStoredPractice({version:2,catalog:selection,activeId:session.id,sessions:{[session.id]:session},taskStates:{[id]:draft}}));
  assert.equal(restored.sessions[session.id].lastTaskId,id);assert.equal(restored.taskStates[id].answer,draft.answer);
 }}finally{globalThis.fetch=previous;}
 assert.equal(coverageGapReport().length,9);
 for(const id of report.approvedIds)assert.equal(contentFingerprint(corpus.get(id)),JSON.parse(readFileSync('docs/coverage-cycle-verification.json','utf8')).records.find(r=>r.id===id).sha256);
});

test('completed coverage checkpoint is read-only and cannot repeat the import',async()=>{
 const before=readFileSync('src/lib/task-package-index.ts','utf8');
 const result=await releaseCoverageCycle({checkOnly:true});assert.ok(result.alreadyReleased>0);
 assert.equal(readFileSync('src/lib/task-package-index.ts','utf8'),before);
});
