import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createContentLoader,projectRoot} from './content-source-loader.mjs';
import {editorialCases} from './coverage-editorial-20261029.mjs';
import {reviewedKeys,reviewReferences,reviewNotes} from './coverage-editorial-review.mjs';
import {coverageFileCases} from './coverage-file-generators.mjs';
import {releasePilot} from './release-task-pilot.mjs';
import {publishedCorpus,structuralIssues,assertTaskExpansionAllowed} from './import-tasks.mjs';
import {contentFingerprint} from './content-review-evidence.mjs';
import {cycleInventory} from './release-round-cycle.mjs';

export const releaseId='coverage-20261029-r2';
export const reportFile='docs/coverage-cycle-release.json';
const json=f=>JSON.parse(readFileSync(resolve(projectRoot,f),'utf8'));
const write=(f,value)=>writeFileSync(resolve(projectRoot,f),JSON.stringify(value,null,2)+'\n');
const chemicalFamilies={1:'element-substance',2:'atomic-shell-period-charge',4:'oxidation-state-matching',5:'bond-type-selection',6:'element-comparison',7:'inorganic-class-ordered',8:'oxide-reactivity',9:'reaction-product-matching',10:'reagent-pair-matching',11:'redox-recognition',12:'reaction-sign-matching',13:'dissociation-amounts',14:'net-ionic-reactants',15:'electron-transfer-classification',16:'school-lab-safety',17:'qualitative-reagent-matching'};
const preciseFamilies={'development-types':'animal-development-matching','plant-groups':'plant-division-matching','erythrocyte-traits':'human-blood-cell-traits','skeletal-muscle-traits':'human-muscle-tissue-traits','culture-scientific-test':'science-identification','culture-art':'art-identification','socialization-responsibility':'personality-socialization','social-role':'social-role-identification','money-functions':'money-function-identification','democracy-signs':'political-regime-identification','federation-sign':'territorial-structure-identification','executive-body':'state-power-branches','constitution-supremacy':'constitution-hierarchy'};

export function buildCoverageRows(){
 const l=createContentLoader(),exams=l('src/lib/exams.ts'),{originalProvenance}=l('src/lib/content/provenance.ts');
 return [...editorialCases,...coverageFileCases()].map(entry=>{
  const exam=entry.exam??'ОГЭ',model=exams.getExamDefinition({examType:exam,subjectId:entry.subject,level:null}),slot=model.numbers.find(n=>n.number===entry.number);
  assert.ok(slot?.practiceAnswerFormat,`No reviewed format: ${model.id}/${entry.number}`);
  const id=`coverage-20261029-${model.id}-${entry.number}-${entry.slug}`;
  const family=entry.subject==='chemistry'?chemicalFamilies[entry.number]:entry.subject==='informatics'?entry.proof.kind:slot.generation.subtypes[0];
  const rule=entry.rule??(entry.number===2&&entry.subject==='chemistry'?'text':'choices');
  const answerRule=rule==='choices'?{type:'choices',value:entry.answer,ordered:slot.evaluation?.ordering!=='unordered'}:rule==='number'?{type:'number',value:entry.answer}:{type:'text',value:entry.answer};
  const task={id,examType:[exam],subjectId:entry.subject,level:null,examYear:2027,examVersionId:model.versionId,examNumber:entry.number,part:slot.part,topicId:`${model.id}-n${entry.number}`,prototypeId:`${model.id}-n${entry.number}-original`,title:entry.triple[2],prompt:entry.prompt,answerDisplay:entry.answer,answerRule,answerFormat:slot.practiceAnswerFormat,difficulty:'standard',solution:entry.steps.map(text=>({text})),...(entry.resources?{resources:entry.resources}:{}),scoring:{status:'pending-official-verification',maxPrimaryScore:slot.maxPrimaryScore},source:{kind:'author',label:'Оригинальная тренировка «Точки» · проект 2027, не официальный КИМ',revision:1},provenance:originalProvenance(entry.subject==='informatics'?'original-deterministic-family':'original-individual-task'),requirementsReference:{...slot.sourceReference,year:2027,status:'draft-copy-reviewed'},publication:{id,releaseStatus:'ready',provenance:{sourceIds:['tochka-project-original'],authorship:'project-original',sourceFiles:[entry.subject==='informatics'?'scripts/coverage-file-generators.mjs':'scripts/coverage-editorial-20261029.mjs'],attribution:['Авторский материал проекта «Точка»; справочные источники — только для проверки фактов.']},validation:{status:'automated-reviewed',checkedAt:'2026-10-29',evidence:['scripts/coverage-editorial-review.mjs','scripts/verify-coverage-files.py','docs/coverage-cycle-verification.json']}}};
  task.publication.provenance.attribution.unshift('Авторский материал проекта «Точка»');
  assertTaskExpansionAllowed(task);
  return {task,family:preciseFamilies[entry.slug]??family,triple:entry.triple,proof:{...entry.proof,slug:entry.slug,review:entry.subject==='informatics'?'independent-python-files':'targeted-author-editorial-review-not-external-expert'}};
 });
}

export function verifyCoverageRows(rows){
 const l=createContentLoader(),check=l('src/lib/tasks.ts').checkTaskAnswer;
 for(const row of rows){
  const {task,proof}=row;
  assertTaskExpansionAllowed(task);
  assert.equal(task.examYear,2027);assert.ok(task.examVersionId.endsWith('-2027-draft'));
  assert.ok(task.solution.length>=2&&task.solution.every(s=>s.text.length>20));
  assert.deepEqual(check(task.answerDisplay,task.answerRule),{valid:true,correct:true},task.id);
  if(task.subjectId!=='informatics'){
   assert.equal(task.answerDisplay,reviewedKeys[task.subjectId]?.[proof.slug],`Unreviewed key: ${task.id}`);
   assert.ok(reviewNotes[task.subjectId]&&reviewReferences[task.subjectId]);
   if(proof.kind==='electron-shells'){
    // Inverse lookup of a separately maintained atomic table, not summing generation's key.
    const known={'2,8,2':{period:3,z:12},'2,6':{period:2,z:8}},atom=known[proof.shells.join(',')];
    assert.equal(task.answerDisplay,`${atom.period}${atom.z}`);
   }
   if(proof.kind==='electron-direction'){
    assert.equal(task.answerDisplay,proof.changes.map(([a,b])=>{const electronsAccepted=a-b;assert.notEqual(electronsAccepted,0);return electronsAccepted>0?'2':'1';}).join(''));
   }
  }
 }
 const files=rows.filter(r=>r.task.subjectId==='informatics');
 const result=spawnSync('python',['scripts/verify-coverage-files.py'],{cwd:projectRoot,input:files.map(JSON.stringify).join('\n')+'\n',encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);const independent=JSON.parse(result.stdout);assert.equal(independent.verified,files.length);
 return {verified:rows.length,fileChecks:independent,editorial:rows.length-files.length,externalExpertReviewed:0,notes:reviewNotes};
}

function blockers(model,n){
 if(model.id==='oge-social-studies'&&n.number===3)return ['Групповая перестановка ответов: порядок внутри сходств/различий свободный; текущий choices не выражает две независимые группы. Нужен подтверждённый контракт эквивалентных ответов.'];
 if(n.answerFormat==='extended')return ['Нужны полноценное условие и поэлементная рубрика самопроверки; максимум баллов сам по себе не критерий.',...(n.requiredResources??[])];
 if(model.id==='oge-biology'&&n.number===1)return ['Формат демоверсии требует собственное изображение/фотографию; текстовое определение не заменяет номер.'];
 return (n.requiredResources?.length?n.requiredResources:['Нет подготовленного и содержательно проверенного авторского набора для этого формата.']);
}
export function coverageGapReport(corpus=publishedCorpus()){
 const l=createContentLoader(),registry=l('src/lib/exams.ts'),inventory=cycleInventory(corpus);
 const taxonomy=json('docs/task-classification-map.json');
 return inventory.filter(d=>d.id!=='ege-math-profile').map(d=>{
  const model=registry.getExamDefinition({examType:d.id.startsWith('oge-')?'ОГЭ':'ЕГЭ',subjectId:d.id.includes('math')?'math':d.id.slice(4),level:d.id==='ege-math-base'?'base':null});
  return {...d,modelStatus:'draft-2027-not-final',fullSubtypeInventoryConfirmed:false,numbers:d.numbers.map(n=>{
   const slot=model.numbers.find(s=>s.number===n.number),classification=taxonomy.directions.find(s=>s.modelId===d.id)?.numbers.find(s=>s.number===n.number);
   return {...n,skill:slot.title,answerFormat:slot.answerFormat,resources:slot.requiredResources??[],source:slot.sourceReference,knownSubtypeCoverage:classification?.groups??[],missingSubtypeCatalog:'Полнота перечня подтипов не подтверждена; неизвестные категории не придумывались.',blockers:n.count?['Наличие задач не подтверждает полноту подтипов и рубрик.']:blockers(model,slot)};
  })};
 });
}

export async function releaseCoverageCycle({checkOnly=false}={}){
 const rows=buildCoverageRows(),corpus=publishedCorpus(),validation=verifyCoverageRows(rows);
 for(const row of rows)assert.deepEqual(structuralIssues(row.task,corpus),[],row.task.id);
 if(existsSync(resolve(projectRoot,reportFile))){
  const report=json(reportFile),byId=new Map(corpus.map(t=>[t.id,t]));
  for(const record of json('docs/coverage-cycle-verification.json').records)assert.equal(contentFingerprint(rows.find(r=>r.task.id===record.id).task),record.sha256);
  for(const id of report.approvedIds)assert.equal(contentFingerprint(byId.get(id)),contentFingerprint(rows.find(r=>r.task.id===id).task));
  assert.equal(cycleInventory(corpus).find(d=>d.id==='ege-math-profile').tasks,report.frozenProfileCount);
  return {alreadyReleased:report.approvedIds.length,validation};
 }
 if(checkOnly)return {candidates:rows.length,validation,publication:'not-requested'};
 const before=cycleInventory(corpus),profileCount=before.find(d=>d.id==='ege-math-profile').tasks;
 assert.equal(profileCount,3603,'Unexpected frozen baseline: inspect before proceeding, never roll back');
 const identities=new Map(corpus.map(t=>[t.id,contentFingerprint(t)]));
 write('docs/coverage-cycle-before.json',before);
 write('docs/coverage-cycle-gaps.json',{date:'2026-10-29',directions:coverageGapReport(corpus)});
 const controls=[];for(let i=0;i<rows.length;i+=25)controls.push(verifyCoverageRows(rows.slice(i,i+25)));
 write('docs/coverage-cycle-verification.json',{date:'2026-10-29',modelStatus:'draft-2027-not-final',references:reviewReferences,controls,externalExpertReviewed:0,records:rows.map(r=>({id:r.task.id,sha256:contentFingerprint(r.task),family:r.family,triple:r.triple,proof:r.proof,method:r.proof.review}))});
 const result=await releasePilot({tasks:rows.map(r=>r.task),batchId:releaseId,batchSize:25,allowDuplicates:true,reviewFile:'docs/coverage-cycle-review.json',reviewedAt:'2026-10-29',reviewMethod:'source-answer-and-solution',evidence:['scripts/coverage-editorial-review.mjs','scripts/verify-coverage-files.py','docs/coverage-cycle-verification.json']});
 const afterCorpus=publishedCorpus(),after=cycleInventory(afterCorpus),byId=new Map(afterCorpus.map(t=>[t.id,t]));
 for(const [id,sha] of identities)assert.equal(contentFingerprint(byId.get(id)),sha,`Existing task changed: ${id}`);
 assert.equal(after.find(d=>d.id==='ege-math-profile').tasks,profileCount);
 const report={date:'2026-10-29',batchId:releaseId,counts:result.counts,approvedIds:result.approvedIds,before,after,frozenProfileCount:profileCount,profileAdded:0,oldTasksVerified:identities.size,stagingOnly:0,validation,supersededJobs:[{job:'coverage-20261029-r1',published:0,review:69,duplicates:1,reason:'Exact required attribution line was missing; corrected to existing registry attribution, no rights gate relaxed. Historical checkpoint retained; all accepted IDs superseded by r2.'}],semanticReview:'Finite editorial comparison of topics/solutions and small bounded file families plus existing corpus-wide lexical gate; no claim of embedding/AI semantic certification.',publication:'source-shards-ready-deploy-not-yet-confirmed'};
 write(reportFile,report);return report;
}
export function refreshCoverageReport(){
 const report=json(reportFile),corpus=publishedCorpus(),rows=new Map(buildCoverageRows().map(r=>[r.task.id,r])),verification=json('docs/coverage-cycle-verification.json');
 // Only QA/classification metadata; immutable conditions/IDs/shards are never rewritten.
 for(const record of verification.records){const row=rows.get(record.id);assert.equal(contentFingerprint(row.task),record.sha256);record.family=row.family;record.triple=row.triple;}
 write('docs/coverage-cycle-verification.json',verification);
 report.after=cycleInventory(corpus);write(reportFile,report);
 const gaps={date:'2026-10-29',directions:coverageGapReport(corpus)};write('docs/coverage-cycle-gaps.json',gaps);
 const lines=['# Закрытие пустых номеров — 29.10.2026','','Модели — проекты 2027, не окончательные спецификации. Текущий выпуск: '+releaseId+'. Статус сайта подтверждается отдельно в coverage-cycle-publication.json.','','| Направление | Было | Добавлено | Стало | Пустых до → после | Полный пробник |','|---|---:|---:|---:|---:|---|'];
 for(const d of report.after){const before=report.before.find(b=>b.id===d.id);lines.push(`| ${d.id} | ${before.tasks} | ${d.tasks-before.tasks} | ${d.tasks} | ${before.numbers.filter(n=>!n.count).length} → ${d.numbers.filter(n=>!n.count).length} | ${d.fullMock?'да':'нет'} |`);}
 lines.push('',`Кандидатов 70; принято ${report.approvedIds.length}, дубликатов ${report.counts.duplicates}, ошибок ${report.counts.rejected}, ожидают review ${report.counts.review}. Новых staged-задач без включения в банк 0. 35 новых immutable shards; все ${report.oldTasksVerified} прежних записей сохранены. ЕГЭ профиль — 3603, добавлено 0; пополнение приостановлено.`, '', '## Закрытые и оставшиеся позиции','');
 for(const d of gaps.directions){const old=report.before.find(b=>b.id===d.id);lines.push(`- ${d.id}: закрыты №${d.numbers.filter(n=>n.count&&!old.numbers.find(b=>b.number===n.number).count).map(n=>n.number).join(', ')||'—'}; пусты №${d.numbers.filter(n=>!n.count).map(n=>n.number).join(', ')||'—'}.`);}
 lines.push('', '## Проверки содержания и ограничения','','64 конечных редакционных кандидата сверены с отдельным авторским листом ключей, формулировками и вариантами; 63 приняты. Это адресная авторская проверка, внешней экспертной сертификации 0. 6 файловых заданий проверены отдельным Python из фактического TXT/TSV: целочисленное сравнение среднего и перебор пар; пошаговая симуляция процессов вместо формулы критического пути; разбор токенов вместо JS-регулярного выражения. Для атомов и электронных процессов — дополнительный обратный справочник/расчёт. Условия и объяснения оригинальные, материалы ФИПИ используются для формата; тексты, задания и иллюстрации оттуда не копировались.','','Первый технический intake r1 не выпустил ни одного задания: 69 review из-за отсутствия точной обязательной строки атрибуции, 1 duplicate. В r2 строка исправлена по прежнему реестру, правила прав не ослаблялись. Исторический checkpoint r1 оставлен как superseded; нового незавершённого редакционного review нет.','','Дедупликация: прежний корпусный ID/точный/лексический near-match gate плюс адресное сравнение смысла, вариантов и решений этой небольшой партии. Один электронно-оболочечный параметрический вариант исключён; embedding-проверка и полная семантическая эквивалентность всего банка не заявляются.','','Не созданы имитации рисунков, аудио, опытов или автоматической экспертной оценки. Полная карта подтипов и индивидуальные коды кодификатора не подтверждены. Подробные требования, ссылки на документы, имеющиеся темы и причины блокировки каждого пустого номера: coverage-cycle-gaps.json.','','Основные блокеры: химия 20–22 — поэлементные рубрики и оригинальные развёрнутые решения; 23 — реальная лаборатория. Биология 1/4/6/13/14/16/19–22 — графика/схемы; 23–26 — развёрнутые критерии и полноценные тексты/таблицы. Обществознание 3 — эквивалентность перестановок внутри двух групп, 1/8/17–20 — рубрики/текст, 7/12 — фотография/диаграмма. Информатика ОГЭ 13–16 — практические форматы и критерии; ЕГЭ 3/18 — ресурсные форматы баз/таблиц, 26/27 — проверенный формат многокомпонентного ответа и предметный алгоритм. Русский ОГЭ 1 — настоящее авторское аудио, 13 и ЕГЭ27 — полноценные тексты и рубрики. Общий максимум баллов не заменяет критерии.','','## Продолжение без повторного импорта','','`node scripts/release-coverage-cycle.mjs --check` — проверяет завершённые 70 кандидатов и опубликованные ID, не импортирует повторно. `node scripts/release-coverage-cycle.mjs --report` — обновляет отчёт/QA-классификацию без записи в банк. `npm run taxonomy:check` — проверяет воспроизводимость метаданных.','','Следующая партия: оригинальные графические материалы биологии и точные рубрики химии 20–22/обществознания, затем практические файлы ОГЭ-информатики. Следующему выпуску нужен отдельный release ID, новые условия и собственный review; исторические r1/r2 не запускать как новые партии. Профильную математику не генерировать.');
 writeFileSync(resolve(projectRoot,'docs/coverage-cycle-progress.md'),lines.join('\n')+'\n');return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const r=process.argv.includes('--report')?refreshCoverageReport():await releaseCoverageCycle({checkOnly:process.argv.includes('--check')});console.log(JSON.stringify({counts:r.counts,alreadyReleased:r.alreadyReleased,candidates:r.candidates,profileAdded:0}));}
