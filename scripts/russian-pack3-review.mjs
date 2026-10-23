import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader } from "./content-source-loader.mjs";

const load=createContentLoader();
const {russianPack3}=load("src/lib/content/russian-pack3.ts");
const {russianTasks}=load("src/lib/content/russian-bank.ts");
const {pack3SpellingExercises}=load("src/lib/content/russian-pack3-ege-spelling.ts");
const {checkTaskAnswer}=load("src/lib/tasks.ts");

// Separately maintained author review, not a claimed independent expert assessment.
const keys={
 ОГЭ:{
  2:["123","134","234","123","134","1345","123","1345","134","1234","124","145","134","1235"],
  3:["245","125","135","234","145","235","1245","125","345","135","234","2345","124","145"],
  4:["425","251","534","315","142","453","254","541","235","451","342","513","245","532"],
  5:["123","123","123","123","2","123","34","123","234","12","123","12","1234","12"],
  6:["145","235","124","345","134","245","125","234","35","135","124","245","235","145"],
  7:["123","1234","12345","134","12","2345","124","134","1235","12","12","1234","12456","12345"],
  8:["уха","друзей","паспорта","тренеры","килограмма","вафель","варежек","плеча","двумястами","полутора","глубже","шире","береги","поездов"],
  9:["советпапы","неделясдождями","тросизстали","площадьгорода","встретилсрадостью","трудилсянастойчиво","читаетсвыражением","осенняяпоездка","птичьепение","сосудизстекла","врачебнаяпомощь","замыселавтора","безошибочноерешение","смотрелнедоверчиво"],
  10:["134","135","234","134","135","134","235","124","145","125","134","125","134","125"],
  11:["2","4","3","4","5","3","1","5","4","3","5","1","3","5"],
  12:["вдохновенно","робко","осторожно","терпеливо","облегчение","внимательно","упорно","охотно","бережно","аккуратно","добросовестно","вдумчиво","тщательно","выразительность"],
 },
 ЕГЭ:{
  1:["но","который","чтобы","так"],2:["134","145","124","245"],3:["124","234","134","234"],
  4:["124","235","245","34"],5:["практичную","абонентскую","невеждой","гарантированные"],
  6:["месяце","юный","победу","расширила"],7:["положи","двумстам","мест","договоры"],
  8:["24135","31425","32451","35421","21435"],
  9:["1235","235","2345","1245"],10:["1245","1245","124","1235"],
  11:["124","124","1235","1234"],12:["1235","1235","1245","1235"],
  13:["124","25","234","135","124"],14:["135","234","235","145"],15:["13","14","34","14"],
  16:["235","134","125","24","135"],17:["123","123","123","123","234"],
  18:["134","345","1234","234","123456"],19:["12","34","123","12","14"],
  20:["123","13","123","12345","134"],21:["135","235","134","145","124"],
  22:["42315","21453","45123","35124"],23:["134","235","345","124"],
  24:["123","124","134","1235"],25:["пропуститьмимоушей","прячет","благодарность","досадовал"],26:["5","2","5","6"],
 },
};

test("pack 3: exactly 266 items, 154/112 allocation and all separately reviewed answer keys",()=>{
 assert.equal(russianPack3.length,266);
 assert.equal(russianPack3.filter(item=>item.exam==="ОГЭ").length,154);
 for(const[exam,numbers]of Object.entries(keys))for(const[number,expected]of Object.entries(numbers)){
  const actual=russianPack3.filter(item=>item.exam===exam&&item.entry.number===Number(number));
  const count=exam==="ОГЭ"?14:[8,13,16,17,18,19,20,21].includes(Number(number))?5:4;
  assert.equal(actual.length,count,`${exam} #${number}`);
  assert.deepEqual(actual.map(item=>item.entry.answer),expected,`${exam} #${number}`);
 }
 for(const task of russianTasks.filter(task=>task.id.includes("-p3-"))){
  assert.equal(checkTaskAnswer(task.answerDisplay,task.answerRule).correct,true,task.id);
  assert.equal(checkTaskAnswer(task.answerDisplay+"9",task.answerRule).correct,false,task.id);
  if(task.answerRule.type==="choices"&&task.answerRule.ordered){
   assert.equal(new Set(task.answerDisplay).size,task.answerDisplay.length,task.id);
   assert.equal(task.answerDisplay.length,task.examType[0]==="ОГЭ"?3:5,task.id);
  }
 }
});

const filled={
 "letters-frost":["О","Мороз украсил окно, за порогом блестел снег."],
 "letters-river":["Е","На берегу лесник увидел лосиный след."],
 "letters-autumn":["И","В тишине широкой долины блистала вода."],
 "letters-grass":["А","На траве лежали зелёные листья, а в зарослях качалась ветка."],
 "letters-doors":["И","Сторож запирал двери, собирал бумаги и замер у порога."],
 "letters-seedlings":["О","Юный садовник поливал росток, прикоснулся к листу и загорел на солнце."],
 "letters-prefixes":["Е","Прекрасный день помог преодолеть путь, приблизиться к реке и присесть у воды."],
 "letters-adjacent":["И","У прибрежного леса приземлилась птица и прикрыла крылом птенца."],
 "letters-past-verbs":["Е","Мы видели, как птицы летели над землёй и садились на ветки."],
 "letters-suffixes":["Е","Мальчик положил в ящик листочек, звоночек, домик и карандашик."],
 "letters-endings":["Е","Ты борешься с ветром, стелешь плащ, смотришь вдаль и слышишь шум."],
 "letters-dawn":["А","На заре ребята предлагали расчистить тропу, но устали у большого дуба."],
 "letters-fields":["О","По сторонам дороги темнели поля и тянулась полоса леса."],
 "letters-silver":["Е","Серебристый ручей блестел у берёзы и убегал за поворот."],
};
test("pack 3: all 14 missing-letter OGE keys reconstructed from separate complete sentences",()=>{
 for(const[slug,[letter,sentence]]of Object.entries(filled)){
  const entry=russianPack3.find(item=>item.entry.slug===`p3-${slug}`).entry;
  const mask=entry.prompt.split("\n")[1];const numbers=[...mask.matchAll(/\((\d)\)/g)].map(m=>m[1]);
  const pattern=mask.replace(/[.*+?^${}|[\]\\]/g,"\\$&").replace(/\(\d\)/g,"(.)");
  const match=sentence.match(new RegExp("^"+pattern+"$"));assert(match,slug);
  assert.equal(numbers.filter((_,i)=>match[i+1].toLocaleUpperCase("ru")===letter).join(""),entry.answer,slug);
 }
});

const accents=new Map([
 "вероисповЕдание","граждАнство","диспансЕр","еретИк","жалюзИ","завИдно","заселЁн","звонИт","избалОванный","квартАл",
 "кровоточИть","кремЕнь","кУхонный","ломОта","лЕкторы","мозаИчный","намЕрение","нанЯвшийся","нЕнависть","нефтепровОд",
].map(word=>[word.toLocaleLowerCase("ru"),word]));
test("pack 3: all EGE accent choices agree with a separate explicit normative list",()=>{
 for(const {entry}of russianPack3.filter(i=>i.exam==="ЕГЭ"&&i.entry.number===4)){
  const candidates=entry.prompt.split("\n").slice(1).map(line=>line.slice(3));
  assert.equal(candidates.length,5);
  const actual=candidates.flatMap((word,i)=>{const correct=accents.get(word.toLocaleLowerCase("ru"));assert(correct,word);return word===correct?[i+1]:[];}).join("");
  assert.equal(actual,entry.answer,entry.slug);
 }
});

test("pack 3: every EGE spelling row has unique words, one-character holes and an independently recorded key",()=>{
 assert.equal(pack3SpellingExercises.length,16);const seen=new Set();
 for(const exercise of pack3SpellingExercises){
  const rows=exercise.rows.map(row=>{
   assert.equal(new Set(row.map(([,word])=>word)).size,row.length,exercise.slug);
   return row.map(([mask,word])=>{assert.equal(mask.split("_").length,2);const hole=mask.indexOf("_");assert.equal(mask.replace("_",word[hole]),word,mask);return word[hole];});
  });
  const actual=rows.flatMap((letters,i)=>letters.every(letter=>letter===letters[0])?[i+1]:[]).join("");
  const entry=russianPack3.find(i=>i.entry.slug===`p3-${exercise.slug}`).entry;
  assert.equal(actual,entry.answer,exercise.slug);
  const signature=exercise.rows.map(row=>row.map(([,word])=>word).sort().join("|")).sort().join("/");
  assert(!seen.has(signature),exercise.slug);seen.add(signature);
 }
});

test("pack 3: all 22 original texts, extractable lexical answers, references and digit markers are complete",()=>{
 const passages=new Map();
 for(const{entry,exam}of russianPack3){
  if(entry.passage){
   const{id,sentences}=entry.passage;assert(sentences.length>=4);assert(sentences.join(" ").length>=300,id);assert(entry.references?.length);
   for(const n of entry.references)assert(n>=1&&n<=sentences.length,id);
   if(passages.has(id))assert.deepEqual(passages.get(id),sentences);passages.set(id,sentences);
   if(entry.number===(exam==="ОГЭ"?12:25)){
    const text=entry.references.map(n=>sentences[n-1]).join(" ").toLocaleLowerCase("ru").replace(/[^\p{L}]/gu,"");
    assert(text.includes(entry.answer),entry.slug);
   }
  }
  if(entry.mode!=="word"&&entry.mode!=="ordered"){
   const markers=[...entry.prompt.matchAll(/\((\d)\)/g)].map(m=>m[1]);
   if(markers.length&&/позиц/i.test(entry.prompt)){assert.equal(new Set(markers).size,markers.length);for(const n of entry.answer)assert(markers.includes(n),entry.slug);}
   const options=[...entry.prompt.matchAll(/^([1-9])\) /gm)].map(m=>m[1]);
   if(options.length)for(const n of entry.answer)assert(options.includes(n),entry.slug);
  }
 }
 assert.equal(passages.size,22);
 assert.equal(new Set([...passages.values()].map(s=>s.join(" "))).size,22);
});

test("pack 3: all previous 362 Russian entries preserve contents and indices",()=>{
 const oldLoad=createContentLoader({revision:"910bd64"});
 const before=oldLoad("src/lib/content/russian-bank.ts").russianTasks;
 const substantive=task=>Object.fromEntries(Object.entries(task).filter(([key])=>key!=="publication"));
 assert.equal(before.length,362);
 assert.deepEqual(russianTasks.slice(0,before.length).map(substantive),before.map(substantive));
 const oldPractice=oldLoad("src/lib/practice.ts");
 const selection=oldPractice.normalizeCatalogSelection({exam:"ОГЭ",subjectId:"russian",mode:"number",examNumber:8});
 const saved=oldPractice.createPracticeSession("russian-pre-pack3",selection);
 saved.lastPosition=7;saved.lastTaskId=saved.taskIds[7];
 const oldIds=[...saved.taskIds];assert.equal(oldIds.length,14);
 const {serializeStoredPractice}=oldLoad("src/lib/practice-storage.ts");
 const {parseStoredPractice}=load("src/lib/practice-storage.ts");
 const serialized=serializeStoredPractice({version:2,catalog:selection,activeId:saved.id,sessions:{[saved.id]:saved},taskStates:{[saved.lastTaskId]:{...oldPractice.emptyTaskState(),answer:"сапог",attempt:{id:"old-russian-attempt",correct:false}}}});
 const restored=parseStoredPractice(serialized);
 assert.equal(restored.sessions[saved.id].lastTaskId,saved.lastTaskId);
 assert.equal(restored.sessions[saved.id].taskIds.length,41);
 assert.deepEqual(restored.sessions[saved.id].taskIds.slice(0,oldIds.length),oldIds);
 assert.equal(restored.taskStates[saved.lastTaskId].attempt.id,"old-russian-attempt");
});
