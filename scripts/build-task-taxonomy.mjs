import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync,readFileSync,writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createContentLoader,projectRoot } from "./content-source-loader.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";

const hash=s=>createHash("sha256").update(s).digest("hex").slice(0,12);
const slug=s=>s.toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
const labels={
  "relative-humidity":["Атмосфера","Влажность воздуха","Расчёт относительной влажности"],
  "population-balance":["Население","Естественное и механическое движение","Баланс изменения численности"],
  "reserve-production-ratio":["Природные ресурсы","Ресурсообеспеченность","Отношение запасов к добыче"],
  "time-zone-conversion":["Земля и время","Часовые пояса","Перевод местного времени; экзаменационная карта ещё требуется"],
  "climate-table-inference":["Атмосфера","Климатические показатели","Вывод по климатической таблице"],
  gamete:["Клетка","Мейоз","Хромосомный набор гаметы"],
  "daughter-mitosis":["Клетка","Митоз","Хромосомный набор дочерней клетки"],
  "monohybrid-recessive":["Генетика","Моногибридное скрещивание","Вероятность рецессивного фенотипа"],
  "monohybrid-heterozygote":["Генетика","Моногибридное скрещивание","Вероятность гетерозиготного генотипа"],
  "taxonomic-rank-order":["Систематика","Таксономические ранги","Упорядочивание таксонов"],
  "germination-lab-sequence":["Методы биологии","Постановка опыта","Последовательность эксперимента"],
  "organism-traits-from-description":["Организм","Признаки организма","Анализ описания организма"],
  "plant-animal-cell-comparison":["Клетка","Растительная и животная клетки","Сравнение клеточных структур"],
  "events-to-years":["Историческая хронология","Даты событий","Соответствие события и года"],
  "chronology-russia":["Историческая хронология","Последовательность событий России","Хронологическое упорядочивание"],
  "limited-budget-choice":["Экономика","Ограниченность ресурсов","Выбор доступного набора благ"],
  "short-run-fixed-variable-costs":["Экономика","Издержки фирмы","Классификация постоянных и переменных издержек"],
  "budget-constraint-judgments":["Экономика","Бюджетное ограничение","Проверка суждений о бюджете"],
  "ohm-current":["Электричество","Закон Ома","Расчёт силы тока"],
  "uniform-speed":["Механика","Равномерное движение","Расчёт скорости по пути и времени"],
  "density-SI-conversion":["Механика","Плотность вещества","Плотность с переводом единиц в СИ"],
  "water-heating-no-phase-change":["Тепловые явления","Нагревание без фазового перехода","Количество теплоты"],
  "DC-power":["Электричество","Мощность постоянного тока","Расчёт электрической мощности"],
  "carbonate-element-mass":["Расчёты по формулам веществ","Массовая доля элемента","Масса элемента в карбонате кальция"],
  "dilute-solution-mixture":["Растворы","Массовая доля растворённого вещества","Баланс вещества при смешивании"],
  "stoichiometric-heat":["Химические реакции","Тепловой эффект","Расчёт по термохимическому уравнению"],
  "gas-from-impure-metal":["Химические реакции","Примеси и выход газа","Расчёт газа из металла с примесями"],
  "fixed-width-information-volume":["Кодирование информации","Равномерное кодирование","Информационный объём сообщения"],
  "positional-value-conversion":["Системы счисления","Позиционная запись числа","Перевод в десятичную систему"],
  "power-minus-offset-digit-count":["Системы счисления","Цифры позиционной записи","Число цифр в разности степени и числа"],
};
const mathConcepts=[
  ["Математический анализ","Производная и экстремумы",/кубическ.*функци/iu],
  ["Геометрия на плоскости","Окружность",/окружност|касательн.*окруж|хорд/iu],
  ["Геометрия на плоскости","Треугольники",/треуголь|гипотенуз|катет|пифагор|высот.*проекц/iu],
  ["Геометрия на плоскости","Четырёхугольники",/трапец|ромб|параллелограмм/iu],
  ["Стереометрия","Многогранники",/куб|пирамид|параллелепипед|призм|плоскост|пространствен/iu],
  ["Векторы","Координаты и операции с векторами",/вектор/iu],
  ["Алгебра","Алгебраические дроби",/алгебраическ.*дроб|преобразован.*дроб|разност.*квадрат/iu],
  ["Алгебра","Рациональные уравнения и ОДЗ",/рациональн.*уравнен|уравнен.*одз/iu],
  ["Числа и вычисления","Обыкновенные дроби",/дроб/iu],
  ["Числа и вычисления","Десятичные числа",/десятичн/iu],
  ["Числа и вычисления","Проценты",/процент|скидк|изменени.*цен/iu],
  ["Алгебра","Логарифмические уравнения",/логарифмическ.*уравнен|логарифм.*област/iu],
  ["Алгебра","Показательные уравнения",/показательн.*уравнен/iu],
  ["Алгебра","Иррациональные уравнения",/иррациональн.*уравнен/iu],
  ["Алгебра","Логарифмы",/логарифм/iu],
  ["Алгебра","Степени",/степен|показательн/iu],
  ["Алгебра","Квадратные корни",/корн.*выраж|выраж.*корн|с корн/iu],
  ["Алгебра","Квадратные уравнения",/квадратн.*уравнен/iu],
  ["Алгебра","Неравенства",/неравен|метод.*интервал/iu],
  ["Алгебра","Последовательности и прогрессии",/прогресс/iu],
  ["Алгебра","Тригонометрические уравнения",/тригонометр/iu],
  ["Алгебра","Параметры",/параметр/iu],
  ["Математический анализ","Производная и экстремумы",/производн|касательн|наибольш.*значен|наименьш.*значен/iu],
  ["Функции","Графики и формулы функций",/функци|график|пропорциональн/iu],
  ["Вероятность","Случайные события",/вероятност|исход|попадан|успех/iu],
  ["Текстовые задачи","Движение",/движени|скорост|вдогон|навстреч/iu],
  ["Текстовые задачи","Работа и производительность",/совместн.*работ|труб/iu],
  ["Текстовые задачи","Смеси",/смес|концентрац/iu],
  ["Практические расчёты","Планы и измерения",/план|участк|плит|ограждени/iu],
  ["Работа с данными","Таблицы и диаграммы",/таблиц|частот/iu],
  ["Целые числа и логика","Делимость и перебор",/цел.*числ|натуральн|монет|делим|остат|цифр|дирихле|гарантирован/iu],
];

export function buildTaskTaxonomy(){
  const load=createContentLoader(),{practiceBank}=load("src/lib/tasks.ts"),{getTaskView}=load("src/lib/task-placement.ts");
  const {getSubjects}=load("src/lib/subjects.ts"),{getExamDefinition}=load("src/lib/exams.ts"),{sourceRegistry}=load("src/lib/source-registry.ts");
  const {getPublicationDecision}=load("src/lib/content-publication.ts");
  const bank=[...practiceBank,...load("src/lib/task-package-index.ts").taskPackageIndex.flatMap(p=>JSON.parse(readFileSync(resolve(projectRoot,"public/task-packages",p.file),"utf8")))];
  assert.equal(new Set(bank.map(t=>t.id)).size,bank.length);
  const mathCases=new Map();
  for(const name of ["oge","ege","base","challenge"]){const m=load(`src/lib/content/${name}-bank.ts`);for(const c of m[`${name}GeneratorCases`])mathCases.set(c.taskId,{family:c.family??m[`${name}Tasks`].find(t=>t.id===c.taskId).prototypeId,evidence:`src/lib/content/${name}-bank.ts`});}
  const proofs=JSON.parse(readFileSync(resolve(projectRoot,"docs/remaining-pilot-verification.json"),"utf8")).records;
  const reviewed=new Map(proofs.map(r=>[r.id,{...r,evidence:"docs/remaining-pilot-verification.json"}]));
  const reviewHashes=new Map(JSON.parse(readFileSync(resolve(projectRoot,"docs/remaining-pilot-review.json"),"utf8")).reviews.map(r=>[r.id,r.sha256]));
  const profilePath=resolve(projectRoot,"docs/profile-math-verification.json");
  const profileReceipt=existsSync(profilePath)?JSON.parse(readFileSync(profilePath,"utf8")):null;
  const refillPath=resolve(projectRoot,"docs/priority-refill-verification.json");
  const refillRecords=existsSync(refillPath)?JSON.parse(readFileSync(refillPath,"utf8")).records:[];
  const profileReviews=new Map([...(profileReceipt?.records??[]),...refillRecords].map(r=>[r.id,r]));
  const nodes={},assignments={},records=[];
  function node(kind,subject,title,parentId){const id=`${subject}-${kind}-${hash(`${parentId??""}|${title}`)}`;const value={id,kind,subjectId:subject,title,...(parentId?{parentId}: {})};if(nodes[id])assert.deepEqual(nodes[id],value);else nodes[id]=value;return id;}
  for(const raw of bank){
    const task=getTaskView(raw),model=getExamDefinition({examType:task.examType[0],subjectId:task.subjectId,level:task.level}),slot=model.numbers.find(n=>n.number===task.examNumber);
    let group=mathCases.get(task.id),proof=reviewed.get(task.id),triple=null,family=null,evidence=null;
    if(group){family=group.family;evidence=group.evidence;const concept=mathConcepts.find(([, ,re])=>re.test(task.title));if(concept)triple=[concept[0],concept[1],task.title];
      if(model.id==="ege-math-profile"&&task.examNumber===10||model.id==="ege-math-base"&&task.examNumber===4||model.id==="oge-math"&&task.examNumber===12)triple=["Прикладные расчёты","Расчёты по формулам",task.title];
    }
    if(proof){assert.equal(contentFingerprint(raw),reviewHashes.get(task.id),`Stale classification evidence: ${task.id}`);family=proof.subtype;evidence=proof.evidence;triple=labels[family]??null;
      if(family.startsWith("grammar-")){
        if(task.subjectId==="english"){family="past-simple-irregular";triple=["Грамматика","Неправильные глаголы","Форма Past Simple в контексте"];}
        else {family="finite-verb-forms";triple=["Грамматика","Личные формы глагола","Согласование формы глагола с подлежащим"];}
      }
    }
    const profile=profileReviews.get(raw.id);
    if(profile){assert.equal(contentFingerprint(raw),profile.sha256,`Stale profile classification: ${raw.id}`);family=profile.family;triple=profile.triple;evidence=raw.id.startsWith("refill-")?"docs/priority-refill-verification.json":"docs/profile-math-verification.json";}
    const topicId=node("topic",task.subjectId,triple?.[0]??slot?.title??"Школьная математическая база");
    const subtopicId=triple?node("subtopic",task.subjectId,triple[1],topicId):null;
    const subtypeId=triple?`${task.subjectId}-subtype-${slug(family)}`:null;
    if(subtypeId){const value={id:subtypeId,kind:"subtype",subjectId:task.subjectId,title:triple[2]};if(!nodes[subtypeId])nodes[subtypeId]=value;}
    const sourceIds=raw.publication.provenance.sourceIds;
    const original=raw.publication.provenance.authorship==="project-original"&&sourceIds.length===1&&sourceIds[0]==="tochka-project-original"&&getPublicationDecision(raw.publication).allowed;
    const explicitCategories=sourceIds.map(id=>sourceRegistry.find(s=>s.id===id)?.taskOriginCategory);
    const confirmedCategory=getPublicationDecision(raw.publication).allowed&&explicitCategories.every(Boolean)&&new Set(explicitCategories).size===1?explicitCategories[0]:null;
    const sourceCategory=original?"tochka-original":confirmedCategory??"unconfirmed";
    assignments[raw.id]=[model.id,task.examNumber,topicId,subtopicId,subtypeId,sourceCategory];
    records.push({taskId:raw.id,modelId:model.id,number:task.examNumber,active:task.availability!=="history-only",topicId,subtopicId,subtypeId,reviewStatus:triple?"authored-family-reviewed":"needs-editorial-review",evidence:triple?evidence:null,skill:triple?.[2]??slot?.title??null,difficulty:{value:raw.difficulty,status:"author-level-not-official-difficulty"},source:{category:sourceCategory,sourceIds,originYear:null,requirementsYear:raw.examYear,identifier:raw.id,sourceFiles:raw.publication.provenance.sourceFiles,evidenceSourceIds:sourceIds,rightsStatus:original?"project-authorship-declared-not-independent-legal-opinion":confirmedCategory?"publication-gate-confirmed":"unconfirmed"},codifier:{status:"pending-individual-mapping",requirementsReference:slot?.sourceReference??null},sourceContentSha256:contentFingerprint(raw)});
  }
  const audit=JSON.parse(readFileSync(resolve(projectRoot,"docs/all-directions-readiness.json"),"utf8")).generatorAudit;
  const directions=["ОГЭ","ЕГЭ"].flatMap(exam=>getSubjects(exam).flatMap(([subjectId])=>(exam==="ЕГЭ"&&subjectId==="math"?["base","profile"]:[null]).map(level=>{
    const model=getExamDefinition({examType:exam,subjectId,level});assert.equal(model.year,2027);
    return {modelId:model.id,exam,subjectId,level,modelVersion:model.versionId,numbers:model.numbers.map(n=>{
      const tasks=records.filter(t=>t.modelId===model.id&&t.number===n.number&&t.active);
      const prior=audit.directions.find(d=>d.id===model.id)?.numbers.find(s=>s.number===n.number);
      const groups=[...Map.groupBy(tasks,t=>[t.subtypeId,t.topicId,t.subtopicId,t.source.category].join("|"))].map(([,rows])=>({subtypeId:rows[0].subtypeId,topicId:rows[0].topicId,subtopicId:rows[0].subtopicId,sourceCategory:rows[0].source.category,count:rows.length,status:rows[0].reviewStatus}));
      return {number:n.number,skill:n.title,answerFormat:n.answerFormat,part:n.part,officialLabels:n.officialLabels??[String(n.number)],requirementsReference:n.sourceReference??null,codifier:{status:"number-level-reference-only-not-individual-task-mapping",contentCodes:[...new Set(prior?.subtypes.flatMap(s=>s.knowledgeCodes)??[])],requirementCodes:[...new Set(prior?.subtypes.flatMap(s=>s.requirementCodes)??[])]},status:groups.some(g=>g.subtypeId)?"PARTIAL":"BLOCKED",complete:false,taskCount:tasks.length,groups,manualReviewReasons:["Полный каталог существенных подтипов и индивидуальные связи с кодификатором не подтверждены",...(tasks.some(t=>!t.subtypeId)?["Есть задачи без содержательно проверенного подтипа/подтемы"]:[]),...(!tasks.length?["Нет опубликованных совместимых заданий"]:[])]};
    })};
  })));
  const generators=audit.directions.flatMap(d=>d.numbers.flatMap(n=>n.subtypes.filter(s=>s.hasGenerator).map(s=>{
    const profile=profileReceipt?.generators.find(g=>d.id==="ege-math-profile"&&g.number===n.number&&g.subtype===s.subtype);
    const triple=labels[s.subtype]??(profile?[profile.topic,profile.subtopic,profile.title]:null),topicId=triple?node("topic",d.subjectId,triple[0]):null,subtopicId=triple?node("subtopic",d.subjectId,triple[1],topicId):null;
    const subtypeId=triple?`${d.subjectId}-subtype-${slug(s.subtype)}`:null;if(subtypeId&&!nodes[subtypeId])nodes[subtypeId]={id:subtypeId,kind:"subtype",subjectId:d.subjectId,title:triple[2]};
    return {generatorId:`${d.id}:${n.number}:${s.subtype}`,modelId:d.id,number:n.number,subtype:s.subtype,subtypeId,topicId,subtopicId,answerFormat:s.answerFormat,verification:s.answerVerification,implementation:s.generationMethod,readiness:s.status,limitations:s.limitations};
  })));
  if(existsSync(profilePath))for(const g of JSON.parse(readFileSync(profilePath,"utf8")).generators){
    if(generators.some(row=>row.generatorId===`ege-math-profile:${g.number}:${g.subtype}`))continue;
    const topicId=node("topic","math",g.topic),subtopicId=node("subtopic","math",g.subtopic,topicId),subtypeId=`math-subtype-${slug(g.subtype)}`;
    if(!nodes[subtypeId])nodes[subtypeId]={id:subtypeId,kind:"subtype",subjectId:"math",title:g.title};
    generators.push({generatorId:`ege-math-profile:${g.number}:${g.subtype}`,modelId:"ege-math-profile",number:g.number,subtype:g.subtype,subtypeId,topicId,subtopicId,answerFormat:g.number<=13?"number":"extended",verification:g.verification,implementation:{file:"scripts/profile-math-generators.mjs",export:"generateProfileBatch",selector:{number:g.number,subtype:g.subtype}},readiness:g.status,limitations:g.limitations});
  }
  const active=records.filter(t=>t.active),numbers=directions.flatMap(d=>d.numbers);
  return {schemaVersion:1,checkedAt:"2026-10-27",structureVersion:"2027-placement-v1",nodes,assignments,records,directions,generators,sourceRecords:sourceRegistry,counts:{directions:directions.length,numbers:numbers.length,numbersWithTasks:numbers.filter(n=>n.taskCount).length,numbersWithReviewedSubtypes:numbers.filter(n=>n.groups.some(g=>g.subtypeId)).length,fullyClassifiedNumbers:0,subtypes:Object.values(nodes).filter(n=>n.kind==="subtype").length,topics:Object.values(nodes).filter(n=>n.kind==="topic").length,subtopics:Object.values(nodes).filter(n=>n.kind==="subtopic").length,sourceTasks:records.length,activeTasks:active.length,reviewedDetailedTasks:active.filter(t=>t.subtypeId).length,broadTopicOnlyTasks:active.filter(t=>!t.subtypeId).length,unconfirmedOriginTasks:records.filter(t=>t.source.category==="unconfirmed").length,individualCodifierMappingsConfirmed:0,generatorContracts:generators.length},limitations:["Классификация авторских семейств не является исчерпывающей официальной типологией ФИПИ", "Без прямого подтверждения подтип/подтема остаются пустыми; общая тема не объявляется полным покрытием", "Все связи с кодификатором пока уровня номера; индивидуальная привязка требует содержательной проверки", "Происхождение собственных задач подтверждено декларацией и файлами проекта, не независимой правовой экспертизой", "Год экзамена не выдаётся за год происхождения материала", "Новые материалы не создавались и не импортировались"]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const report=buildTaskTaxonomy();
  if(process.argv.includes("--check")){
    const data=createContentLoader()("src/lib/content/task-taxonomy-data.ts").taskTaxonomyData;
    assert.deepEqual(data,{schemaVersion:1,nodes:report.nodes,assignments:report.assignments},"Classification metadata is stale; rebuild after a reviewed content release");
    assert.deepEqual(JSON.parse(readFileSync(resolve(projectRoot,"docs/task-classification-map.json"),"utf8")),report,"Classification report is stale");
    console.log(JSON.stringify({valid:true,...report.counts}));
  }else{
  writeFileSync(resolve(projectRoot,"src/lib/content/task-taxonomy-data.ts"),"// Generated metadata only: no statements, answers, or changes to immutable tasks.\nimport type { TaxonomyData } from '../task-taxonomy';\nexport const taskTaxonomyData:TaxonomyData="+JSON.stringify({schemaVersion:1,nodes:report.nodes,assignments:report.assignments})+";\n");
  writeFileSync(resolve(projectRoot,"docs/task-classification-map.json"),JSON.stringify(report,null,2)+"\n");
  const lines=["# Классификация задач: все 30 направлений", "", "Карта учитывает единую модель проектов 2027. Подробно классифицированы только доказанные авторские семейства; полнота официальных подтипов не заявляется. Год стандарта не считается годом происхождения задания.", "", "| Направление | Номеров | Номеров с проверенными подтипами | Подробно классифицировано задач | Остальные задачи: редакционная проверка |", "|---|---:|---:|---:|---|"];
  for(const d of report.directions){const r=report.records.filter(t=>t.modelId===d.modelId&&t.active);lines.push(`| ${d.modelId} | ${d.numbers.length} | ${d.numbers.filter(n=>n.groups.some(g=>g.subtypeId)).length} | ${r.filter(t=>t.subtypeId).length} | ${r.filter(t=>!t.subtypeId).length}; №${d.numbers.filter(n=>n.groups.some(g=>!g.subtypeId)).map(n=>n.number).join(", ")||"—"} |`);}
  lines.push("", "Все 825 номеров требуют проверки исчерпывающего перечня существенных подтипов и индивидуальных кодов ФИПИ. Для пустых позиций не созданы фиктивные категории. Полная карта с группами и источниками: `task-classification-map.json`. Метаданные клиента не содержат условий или ответов и не загружают shards.", "", "Генераторы: 31 контракт прежнего каталога, с темой, подтемой, подтипом, форматом ответа, способом проверки и READY/PARTIAL/BLOCKED. `planSubtypeGeneration` принимает modelId/number/subtype/count, проверяет прежний READY-gate и формирует заказ, но не запускает генерацию или публикацию.");
  writeFileSync(resolve(projectRoot,"docs/task-classification-summary.md"),lines.join("\n")+"\n");
  console.log(JSON.stringify(report.counts));
  }
}
