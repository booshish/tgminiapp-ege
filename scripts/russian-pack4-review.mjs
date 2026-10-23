import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader } from "./content-source-loader.mjs";
const load=createContentLoader();
const {russianPack4}=load("src/lib/content/russian-pack4.ts");
const {russianTasks}=load("src/lib/content/russian-bank.ts");
const {checkTaskAnswer}=load("src/lib/tasks.ts");
const {pack4SpellingExercises}=load("src/lib/content/russian-pack4-ege-spelling.ts");

// Author's separate answer sheet, not independent expert or official certification.
const reviewed={
 ОГЭ:{
  2:["123","1235","1235","1245","1235","1245","1235","1235","1235","1234","1235","1345","1235"],
  3:["134","245","135","234","145","235","125","345","134","245","135","145","234"],
  4:["421","513","324","541","532","251","453","431","542","531","451","324","543"],
  5:["1234","1234","124","1234","12","123","134","123","12","124","1234","124","1234"],
  6:["245","135","234","145","235","125","345","134","124","1345","124","2345","345"],
  7:["1245","12345","1235","123","145","124","1345","123","125","1245","125","145","125"],
  8:["груш","блюдец","моложе","ляг","ста","пятидесяти","её","туфель","четырёх","девяти","суше","восьми","окон"],
  9:["медальизбронзы","следлисы","осеннийветер","слушалвнимательно","стекляннаяваза","ответилсосмелостью","кольцоизсеребра","соседскийсовет","шёлнеспешно","прохладаночи","бумажныйкораблик","относилсясуважением"],
  10:["135","245","134","145","134","134","124","134","135","134","134","134","134"],
  11:["4","6","5","4","5","5","4","7","5","5","3","5","5"],
  12:["увлечённо","тщательно","приветливо","внимательно","облегчённо","негромко","благоразумно","терпеливо","точно","неподвижно","спокойно","находчиво","уважительно"],
 },
 ЕГЭ:{
  1:["тем","он","то","чтобы","но"],2:["125","135","125","123","123"],3:["135","134","134","124","134"],
  4:["235","1234","123","1235","12345"],5:["заплатить","ледяной","единственный","гуманитарный","каменистой"],
  6:["бесплатно","вместе","памятному","первый","обратно"],7:["обеими","пятистах","лучше","носков","их"],
  8:["25367","12457","26573","34567","13456"],
  9:["134","135","123","12","1245"],10:["124","124","123","1235","1235"],
  11:["1245","1235","124","1245","12345"],12:["1235","1235","2345","1235","1245"],
  13:["124","245","134","135","234"],14:["235","124","245","125","124"],15:["23","134","234","1345","34"],
  16:["235","135","125","124","35"],17:["1234","1234","23","123","23"],
  18:["1234","1234","145","1234","1234"],19:["14","134","1234","13","123"],
  20:["1234","13","1234","123","123"],21:["14","135","135","135","245"],
  22:["35214","32451","45132","31254","32514"],
  23:["135","134","134","134","134"],24:["123","123","123","123","123"],
  25:["безколебаний","отвсейдуши","посправедливости","безутайки","совсехсторон"],26:["6","7","7","6","6"],
 },
};
test("pack 4: remaining 272 originals, 142/130 allocation and separately reviewed keys",()=>{
 assert.equal(russianPack4.length,272);
 assert.equal(russianPack4.filter(x=>x.exam==="ОГЭ").length,142);
 assert.equal(russianPack4.filter(x=>x.exam==="ЕГЭ").length,130);
 for(const[exam,numbers]of Object.entries(reviewed))for(const[number,answers]of Object.entries(numbers)){
  const entries=russianPack4.filter(x=>x.exam===exam&&x.entry.number===Number(number)).map(x=>x.entry);
  assert.deepEqual(entries.map(e=>e.answer),answers,`${exam} #${number}`);
 }
 for(const task of russianTasks.filter(t=>t.id.includes("-p4-"))){
  assert.equal(checkTaskAnswer(task.answerDisplay,task.answerRule).correct,true,task.id);
  assert.equal(checkTaskAnswer(task.answerDisplay+"9",task.answerRule).correct,false,task.id);
  if(task.answerRule.type==="choices"&&!task.answerRule.ordered)
   assert.equal(checkTaskAnswer([...task.answerDisplay].reverse().join(""),task.answerRule).correct,true,task.id);
 }
});

const filled={
 "letters-rain":["О","Дорога шла вдоль полей. Над лесами собирались тучи, а на поляне уже лежала коса утреннего тумана."],
 "letters-wood":["Е","Мастер выбрал деревянную рейку, измерил её и прикрепил к стене."],
 "letters-evening":["И","Мы собирали ветки, выжидали минуту и разжигали огонь. Вдалеке блистала река."],
 "letters-shoot":["А","Подрастающий побег касался стены. Солнце озаряло двор, где росли кусты и загорали отдыхающие."],
 "letters-pre":["Е","Путники преодолели перевал, присели у ручья и прикоснулись к холодной воде. Перед ними лежала прекрасная долина, а тропа преградила путь потоку."],
 "letters-z":["З","Беззвучный шаг не разбудил сторожа. Дежурный расписал график, избежал ошибки и бесполезного спора."],
 "letters-suffix-e":["Е","На столе лежал замочек, рядом — ключик. Мастер надел плюшевый жилет и спрятал орешек в ситцевый мешочек."],
 "letters-endings-i":["И","В тетради записано: ты видишь узор, слышишь музыку и пишешь о роще ."],
 "letters-adverb-a":["А","Издалека виднелась башня. Сначала мы пошли вправо, потом свернули влево и увидели слева реку."],
 "letters-sign":["Ь","Ночью поднялась вьюга. У подъезда мы услышали, как тихо скрипит дверь, и решили её беречь ."],
 "letters-ts-i":["И","В цирке появилась новая декорация. За кулисами стояли цыплята, а на полке лежали огурцы и цифровой прибор."],
 "letters-verb-u":["Ю","Дети читают, клеят и строят. В саду тают последние льдинки, а художники рисуют весну."],
 "letters-nature-e":["Е","Весной берёзы покрылись листвой. На поляне загорелся костёр, и лесник подошёл к гостям."],
};
test("pack 4: OGE missing letters reconstructed from 13 separate complete paragraphs",()=>{
 for(const[slug,[letter,sentence]]of Object.entries(filled)){
  const entry=russianPack4.find(x=>x.entry.slug===`p4-${slug}`).entry;
  const chunks=entry.prompt.split("\n")[1].split(/\((\d)\)\.\./);
  const numbers=[];let pattern="^";
  for(let i=0;i<chunks.length;i++){
   if(i%2){numbers.push(chunks[i]);pattern+="(.)";}
   else pattern+=chunks[i].replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  }
  const match=sentence.match(new RegExp(pattern+"$"));assert(match,slug);
  assert.equal(numbers.filter((_,i)=>match[i+1].toLocaleUpperCase("ru")===letter).join(""),entry.answer,slug);
 }
});

// Independently filled full-word rows, compact notation: commas = words, / = rows.
const spellings={
 "roots-forest":"лесник,зернистый,сердечный/полагать,касательная,росток/собирать,замирать,блистательный/загореть,прикоснуться,изложение/помириться,запереть,протирать",
 "roots-checks":"спешить,степной,увлекать/поклонение,заря,выращенный/обжигать,вычитать,расстилать/пловец,ростовщик,скачок/запевать песню,светлячок,потерять",
 "roots-dictionary":"капуста,картина,багаж/коридор,горизонт,помидор/сирень,директор,билет/касаться,замереть,отрасль/батон,сапог,вокзал",
 "roots-meaning":"примирение сторон,умиротворить,помирить друзей/примерять пальто,измерение,соразмерный/посветить фонарём,посвятить стихотворение,осветить зал/укротить зверя,сократить путь,поглотить/развеваться на ветру,развивать способности,увядать без воды",
 "roots-alternating":"наклониться,выгореть,отросли волосы/отпирать,выдирать,оттирать/разрастись,заросли,прилагать/озарить,зарево,зарница/блестеть,заберу,натереть",
 "prefix-hard-sign":"объяснить,разъярённый,предъюбилейный/вьюнок,воробьи,платье/съехать,подъезд,вьюга/межъязыковой,сверхъестественный,изъять/пьеса,съёмка,соловьи",
 "prefix-voicing":"безвредный,издать,разглядеть/растолкать,бесшумный,воспитать/исправить,бескрайний,разбудить/сдать,сжать,сбить/воззвать,рассвет,избрать",
 "prefix-pre-pri":"прибрежный,пригородный,пришкольный/преувеличить,премудрый,преградить/привстать,приоткрыть,приклеить/приступить к делу,преступить закон,прибывать в город/придать значение,предать друга,претерпеть лишения",
 "prefix-y-i":"безыдейный,подыграть,предыстория/межинститутский,сверхинтересный,дезинформация/обыскать,розыск,сыграть/безымянный,постиндустриальный,предыдущий/заиграть,поискать,наиграть",
 "prefix-invariable":"подставка,надписать,предсказать/открыть,отпечаток,отпереть дверь/обжечь руку кипятком,обдумать решение,обновить сведения/надстроить,подбросить,открутить/расшить,беспечный,истечь",
 "suffix-ek-ik":"домик,столик/платочек,мешочек/мячик,орешек/цветочек,овражек/листик,билетик",
 "suffix-liv-chiv":"доверчивый,забывчивый/счастливый,приветливый/сиреневый,тюлевый/красивый,плюшевый/улыбчивый,расчётливый",
 "suffix-ova-yva":"советовать,беседовать/танцевать,ночевать/рассказывать,отклеивать/командовать,пробовать/завидовать,горевать",
 "suffix-hissing":"ежовый,парчовый/грушевый,плюшевый/ситцевый,свинцовый/алычовый,камышовый/пищевой,марлевый",
 "suffix-enka":"синенький,беленький/мягонький,тихонький/продлевать,застревать/выздороветь,обессилеть от болезни/расклеивать,развеивать",
 "verbs-spring":"снег тает,сеешь/клеишь,строишь/дремлющий,борющийся/смотрят дети,тают льдинки/читаемый,измеряемый",
 "verbs-exceptions":"дышат спортсмены,слышат дети/бреют мастера,стелют ковры/видишь,ненавидишь/держащий,гонящий/зависимый,слышимый",
 "verbs-past":"услышавший,увидевший/растаявший,затеявший/выдержавший,смешавший краски/заметивший следы,построивший/обидевшийся,зависевший от погоды",
 "verbs-active":"колющий,борющийся/дышащий,слышащий/зависящий,клеящий/пишущий,строящий/читающий,рисующий",
 "verbs-passive":"обсуждаемый,проверяемый/хранимый,ценимый/смотришь,сеешь/веришь,кормишь/заполняемый,решаемый",
};
test("pack 4: all 20 EGE orthography rows checked against separate full spellings",()=>{
 assert.equal(pack4SpellingExercises.length,20);
 for(const exercise of pack4SpellingExercises){
  const full=spellings[exercise.slug].split("/").map(row=>row.split(","));const selected=[];
  assert.equal(exercise.rows.length,5);
  exercise.rows.forEach((row,i)=>{
   assert.equal(row.length,exercise.number<=10?3:2);
   const letters=row.map(([mask,correct],j)=>{
    assert.equal(correct,full[i][j]);const[before,after]=mask.split("_");
    assert(correct.startsWith(before)&&correct.endsWith(after));assert.equal(correct.length,before.length+after.length+1);
    return correct[before.length];
   });if(new Set(letters).size===1)selected.push(i+1);
  });
  const entry=russianPack4.find(x=>x.entry.slug===`p4-${exercise.slug}`).entry;
  assert.equal(entry.answer,selected.join(""),exercise.slug);
 }
});
const accents=new Map([
 "принЯв","начАв","понЯв","начАвший","отдАв","тОрты","щавЕль","слИвовый","кАмбала","свЁкла",
 "договОр","каталОг","экспЕрт","обеспЕчение","ходАтайство","включИт","вручИт","облегчИт","налИл","создАла",
 "оптОвый","красИвее","мизЕрный","дАвнишний","вернА",
].map(word=>[word.toLocaleLowerCase("ru").replace(/ё/g,"е"),word]));
test("pack 4: accent keys reconstructed from separate normative-word list",()=>{
 for(const {entry} of russianPack4.filter(x=>x.exam==="ЕГЭ"&&x.entry.number===4)){
  const selected=[];
  for(const m of entry.prompt.matchAll(/^([1-5])\) (.+)$/gm)){
   const expected=accents.get(m[2].toLocaleLowerCase("ru").replace(/ё/g,"е"));assert(expected,m[2]);
   if(m[2]===expected)selected.push(m[1]);
  }assert.equal(entry.answer,selected.join(""),entry.slug);
 }
});
test("pack 4: 23 original passages, references and lexical answers are complete",()=>{
 const passages=new Map();
 for(const{entry}of russianPack4){
  if(entry.passage){
   const p=entry.passage;assert(p.sentences.length>=4);assert(entry.references.length>0);
   for(const n of entry.references)assert(n>0&&n<=p.sentences.length,entry.slug);
   if(passages.has(p.id))assert.deepEqual(passages.get(p.id),p.sentences);passages.set(p.id,p.sentences);
   if((entry.number===12||entry.number===25)&&entry.mode==="word"){
    const words=entry.references.map(n=>p.sentences[n-1]).join(" ").toLocaleLowerCase("ru").replace(/[^а-яё]/g,"");
    assert(words.includes(entry.answer),entry.slug);
   }
  }
  if(/позици/i.test(entry.prompt))for(const d of entry.answer)assert(entry.prompt.includes(`(${d})`),entry.slug);
 }
 assert.equal(passages.size,23);assert.equal(new Set([...passages.values()].map(s=>s.join(" "))).size,23);
 const old=createContentLoader({revision:"8b407d7"})("src/lib/content/russian-bank.ts").russianTasks;
 const previousTexts=new Set(old.filter(t=>t.sharedConditionId).map(t=>t.sharedConditionId));
 for(const id of passages.keys())assert(!previousTexts.has(id),id);
});
test("pack 4: all 628 previous tasks and old attempt survive append/reload",()=>{
 const oldLoad=createContentLoader({revision:"8b407d7"});const before=oldLoad("src/lib/content/russian-bank.ts").russianTasks;
 const substantive=t=>Object.fromEntries(Object.entries(t).filter(([key])=>key!=="publication"));
 assert.equal(before.length,628);assert.deepEqual(russianTasks.slice(0,628).map(substantive),before.map(substantive));
 // These two minimal phrase formats must not repeat an already published correction/transformation.
 for(const n of russianTasks.slice(628).filter(t=>t.examType[0]==="ОГЭ"&&[8,9].includes(t.examNumber)))
  assert(!before.some(t=>t.examType[0]==="ОГЭ"&&t.examNumber===n.examNumber&&t.answerDisplay===n.answerDisplay),n.id);
 const oldPractice=oldLoad("src/lib/practice.ts");
 const selection=oldPractice.normalizeCatalogSelection({exam:"ОГЭ",subjectId:"russian",mode:"number",examNumber:8});
 const saved=oldPractice.createPracticeSession("pre-pack4",selection);saved.lastPosition=20;saved.lastTaskId=saved.taskIds[20];
 assert.equal(saved.taskIds.length,28);const answerState={...oldPractice.emptyTaskState(),answer:"уха",attempt:{id:"pre-pack4-attempt",correct:false}};
 const raw=oldLoad("src/lib/practice-storage.ts").serializeStoredPractice({version:2,catalog:selection,activeId:saved.id,sessions:{[saved.id]:saved},taskStates:{[saved.lastTaskId]:answerState}});
 const restored=load("src/lib/practice-storage.ts").parseStoredPractice(raw);
 assert.equal(restored.activeId,saved.id);assert.equal(restored.sessions[saved.id].lastTaskId,saved.lastTaskId);
 assert.equal(restored.sessions[saved.id].taskIds.length,41);assert.deepEqual(restored.sessions[saved.id].taskIds.slice(0,28),saved.taskIds);
 assert.equal(restored.taskStates[saved.lastTaskId].attempt.id,"pre-pack4-attempt");
});
test("pack 4: optional ё/е equivalence is scoped, other answer rules unchanged",()=>{
 const task=russianTasks.find(t=>t.id.includes("-p4-norm-possessive-"));
 assert.equal(checkTaskAnswer("ЕЕ",task.answerRule).correct,true);
 assert.equal(checkTaskAnswer("её",task.answerRule).correct,true);
 assert.equal(checkTaskAnswer("его",task.answerRule).correct,false);
 assert.equal(checkTaskAnswer("ее",{type:"text",value:"её",caseInsensitive:true}).correct,false);
 for(const t of russianTasks.filter(t=>t.id.includes("-p4-")&&t.answerRule.yoEquivalent))
  assert.equal(checkTaskAnswer(t.answerDisplay.replace(/ё/g,"е"),t.answerRule).correct,true,t.id);
 assert(!russianTasks.slice(0,628).some(t=>t.answerRule.yoEquivalent));
});
