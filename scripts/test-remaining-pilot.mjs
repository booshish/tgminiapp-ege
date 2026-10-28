import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildRemainingTasks, candidateEntries, verifyEntry } from "./release-remaining-pilot.mjs";
import { humidity,migration,resourceYears,localTime,chromosomes,cross,taxonomy } from "./remaining-generators.mjs";
import { affordableBasket,historicalMatching,chronology,costMatching,economicJudgments } from "./humanities-originals.mjs";
import { verifyGenerated } from "./verify-remaining-generators.mjs";
import { verifyHumanities } from "./humanities-originals.mjs";
import { verifyLanguage,buildLanguagePilot } from "./language-originals.mjs";
import { structuralIssues } from "./import-tasks.mjs";
import { createContentLoader } from "./content-source-loader.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";

test("84 real original seeds span seventeen new directions; no unverified literary/audio/map/essay substitutes",()=>{
  const tasks=buildRemainingTasks(),load=createContentLoader(),{checkTaskAnswer}=load("src/lib/tasks.ts"),{getPublicationDecision}=load("src/lib/content-publication.ts");
  assert.equal(tasks.length,84);const groups=Map.groupBy(tasks,t=>`${t.examType[0]}-${t.subjectId}`);assert.equal(groups.size,17);
  for(const [key,items] of groups)assert.equal(items.length,key==="ЕГЭ-geography"?4:5);
  assert.equal(new Set(tasks.map(t=>t.id)).size,84);
  for(const [i,t] of tasks.entries()){
    assert.deepEqual(structuralIssues(t),[],t.id);assert.equal(checkTaskAnswer(t.answerDisplay,t.answerRule).correct,true,t.id);
    assert.equal(getPublicationDecision(t.publication).allowed,true,t.id);
    assert.equal(checkTaskAnswer("неверный ответ 9999999",t.answerRule).correct,false,t.id);
    assert.ok(t.requirementsReference.pdfPage>0);assert.equal(t.examYear,2027);assert.equal(t.answerFormat==="extended",false);
    assert.throws(()=>verifyEntry({...candidateEntries[i],answer:"9999999"}),t.id);
  }
  assert.equal(tasks.some(t=>t.subjectId==="literature"),false);
  assert.equal(tasks.some(t=>t.id==="remaining-20261027-010"),false);
});
test("bounded calculation generators pass parameter sweeps and reject invalid physical / statistical domains",()=>{
  for(const fraction of [.1,.3,.6,.9])verifyGenerated(humidity(17.4*fraction,17.4,20,"Учебная"));
  for(const e of ["oge","ege"])for(const births of [0,100,900])for(const deaths of [0,200,800])verifyGenerated(migration(e,80000,80300,births,deaths,"условной территории"));
  for(const hour of [0,1,12,23])for(const from of [3,7,12])for(const to of [3,7,12])verifyGenerated(localTime(hour,5,from,to));
  for(let n=4;n<=80;n+=2)for(const process of ["gamete","daughter-mitosis"])verifyGenerated(chromosomes(n,process));
  for(const a of ["AA","Aa","aa"])for(const b of ["AA","Aa","aa"])for(const target of ["recessive","heterozygote"])verifyGenerated(cross(a,b,target));
  for(const reserves of [1,2,3])verifyGenerated(resourceYears(reserves,25,"угля"));
  assert.throws(()=>humidity(20,10,20,"bad"));assert.throws(()=>humidity(5,10,-20,"bad"));assert.throws(()=>migration("oge",1000,99999,0,0,"bad"));assert.throws(()=>chromosomes(13,"gamete"));assert.throws(()=>cross("AB","Aa","recessive"));assert.throws(()=>localTime(24,1,3,3));assert.throws(()=>resourceYears(1.1,37,"угля"));
  assert.throws(()=>taxonomy("oge",[{label:"Класс",rank:2},{label:"Другой класс",rank:2}]));
});
test("reference-based humanities and language controls do not masquerade as an independent expert",()=>{
  for(const row of [affordableBasket(1000,[130,170],[[8,1],[2,3],[6,3],[1,6]]),historicalMatching("ege",["ice","city","ugra"],[1240,1242,1380,1480,1613,1703]),chronology("oge",["emancipation","empire","romanov"]),costMatching("ege",[2,4,3,0,1]),economicJudgments(2400,400,300)])verifyHumanities(row);
  assert.throws(()=>affordableBasket(1000,[10,20],[[1,1],[2,2],[3,3],[4,4]]));
  const languages=buildLanguagePilot();assert.equal(languages.length,45);languages.forEach(verifyLanguage);
  for(const item of languages)assert.throws(()=>verifyLanguage({...item,answer:"invalid"}));
  for(const task of buildRemainingTasks())assert.equal(task.publication.validation.status,"automated-reviewed");
});
test("all published shard hashes and IDs remain intact, with frozen previous 67 tasks",()=>{
  const {taskPackageIndex}=createContentLoader()("src/lib/task-package-index.ts");
  const all=taskPackageIndex.flatMap(p=>{
    const body=readFileSync(new URL(`../public/task-packages/${p.file}`,import.meta.url),"utf8");assert.equal(createHash("sha256").update(body).digest("hex"),p.sha256);
    const tasks=JSON.parse(body);assert.deepEqual(tasks.map(t=>t.id),p.tasks.map(t=>t.id));return tasks;
  });
  assert.equal(new Set(all.map(t=>t.id)).size,all.length);
  assert.equal(all.filter(t=>/^(oge-informatics-pilot-|multi-subject-20261026-|science-stage-a-)/.test(t.id)).length,67);
  // Before release, generated tasks are tested above. After release, every byte is checked.
  const released=all.filter(t=>t.id.startsWith("remaining-20261027-"));
  if(released.length){assert.equal(released.length,84);for(const t of buildRemainingTasks())assert.equal(contentFingerprint(all.find(p=>p.id===t.id)),contentFingerprint(t));}
});
test("new packages load only the selected number; all new subjects preserve attempts, bookmarks and existing task order",async()=>{
  const load=createContentLoader(),bank=load("src/lib/tasks.ts"),{ensureTaskPackages}=load("src/lib/task-packages.ts"),{isAvailableTask}=load("src/lib/study-tools.ts");
  const {emptyLearningState,parseLearningState}=load("src/lib/learning-events.ts"),{appendCheckedAnswer}=load("src/lib/learning-mutations.ts");
  const tasks=buildRemainingTasks(),before=bank.practiceBank.map(t=>t.id),originalFetch=globalThis.fetch,requests=[];
  globalThis.fetch=async url=>{requests.push(String(url));return new Response(readFileSync(new URL(`../public${url}`,import.meta.url),"utf8"));};
  try{
    let state=emptyLearningState;
    for(const group of Map.groupBy(tasks,t=>`${t.examType[0]}-${t.subjectId}`).values()){
      const first=group[0],count=requests.length;
      await ensureTaskPackages({examType:first.examType[0],subjectId:first.subjectId,examNumber:first.examNumber});
      assert.ok(requests.length>count);assert.ok(requests.slice(count).every(url=>url.includes(`-n${first.examNumber}-`)));
      const task=bank.getPracticeTasks({examType:first.examType[0],subjectId:first.subjectId,examNumber:first.examNumber}).find(t=>t.id===first.id);assert.ok(task?.id);assert.equal(isAvailableTask(task),true);
      state=appendCheckedAnswer(state,task,task.answerDisplay,true,`new-direction-${task.id}`).state;
      const restored=parseLearningState(JSON.stringify(state));assert.deepEqual(restored.events,state.events);assert.deepEqual(restored.game,state.game);
      const bookmarks=JSON.parse(JSON.stringify({ids:[task.id]}));assert.equal(bank.practiceBank.find(t=>t.id===bookmarks.ids[0]).id,task.id);
    }
    assert.deepEqual(bank.practiceBank.slice(0,before.length).map(t=>t.id),before);
    assert.equal(state.events.length,17);
    const count=requests.length;await ensureTaskPackages({examType:tasks[0].examType[0],subjectId:tasks[0].subjectId,examNumber:tasks[0].examNumber});assert.equal(requests.length,count);
  }finally{globalThis.fetch=originalFetch;}
});
