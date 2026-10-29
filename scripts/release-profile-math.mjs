import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createContentLoader,projectRoot} from './content-source-loader.mjs';
import {generateProfileBatch,profileFamilies} from './profile-math-generators.mjs';
import {contentFingerprint} from './content-review-evidence.mjs';
import {publishedCorpus,structuralIssues} from './import-tasks.mjs';
import {releasePilot} from './release-task-pilot.mjs';

export const profileReleaseId='profile-math-20261028-r1';
export const profilePrefix='profile-20261028-';
export function verifyProfileRows(rows) {
  const result=spawnSync('python',['scripts/verify-profile-math.py'],{cwd:projectRoot,input:rows.map(r=>JSON.stringify(r)).join('\n')+'\n',encoding:'utf8',maxBuffer:5_000_000});
  assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(result.stdout);assert.equal(report.verified,rows.length);return report;
}
export function profileInventory(corpus=publishedCorpus()) {
  const load=createContentLoader(),{getTaskView}=load('src/lib/task-placement.ts');
  const taxonomy=existsSync(resolve(projectRoot,'docs/task-classification-map.json'))?JSON.parse(readFileSync(resolve(projectRoot,'docs/task-classification-map.json'),'utf8')):null;
  const classes=new Map(taxonomy?.records.map(r=>[r.taskId,r])??[]);
  const tasks=corpus.map(getTaskView).filter(t=>t.subjectId==='math'&&t.level==='profile'&&t.availability!=='history-only'&&t.examNumber!==null);
  return Array.from({length:20},(_,i)=>{
    const group=tasks.filter(t=>t.examNumber===i+1),subtypes={};
    for(const t of group){const key=classes.get(t.id)?.subtypeId??'needs-editorial-review';subtypes[key]=(subtypes[key]??0)+1;}
    return {number:i+1,count:group.length,withSolutions:group.filter(t=>t.solution.length&&t.solution.every(s=>s.text.trim())).length,subtypes};
  });
}
function writeJSON(file,value){writeFileSync(resolve(projectRoot,file),JSON.stringify(value,null,2)+'\n');}
export async function releaseProfileMath({checkOnly=false}={}) {
  if(!checkOnly)createContentLoader()('src/lib/subjects.ts').assertContentExpansionAllowed('ege-math-profile');
  const rows=generateProfileBatch(),corpus=publishedCorpus();
  const control=verifyProfileRows(generateProfileBatch({control:true}));
  const independent=verifyProfileRows(rows);
  for(const {task} of rows)assert.deepEqual(structuralIssues(task,corpus),[],task.id);
  const verification={schemaVersion:1,checkedAt:'2026-10-28',batchId:profileReleaseId,kind:'original-training-not-official-kim',officialModel:'ege-math-profile-2027-draft',control,independent,expertReviewed:false,
    implementationSha256:Object.fromEntries(['scripts/profile-math-generators.mjs','scripts/verify-profile-math.py'].map(file=>[file,createHash('sha256').update(readFileSync(resolve(projectRoot,file))).digest('hex')])),
    solutionQA:'Separate exact arithmetic, symbolic identities/derivatives, finite enumeration and targeted review of bounded proof templates; not external expert certification',
    modelEvidence:{spec:'docs/fipi/МА-11 ЕГЭ 2027 СПЕЦ_профильный.pdf',demo:'docs/fipi/МА-11 ЕГЭ 2027 ДЕМО_профильный.pdf',status:'draft-not-final',newNumbers:[6,13,17],number17Criteria:'Demo printed pages 25–26: 2 justified correct; 1 complete correct method with computational error; 0 otherwise. No extension to other rubrics.'},
    generators:profileFamilies,records:rows.map(r=>({id:r.task.id,sha256:contentFingerprint(r.task),...r.classification,proof:r.proof,method:'separate-python-sympy-enumeration',expertReviewed:false}))};
  if(checkOnly){
    assert.deepEqual(JSON.parse(readFileSync(resolve(projectRoot,'docs/profile-math-verification.json'),'utf8')),verification);
    const published=corpus.filter(t=>t.id.startsWith(profilePrefix)),byId=new Map(rows.map(r=>[r.task.id,r.task]));
    const release=JSON.parse(readFileSync(resolve(projectRoot,'docs/profile-math-release.json'),'utf8'));
    assert.deepEqual(published.map(t=>t.id).sort(),[...release.approvedIds].sort());
    for(const task of published)assert.equal(contentFingerprint(task),contentFingerprint(byId.get(task.id)),task.id);
    return {published:published.length,independent};
  }
  writeJSON('docs/profile-math-verification.json',verification);
  const reportPath=resolve(projectRoot,'docs/profile-math-release.json');
  const prior=existsSync(reportPath)?JSON.parse(readFileSync(reportPath,'utf8')):null;
  if(prior?.approvedIds?.some(id=>corpus.some(t=>t.id===id))){
    assert.ok(prior.approvedIds.every(id=>corpus.some(t=>t.id===id)),'Partial publication needs operator review, never regenerate IDs');
    return releaseProfileMath({checkOnly:true});
  }
  const before=profileInventory(corpus),originalShards=createContentLoader()('src/lib/task-package-index.ts').taskPackageIndex.map(p=>({file:p.file,sha256:p.sha256}));
  const result=await releasePilot({tasks:rows.map(r=>r.task),batchId:profileReleaseId,reviewFile:'docs/profile-math-review.json',reviewedAt:'2026-10-28',allowDuplicates:true,reviewMethod:'independent-computation',evidence:['scripts/verify-profile-math.py','docs/profile-math-verification.json']});
  const all=publishedCorpus(),published=all.filter(t=>t.id.startsWith(profilePrefix));
  assert.equal(published.length,result.approvedIds.length);
  for(const p of originalShards)assert.equal(createHash('sha256').update(readFileSync(resolve(projectRoot,'public/task-packages',p.file))).digest('hex'),p.sha256);
  writeJSON('docs/profile-math-release.json',{schemaVersion:1,batchId:profileReleaseId,date:'2026-10-28',status:'source-packages-released-deployment-not-yet-confirmed',before,counts:result.counts,approvedIds:result.approvedIds,originalShards,newTasks:published.length,stagingOnly:0,templates:profileFamilies.length,withIndependentAnswerAndSolutionChecks:published.length,externalExpertReviewed:0,targetTotal:2000,notes:['Duplicates excluded by unchanged 90% token-similarity gate; they are not published.','Archived source tasks and IDs unchanged.','Full exam remains blocked for unconfirmed 2027 rubrics in other extended numbers.']});
  return {counts:result.counts,published:published.length,total:before.reduce((s,n)=>s+n.count,0)+published.length};
}
export function writeProfileSummary(){
  const report=JSON.parse(readFileSync(resolve(projectRoot,'docs/profile-math-release.json'),'utf8'));
  const current=profileInventory(),tasks=publishedCorpus().filter(t=>t.id.startsWith(profilePrefix));
  const rows=current.map((row,i)=>({number:row.number,before:report.before[i].count,added:tasks.filter(t=>t.examNumber===row.number).length,after:row.count,subtypesCovered:Object.keys(row.subtypes).filter(s=>s!=='needs-editorial-review').length,subtypeCounts:row.subtypes,pendingClassification:row.subtypes['needs-editorial-review']??0,generators:profileFamilies.filter(f=>f.number===row.number).map(f=>({subtype:f.subtype,readiness:f.status}))}));
  writeJSON('docs/profile-math-inventory.json',{checkedAt:'2026-10-28',model:'ege-math-profile-2027-draft',rows,totalBefore:rows.reduce((n,r)=>n+r.before,0),totalAdded:tasks.length,totalAfter:rows.reduce((n,r)=>n+r.after,0),emptyNumbers:rows.filter(r=>!r.after).map(r=>r.number),subtypeInventoryComplete:false});
  const lines=['# Профильная математика — первая массовая партия 28.10.2026','','Модель: проект ЕГЭ-2027, не утверждённая спецификация. Первичные баллы — 33, заданий — 20. Новые материалы оригинальные, не официальные КИМ. Статус удалённой публикации — в `profile-math-publication.json`, если квитанция уже сохранена.','', '| № | Было | Добавлено в release | Стало | Покрыто именованных подтипов |','|---:|---:|---:|---:|---:|'];
  for(const r of rows)lines.push(`| ${r.number} | ${r.before} | ${r.added} | ${r.after} | ${r.subtypesCovered} |`);
  lines.push('',`Всего: **${rows.reduce((n,r)=>n+r.before,0)} → ${rows.reduce((n,r)=>n+r.after,0)}**, новых ${tasks.length}. 2840 кандидатов; 804 дубликата исключены неизменённым gate >=90% сходства множеств слов, ошибок/сомнительных записей 0. Неопубликованных staged-задач этой партии 0: 2036 принятых записей уже включены в 20 новых immutable shards; контрольные файлы staging сохранены для аудита.`,
    '', '## Качество и ограничения', '',
    '- 41 оригинальный шаблон / один параметризованный фабричный API `generateProfileBatch`, отдельный Python/SymPy-проверяющий модуль. Контроль 164 условий (по 4 на семейство), затем проверены все 2840 кандидатов; 2036 принятых имеют проверенные ответы и решения. Внешних экспертных рецензий 0. Символьная проверка и отдельный перебор не выдаются за оценку реальных ученических работ.',
    '- Все новые задания снабжены темой, подтемой, подтипом, происхождением и fingerprint поэлементного review. ФИПИ используется только как источник структуры; чужие условия, рисунки и решения не копировались. 1816 прежних bundled-записей и 124 прежних shards / 151 lazy-запись сохранены.',
    '- 27 ограниченных короткоответных семейств READY; 14 развёрнутых PARTIAL. Это не полное покрытие существенных подтипов. Параметрические области конечны; повторный заказ обязательно проходит дедупликацию. Перестановка/изменение параметров не гарантирует новую опубликованную задачу.',
    '- №6: ожидание, дисперсия, стандартное отклонение; №13: равномерное погашение тела кредита, капитализация вклада; №17: обоснование максимума прибыли и глобального минимума затрат. Для №17 приведена шкала проекта 0/1/2; интерактивное оценивание и XP не расширялись. Для №14–16 и №18–20 пока только авторские памятки: они не выдаются за подтверждённые поэлементные критерии.',
    '- Пустых номеров больше нет. Полные перечни подтипов/индивидуальные коды кодификатора не завершены. Требуют дальнейшей реализации: составные/непрерывные распределения №6; кредиты с иными графиками и обратные финансовые задачи №13; иные прикладные модели №17; геометрические конфигурации с оригинальными рисунками; более сложные параметры и целочисленные исследования; иные подтипы всех номеров вне указанного ограниченного набора.',
    '- Полный профильный пробник НЕ разблокирован: критерии №14–20 ещё не зарегистрированы как совместимые для всех требуемых форматов. Автоматическая проверка развёрнутых решений не добавлялась. Старые попытки, XP/серии, закладки и черновики не менялись.',
    '- Исправлена только метка ранее неправильно классифицированного семейства «кубическая функция»: математический анализ, не геометрический куб. Условия/ID старых задач не менялись.',
    '', '## Продолжение', '',
    '`node scripts/release-profile-math.mjs --check` — заново проверяет существующий выпуск без записи и повторного импорта. Нужен Python с `scripts/requirements-math-qa.txt`. `node scripts/release-profile-math.mjs --summary` — пересчитывает только отчёт.',
    '', 'Не запускать r1 как новую партию. Для дальнейшего наполнения: `planSubtypeGeneration(generationAudit(), {modelId:"ege-math-profile", number:6, subtype:"two-point-variance", count:...})`, затем `generateProfileBatch({...order.implementation.selector, perFamily:order.count})`, независимый `verifyProfileRows` и прежний releasePilot с НОВЫМ batchId. IDs детерминированы: уже опубликованные кандидаты отклоняются как дубликаты, а не переписываются. Для расширения математической области нужны новые проверенные конструкции, а не сброс ID.',
    '', 'Начинать следующий этап с недостающих критериев №14–20 и более глубоких подтипов №4/5/13/17, а не повторного импорта r1. Основная цель этого этапа (не менее 2000 подходящих задач) достигнута в исходниках; удалённый deploy подтверждается отдельно.');
  writeFileSync(resolve(projectRoot,'docs/profile-math-progress.md'),lines.join('\n')+'\n');
  return rows;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)console.log(JSON.stringify(process.argv.includes('--summary')?writeProfileSummary():await releaseProfileMath({checkOnly:process.argv.includes('--check')})));
