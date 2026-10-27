import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync,existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createContentLoader,projectRoot } from "./content-source-loader.mjs";
import { generationAudit,auditBaseline,requireReadyGenerator } from "./exam-generation-audit.mjs";
import { generatorCapabilities,finiteFactoryInventory } from "./generator-catalog.mjs";
import { buildGeneratorControls,verifyControlStatement } from "./check-generator-controls.mjs";
import { carbonateTemplate,speedTemplate,densityTemplate,heatTemplate,powerTemplate,thermochemistryTemplate,gasYieldTemplate,ohmTemplate,solutionTemplate,verifyScience } from "./release-science-stage-a.mjs";
import { informationVolumeTemplate,radixValueTemplate,radixDigitCountTemplate } from "./original-informatics-pilot.mjs";

const load=createContentLoader(),{getExamAnswerContract,scoreExamAnswer,getExtendedAnswerGuidance}=load("src/lib/exam-answer-scoring.ts");
test("reviewed draft primary-score contracts distinguish single, partial ordered and unordered formats without XP",()=>{
  const rule=getExamAnswerContract("ege-chemistry",6);
  for(const [response,points] of [[["1","2","3"],2],[["1","4","3"],1],[["4","4","3"],0],[["1","2"],0],[["1","","3"],0],[["1","2","3","4"],0]])assert.equal(scoreExamAnswer(rule,["1","2","3"],response).points,points);
  assert.equal(scoreExamAnswer(rule,["1","2","3"],["4","5","6"],[["4","5","6"]]).points,2);
  const unordered=getExamAnswerContract("ege-chemistry",1);
  assert.equal(scoreExamAnswer(unordered,["1","3"],["3","1"]).points,1);
  assert.equal(scoreExamAnswer(unordered,["1","3"],["1","1","3"]).points,0);
  const numeric=getExamAnswerContract("ege-chemistry",26);
  assert.equal(scoreExamAnswer(numeric,["1.2"],["1,20"]).points,1);
  assert.equal(scoreExamAnswer(numeric,["1.2"],["6/5"]).points,0);
  assert.throws(()=>scoreExamAnswer(numeric,["1.2","3"],["1.2"]));
  assert.throws(()=>scoreExamAnswer(numeric,["1"],["1"],[["bad"]]));
  assert.equal(getExamAnswerContract("oge-biology",12),null); // never project EGE rules onto OGE
  assert.equal(getExamAnswerContract("ege-chemistry",29),null);
  assert.equal(scoreExamAnswer(numeric,["1"],["1"]).kind,"draft-primary-score");
});
test("informatics pair rubric awards one for reversed cells or one correct positioned cell, never for extras",()=>{
  const rule=getExamAnswerContract("ege-informatics",26);
  for(const [response,points] of [[["10","20"],2],[["20","10"],1],[["10","99"],1],[["","20"],1],[["10"],1],[["20"],0],[[],0],[["10","20","99"],0],[["30","40"],0]])assert.equal(scoreExamAnswer(rule,["10","20"],response).points,points);
  assert.throws(()=>scoreExamAnswer(rule,["10"],["10"]));
  assert.equal(scoreExamAnswer(rule,["10","20"],["010","20"]).points,2);
});
test("biology selection and sequence use different reviewed partial-credit rules; ambiguous missing positions require review",()=>{
  const selection=getExamAnswerContract("ege-biology",7),sequence=getExamAnswerContract("ege-biology",12);
  for(const [answer,points] of [[["5","1","3"],2],[["1","3"],1],[["1","3","4"],1],[["1","3","5","6"],1],[["1","3","5","5"],1],[["1","3","5","6","7"],0],[["1"],0]])assert.equal(scoreExamAnswer(selection,["1","3","5"],answer).points,points);
  for(const [answer,points] of [[["1","2","3","4"],2],[["2","1","3","4"],1],[["4","3","2","1"],0],[["1","2","3","4","5"],1],[["2","1","3","4","5"],0]])assert.equal(scoreExamAnswer(sequence,["1","2","3","4"],answer).points,points);
  assert.equal(scoreExamAnswer(sequence,["1","2","3","4"],["1","2","3"]).points,null);
  assert.equal(scoreExamAnswer(sequence,["1","2","3","4"],["1","2","3"]).kind,"manual-review-required");
});
test("2026 official physics guidance stays a fallback for expert/self-check, never automatic 2027 certification",()=>{
  for(let n=17;n<=22;n++){
    const guide=getExtendedAnswerGuidance("oge-physics",n);
    assert.equal(guide.documentYear,2026);assert.equal(guide.mode,"self-or-expert-only");
    assert.equal(guide.maximum,[18,19].includes(n)?2:3);assert.ok(guide.source.url.startsWith("https://doc.fipi.ru/"));
    assert.ok(guide.limitations.some(s=>s.includes("2027")));
  }
  assert.equal(getExtendedAnswerGuidance("oge-physics",16),null);
});
test("all thirty pairs have per-number and subtype maps; unknown coverage blocks whole-number READY",()=>{
  const audit=generationAudit();assert.equal(audit.directions.length,30);assert.equal(audit.counts.targetNumbers,825);
  assert.equal(audit.counts.unknownCoverageGates,825);assert.equal(audit.counts.fullyConfirmedModels,0);assert.equal(audit.counts.newFunctions,9);
  assert.equal(audit.counts.scoringRuleReviewedNumbers,76);
  assert.equal(new Set(audit.directions.map(d=>d.id)).size,30);
  for(const d of audit.directions)for(const n of d.numbers){
    assert.notEqual(n.status,"READY");assert.equal(n.exhaustiveSubtypeCatalogue,false);
    assert.equal(n.subtypes.filter(s=>s.subtype==="__unreviewed_subtypes__").length,1);
    for(const s of n.subtypes){
      assert.ok(s.checkedSkill&&s.conditionFormat&&s.answerFormat);assert.ok(s.maxPrimaryScore>=1);
      assert.ok(["READY","PARTIAL","BLOCKED"].includes(s.status));
      assert.ok(s.resources&&s.answerVerification&&s.officialReview);
      if(s.status==="READY"){assert.ok(s.hasGenerator&&s.answerVerification.independent);assert.equal(s.officialReview.criteriaStatus,"specific-general-scoring-rule-reviewed");assert.equal(s.resources.available,true);}
    }
  }
  const profile=audit.directions.find(d=>d.id==="ege-math-profile");
  assert.equal(profile.runtimeNumberCount,19);assert.equal(profile.targetNumberCount,20);assert.equal(profile.targetMaximum,33);
  assert.equal(profile.numbers[5].title,"Случайные величины");assert.equal(profile.numbers[19].maxPrimaryScore,4);
  assert.ok(profile.differences.some(d=>d.kind==="number-count"));
  const russian=audit.directions.find(d=>d.id==="oge-russian");
  assert.equal(russian.derivedTaskScoreSum+russian.sharedScoringPools.reduce((sum,p)=>sum+p.maximum,0),38);
  assert.equal(russian.numbers[12].maxPrimaryScore,8);
});
test("capability exports and finite generator families exist; no fake numeric-family mapping or missing evidence",async()=>{
  assert.equal(new Set(generatorCapabilities.map(c=>c.id)).size,generatorCapabilities.length);
  for(const c of generatorCapabilities){
    const implementation=await import(new URL(`../${c.implementation.file}`,import.meta.url));
    assert.equal(typeof implementation[c.implementation.export],"function",c.id);assert.ok(c.parameterDomain);
    assert.ok(existsSync(resolve(projectRoot,c.verification.file)));
  }
  for(const f of finiteFactoryInventory){assert.ok(existsSync(resolve(projectRoot,f.file)));assert.ok(existsSync(resolve(projectRoot,f.verifier)));}
  const a=generationAudit(),base=a.directions.find(d=>d.id==="ege-math-base");
  assert.ok(base.numbers.every(n=>n.subtypes.some(s=>s.finiteFamilyCaseCount>0)));
  const profile=a.directions.find(d=>d.id==="ege-math-profile");
  assert.ok(profile.numbers.some(n=>n.subtypes.some(s=>s.generationMethod?.export==="egeGeneratorCases")));
});
test("nine new reusable functions and three existing functions pass 72 diverse verified control cases",()=>{
  const controls=buildGeneratorControls();assert.equal(controls.length,72);
  assert.equal(Map.groupBy(controls,c=>c.family).size,12);
  assert.equal(carbonateTemplate(3)[3],"1.2");
  for(let mass=1;mass<=10000;mass+=37){const entry=carbonateTemplate(mass);verifyScience({id:"sweep",answerDisplay:entry[3]},entry);assert.ok(entry[3].length<=6);}
  for(const invalid of [()=>speedTemplate(1,100),()=>densityTemplate(10,99999),()=>heatTemplate(1,90,100),()=>heatTemplate(1,30,20),()=>powerTemplate(5000,2),()=>thermochemistryTemplate(-2),()=>gasYieldTemplate(10,101),()=>gasYieldTemplate(1.1,33)])assert.throws(invalid);
  assert.throws(()=>ohmTemplate(1e308,1));assert.throws(()=>solutionTemplate(1e308,20,1e308,10));
  const changed=speedTemplate(90,10);changed[2]=changed[2].replace("90 м","91 м");assert.throws(()=>verifyControlStatement(changed));
  const receipt=JSON.parse(readFileSync(resolve(projectRoot,"docs/generator-control-review.json"),"utf8"));
  assert.equal(receipt.passed,true);assert.equal(receipt.controls,72);assert.equal(receipt.expertReviewClaimed,false);
  for(const [file,sha] of Object.entries(receipt.implementationSha256))assert.equal(sha,createHash("sha256").update(readFileSync(resolve(projectRoot,file))).digest("hex"));
  assert.deepEqual(receipt.records.map(r=>r.sha256),controls.map(c=>c.sha256));
  assert.equal(receipt.intake.counts.found,72);assert.equal(receipt.intake.counts.rejected,0);assert.equal(receipt.intake.publicTasksAdded,0);
});
test("new informatics subtypes verify arithmetic over many parameters and reject invalid encodings",()=>{
  for(const bits of [8,16,32])for(const n of [1,17,53,1000])verifyControlStatement(informationVolumeTemplate(n,bits));
  for(let base=2;base<=16;base++)for(const exponent of [3,7,18,30])for(const offset of [1,base,base*base-1])verifyControlStatement(radixDigitCountTemplate(base,exponent,offset));
  for(let base=2;base<=16;base++)verifyControlStatement(radixValueTemplate((base**3-1).toString(base).toUpperCase(),base));
  assert.throws(()=>informationVolumeTemplate(5,7));assert.throws(()=>radixValueTemplate("12",2));assert.throws(()=>radixValueTemplate("001",10));assert.throws(()=>radixDigitCountTemplate(2,4,4));
});
test("published shard metadata and all 151 tasks remain byte-for-byte unchanged; control IDs never publish",()=>{
  const indexPath="src/lib/task-package-index.ts";
  assert.equal(readFileSync(resolve(projectRoot,indexPath),"utf8"),execFileSync("git",["show",`${auditBaseline}:${indexPath}`],{cwd:projectRoot,encoding:"utf8"}));
  const {taskPackageIndex}=load(indexPath);assert.equal(taskPackageIndex.length,124);
  const tasks=taskPackageIndex.flatMap(p=>{
    const body=readFileSync(resolve(projectRoot,"public/task-packages",p.file));
    assert.equal(createHash("sha256").update(body).digest("hex"),p.sha256);return JSON.parse(body);
  });
  assert.equal(tasks.length,151);assert.equal(new Set(tasks.map(t=>t.id)).size,151);
  assert.equal(tasks.some(t=>t.id.startsWith("audit-control-")),false);
  const {getExamDefinition}=load("src/lib/exams.ts");
  assert.equal(getExamDefinition({examType:"ЕГЭ",subjectId:"math",level:"profile"}).versionId,"ege-math-profile-2026");
});
test("mass-generation gate authorizes only an explicit READY subtype, never an entire number or a finite editorial seed",()=>{
  const audit=generationAudit();
  assert.equal(requireReadyGenerator(audit,"ege-chemistry",27,"stoichiometric-heat").status,"READY");
  assert.equal(requireReadyGenerator(audit,"ege-informatics",14,"power-minus-offset-digit-count").status,"READY");
  assert.throws(()=>requireReadyGenerator(audit,"ege-biology",12,"taxonomic-rank-order"));
  assert.throws(()=>requireReadyGenerator(audit,"oge-physics",6,"uniform-speed"));
  assert.throws(()=>requireReadyGenerator(audit,"ege-chemistry",27));
  assert.throws(()=>requireReadyGenerator(audit,"ege-chemistry",27,"__unreviewed_subtypes__"));
  const changed=structuredClone(audit);
  changed.directions.find(d=>d.id==="ege-chemistry").numbers.find(n=>n.number===27).subtypes.find(s=>s.subtype==="stoichiometric-heat").generationMethod.codeSha256="0".repeat(64);
  assert.throws(()=>requireReadyGenerator(changed,"ege-chemistry",27,"stoichiometric-heat"));
});
