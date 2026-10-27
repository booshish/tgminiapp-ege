import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";
import { releasePilot } from "./release-task-pilot.mjs";
import { numericPilot } from "./remaining-generators.mjs";
import { verifyGenerated } from "./verify-remaining-generators.mjs";
import { humanitiesPilot, verifyHumanities, historicalFacts } from "./humanities-originals.mjs";
import { buildLanguagePilot, verifyLanguage } from "./language-originals.mjs";

export const preparedEntries=[...numericPilot,...humanitiesPilot,...buildLanguagePilot()];
// Calculating time offsets is valid prerequisite practice but is NOT the reviewed
// map-reading format of EGE geography 14. Keep it out until a real map is supported.
export const candidateEntries=preparedEntries.filter(e=>!(e.model==="ege-geography"&&e.number===14));
export function verifyEntry(entry){
  if(entry.proof.kind.startsWith("language")||["classifier","chinese-integer","chinese-lexeme"].includes(entry.proof.kind))return verifyLanguage(entry);
  if(entry.model.endsWith("-history")||entry.model.endsWith("-social-studies"))return verifyHumanities(entry);
  return verifyGenerated(entry);
}
export function buildRemainingTasks(){
  const load=createContentLoader(),{getExamDefinition}=load("src/lib/exams.ts"),{originalProvenance}=load("src/lib/content/provenance.ts");
  return candidateEntries.map((entry)=>{
    verifyEntry(entry);
    const examType=entry.model.startsWith("ege-")?"ЕГЭ":"ОГЭ",subjectId=entry.model.slice(4);
    const m=getExamDefinition({examType,subjectId,level:null}),slot=m?.numbers.find(n=>n.number===entry.number);
    assert.ok(slot?.practiceAnswerFormat,`${entry.model}/${entry.number} has no reviewed import contract`);
    const id=`remaining-20261027-${String(preparedEntries.indexOf(entry)+1).padStart(3,"0")}`;
    const answerRule=entry.rule==="word"?{type:"text",value:entry.answer,caseInsensitive:true}:entry.rule?{type:"choices",value:entry.answer,ordered:entry.rule!=="unordered"}:{type:"number",value:entry.answer};
    assert.ok(slot.answerRuleTypes.includes(answerRule.type));
    return {id,examType:[examType],subjectId,level:null,examYear:2027,examVersionId:m.versionId,examNumber:entry.number,part:slot.part,topicId:`${m.id}-n${entry.number}`,prototypeId:`${m.id}-n${entry.number}-original`,title:slot.title,prompt:entry.prompt,answerDisplay:entry.answer,answerRule,answerFormat:slot.practiceAnswerFormat,difficulty:"foundation",
      solution:[{text:entry.explanation}],...(entry.resources?{resources:entry.resources}:{}),source:{kind:"author",label:"Авторская подготовительная тренировка по проекту модели 2027 · не официальный КИМ",revision:1},provenance:originalProvenance("original-individual-task"),scoring:{status:"pending-official-verification",maxPrimaryScore:slot.maxPrimaryScore},requirementsReference:{...slot.sourceReference,year:2027,status:"draft-copy-reviewed"},
      publication:{id,releaseStatus:"ready",provenance:{sourceIds:["tochka-project-original"],authorship:"project-original",sourceFiles:["scripts/remaining-generators.mjs","scripts/humanities-originals.mjs","scripts/language-originals.mjs"],attribution:["Авторский материал проекта «Точка»","Справочные источники используются только для сверки фактов и правил."]},validation:{status:"automated-reviewed",checkedAt:"2026-10-27",evidence:["scripts/test-remaining-pilot.mjs","docs/remaining-pilot-review.json"]}},
    };
  });
}
export function verificationRecords(tasks=buildRemainingTasks()){
  return tasks.map((t,i)=>({id:t.id,model:t.examVersionId,number:t.examNumber,subtype:candidateEntries[i].subtype,proof:candidateEntries[i].proof,method:t.subjectId==="history"?"reference-facts-and-independent-order-or-matching-check":t.subjectId==="social-studies"?"targeted-concept-review-and-numerical-or-rule-check":["english","german","french","spanish","chinese"].includes(t.subjectId)?"targeted-reference-paradigm-and-original-context-review-not-expert":"independent-inverse-enumeration-or-targeted-fact-review",expertReviewed:false,scope:"Only this authored training item; not all exam subtypes or expert assessment"}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const tasks=buildRemainingTasks();
  // Existing releasePilot remains the ONLY JSONL/staging/shard publisher.
  await releasePilot({tasks,batchId:"remaining-20261027-r4",reviewFile:"docs/remaining-pilot-review.json",reviewedAt:"2026-10-27",reviewMethod:"source-answer-and-solution",evidence:["scripts/test-remaining-pilot.mjs","scripts/verify-remaining-generators.mjs","scripts/humanities-originals.mjs","scripts/language-originals.mjs"]});
  writeFileSync(resolve(projectRoot,"docs/remaining-pilot-verification.json"),JSON.stringify({checkedAt:"2026-10-27",sourceFacts:historicalFacts,records:verificationRecords(tasks)},null,2)+"\n");
}
