import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContentLoader,projectRoot } from "./content-source-loader.mjs";
import { buildTaskTaxonomy } from "./build-task-taxonomy.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";
import { generationAudit,planSubtypeGeneration } from "./exam-generation-audit.mjs";
const load=createContentLoader(),bank=load("src/lib/tasks.ts"),taxonomy=load("src/lib/task-taxonomy.ts");
const report=JSON.parse(readFileSync(resolve(projectRoot,"docs/task-classification-map.json"),"utf8"));
const selected={examType:"ЕГЭ",subjectId:"math",level:"profile",examNumber:9};

test("taxonomy is a reproducible metadata overlay for 30 directions/825 positions, not a second task bank",()=>{
  assert.deepEqual(buildTaskTaxonomy(),report);
  assert.equal(report.directions.length,30);assert.equal(report.directions.flatMap(d=>d.numbers).length,825);
  assert.equal(report.counts.sourceTasks,1967);assert.equal(report.counts.fullyClassifiedNumbers,0);
  assert.equal(report.counts.reviewedDetailedTasks,713);assert.equal(report.counts.numbersWithReviewedSubtypes,119);
  const data=load("src/lib/content/task-taxonomy-data.ts").taskTaxonomyData;
  assert.equal(Object.keys(data.assignments).length,1967);assert.equal(JSON.stringify(data).includes('"prompt"'),false);assert.equal(JSON.stringify(data).includes('"answerRule"'),false);
});
test("stable taxonomy IDs resolve valid topic→subtopic relations; sources never become subtypes",()=>{
  for(const node of Object.values(report.nodes)){
    assert.match(node.id,/^[a-z0-9-]{1,100}$/);
    if(node.kind==="subtopic"){assert.equal(report.nodes[node.parentId].kind,"topic");assert.equal(report.nodes[node.parentId].subjectId,node.subjectId);}
  }
  for(const r of report.records){assert.ok(report.nodes[r.topicId]);if(r.subtypeId)assert.equal(report.nodes[r.subtypeId].kind,"subtype");if(r.subtopicId)assert.equal(report.nodes[r.subtopicId].parentId,r.topicId);assert.equal(report.nodes[r.source.category],undefined);assert.equal(r.source.originYear,null);}
  for(const d of report.directions)for(const n of d.numbers){assert.equal(n.complete,false);assert.ok(n.manualReviewReasons.length);assert.equal(n.groups.reduce((a,g)=>a+g.count,0),n.taskCount);}
});
test("source evidence is explicit: all current originals remain originals, never relabelled FIPI by structural references",()=>{
  assert.equal(report.counts.unconfirmedOriginTasks,0);
  for(const r of report.records){assert.equal(r.source.category,"tochka-original");assert.deepEqual(r.source.sourceIds,["tochka-project-original"]);assert.ok(r.source.sourceFiles.length);assert.equal(r.source.rightsStatus,"project-authorship-declared-not-independent-legal-opinion");}
  assert.ok(report.sourceRecords.find(s=>s.id==="tochka-project-original").evidence.length);
  assert.deepEqual(taxonomy.taskSourceCategories.map(s=>s.id),["tochka-original","fipi-open-bank","fipi-demo","egkr","official-past-exams","other-verified","unconfirmed"]);
  assert.equal(bank.getPracticeTasks({...selected,sourceCategoryId:"fipi-open-bank"}).length,0);
});
test("real multi-subtype number filters compose by topic/subtopic/subtype/source and never fall back to other tasks",()=>{
  const options=taxonomy.getNumberTaxonomyOptions(selected);assert.ok(options.subtypes.length>=4);
  const subtypeId=options.subtypes[0].id;
  const tasks=bank.getPracticeTasks({...selected,subtypeId});assert.ok(tasks.length>0);assert.equal(tasks.length,bank.getPracticeTaskCount({...selected,subtypeId}));
  const c=taxonomy.getTaskClassification(tasks[0].id);
  const filter={...selected,subtypeId,taxonomyTopicId:c.topicId,subtopicId:c.subtopicId,sourceCategoryId:"tochka-original"};
  assert.deepEqual(bank.getPracticeTasks(filter),tasks);
  assert.deepEqual(bank.getPracticeTasks({...filter,subtopicId:"unreviewed-subtopic"}),[]);
  assert.deepEqual(bank.getPracticeTasks({...filter,sourceCategoryId:"egkr"}),[]);
  assert.ok(bank.getPracticeTasks(selected).length>tasks.length);
});
test("Russian per-card prototypes are not invented linguistic subtypes or automatically expert-reviewed",()=>{
  const records=report.records.filter(r=>r.modelId.endsWith("-russian"));assert.equal(records.length,910);
  assert.ok(records.every(r=>!r.subtypeId&&r.reviewStatus==="needs-editorial-review"));
  assert.equal(taxonomy.getNumberTaxonomyOptions({examType:"ЕГЭ",subjectId:"russian",examNumber:4}).subtypes.length,0);
  assert.ok(report.records.every(r=>r.codifier.status==="pending-individual-mapping"));
});
test("filtered contexts and stable task drafts survive routes/reload and remain separate from all-number sessions",()=>{
  const practice=load("src/lib/practice.ts"),storage=load("src/lib/practice-storage.ts"),{parseStudyRoute}=load("src/lib/navigation.ts");
  const subtypeId=taxonomy.getNumberTaxonomyOptions(selected).subtypes[0].id;
  const selection=practice.normalizeCatalogSelection({...selected,exam:"ЕГЭ",mode:"number",subtypeId,sourceCategoryId:"tochka-original"});
  const all={...selection,subtypeId:undefined,sourceCategoryId:undefined};
  assert.notEqual(practice.practiceContextKey(selection),practice.practiceContextKey(all));
  const session=practice.createPracticeSession("taxonomy-session",selection),id=session.taskIds[0];
  const data={version:2,catalog:selection,sessions:{[session.id]:session},activeId:session.id,taskStates:{[id]:{...practice.emptyTaskState(),answer:"-"}}};
  const parsed=storage.parseStoredPractice(storage.serializeStoredPractice(data));assert.equal(parsed.sessions[session.id].selection.subtypeId,subtypeId);assert.equal(parsed.taskStates[id].answer,"-");
  assert.deepEqual(storage.parseStoredPractice(storage.serializeStoredPractice(parsed)),parsed);
  const route=parseStudyRoute(`#tasks?exam=ЕГЭ&subject=math&level=profile&mode=number&number=9&subtypeId=${subtypeId}&sourceCategoryId=tochka-original`,bank.practiceBank.length);
  assert.equal(route.subtypeId,subtypeId);assert.equal(route.invalidContext,false);
  assert.equal(parseStudyRoute("#tasks?subtypeId=%3Cscript%3E",bank.practiceBank.length).invalidContext,true);
  assert.equal(practice.normalizeCatalogSelection({...selection,examNumber:undefined}).subtypeId,undefined);
});
test("current 2027 placements and every authored task body/answer/ID remain byte-identical to previous source release",()=>{
  const old=createContentLoader({revision:"ae9003dc3576431fbc6bbba9acae17d106cdb1cb"});
  const prior=old("src/lib/tasks.ts").practiceBank;
  assert.equal(bank.practiceBank.length,prior.length);bank.practiceBank.forEach((t,i)=>assert.equal(contentFingerprint(t),contentFingerprint(prior[i]),t.id));
  assert.deepEqual(load("src/lib/task-package-index.ts").taskPackageIndex,old("src/lib/task-package-index.ts").taskPackageIndex);
  assert.equal(taxonomy.getTaskClassification("multi-subject-20261026-25").number,13);
  for(const t of bank.tasks.filter(t=>t.level==="profile"&&t.examNumber===16))assert.equal(taxonomy.getTaskClassification(t.id).number,null);
});
test("lazy facets count unloaded metadata accurately; selecting a subtype fetches only its immutable shard",async()=>{
  const fresh=createContentLoader(),b=fresh("src/lib/tasks.ts"),tax=fresh("src/lib/task-taxonomy.ts"),{ensureTaskPackages}=fresh("src/lib/task-packages.ts");
  const row=report.records.find(r=>r.taskId.startsWith("remaining-")&&r.modelId==="ege-biology"&&r.subtypeId);
  const filter={examType:"ЕГЭ",subjectId:"biology",examNumber:row.number,subtypeId:row.subtypeId};
  const expected=b.getPracticeTaskCount(filter),original=globalThis.fetch,requested=[];
  assert.ok(expected>0);assert.equal(b.getPracticeTasks(filter).length,0);assert.equal(tax.getNumberTaxonomyOptions(filter).matching,expected);
  globalThis.fetch=async url=>{requested.push(url);return new Response(readFileSync(resolve(projectRoot,"public",String(url).replace(/^\//,"")),"utf8"));};
  try {await ensureTaskPackages(filter);assert.equal(b.getPracticeTasks(filter).length,expected);assert.equal(b.getPracticeTaskCount(filter),expected);assert.ok(requested.length>0);const n=requested.length;await ensureTaskPackages(filter);assert.equal(requested.length,n);}finally{globalThis.fetch=original;}
});
test("generation orders select an exact READY subtype and bounded quantity through the existing gate",()=>{
  assert.equal(report.generators.length,31);assert.ok(report.generators.every(g=>g.subtypeId&&g.topicId&&g.subtopicId&&g.answerFormat&&g.verification));
  const audit=generationAudit(),request=planSubtypeGeneration(audit,{modelId:"ege-chemistry",number:26,subtype:"dilute-solution-mixture",count:120});assert.equal(request.count,120);assert.equal(request.subtype,"dilute-solution-mixture");
  for(const count of [0,-1,1.5,1001,"100"])assert.throws(()=>planSubtypeGeneration(audit,{modelId:"ege-chemistry",number:26,subtype:"dilute-solution-mixture",count}));
  assert.throws(()=>planSubtypeGeneration(audit,{modelId:"ege-geography",number:14,subtype:"time-zone-conversion",count:5}));
});
