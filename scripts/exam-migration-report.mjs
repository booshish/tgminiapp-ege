import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createContentLoader,projectRoot } from "./content-source-loader.mjs";

const changed = {
  "ege-math-profile":{count:19,maximum:32,note:"Новые №6,13,17; часть 1 №1–13, часть 2 №14–20. Экстремумы прежнего №12 → №9; прежний развёрнутый №16 не переносится в краткий №13."},
  "ege-informatics":{count:27,maximum:29,note:"№10 — подсеть, №13 — алгоритм, №23 — графы; №27 одна строка из двух чисел. Старые форматы требуют проверки условия, не позиционного переноса."},
  "ege-history":{count:21,maximum:42,note:"Добавлен №15 (всеобщая история); старые №15–21 сдвинуты. №20 изменён понятийный формат; №22 только два аргумента по России, максимум 2 вместо 3."},
  "oge-history":{count:24,maximum:37,note:"Удалён старый №21; старые №22–24 → №21–23."},
  "oge-social-studies":{count:24,maximum:37,note:"24→20: перестановка номеров; фото 3→2 балла; две модели статистики; новый развёрнутый №17; три вопроса к тексту вместо четырёх. Автоматической позиционной карты 2026 нет."},
  "oge-russian":{count:13,maximum:37,note:"№13.1–13.3: обязательны пояснения примеров; СК2 3→4, сочинение 7→8, общий максимум 38. Общие 13 баллов грамотности не прибавляются отдельно каждому ответу."},
};

function crosswalk(model) {
  const oldCount=changed[model.id]?.count??model.numbers.length;
  const profile={1:1,2:2,3:3,4:4,5:5,6:7,7:8,8:9,9:10,10:11,11:12,12:9,13:14,14:15,15:16,16:null,17:18,18:19,19:20};
  return Array.from({length:oldCount},(_,i)=>{
    const oldNumber=i+1;
    let number=oldNumber,decision="same-position-subject-to-item-review",change="Без существенных изменений по официальной сводке; отдельное условие проверяется по своей версии";
    if(model.id==="ege-math-profile"){number=profile[oldNumber];decision=number===null?"hold":"per-id-skill-map";change=number===null?"Нельзя автоматически переносить развёрнутую финансовую задачу в краткий ответ":"Сопоставление по типу и формату конкретного задания; №12 с экстремумами → №9";}
    if(model.id==="oge-history"){number=oldNumber===21?null:oldNumber>21?oldNumber-1:oldNumber;decision=number===null?"hold":"per-skill-review";change=number===null?"Позиция исключена":"Сохранение навыка, после №21 сдвиг на один";}
    if(model.id==="ege-history"){number=oldNumber>=15?oldNumber+1:oldNumber;decision=[19,21].includes(oldNumber)?"manual-format-and-criteria-review":"per-skill-review";change=oldNumber===21?"Всемирная история исключена; 3→2 балла":oldNumber===19?"Уточнено использование исторического понятия":oldNumber>=15?"Сдвиг из-за нового источника №15":"Позиция сохранена";}
    if(model.id==="oge-social-studies"){number=null;decision="manual-crosswalk-required";change="Не подтверждена полная 2026→2027 карта; прежних задач этой модели в опубликованном банке нет";}
    if(model.id==="ege-informatics"&&[10,13,23,27].includes(oldNumber)){
      number=oldNumber===13?10:oldNumber===23?13:oldNumber===27?27:null;
      decision="manual-format-and-skill-review";change=oldNumber===27?"Две строки по два числа → одна строка из двух чисел; старый ключ без проверки не подходит":"Перенос зависит от реального условия, а не только прежнего номера";
    }
    if(model.id==="oge-russian"&&oldNumber===13){decision="manual-criteria-review";change="Примеры с пояснениями; СК2 максимум 4, сочинение 8";}
    const slot=model.numbers.find(n=>n.number===number);
    return {sourceNumber:oldNumber,targetNumber:number,decision,change,targetPart:slot?.part??null,targetAnswerFormat:slot?.answerFormat??null,targetMaximum:slot?.maxPrimaryScore??null,sourceMaximum:model.id==="ege-history"&&oldNumber===21?3:model.id==="oge-russian"&&oldNumber===13?7:null,sourceMaximumStatus:"Only explicitly confirmed changes are filled; no guessed old per-item scores"};
  });
}

export function examMigrationReport(){
  const load=createContentLoader(),{getSubjects,subjectTitle}=load("src/lib/subjects.ts"),{getExamDefinition}=load("src/lib/exams.ts");
  const {practiceBank}=load("src/lib/tasks.ts"),{getTaskView}=load("src/lib/task-placement.ts"),{placements2027}=load("src/lib/content/placements-2027.ts");
  const {getPublicationDecision}=load("src/lib/content-publication.ts"),{getMockCoverage,getMockVariants}=load("src/lib/mock-exam.ts");
  const packages=load("src/lib/task-package-index.ts").taskPackageIndex;
  const bank=[...practiceBank,...packages.flatMap(p=>JSON.parse(readFileSync(resolve(projectRoot,"public/task-packages",p.file),"utf8")))];
  assert.equal(new Set(bank.map(t=>t.id)).size,bank.length);
  const directions=["ОГЭ","ЕГЭ"].flatMap(exam=>getSubjects(exam).flatMap(([subjectId])=>(exam==="ЕГЭ"&&subjectId==="math"?["base","profile"]:[null]).map(level=>{
    const model=getExamDefinition({examType:exam,subjectId,level});
    assert.equal(model.year,2027);assert.equal(model.verificationStatus,"draft-source-reviewed");
    assert.deepEqual(model.numbers.map(n=>n.number),Array.from({length:model.numbers.length},(_,i)=>i+1));
    assert.equal(model.numbers.reduce((a,n)=>a+n.maxPrimaryScore,0)+(model.sharedScoringPools??[]).reduce((a,p)=>a+p.maximum,0),model.maxPrimaryScore,`${model.id} primary-score total`);
    const source=bank.filter(t=>t.examType[0]===exam&&t.subjectId===subjectId&&t.level===level);
    const approved=source.filter(t=>t.publication.id===t.id&&getPublicationDecision(t.publication).allowed);
    const active=approved.map(getTaskView).filter(t=>t.availability!=="history-only");
    for(const t of active.filter(t=>t.examNumber!==null)){
      const slot=model.numbers.find(n=>n.number===t.examNumber);assert.ok(slot,t.id);
      assert.equal(t.part,slot.part,t.id);assert.equal(t.examVersionId,model.versionId,t.id);
      assert.equal(t.answerRule.type==="self",slot.answerFormat==="extended",t.id);
    }
    const math=subjectId==="math",coverage=math?getMockCoverage(model,source):null;
    return {id:model.id,subject:subjectTitle(subjectId),exam,level,source2026Count:changed[model.id]?.count??model.numbers.length,target2027Count:model.numbers.length,sourceMaximum:changed[model.id]?.maximum??model.maxPrimaryScore,targetMaximum:model.maxPrimaryScore,status:"2027-draft-numbered-plan-reviewed-not-full-rubric-certification",officialSubstantiveChange:Boolean(changed[model.id]),changes:changed[model.id]?.note??"По сводке ФИПИ существенных изменений нет; сохранена ранее проверенная проектная модель 2027",version:model.versionId,sources:model.sources,durationMinutes:model.durationMinutes??null,sessions:model.sessions??[],sourceTaskCount:source.length,retainedActiveTasks:active.length,retainedNumberedTasks:active.filter(t=>t.examNumber!==null).length,foundationTasks:active.filter(t=>t.examNumber===null).length,movedTasks:approved.filter(t=>getTaskView(t).examNumber!==t.examNumber&&getTaskView(t).availability!=="history-only").length,previouslyHistoryOnly:approved.filter(t=>t.availability==="history-only").length,newlyHeld:approved.filter(t=>t.availability!=="history-only"&&getTaskView(t).availability==="history-only").length,missingNumbers:model.numbers.filter(n=>!active.some(t=>t.examNumber===n.number)).map(n=>n.number),fullStudyVariants:math?getMockVariants(model,source).length:0,mockBlockers:coverage?{missingNumbers:coverage.missingNumbers,missingSharedCondition:coverage.missingSharedCondition}:"No full validated variant; no synthetic replacement",criteriaComplete:model.sourceReview?.criteriaComplete??false,crosswalk:crosswalk(model),numbers:model.numbers.map(n=>({number:n.number,part:n.part,title:n.title,format:n.answerFormat,maximum:n.maxPrimaryScore,source:n.sourceReference,resources:n.requiredResources??[],taskCount:active.filter(t=>t.examNumber===n.number).length,criteriaStatus:n.evaluation?.note??"Поэлементная рубрика требует проверки; максимум не заменяет критерии"}))};
  })));
  assert.equal(directions.length,30);assert.equal(directions.reduce((n,d)=>n+d.target2027Count,0),825);
  return {schemaVersion:1,checkedAt:"2026-10-27",status:"draft-structure-migration-with-explicit-rubric-gaps",baseline:"bb955610022931b4210e8f133c0a17137813ae76",newTasks:0,immutableSourceTasks:bank.length,lazyTasks:bank.length-practiceBank.length,immutableShards:packages.length,officialSources:[{url:"https://doc.fipi.ru/ege/demoversii-specifikacii-kodifikatory/2027/Plan_izmeneniya_KIM_EGE_2027.pdf",pages:[1,2]},{url:"https://doc.fipi.ru/oge/demoversii-specifikacii-kodifikatory/2027/Plan_izmeneniya_KIM_OGE_2027.pdf",pages:[1,2]}],totals:{directions:30,positions:825,officiallyChanged:directions.filter(d=>d.officialSubstantiveChange).length,retainedActiveTasks:directions.reduce((n,d)=>n+d.retainedActiveTasks,0),retainedNumberedTasks:directions.reduce((n,d)=>n+d.retainedNumberedTasks,0),movedWithoutChangingIds:directions.reduce((n,d)=>n+d.movedTasks,0),newlyHeld:directions.reduce((n,d)=>n+d.newlyHeld,0),fullRubricCertification:false},limitations:["Проекты ФИПИ 2027, не утверждённые документы", "Полный кодификатор/все поэлементные критерии и ресурсы не сертифицированы", "ОГЭ-обществознание: нет подтверждённой поэлементной карты 2026; существующий банк уже 2027 и не переносится по старым номерам", "Новые профильные №6,13,17 не заполняются неподходящими старыми условиями", "Ранее сохранённые пробники 2026 сохраняют исходный состав, дедлайны и результаты"],directions,placements:placements2027};
}
export function migrationMarkdown(report){
  return "# Единая структура подготовки 2027\n\nПроекты ФИПИ, проверка 27.10.2026. Это аудит структуры и совместимости, не подтверждение всех рубрик. Новых задач: 0. Исходные ID, условия и immutable shards не менялись.\n\n| Предмет | Экзамен | 2026 → 2027 | Изменения | Сохранено в практике | Перенумеровано | Новые пробелы/ограничения |\n|---|---|---|---|---:|---:|---|\n"+report.directions.map(d=>`| ${d.subject}${d.level?` (${d.level})`:""} | ${d.exam} | ${d.source2026Count} → ${d.target2027Count} | ${d.changes} | ${d.retainedActiveTasks} | ${d.movedTasks} | Пустые №: ${d.missingNumbers.join(", ")||"нет"}; полных вариантов ${d.fullStudyVariants}; рубрики ${d.criteriaComplete?"общий краткий ключ":"частично"} |`).join("\n")+"\n\nИсточники, поэлементные номера, части, максимумы, ресурсы и 2026→2027 решения — в `exam-2027-migration.json`. Точные task-ID решения — также `src/lib/content/placements-2027.ts`. Отложенные задания доступны из истории/закладок с маркировкой прежней модели, не в неправильном актуальном номере.\n\n"+report.limitations.map(s=>`- ${s}`).join("\n")+"\n";
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const r=examMigrationReport();writeFileSync(resolve(projectRoot,"docs/exam-2027-migration.json"),JSON.stringify(r,null,2)+"\n");writeFileSync(resolve(projectRoot,"docs/exam-2027-migration.md"),migrationMarkdown(r));console.log(JSON.stringify(r.totals));}
