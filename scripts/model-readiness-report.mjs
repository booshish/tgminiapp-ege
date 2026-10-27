import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";
import { generationAudit,generationAuditMarkdown } from "./exam-generation-audit.mjs";

/** Reproducible registry snapshot; never infer generator readiness from task counts. */
export function modelReadinessReport(){
  const load=createContentLoader(),{getSubjects,subjectTitle}=load("src/lib/subjects.ts"),{getExamDefinition}=load("src/lib/exams.ts"),{taskPackageIndex}=load("src/lib/task-package-index.ts");
  const published=taskPackageIndex.flatMap(p=>JSON.parse(readFileSync(resolve(projectRoot,"public/task-packages",p.file),"utf8")));
  return ["ОГЭ","ЕГЭ"].flatMap(exam=>getSubjects(exam).flatMap(([subjectId])=>(exam==="ЕГЭ"&&subjectId==="math"?["base","profile"]:[null]).map(level=>{
    const m=getExamDefinition({examType:exam,subjectId,level});
    const tasks=published.filter(t=>t.subjectId===subjectId&&t.examType[0]===exam&&t.level===level);
    const added=tasks.filter(t=>t.id.startsWith("remaining-20261027-"));
    return {id:m.id,exam,subjectId,subject:subjectTitle(subjectId),level,version:m.versionId,officialStatus:m.verificationStatus==="draft-source-reviewed"?"2027-draft-copy-not-canonical":"2026-legacy-not-reverified",modelScope:m.sourceReview?.scope??"legacy-review-see-prior-reports",fullyConfirmed:false,criteriaComplete:m.sourceReview?.criteriaComplete??false,numberCount:m.numbers.length,maxPrimaryScore:m.maxPrimaryScore??null,sessions:m.sessions??(m.durationMinutes?[{minutes:m.durationMinutes}]:[]),generatorNumberCount:m.numbers.filter(n=>n.generation?.status==="algorithm-ready").length,newPublishedTasks:added.length,previousLazyTasks:tasks.length-added.length,newNumbers:[...new Set(added.map(t=>t.examNumber))].sort((a,b)=>a-b),massReadiness:m.numbers.some(n=>n.generation?.status==="algorithm-ready")?"specific-subtypes-only":"editorial-or-resource-gate",numbers:m.numbers.map(n=>({number:n.number,officialLabels:n.officialLabels??[String(n.number)],title:n.title,part:n.part,answerFormat:n.answerFormat,responseKind:n.responseKind??null,maximum:n.maxPrimaryScore,automatic:n.evaluation?.mode==="automatic",resources:n.requiredResources??[],generation:n.generation??{status:"legacy-not-reassessed",subtypes:[],blockers:["Use previous subject reports; do not infer scalable generators from pilot counts"]},sourceReference:n.sourceReference??null}))};
  })));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const directions=modelReadinessReport(),generatorAudit=generationAudit();
  writeFileSync(resolve(projectRoot,"docs/all-directions-readiness.json"),JSON.stringify({date:"2026-10-27",checkpoint:"per-subtype-audit-with-explicit-unknown-gates",canonicalArchivesVerified:false,notes:["Runtime registry and 2027 target plans are distinct; profile 2027 has 20 slots, legacy runtime has 19", "The directions.newPublishedTasks fields retain the historical 84-task release, NOT new tasks from this audit", "READY is scoped to one bounded original training subtype; unknown codifier coverage always blocks whole-number readiness"],directions,generatorAudit},null,2)+"\n");
  writeFileSync(resolve(projectRoot,"docs/generator-readiness-summary.md"),generationAuditMarkdown(generatorAudit));
  console.log(JSON.stringify(generatorAudit.counts));
}
