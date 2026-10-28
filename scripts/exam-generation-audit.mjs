import { createHash } from "node:crypto";
import { existsSync,readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";
import { generatorCapabilities, finiteFactoryInventory } from "./generator-catalog.mjs";

export const auditBaseline="54ca49bbe85535adcb5ac58e2d3a7fe9f5da076e";
const localMathDocs={
  "ege-math-base":"docs/fipi/МА-11 ЕГЭ 2027 СПЕЦ_базовый.pdf",
  "ege-math-profile":"docs/fipi/МА-11 ЕГЭ 2027 СПЕЦ_профильный.pdf",
};
const fileHash=file=>createHash("sha256").update(readFileSync(resolve(projectRoot,file))).digest("hex");
function requiredResourcesFor(modelId,number,slot){
  const required=[...(slot?.requiredResources??[])];
  // These dependencies were already documented in the Russian model/review,
  // but were previously only prose and must not disappear from the machine map.
  if(modelId==="oge-russian"){
    if(number===1)required.push("Оригинальная аудиозапись и проверенный исходный текст изложения");
    if([2,3].includes(number))required.push("Связный исходный текст для синтаксического анализа");
    if(number>=10)required.push("Полноценный исходный текст с корректной нумерацией предложений");
  }
  if(modelId==="ege-russian"){
    if(number<=3||number>=23)required.push("Полноценный исходный текст и согласованный комплект связанных заданий");
    if(number===22)required.push("Полный набор оригинальных фрагментов для сопоставления средств выразительности");
  }
  return [...new Set(required)];
}
/** Extend the existing report, never replace the registry or renumber published IDs. */
export function generationAudit(){
  const load=createContentLoader(),{getSubjects}=load("src/lib/subjects.ts"),{getExamDefinition}=load("src/lib/exams.ts");
  const {getExamAnswerContract,getExtendedAnswerGuidance}=load("src/lib/exam-answer-scoring.ts");
  const {practiceBank}=load("src/lib/tasks.ts"),{taskPackageIndex}=load("src/lib/task-package-index.ts");
  const {getTaskView}=load("src/lib/task-placement.ts");
  const lazy=taskPackageIndex.flatMap(p=>JSON.parse(readFileSync(resolve(projectRoot,"public/task-packages",p.file),"utf8")));
  const requirements=JSON.parse(readFileSync(resolve(projectRoot,"docs/exam-requirements.json"),"utf8"));
  const controlsPath=resolve(projectRoot,"docs/generator-control-review.json");
  const controlReview=existsSync(controlsPath)?JSON.parse(readFileSync(controlsPath,"utf8")):null;
  const profilePath=resolve(projectRoot,"docs/profile-math-verification.json");
  const profileReview=existsSync(profilePath)?JSON.parse(readFileSync(profilePath,"utf8")):null;
  const controlsVerifiedFor=cap=>cap.profileRelease?Boolean(profileReview?.control.families[cap.subtype]===4&&profileReview.independent.families[cap.subtype]>0&&[cap.implementation.file,cap.verification.file].every(file=>profileReview.implementationSha256?.[file]===fileHash(file))):Boolean(controlReview?.passed&&controlReview.records.filter(r=>r.family===cap.subtype).length===6&&[cap.implementation.file,"scripts/check-generator-controls.mjs"].every(file=>controlReview.implementationSha256?.[file]===createHash("sha256").update(readFileSync(resolve(projectRoot,file))).digest("hex")));
  const families=finiteFactoryInventory.filter(f=>f.exports.some(e=>e.endsWith("GeneratorCases"))).flatMap(factory=>{
    const file=factory.file,bank=load(file),caseExport=factory.exports.find(e=>e.endsWith("GeneratorCases"));
    const taskExport=factory.exports.find(e=>e.endsWith("Tasks")),byId=new Map(bank[taskExport].map(t=>[t.id,t]));
    const cases=bank[caseExport].map(c=>{const raw=byId.get(c.taskId);if(!raw)throw Error(`Unknown source case: ${c.taskId}`);const t=getTaskView(raw);return {...c,number:t.examNumber,model:t.examType[0]==="ОГЭ"?"oge-math":t.level==="base"?"ege-math-base":"ege-math-profile"};}).filter(c=>c.number!==null);
    return [...Map.groupBy(cases,c=>`${c.model}:${c.number}:${c.family}`)].map(([,rows])=>({model:rows[0].model,number:rows[0].number,subtype:rows[0].family,file,export:caseExport,count:rows.length}));
  });
  const directions=["ОГЭ","ЕГЭ"].flatMap(exam=>getSubjects(exam).flatMap(([subjectId])=>(exam==="ЕГЭ"&&subjectId==="math"?["base","profile"]:[null]).map(level=>{
    const model=getExamDefinition({examType:exam,subjectId,level});
    const officialTarget=subjectId==="math"?requirements.exams.find(e=>e.id===model.id)?.official_target_requirements:null;
    const local=localMathDocs[model.id];
    const targetRows=officialTarget?.numbers??model.numbers;
    const originals=[...practiceBank,...lazy].map(getTaskView).filter(t=>t.availability!=="history-only"&&t.subjectId===subjectId&&t.examType[0]===exam&&t.level===level);
    const differences=[];
    if(model.id==="ege-math-profile")differences.push({kind:"source-to-active-crosswalk",sourceNumbers:19,runtime:model.numbers.length,target:20,action:"Frozen source families mapped by task ID and skill; old financial extended answers held outside active practice"});
    if(model.id==="oge-russian")differences.push({kind:"cross-answer-criteria-pool",taskScoreSum:25,sharedScore:13,total:38,action:"Shared literacy points belong to both extended answers, not task 13 alone"});
    const numbers=targetRows.map(row=>{
      const number=row.number,slot=model.numbers.find(n=>n.number===number),title=row.content_summary??slot?.title;
      const caps=generatorCapabilities.filter(c=>c.model===model.id&&c.number===number);
      const finite=families.filter(f=>f.model===model.id&&f.number===number);
      // Pending title labels are NOT verified subtypes and must not inflate coverage.
      const declared=slot?.practiceAnswerFormat?slot.generation?.subtypes??[]:[];
      const relevant=originals.filter(t=>t.examNumber===number);
      const known=[...new Set([...declared,...caps.map(c=>c.subtype),...finite.map(f=>f.subtype),...(relevant.length&&!declared.length&&!caps.length&&!finite.length?["reviewed-finite-seeds"]:[])])];
      const criterion=subjectId==="math"?model.id==="ege-math-profile"&&number<=13?{mode:"exact-numeric",maximum:1,partialCredit:false,alternatives:"reviewed-per-item",formatting:"integer-or-finite-decimal",taskSpecificRubricComplete:true,source:{file:local,section:"Правила оценивания части 1, печатные страницы 9–10",status:"draft-not-final"}}:null:getExamAnswerContract(model.id,number);
      const source=local?{localFile:local,sha256:createHash("sha256").update(readFileSync(resolve(projectRoot,local))).digest("hex"),documentStatus:"local-draft-not-canonically-authenticated",pages:row.source_references?.map(r=>r.physical_page)??[]}:row.source_references??slot?.sourceReference??null;
      const maximum=row.max_primary_score??slot?.maxPrimaryScore??null;
      const resources=requiredResourcesFor(model.id,number,slot);
      const make=(subtype)=>{
        const cap=caps.find(c=>c.subtype===subtype),fixed=finite.find(f=>f.subtype===subtype);
        const inventoryComplete=false; // Complete codifier expansion has NOT been performed.
        const isUnknown=subtype==="__unreviewed_subtypes__";
        const hasGenerator=!isUnknown&&Boolean(cap),hasSeed=!isUnknown&&Boolean(relevant.length||fixed);
        const missingResources=cap?.resourcesProvided===false?resources.length?resources:["Original resource required"]:hasSeed?[]:resources;
        const controlsCurrent=cap?controlsVerifiedFor(cap):false;
        const ready=Boolean(cap&&criterion&&cap.verification.independent&&!cap.requiresEditorialReview&&cap.resourcesProvided&&(subjectId!=="math"||cap.profileRelease&&controlsCurrent)&&(!cap.newThisStage||controlsCurrent));
        const status=isUnknown||missingResources.length||(!hasGenerator&&!hasSeed)?"BLOCKED":ready?"READY":"PARTIAL";
        return {exam,subjectId,level,modelId:model.id,targetYear:2027,number,officialLabels:slot?.officialLabels??[String(number)],subtype,recordKind:isUnknown?"coverage-gate":subtype==="reviewed-finite-seeds"?"finite-seed-group":"named-subtype",
          checkedSkill:title,skillScope:"brief-numbered-plan-not-exhaustive-codifier",knowledgeCodes:row.content_codes??[],requirementCodes:row.requirement_codes??[],conditionFormat:resources.length?"text-with-declared-resources":"text-or-formula",answerFormat:row.answer_format??slot?.answerFormat??null,answerKind:slot?.responseKind??(criterion?.mode==="exact-numeric"?"numeric":criterion?.mode==="two-cell-pair"?"two-position-numeric-answer":"not-yet-confirmed-per-subtype"),maxPrimaryScore:maximum,
          officialReview:{status:local?"local-draft-plan-reviewed":model.verificationStatus==="draft-source-reviewed"?"draft-copy-numbered-plan-reviewed":"unconfirmed",source,criteriaStatus:criterion?"specific-general-scoring-rule-reviewed":"pending",canonicalArchiveVerified:false,exhaustiveSubtypeCatalogue:inventoryComplete},
          scoring:criterion??{mode:slot?.answerFormat==="extended"?"expert-or-self-check-only":"unconfirmed",maximum,partialCredit:maximum>1?"not-inferred-from-maximum":false,alternatives:"must-be-established-per-item",formatting:"follow-reviewed-item-instructions",taskSpecificRubricComplete:false},
          hasGenerator,generationMethod:cap?{...cap.implementation,...(cap.selector?{selector:cap.selector}:{}),codeSha256:fileHash(cap.implementation.file)}:(fixed?{file:fixed.file,export:fixed.export,kind:"finite-parameter-family"}:hasSeed?{kind:"finite-editorial-seeds-not-scalable"}:null),parameterDomain:cap?.parameterDomain??(fixed?{kind:"existing-finite-cases-only",count:fixed.count}:null),
          answerVerification:cap?{...cap.verification,...(cap.profileRelease?{codeSha256:fileHash(cap.verification.file)}:{})}:(fixed?{method:"existing-family-specific-independent-tests",file:finiteFactoryInventory.find(f=>f.file===fixed.file)?.verifier}:hasSeed?{method:"prior-item-specific-review-only-not-a-generator-proof"}:{method:"unavailable"}),
          difficulty:cap?.difficulty??[],resources:{required:resources,available:isUnknown?false:!cap&&hasSeed&&resources.length?null:missingResources.length===0,missing:missingResources,requiresVerification:!cap&&hasSeed&&resources.length>0,scope:cap?"within-validated-generator-domain":hasSeed?"existing-seed-presence-does-not-certify-all-format-resources":"not-established"},
          status,limitations:[...(cap?.limits??[]),...(isUnknown?["Full codifier/subtype inventory not yet reviewed; no completeness claim"]:[]),...(subjectId==="math"?["Only frozen IDs have reviewed 2027 placements; new generated conditions need skill/format review and a current scoring contract"]:[]),...(!criterion?["Exact scoring/partial-credit rule not yet registered for this format"]:[]),...(!hasGenerator?["No reusable validated parameterized generator for this subtype"]:[]),...(cap?.newThisStage&&!controlsCurrent?["Current independent control-batch receipt is missing"]:[]),...(cap?.requiresEditorialReview?["New facts or contexts require separate editorial verification"]:[])],
          existingTaskCount:isUnknown?0:relevant.length,finiteFamilyCaseCount:fixed?.count??0,extendedGuidance:getExtendedAnswerGuidance(model.id,number),
        };
      };
      const subtypes=[...known,"__unreviewed_subtypes__"].map(make);
      return {number,title,maxPrimaryScore:maximum,part:row.part??slot?.part,answerFormat:row.answer_format??slot?.answerFormat,status:subtypes.some(s=>s.status!=="BLOCKED")?"PARTIAL":"BLOCKED",subtypes,exhaustiveSubtypeCatalogue:false};
    });
    return {id:model.id,exam,subjectId,level,runtimeVersion:model.versionId,runtimeNumberCount:model.numbers.length,targetYear:2027,targetNumberCount:numbers.length,targetMaximum:officialTarget?.maximum_primary_score??model.maxPrimaryScore??null,derivedTaskScoreSum:numbers.reduce((sum,n)=>sum+(n.maxPrimaryScore??0),0),sharedScoringPools:model.sharedScoringPools??[],modelFullyConfirmed:false,modelStatus:"draft-numbered-plan-criteria-incomplete",status:numbers.some(n=>n.status==="PARTIAL")?"PARTIAL":"BLOCKED",differences,numbers};
  })));
  const allRecords=directions.flatMap(d=>d.numbers.flatMap(n=>n.subtypes)),subtypes=allRecords.filter(s=>s.recordKind==="named-subtype");
  return {schemaVersion:2,checkedAt:"2026-10-27",baselineRevision:auditBaseline,statusDefinitions:{READY:"This exact bounded training subtype has a reusable generator, independently checked answer and a reviewed scoring contract; NOT whole-exam approval",PARTIAL:"Finite reviewed seeds or generation with unresolved scoring/editorial/format limits",BLOCKED:"Unknown subtype inventory, missing resources, unreviewed requirements, or no reliable generator/checker"},counts:{directions:directions.length,targetNumbers:directions.reduce((n,d)=>n+d.numbers.length,0),fullyConfirmedModels:directions.filter(d=>d.modelFullyConfirmed).length,knownSubtypes:subtypes.length,finiteSeedGroups:allRecords.filter(s=>s.recordKind==="finite-seed-group").length,unknownCoverageGates:allRecords.filter(s=>s.recordKind==="coverage-gate").length,scoringRuleReviewedNumbers:directions.flatMap(d=>d.numbers).filter(n=>n.subtypes.some(s=>s.officialReview.criteriaStatus==="specific-general-scoring-rule-reviewed")).length,READY:subtypes.filter(s=>s.status==="READY").length,PARTIAL:subtypes.filter(s=>s.status==="PARTIAL").length,BLOCKED:subtypes.filter(s=>s.status==="BLOCKED").length,readyNumbers:directions.flatMap(d=>d.numbers).filter(n=>n.status==="READY").length,parameterizedCapabilities:generatorCapabilities.length,uniqueParameterizedFunctions:new Set(generatorCapabilities.map(c=>`${c.implementation.file}:${c.implementation.export}`)).size,newFunctions:new Set(generatorCapabilities.filter(c=>c.newThisStage).map(c=>c.implementation.export)).size},finiteFactoryInventory,directions};
}

/** Guard for the NEXT bulk-generation stage; never authorize by whole subject/number.
 * Editorially reviewed finite releases still use their existing separate review gate.
 */
export function requireReadyGenerator(audit,modelId,number,subtype){
  if(!subtype||subtype.startsWith("__"))throw Error("An explicit reviewed subtype is required");
  const row=audit.directions.find(d=>d.id===modelId)?.numbers.find(n=>n.number===number)?.subtypes.find(s=>s.subtype===subtype);
  if(!row||row.status!=="READY"||!row.hasGenerator||!row.answerVerification.independent)throw Error(`Mass generation is blocked: ${modelId}/${number}/${subtype}`);
  const cap=generatorCapabilities.find(c=>c.model===modelId&&c.number===number&&c.subtype===subtype);
  if(!cap||row.generationMethod.file!==cap.implementation.file||row.generationMethod.export!==cap.implementation.export||row.generationMethod.codeSha256!==fileHash(cap.implementation.file))throw Error("Generator evidence is stale; regenerate and recheck the readiness audit");
  if(cap.profileRelease&&row.answerVerification.codeSha256!==fileHash(cap.verification.file))throw Error("Independent verifier evidence is stale");
  return row;
}

/** A bounded order for the existing importer/generator pipeline, not a second engine. */
export function planSubtypeGeneration(audit,{modelId,number,subtype,count}){
  if(!Number.isSafeInteger(count)||count<1||count>1000)throw Error("One controlled batch must contain 1..1000 tasks");
  const row=requireReadyGenerator(audit,modelId,number,subtype);
  return {schemaVersion:1,modelId,number,subtype,count,answerFormat:row.answerFormat,implementation:row.generationMethod,verification:row.answerVerification,publication:"existing-JSONL-staging-review-gate-required"};
}

export function generationAuditMarkdown(audit){
  const c=audit.counts;
  const lines=["# Карта генераторов: текущий аудит", "", `Моделей: ${c.directions}; целевых номеров: ${c.targetNumbers}; полностью подтверждённых моделей: ${c.fullyConfirmedModels}.`, "", `Именованных подтипов: ${c.knownSubtypes}: READY ${c.READY}, PARTIAL ${c.PARTIAL}, BLOCKED ${c.BLOCKED}. Отдельно: ${c.finiteSeedGroups} групп конечных редакционных семян и ${c.unknownCoverageGates} барьеров непроверенного покрытия — это не выдуманные подтипы.`, "", `Правила оценивания сверены адресно для ${c.scoringRuleReviewedNumbers} номеров, не для всех ${c.targetNumbers}. ${c.uniqueParameterizedFunctions} повторно используемые функции / ${c.parameterizedCapabilities} контракта применения. Новые функции в этом миграционном этапе не добавлялись.`, "", "READY относится только к указанному ограниченному тренировочному подтипу и проекту 2027; не к утверждённому экзамену, всем уровням сложности или всему номеру. Полнота кодификаторов не заявляется. Все 30 активных моделей — проекты 2027; исходные тела прежних заданий и ID сохранены отдельно от представления.", "", "| Направление | Runtime / цель: номеров | Именованные READY / PARTIAL / BLOCKED | Дополнительные ограничения |", "| --- | ---: | ---: | --- |"];
  for(const d of audit.directions){
    const rows=d.numbers.flatMap(n=>n.subtypes).filter(s=>s.recordKind==="named-subtype");
    const counts=["READY","PARTIAL","BLOCKED"].map(status=>rows.filter(r=>r.status===status).length).join(" / ");
    const resources=d.numbers.filter(n=>n.subtypes.some(s=>s.resources.required.length)).map(n=>n.number);
    lines.push(`| ${d.id} | ${d.runtimeNumberCount} / ${d.targetNumberCount} | ${counts} | ${d.differences.length?"Есть явные расхождения/общие критерии; ":""}${resources.length?`ресурсные форматы: ${resources.join(", ")}; `:""}полный кодификатор и критерии не завершены |`);
  }
  lines.push("", "## Разрешённые первые подтипы для масштабирования", "", "Использовать `requireReadyGenerator(audit, modelId, number, subtype)`; общий статус предмета или `algorithm-ready` старого снимка не заменяет этот gate. Выпускать через прежний JSONL → staging → immutable shards → metadata index. Даже READY не отключает независимую проверку каждого результата, дубликаты и проверку прав.", "");
  for(const row of audit.directions.flatMap(d=>d.numbers.flatMap(n=>n.subtypes)).filter(s=>s.status==="READY"))lines.push(`- ${row.modelId} №${row.number}, ${row.subtype}: ${row.generationMethod.file} → ${row.generationMethod.export}; ${row.answerVerification.method}.`);
  lines.push("", "## Продолжение", "", "1. Карта замороженных математических ID уже применена. Заполнить новые профильные №6/13/17 и подтвердить критерии; не менять старые ID и результаты.", "2. Критерии ОГЭ-информатики, физики/химии ОГЭ и расчётной географии; затем расширять проверенные численные подтипы.", "3. Поэлементные рубрики остальных 30 направлений и полный разбор кодификаторов, с конкретной страницей и статусом документа.", "4. Содержательная редакционная проверка русского/иностранных языков и фактических дисциплин; реальные тексты, карты, аудио и экспериментальные ресурсы. Не заменять их тестовыми имитациями.", "", "Машинная карта: `docs/all-directions-readiness.json` → `generatorAudit`. Читать выборочно по modelId/number/subtype, не загружать весь отчёт в контекст или на устройство ученика.");
  return lines.join("\n")+"\n";
}
