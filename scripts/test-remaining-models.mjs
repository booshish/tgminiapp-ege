import test from "node:test";
import assert from "node:assert/strict";
import { createContentLoader } from "./content-source-loader.mjs";

const expected = [
  ["oge-biology",26,47,5],["ege-biology",28,57,7],
  ["oge-geography",30,31,3],["ege-geography",29,38,8],
  ["oge-history",23,35,6],["ege-history",22,43,10],
  ["oge-social-studies",20,32,8],["ege-social-studies",25,58,9],
  ["oge-literature",5,40,5],["ege-literature",11,48,5],
  ...["english","german","french","spanish"].flatMap(s=>[[`oge-${s}`,38,68,4],[`ege-${s}`,42,82,6]]),
  ["ege-chinese",32,80,5],
];
test("all thirty registered pairs resolve uniquely, nineteen additional draft plans have exact slots and scores",()=>{
  const load=createContentLoader(),{getExamDefinition}=load("src/lib/exams.ts"),{subjectExamDefinitions}=load("src/lib/subject-models.ts"),{getSubjects}=load("src/lib/subjects.ts"),{remainingModels}=load("src/lib/content/remaining-models.ts");
  assert.equal(remainingModels.length,19);assert.equal(new Set(subjectExamDefinitions.map(m=>m.id)).size,subjectExamDefinitions.length);
  let pairs=0;
  for(const exam of ["ОГЭ","ЕГЭ"])for(const [subjectId] of getSubjects(exam))for(const level of exam==="ЕГЭ"&&subjectId==="math"?["base","profile"]:[null]){
    const model=getExamDefinition({examType:exam,subjectId,level});assert.ok(model?.available,`${exam}/${subjectId}/${level}`);pairs++;
  }
  assert.equal(pairs,30);
  for(const [id,count,max,extended] of expected){
    const m=remainingModels.find(m=>m.id===id);assert.ok(m,id);
    assert.equal(m.numbers.length,count,id);assert.equal(m.maxPrimaryScore,max,id);
    assert.equal(m.numbers.reduce((s,n)=>s+n.maxPrimaryScore,0),max,id);
    assert.equal(m.numbers.filter(n=>n.answerFormat==="extended").length,extended,id);
    assert.deepEqual(m.numbers.map(n=>n.number),Array.from({length:count},(_,i)=>i+1));
    assert.equal(m.sourceReview.canonicalArchiveVerified,false);assert.equal(m.sourceReview.criteriaComplete,false);
    assert.match(m.verificationNote,/Проект 2027/);
    for(const n of m.numbers){
      assert.ok(n.title&&n.responseKind&&n.pendingReason&&n.generation.subtypes.length);
      assert.ok(n.sourceReference.pdfPage>0);
      assert.equal(n.evaluation.mode,n.answerFormat==="extended"?"expert":"automatic");
    }
  }
});
test("interleaved expert slots, literary alternatives and separate oral numbering never become short automatic questions",()=>{
  const {remainingModels}=createContentLoader()("src/lib/content/remaining-models.ts");
  const get=id=>remainingModels.find(m=>m.id===id);
  assert.equal(get("oge-geography").numbers[11].answerFormat,"extended");
  assert.equal(get("oge-social-studies").numbers[0].answerFormat,"extended");
  assert.equal(get("oge-social-studies").numbers[13].maxPrimaryScore,2);
  assert.equal(get("ege-biology").numbers[20].maxPrimaryScore,1);
  assert.equal(get("ege-biology").numbers[25].maxPrimaryScore,4);
  assert.deepEqual(get("oge-literature").numbers[0].officialLabels,["1.1","1.2"]);
  assert.equal(get("oge-literature").offeredTaskCount,12);
  for(const [id,written,oral] of [["oge-english",35,3],["ege-spanish",38,4],["ege-chinese",29,3]]){
    const m=get(id);assert.equal(m.sessions.length,2);
    for(let i=1;i<=oral;i++){
      const n=m.numbers[written+i-1];assert.deepEqual(n.officialLabels,[String(i)]);assert.equal(n.responseKind,"oral");assert.equal(n.evaluation.mode,"expert");
      assert.ok(n.requiredResources.some(x=>x.includes("Микрофон")));
      assert.equal(n.practiceAnswerFormat,undefined);
    }
  }
});
