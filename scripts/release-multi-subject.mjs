import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { rows } from "./multi-subject-originals.mjs";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";
import { releasePilot } from "./release-task-pilot.mjs";

// Separate filled forms/rule annotations, not a claim of automated expert review.
const linguistic = {
  "oge-basis": [true,false,true,false,true],
  "oge-commas": [true,true,true,false],
  "oge-letters": ["тишине","ребята","заметили","зелёную","калитку"].map((word,i) => word[[1,1,3,1,3][i]] === "е"),
  "oge-form": "блюдец", "oge-phrase": ["кольцо","из","серебра"].join(""),
  "ege-stress": ["включИт","красИвее","тОрты","срЕдства","договОр"].map((norm,i) => norm === ["вклЮчит","красИвее","тортЫ","срЕдства","дОговор"][i]),
  "ege-paronym": "памятливый", "ege-pleonasm": "впервые", "ege-form": "двухсот",
  "ege-commas": [1,0,1,2,0].map((commas) => commas === 1),
};
export function verifyModel([kind,...a]) {
  switch(kind) {
    case "sum": return a.reduce((x,y) => x+y,0);
    case "product": return a.reduce((x,y) => x*y,1);
    case "fraction": return (a[0]-a[1])/(a[2]-a[3]);
    case "equation": return (a[2]-a[1])/a[0];
    case "ratio": return a[0]/a[1];
    case "area": return a[0]*a[1]/2;
    case "iso-area": return a[1]*Math.sqrt(a[0]**2-(a[1]/2)**2)/2;
    case "percent": return a[0]*(100+a[1])/100;
    case "pythagoras": return Math.sqrt(a[0]**2-a[1]**2);
    case "dot": return a[0].reduce((n,v,i) => n+v*a[1][i],0);
    case "power-equation": {for(let x=-10;x<=20;x++)if(a[0]**(x-a[1])===a[2])return x; throw Error("No root");}
    case "encoded": return a[0]*a[1]/8;
    case "interval-count": return Array.from({length:101},(_,i)=>i).filter(x=>x>a[0]&&x<a[1]).length;
    case "commands": return [...a[1]].reduce((n,c)=>c==="1"?n*4:n-3,a[0]);
    case "recurrence": {let n=a[0];for(let i=0;i<a[1];i++)n=n*3+1;return n;}
    case "base": return parseInt(a[0],a[1]);
    case "word-bits": return a[0].length*a[1];
    case "image": return a[0]*a[1]*a[2]/8;
    case "enumerate-words": {let count=0;for(let n=0;n<81;n++){const word=n.toString(3).padStart(4,"0");if([...word].filter(c=>c==="0").length===1)count++;}return count;}
    case "digit-sum": return [...a[0].toString(a[1])].reduce((n,d)=>n+Number(d),0);
    case "programs": {const paths=n=>n===a[1]?1:n>a[1]?0:paths(n+2)+paths(n*2);return paths(a[0]);}
    case "coordinate": return a[0]+a[1]*a[2];
    case "force": return (a[0]-a[1])/a[2];
    case "velocity": return (a[1]-a[0])/a[2];
    case "russian": {const value=linguistic[a[0]];assert.notEqual(value,undefined);return Array.isArray(value)?value.flatMap((ok,i)=>ok?[i+1]:[]).join(""):value;}
    default: throw Error(`Unknown verification ${kind}`);
  }
}
export function buildMultiSubjectTasks() {
  const { practiceBank } = createContentLoader()("src/lib/tasks.ts");
  return rows.map(([version,number,prompt,answer,explanation,check,extras = {}],i) => {
    const model = practiceBank.find(t=>t.examVersionId.startsWith(`${version}-`) && t.examNumber===number && t.availability!=="history-only");
    assert.ok(model,`Missing reviewed model ${version}/${number}`);
    const expected=verifyModel(check);
    if(check[0]==="russian") assert.equal(expected,answer);
    else {const [n,d="1"]=answer.split("/");assert.ok(Math.abs(Number(n)/Number(d)-Number(expected))<1e-10,`${version}/${number}: ${expected} != ${answer}`);}
    const task=structuredClone(model);
    for(const name of ["resources","conditionLatex","diagram","sharedConditionId","selfCheckNotes","criteriaSourceUrl"]) delete task[name];
    task.id=`multi-subject-20261026-${String(i+1).padStart(2,"0")}`;
    task.title=`${model.title} · авторская пробная партия`;
    task.prompt=prompt;task.answerDisplay=answer;task.solution=[{text:explanation}];
    task.answerRule=extras.ruleType==="choices"?{type:"choices",value:answer,ordered:false}:extras.ruleType==="text"?{type:"text",value:answer,caseInsensitive:true}:{type:"number",value:answer};
    assert.equal(task.answerFormat,task.answerRule.type==="number"?"number":"text");
    if(extras.conditionLatex)task.conditionLatex=extras.conditionLatex;
    if(extras.diagram)task.diagram=extras.diagram;
    task.provenance.creation_method="original-individual-task";
    task.source={kind:"author",label:"Оригинальная пробная тренировка · не задание реального КИМ",revision:1};
    task.publication={id:task.id,releaseStatus:"ready",provenance:{sourceIds:["tochka-project-original"],authorship:"project-original",sourceFiles:["scripts/multi-subject-originals.mjs"],attribution:["Авторский материал проекта «Точка»"]},validation:{status:"automated-reviewed",checkedAt:"2026-10-26",evidence:["scripts/release-multi-subject.mjs","docs/multi-subject-review.json"]}};
    return task;
  });
}
export function subjectInventory(tasks=buildMultiSubjectTasks()) {
  const load=createContentLoader();
  const {getSubjects,subjectTitle}=load("src/lib/subjects.ts"), {getExamDefinition}=load("src/lib/exams.ts");
  return ["ОГЭ","ЕГЭ"].flatMap(exam=>getSubjects(exam).flatMap(([subjectId])=>(exam==="ЕГЭ"&&subjectId==="math"?["base","profile"]:[null]).map(level=>{
    const definition=getExamDefinition({examType:exam,subjectId,level});
    const published=tasks.filter(t=>t.examType[0]===exam&&t.subjectId===subjectId&&t.level===level);
    return {exam,subjectId,subject:subjectTitle(subjectId),level,model:definition?.versionId??null,modelStatus:definition?.verificationStatus??"unavailable",newTasks:published.length,numbers:[...new Set(published.map(t=>t.examNumber))].sort((a,b)=>a-b),readiness:published.length?subjectId==="russian"?"pilot-only-linguistic-QA-required":"controlled-batches-only-not-all-types":definition?"reviewed-model-other-batch":"blocked-no-reviewed-exam-model",blocker:definition?"Audio, new image types and expert assessment are not certified by this pilot":"No source-reviewed specification/number mapping in the project"};
  })));
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const tasks=buildMultiSubjectTasks();
  await releasePilot({tasks,batchId:"multi-subject-20261026-r2",reviewFile:"docs/multi-subject-review.json",evidence:["scripts/release-multi-subject.mjs","scripts/multi-subject-originals.mjs"]});
  writeFileSync(resolve(projectRoot,"docs/multi-subject-verification.json"),JSON.stringify(rows.map((r,i)=>({id:tasks[i].id,model:r[5],computed:verifyModel(r[5]),scope:r[5][0]==="russian"?"rule-annotations-and-targeted-linguistic-review-not-expert-certification":"independent-computation"})),null,2)+"\n");
  writeFileSync(resolve(projectRoot,"docs/multi-subject-inventory.json"),JSON.stringify(subjectInventory(tasks),null,2)+"\n");
}
