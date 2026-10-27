import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildScienceTasks,verifyScience,ohmTemplate,carbonateTemplate,solutionTemplate,speedTemplate,densityTemplate,heatTemplate,powerTemplate,thermochemistryTemplate,gasYieldTemplate } from "./release-science-stage-a.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";
import { structuralIssues, importTasks } from "./import-tasks.mjs";
import { projectRoot,createContentLoader } from "./content-source-loader.mjs";
import { informationVolumeTemplate,radixValueTemplate,radixDigitCountTemplate } from "./original-informatics-pilot.mjs";

/** Read the actual authored statement, not just the generator's proof object. */
export function verifyControlStatement(entry){
  const [,,text,answer,,p]=entry;
  const read=(pattern)=>{const m=text.match(pattern);assert.ok(m,`Statement shape ${p.kind}`);return m.slice(1).map(v=>Number(v.replace(",",".")));};
  const eq=(a,b)=>assert.ok(Math.abs(a-b)<1e-8);
  switch(p.kind){
    case "information-volume":{const [s,b]=read(/содержит ([\d.]+) символов.*ровно ([\d.]+) бит/u);eq(s,p.symbols);eq(b,p.bits);let bytes=0;for(let i=0;i<s;i++)bytes+=b/8;eq(Number(answer),bytes);return;}
    case "radix-value":{assert.ok(text.includes(`Число ${p.digits}`)&&text.includes(`основанием ${p.radix}`));let n=0;[...p.digits].reverse().forEach((d,i)=>{n+="0123456789ABCDEF".indexOf(d)*p.radix**i;});eq(Number(answer),n);return;}
    case "radix-digit-count":{const [b,e,k]=read(/N = ([\d.]+)\^([\d.]+) − ([\d.]+)/u);eq(b,p.base);eq(e,p.exponent);eq(k,p.offset);const representation=(BigInt(b)**BigInt(e)-BigInt(k)).toString(b);assert.equal(Number(answer),[...representation].filter(d=>d===(b-1).toString(b)).length);return;}
    case "ohm":{const [r,u]=read(/сопротивлением ([\d.]+) Ом.*напряжение ([\d.]+) В/u);eq(r,p.resistance);eq(u,p.voltage);break;}
    case "element-mass":{const [mass]=read(/взяли ([\d.]+) мг чистого CaCO₃/u);eq(mass,p.compoundMass);assert.ok(text.includes("Ar(Ca)=40, Ar(C)=12, Ar(O)=16"));break;}
    case "solution":{const [a,w,b,v]=read(/смешали ([\d.]+) г.*долей ([\d.]+)% и ([\d.]+) г.*долей ([\d.]+)%/u);assert.deepEqual([[a,w],[b,v]],p.solutions);break;}
    case "speed":{const [s,t]=read(/прошла ([\d.]+) м за ([\d.]+) с/u);eq(s,p.distance);eq(t,p.time);break;}
    case "density":{const [v,m]=read(/объём ([\d.]+) см³ и массу ([\d.]+) г/u);eq(v,p.cm3);eq(m,p.grams);break;}
    case "heat":{const [m,t1,t2]=read(/([\d.]+) кг жидкой воды нагрели от ([\d.]+) до ([\d.]+) °C/u);eq(m,p.mass);eq(t2-t1,p.delta);assert.ok(text.includes(`c=${p.capacity}`));break;}
    case "power":{const [u,i]=read(/напряжение ([\d.]+) В, сила тока ([\d.]+) А/u);eq(u,p.voltage);eq(i,p.current);break;}
    case "thermal":{const [mass]=read(/прореагировало ([\d.]+) г O₂/u);eq(mass,p.mass);assert.ok(text.includes("M(O₂)=32")&&text.includes("572 кДж"));break;}
    case "gas-yield":{const [m,w]=read(/модели ([\d.]+) г технического Mg содержат ([\d.]+)%/u);eq(m,p.mass);eq(w,p.impurityPercent);assert.ok(text.includes("M(Mg)=24")&&text.includes("Vₘ=22,4"));break;}
    default:throw Error("No independently parsed statement contract");
  }
  if(p.kind==="thermal"||p.kind==="gas-yield"){
    const reaction=p.kind==="thermal"?text.match(/уравнение (.+) \+ 572 кДж/u)?.[1]:text.match(/HCl: (.+)\. M\(Mg\)/u)?.[1];assert.ok(reaction);
    const atoms=side=>side.split("+").reduce((sum,term)=>{
      const s=term.replace(/[₀-₉]/g,c=>String("₀₁₂₃₄₅₆₇₈₉".indexOf(c))).replace(/\((?:г|ж)\)/gu,"").replace(/\s/gu,"");
      const [,coefficient="1",formula]=s.match(/^(\d+)?([A-Z].*)$/u)??[];assert.ok(formula);
      const elements=[...formula.matchAll(/([A-Z][a-z]?)(\d*)/gu)];assert.equal(elements.map(e=>e[0]).join(""),formula);
      for(const [,symbol,count] of elements)sum[symbol]=(sum[symbol]??0)+Number(coefficient)*Number(count||1);return sum;
    },{});
    const [left,right]=reaction.split(/[=→]/u);assert.deepEqual(atoms(left),atoms(right));
  }
  verifyScience({id:"parsed-statement",answerDisplay:answer},entry);
}

export function buildGeneratorControls(){
  const load=createContentLoader(),{checkTaskAnswer}=load("src/lib/tasks.ts");
  const seeds=[...buildScienceTasks(),...load("src/lib/content/informatics-bank.ts").informaticsTasks];
  const entries=[];
  for(let i=0;i<6;i++)entries.push(
    {family:"ohm-current",entry:ohmTemplate(6+3*i,3)},
    {family:"carbonate-element-mass",entry:carbonateTemplate(3+37*i)},
    {family:"dilute-solution-mixture",entry:solutionTemplate(80+20*i,2+i,80+20*i,14+i)},
    {family:"uniform-speed",entry:speedTemplate(90+30*i,10)},
    {family:"density-SI-conversion",entry:densityTemplate(10+10*i,[2700,7800,8900][i%3])},
    {family:"water-heating-no-phase-change",entry:heatTemplate(Number((.2+.1*i).toFixed(1)),10+2*i,40+3*i)},
    {family:"DC-power",entry:powerTemplate(6+6*i,.25+.25*i)},
    {family:"stoichiometric-heat",entry:thermochemistryTemplate(8+8*i)},
    {family:"gas-from-impure-metal",entry:gasYieldTemplate(Number((2.4*(i+1)).toFixed(1)),10*i)},
    {family:"fixed-width-information-volume",entry:informationVolumeTemplate(47+19*i,[8,16,32][i%3])},
    {family:"positional-value-conversion",entry:radixValueTemplate(["10101","2012","735","3A2","12101","A3B"][i],[2,3,8,16,4,16][i])},
    {family:"power-minus-offset-digit-count",entry:radixDigitCountTemplate([2,3,5,8,10,16][i],5+2*i,[1,3,7,13,21,45][i])},
  );
  const controls=entries.map(({family,entry},i)=>{
    verifyControlStatement(entry);
    const [model,number,prompt,answer,explanation,proof]=entry;
    const seed=seeds.find(t=>t.examVersionId===`${model}-2027-draft`&&t.examNumber===number);assert.ok(seed,`${model}/${number}`);
    const task=structuredClone(seed),id=`audit-control-20261027-${family.toLowerCase()}-${Math.floor(i/12)+1}`;
    Object.assign(task,{id,prompt,answerDisplay:answer,answerRule:{type:"number",value:answer},solution:[{text:explanation+` Ответ: ${answer}.`}],difficulty:["dilute-solution-mixture","water-heating-no-phase-change","stoichiometric-heat","gas-from-impure-metal","power-minus-offset-digit-count"].includes(family)?"standard":"foundation"});
    task.publication.id=id;task.publication.provenance.sourceFiles=["scripts/release-science-stage-a.mjs","scripts/original-informatics-pilot.mjs","scripts/check-generator-controls.mjs"];
    task.publication.validation.checkedAt="2026-10-27";task.publication.validation.evidence=["scripts/check-generator-controls.mjs","scripts/test-exam-generation-audit.mjs"];
    assert.deepEqual(structuralIssues(task),[],id);assert.equal(checkTaskAnswer(answer,task.answerRule).correct,true);
    assert.equal(checkTaskAnswer("99999999",task.answerRule).correct,false);
    // Alter both stored key and tuple: verification must reject the mathematical error,
    // not merely notice that two copies of the key differ.
    const corrupt=[...entry];corrupt[3]=String(Number(answer)+1);
    assert.throws(()=>verifyControlStatement(corrupt));
    return {family,model,number,task,proof,sha256:contentFingerprint(task)};
  });
  assert.equal(new Set(controls.map(c=>c.task.id)).size,72);
  assert.equal(new Set(controls.map(c=>c.sha256)).size,72);
  for(const group of Map.groupBy(controls,c=>c.family).values()){
    assert.equal(group.length,6);assert.equal(new Set(group.map(c=>c.task.prompt)).size,6);
    assert.ok(new Set(group.map(c=>c.task.answerDisplay)).size>=2);
  }
  return controls;
}

export async function checkGeneratorControls({stage=false}={}){
  const controls=buildGeneratorControls();
  const {taskPackageIndex}=createContentLoader()("src/lib/task-package-index.ts");
  const publicIds=new Set(taskPackageIndex.flatMap(p=>p.tasks.map(t=>t.id)));
  assert.ok(controls.every(c=>!publicIds.has(c.task.id)),"Control batches must not leak into the public bank");
  let intake=null;
  if(stage){
    const directory=resolve(projectRoot,".content-staging/generator-controls");mkdirSync(directory,{recursive:true});
    const input=resolve(directory,"calculation-audit-20261027-v3.jsonl");
    writeFileSync(input,controls.map(c=>JSON.stringify(c.task)).join("\n")+"\n");
    const result=await importTasks({input,job:"generator-controls-20261027-v3",reviews:controls.map(c=>({id:c.task.id,sha256:c.sha256,method:"independent-computation",evidence:["scripts/check-generator-controls.mjs","scripts/test-exam-generation-audit.mjs"]}))});
    assert.equal(result.counts.found,72);assert.equal(result.counts.rejected,0);assert.equal(result.counts.review,0);
    intake={job:"generator-controls-20261027-v3",counts:result.counts,publicTasksAdded:0};
  }
  const implementationSha256=Object.fromEntries(["scripts/release-science-stage-a.mjs","scripts/original-informatics-pilot.mjs","scripts/check-generator-controls.mjs"].map(file=>[file,createHash("sha256").update(readFileSync(resolve(projectRoot,file))).digest("hex")]));
  const report={checkedAt:"2026-10-27",kind:"original-training-control-batches-not-publication",implementationSha256,passed:true,controls:controls.length,families:Map.groupBy(controls,c=>c.family).size,newFunctions:9,independentVerification:"parsed statements, inverse substitution, units, atomic mass and stoichiometric balances, independent positional expansion / BigInt; altered-key rejection",expertReviewClaimed:false,intake,records:controls.map(({task,...record})=>({...record,id:task.id,answer:task.answerDisplay}))};
  writeFileSync(resolve(projectRoot,"docs/generator-control-review.json"),JSON.stringify(report,null,2)+"\n");
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const r=await checkGeneratorControls({stage:process.argv.includes("--stage")});console.log(JSON.stringify({passed:r.passed,controls:r.controls,families:r.families,intake:r.intake}));}
