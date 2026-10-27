import assert from "node:assert/strict";
import { readFileSync,writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";
import { releasePilot } from "./release-task-pilot.mjs";

/** Own numerical template. Its key is independently checked by U=IR below. */
export function ohmTemplate(voltage=18,resistance=12) {
  assert.ok(Number.isFinite(voltage)&&voltage>=1&&voltage<=240&&Number.isFinite(resistance)&&resistance>=.1&&resistance<=1e6);
  const current=voltage/resistance;
  assert.ok(Number.isFinite(current)&&current>=.0001&&current<=20);
  assert.equal(Number(current.toFixed(4)),current,"Use a short terminating decimal or define explicit rounding in a different template");
  return ["oge-physics",9,`На участке цепи с сопротивлением ${resistance} Ом поддерживают напряжение ${voltage} В. Найдите силу постоянного тока в амперах. Участок подчиняется закону Ома.`,String(voltage/resistance),`По закону Ома I = U/R = ${voltage}/${resistance} А. Проверка: I·R должно вернуть исходное напряжение.`,{kind:"ohm",voltage,resistance,unit:"A"}];
}
export function carbonateTemplate(mass=250) {
  assert.ok(Number.isInteger(mass)&&mass>0&&mass<=10000);
  // 3 * 0.4 previously produced the invalid long key 1.2000000000000002.
  const key=mass*2/5;
  return ["oge-chemistry",19,`Для учебного анализа взяли ${mass} мг чистого CaCO₃. Используйте Ar(Ca)=40, Ar(C)=12, Ar(O)=16. Найдите массу кальция в образце в миллиграммах.`,String(key),"На кальций приходится 40 из 100 единиц формульной массы. Массу образца умножаем на 0,4.",{kind:"element-mass",atoms:{Ca:1,C:1,O:3},element:"Ca",compoundMass:mass,unit:"mg"}];
}
export function solutionTemplate(m1=120,w1=10,m2=80,w2=20) {
  // Conservative dilute aqueous NaCl range, not arbitrary 0..100% 'solutions'.
  assert.ok([m1,m2].every(x=>Number.isFinite(x)&&x>=1&&x<=10000)&&[w1,w2].every(x=>Number.isFinite(x)&&x>=0&&x<=20));
  const key=(m1*w1+m2*w2)/(m1+m2);
  assert.equal(Number(key.toFixed(4)),key,"Choose parameters with a finite, short decimal key");
  return ["ege-chemistry",26,`При 20 °C смешали ${m1} г водного раствора NaCl с массовой долей ${w1}% и ${m2} г раствора той же соли с массовой долей ${w2}%. Потерь и реакций нет. Найдите массовую долю соли после смешивания, в процентах.`,String(key),"Массы растворённой соли складываются, как и массы растворов. Отношение первой суммы ко второй выражаем в процентах.",{kind:"solution",solutions:[[m1,w1],[m2,w2]],unit:"percent"}];
}

// The same tuple schema, validator and importer as the original science pilot.
const bounded=(value,min,max)=>assert.ok(Number.isFinite(value)&&value>=min&&value<=max,"Outside reviewed physical domain");
const shortKey=value=>{const key=Number(value.toFixed(4));assert.ok(Math.abs(key-value)<1e-9,"A defined rounding rule or short exact key is required");return String(key);};
export function speedTemplate(distance,time){
  bounded(distance,1,10000);bounded(time,1,3600);bounded(distance/time,.1,50);
  return ["oge-physics",6,`Тележка двигалась равномерно по прямой и прошла ${distance} м за ${time} с. Найдите её скорость в м/с.`,shortKey(distance/time),`Для равномерного движения v=s/t=${distance}/${time} м/с. Подстановка v·t должна дать пройденный путь.`,{kind:"speed",distance,time,unit:"m/s"}];
}
export function densityTemplate(cm3,density){
  bounded(cm3,1,1000);assert.ok([2700,7800,8900].includes(density));const grams=density*cm3/1000;
  return ["oge-physics",7,`Сплошной однородный металлический образец имеет объём ${cm3} см³ и массу ${shortKey(grams)} г. Найдите плотность в кг/м³.`,String(density),"Переведите граммы в килограммы и кубические сантиметры в кубические метры; разделите массу на объём. Обратное произведение плотности на объём возвращает массу.",{kind:"density",grams,cm3,unit:"kg/m3"}];
}
export function heatTemplate(mass,start,end){
  bounded(mass,.1,5);bounded(start,5,75);bounded(end,10,90);assert.ok(end>start);const capacity=4200,delta=end-start;
  return ["oge-physics",8,`В теплоизолированном сосуде ${mass} кг жидкой воды нагрели от ${start} до ${end} °C. Кипения и потерь нет; c=4200 Дж/(кг·°C). Какое количество теплоты получила вода, в джоулях?`,shortKey(capacity*mass*delta),`При отсутствии фазового перехода Q=cmΔT, где ΔT=${delta} °C. Проверка: Q/(cm) возвращает разность температур.`,{kind:"heat",mass,capacity,delta,unit:"J"}];
}
export function powerTemplate(voltage,current){
  bounded(voltage,3,48);bounded(current,.05,5);
  return ["oge-physics",10,`Устройство питается постоянным током: напряжение ${voltage} В, сила тока ${current} А. Вычислите электрическую мощность в ваттах.`,shortKey(voltage*current),"Мощность постоянного тока P=UI. Проверка размерностей: В·А=Вт; P/I возвращает напряжение.",{kind:"power",voltage,current,unit:"W"}];
}
export function thermochemistryTemplate(oxygenMass){
  bounded(oxygenMass,1,640);
  return ["ege-chemistry",27,`Для теоретического расчёта дано термохимическое уравнение 2H₂(г) + O₂(г) = 2H₂O(ж) + 572 кДж. С избытком водорода полностью прореагировало ${oxygenMass} г O₂. M(O₂)=32 г/моль. Сколько теплоты выделилось, в кДж?`,shortKey(oxygenMass/32*572),"По уравнению один моль кислорода соответствует 572 кДж. Массу кислорода переводим в моли, затем используем пропорцию. Это расчёт, не инструкция к опыту.",{kind:"thermal",mass:oxygenMass,molarMass:32,stoichiometricMoles:1,heat:572,unit:"kJ"}];
}
export function gasYieldTemplate(mass,impurityPercent){
  bounded(mass,.5,100);bounded(impurityPercent,0,50);
  return ["ege-chemistry",28,`В расчётной модели ${mass} г технического Mg содержат ${impurityPercent}% инертных примесей. Чистый Mg полностью реагирует с избытком HCl: Mg + 2HCl → MgCl₂ + H₂. M(Mg)=24 г/моль, Vₘ=22,4 л/моль при заданных условиях. Примеси не реагируют; потерь газа нет. Найдите объём H₂ в литрах.`,shortKey(mass*(100-impurityPercent)/100/24*22.4),"Сначала определяем массу чистого Mg, затем его количество вещества. По уравнению n(H₂)=n(Mg); объём равен количеству вещества, умноженному на заданный молярный объём.",{kind:"gas-yield",mass,impurityPercent,molarMass:24,molarVolume:22.4,unit:"L"}];
}
export const scienceEntries = [
  ["oge-physics",6,"На прямом участке учебного трека тележка двигалась равномерно и за 40 с прошла 280 м. Определите её скорость в м/с.","7","При равномерном движении v = s/t = 280/40 = 7 м/с. Произведение 7 м/с на 40 с возвращает 280 м.",{kind:"speed",distance:280,time:40,unit:"m/s"}],
  ["oge-physics",7,"Сплошная металлическая заготовка имеет массу 270 г и объём 100 см³. Найдите плотность материала в кг/м³.","2700","В единицах СИ масса равна 0,270 кг, объём — 0,000100 м³. Плотность ρ = m/V = 2700 кг/м³.",{kind:"density",grams:270,cm3:100,unit:"kg/m3"}],
  ["oge-physics",8,"В термоизолированной установке 0,3 кг воды нагрели на 15 °C без кипения. Удельная теплоёмкость воды равна 4200 Дж/(кг·°C). Потерями теплоты пренебрегите. Сколько джоулей получила вода?","18900","Q = cmΔT = 4200 · 0,3 · 15 = 18900 Дж. Изменение температуры в градусах Цельсия численно равно изменению в кельвинах.",{kind:"heat",mass:0.3,capacity:4200,delta:15,unit:"J"}],
  ohmTemplate(),
  ["oge-physics",10,"Во время работы небольшого электрического устройства напряжение на нём равно 220 В, а сила постоянного тока — 0,25 А. Какую электрическую мощность потребляет устройство? Ответ дайте в ваттах.","55","Для постоянного тока P = UI = 220 · 0,25 = 55 Вт. Один вольт, умноженный на один ампер, даёт один ватт.",{kind:"power",voltage:220,current:0.25,unit:"W"}],
  ["oge-chemistry",3,"Сравните три элемента третьего периода: 1) фосфор (Z = 15), 2) алюминий (Z = 13), 3) кремний (Z = 14). Запишите их номера в порядке усиления неметаллических свойств простых веществ. Числа Z — порядковые номера элементов.","231","В пределах одного малого периода неметаллические свойства усиливаются слева направо. Последовательность Al → Si → P соответствует номерам 2 → 3 → 1.",{kind:"period-order",atomicNumbers:[15,13,14],unit:"ordered-indices"}],
  ["oge-chemistry",18,"Для учебного анализа приготовили 450 мг порошковой смеси. В ней 150 мг чистого CaCO₃, а остальные компоненты не содержат кальция. Используйте Ar(Ca)=40, Ar(C)=12, Ar(O)=16. Какова массовая доля кальция в самом CaCO₃, в процентах? Не в смеси.","40","Относительная формульная масса CaCO₃ равна 40 + 12 + 3·16 = 100. На кальций приходится 40 единиц, поэтому w(Ca)=40/100·100%=40%.",{kind:"element-percent",atoms:{Ca:1,C:1,O:3},element:"Ca",precision:0,unit:"percent"}],
  ["oge-chemistry",19,"Для учебного анализа приготовили 450 мг порошковой смеси. В ней 150 мг чистого CaCO₃, остальные компоненты не содержат кальция. Используйте Ar(Ca)=40, Ar(C)=12, Ar(O)=16. Какова масса кальция в этой порции смеси, в миллиграммах?","60","В CaCO₃ массовая доля кальция 40/100 = 0,4. Поэтому в 150 мг соли содержится 150·0,4=60 мг кальция. Примеси кальция не добавляют.",{kind:"element-mass",atoms:{Ca:1,C:1,O:3},element:"Ca",compoundMass:150,unit:"mg"}],
  ["oge-chemistry",18,"Образец для анализа содержит 680 мг безводного CaSO₄ и 120 мг примесей без серы. Для расчёта примите Ar(Ca)=40, Ar(S)=32, Ar(O)=16. Определите массовую долю серы в чистом безводном CaSO₄ в процентах. Округлите до десятых.","23.5","Масса формульной единицы равна 40 + 32 + 4·16 = 136. Доля серы равна 32/136·100%=23,529…%. После округления до десятых получаем 23,5%.",{kind:"element-percent",atoms:{Ca:1,S:1,O:4},element:"S",precision:1,unit:"percent"}],
  ["oge-chemistry",19,"Образец для анализа содержит 680 мг безводного CaSO₄ и 120 мг примесей без серы. Используйте Ar(Ca)=40, Ar(S)=32, Ar(O)=16. Найдите массу серы в образце в миллиграммах. В промежуточных расчётах не округляйте.","160","Массовая доля серы в CaSO₄ равна 32/136. Поэтому масса серы 680·32/136 = 160 мг; масса примесей на результат не влияет.",{kind:"element-mass",atoms:{Ca:1,S:1,O:4},element:"S",compoundMass:680,unit:"mg"}],
  ["ege-chemistry",26,"Для технологической пробы смешали 120 г водного раствора NaCl с массовой долей 10% и 80 г раствора той же соли с массовой долей 20%. Потерь и химических реакций нет. Найдите массовую долю NaCl в полученной смеси, в процентах.","14","Масса соли: 120·0,10 + 80·0,20 = 28 г. Масса смеси 200 г. Доля соли 28/200·100%=14%.",{kind:"solution",solutions:[[120,10],[80,20]],unit:"percent"}],
  ["ege-chemistry",26,"10,0 г чистого NaOH растворили в воде и довели объём раствора до 500 мл. Молярную массу NaOH примите равной 40 г/моль. Вычислите молярную концентрацию раствора в моль/л.","0.5","Количество вещества NaOH равно 10/40 = 0,25 моль. Объём раствора 0,500 л. Концентрация 0,25/0,500 = 0,5 моль/л.",{kind:"molarity",mass:10,molarMass:40,millilitres:500,unit:"mol/L"}],
  ["ege-chemistry",27,"Реакция идёт по термохимическому уравнению 2H₂(г) + O₂(г) = 2H₂O(ж) + 572 кДж. Полностью прореагировали 16 г кислорода с избытком водорода. M(O₂)=32 г/моль. Сколько килоджоулей теплоты выделилось?","286","По уравнению один моль O₂ даёт 572 кДж. Прореагировало 16/32=0,5 моль O₂, поэтому выделилось 572·0,5=286 кДж.",{kind:"thermal",mass:16,molarMass:32,stoichiometricMoles:1,heat:572,unit:"kJ"}],
  ["ege-chemistry",27,"Для разложения одного моля CaCO₃ по уравнению CaCO₃(тв) = CaO(тв) + CO₂(г) требуется подвести 178 кДж теплоты. Какое количество теплоты нужно подвести для полного разложения 2,5 моль CaCO₃? Ответ в кДж, потери не учитывайте.","445","Удельный по количеству вещества расход теплоты — 178 кДж/моль. Для 2,5 моль требуется 178·2,5=445 кДж. Теплота поглощается, поэтому указывается положительная величина подведённой энергии.",{kind:"thermal-moles",moles:2.5,heatPerMole:178,unit:"kJ"}],
  ["ege-chemistry",28,"Избытком раствора HCl обработали 3,00 г технического магния, содержащего 20% инертных примесей. Реакция: Mg + 2HCl → MgCl₂ + H₂. M(Mg)=24 г/моль, молярный объём газа в условиях опыта — 22,4 л/моль. Найдите объём полученного водорода в литрах, до сотых. Примеси с кислотой не реагируют.","2.24","Чистого Mg: 3·0,80=2,4 г, или 2,4/24=0,1 моль. По уравнению H₂ получается тоже 0,1 моль; его объём 0,1·22,4 = 2,24 л.",{kind:"gas-yield",mass:3,impurityPercent:20,molarMass:24,molarVolume:22.4,unit:"L"}],
];
const atomicMass={Ca:40,C:12,O:16,S:32};
export function verifyScience(task,entry) {
  const [,, ,answer,,c]=entry;
  assert.equal(task.answerDisplay,answer);
  if(c.kind==="period-order") {
    assert.equal(c.unit,"ordered-indices");assert.deepEqual([...c.atomicNumbers].sort((a,b)=>a-b),[13,14,15]);
    const indices=c.atomicNumbers.map((z,i)=>[z,i+1]).sort((a,b)=>a[0]-b[0]).map(([,i])=>i).join("");assert.equal(answer,indices);return;
  }
  const x=Number(answer);assert.ok(Number.isFinite(x));
  const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${task.id}: ${a} != ${b}`);
  switch(c.kind){
    case "speed": assert.equal(c.unit,"m/s");close(x*c.time,c.distance);break;
    case "density": assert.equal(c.unit,"kg/m3");close(x*c.cm3*1e-6,c.grams*1e-3);break;
    case "heat": assert.equal(c.unit,"J");close(x/c.capacity/c.mass,c.delta);break;
    case "ohm": assert.equal(c.unit,"A");close(x*c.resistance,c.voltage);break;
    case "power": assert.equal(c.unit,"W");close(x/c.current,c.voltage);break;
    case "element-percent":case "element-mass":{
      const molarMass=Object.entries(c.atoms).reduce((n,[el,count])=>n+atomicMass[el]*count,0), elementMass=atomicMass[c.element]*c.atoms[c.element];
      const calculated=c.kind==="element-percent"?Number((100*elementMass/molarMass).toFixed(c.precision)):c.compoundMass*elementMass/molarMass;
      close(x,calculated);break;
    }
    case "solution": close(c.solutions.reduce((n,[m,w])=>n+m*w/100,0),x/100*c.solutions.reduce((n,[m])=>n+m,0));break;
    case "molarity":close(x*(c.millilitres/1000)*c.molarMass,c.mass);break;
    case "thermal":close(x/c.heat*c.stoichiometricMoles*c.molarMass,c.mass);break;
    case "thermal-moles":close(x/c.heatPerMole,c.moles);break;
    case "gas-yield":close(x/c.molarVolume*c.molarMass,c.mass*(100-c.impurityPercent)/100);break;
    default:throw Error("Missing independent science verification");
  }
}
export function buildScienceTasks(){
  const load=createContentLoader(),{getExamDefinition}=load("src/lib/exams.ts"),{originalProvenance}=load("src/lib/content/provenance.ts");
  return scienceEntries.map(([id,number,prompt,answer,explanation,c],i)=>{
    const definition=getExamDefinition({examType:id.startsWith("ege")?"ЕГЭ":"ОГЭ",subjectId:id.endsWith("physics")?"physics":"chemistry",level:null}),slot=definition?.numbers.find(n=>n.number===number);assert.ok(slot?.practiceAnswerFormat);
    const task={id:`science-stage-a-20261026-${i+1}`,examType:[definition.examType],subjectId:definition.subjectId,level:null,examYear:definition.year,examVersionId:definition.versionId,examNumber:number,part:slot.part,
      topicId:`${id}-n${number}`,prototypeId:`${id}-n${number}-original`,title:slot.title,prompt,answerDisplay:answer,answerRule:c.kind==="period-order"?{type:"choices",value:answer,ordered:true}:{type:"number",value:answer},answerFormat:slot.practiceAnswerFormat,difficulty:"standard",
      solution:[{text:explanation}],source:{kind:"author",label:"Авторская тренировка · проект структуры 2027, не официальный КИМ",revision:1},provenance:originalProvenance("original-individual-task"),scoring:{status:"pending-official-verification",maxPrimaryScore:slot.maxPrimaryScore},
      requirementsReference:{...slot.sourceReference,year:2027,status:"draft-copy-reviewed"},
      publication:{id:`science-stage-a-20261026-${i+1}`,releaseStatus:"ready",provenance:{sourceIds:["tochka-project-original"],authorship:"project-original",sourceFiles:["scripts/release-science-stage-a.mjs"],attribution:["Авторский материал проекта «Точка»"]},validation:{status:"automated-reviewed",checkedAt:"2026-10-26",evidence:["scripts/release-science-stage-a.mjs","docs/science-stage-a-review.json"]}}};
    verifyScience(task,scienceEntries[i]);return task;
  });
}
export function remainingDirectionsProgress(){
  const load=createContentLoader(),{getExamDefinition}=load("src/lib/exams.ts");
  const original=JSON.parse(readFileSync(resolve(projectRoot,"docs/multi-subject-inventory.json"),"utf8"));
  const tasks=buildScienceTasks();
  return original.filter(r=>r.newTasks===0).map(r=>{
    const model=getExamDefinition({examType:r.exam,subjectId:r.subjectId,level:r.level});
    const added=tasks.filter(t=>t.subjectId===r.subjectId&&t.examType[0]===r.exam);
    return {subjectId:r.subjectId,subject:r.subject,exam:r.exam,modelStatus:added.length?"draft-2027-copy-reviewed-not-canonical":"not-reviewed",modelId:model?.versionId??null,officialCanonicalArchiveVerified:false,newReleaseTasks:added.length,numbers:[...new Set(added.map(t=>t.examNumber))],verification:added.length?"inverse-substitution, units, atom balance and targeted factual review":"not-performed",limitations:added.length?"Only short-answer pilot. Expert answers, experiment resources and official partial-credit scoring not implemented; canonical ZIP not read.":"Official subject-specific demo/specification/codifier not yet read. No numbers or tasks invented.",massReadiness:added.length?"controlled-calculation-subtypes-only":"blocked",nextStep:added.length?"Verify canonical archives, then extend reviewed short-answer subtypes before experiments/extended tasks":r.subjectId==="biology"||r.subjectId==="geography"?"Continue stage A: inspect three official documents for this subject":"Stage B/C: inspect three official subject documents and resource/assessment requirements"};
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const tasks=buildScienceTasks();
  await releasePilot({tasks,batchId:"science-stage-a-20261026-r2",reviewFile:"docs/science-stage-a-review.json",evidence:["scripts/release-science-stage-a.mjs","scripts/test-science-stage-a.mjs"]});
  writeFileSync(resolve(projectRoot,"docs/science-stage-a-verification.json"),JSON.stringify(tasks.map((t,i)=>({id:t.id,model:scienceEntries[i][5],method:"independent-balance-or-inverse-substitution-with-units",expertReviewed:false})),null,2)+"\n");
  writeFileSync(resolve(projectRoot,"docs/remaining-directions-progress.json"),JSON.stringify(remainingDirectionsProgress(),null,2)+"\n");
}
