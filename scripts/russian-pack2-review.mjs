import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader } from "./content-source-loader.mjs";

const load=createContentLoader();
const {russianPack2}=load("src/lib/content/russian-pack2.ts");
const {russianTasks}=load("src/lib/content/russian-bank.ts");
const {spellingExercises}=load("src/lib/content/russian-pack2-ege-spelling.ts");
const {checkTaskAnswer}=load("src/lib/tasks.ts");

// Explicit author review sheet, separate from task answerRule and formatting helpers.
// Complex interpretations have author review, not independent expert certification.
const reviewed={
  ОГЭ:{
    2:["134","124","123","124","1234","1234","1245","124","1234","1234"],
    3:["134","235","123","145","245","134","125","234","135","245"],
    4:["312","321","412","421","231","521","312","432","521","241"],
    5:["123","123","123","123","123","12345","1234","1234","2","1234"],
    6:["124","123","123","123","124","124","123","124","123","123"],
    7:["1234","1345","46","1345","12","12","123","235","13","1245"],
    8:["носков","чулок","помидоров","обеих","пятьюстами","семистам","инженеры","положи","слаще","красивее"],
    9:["стенаизкамня","следволка","летняяночь","действовалбесстрашно","улыбнулсярадостно","садшколы","лисьянора","кольцоизмеди","говорилтихимголосом","зимнееутро"],
    10:["135","124","235","145","134","245","123","234","125","345"],
    11:["3","2","4","3","4","3","4","2","3","2"],
    12:["бережно","душаушлавпятки","напрасным","сообща","поспешно","искренний","затаивдыхание","суеты","тщательно","наблюдательность"],
  },
  ЕГЭ:{
    1:["тем","где","есть","какая","а","чтобы"],
    2:["1245","124","1245","1245","1235","1234"],
    3:["134","124","124","123","124","123"],
    4:["1234","1345","2345","1345","2345","1235"],
    5:["экономические","представить","глиняный","гуманного","заплатить","длинный"],
    6:["главная","впервые","цен","совместное","вверх","собственную"],
    7:["директора","их","клади","обоим","тремястами","красивый"],
    8:["24153","31524","24513","35124","45312","41235"],
    9:["135","12","1235","124","34","134"],
    10:["124","124","124","134","124","1245"],
    11:["124","245","1235","1234","1235","135"],
    12:["1235","1345","1345","1245","124","124"],
    13:["123","245","125","124","124","125"],
    14:["134","145","124","134","135","124"],
    15:["12","23","12","3","24","124"],
    16:["123","234","235","13","245","135"],
    17:["123","1234","123","234","34","123"],
    18:["1234","134","345","1234","12345","12"],
    19:["123","14","12","123","123","34"],
    20:["1234","13","1234","13","1234","1234"],
    21:["135","235","125","123","345","145"],
    22:["34215","54321","51423","53142","24315","31254"],
    23:["134","235","124","245","135","234"],
    24:["123","145","234","125","134","245"],
    25:["подробно","стыдиться","честность","скука","досадой","спустярукава"],
    26:["3","2","3","5","5","4"],
  },
};

test("pack 2: 266 authored entries, uniform 10/6 expansion and independently reviewed keys",()=>{
  assert.equal(russianPack2.length,266);
  const added=russianTasks.filter(task=>task.id.includes("-p2-"));
  assert.equal(added.length,266);
  for(const[exam,numbers]of Object.entries(reviewed))for(const[number,keys]of Object.entries(numbers)){
    const entries=russianPack2.filter(item=>item.exam===exam&&item.entry.number===Number(number)).map(item=>item.entry);
    assert.equal(entries.length,exam==="ОГЭ"?10:6,`${exam} №${number}`);
    assert.deepEqual(entries.map(entry=>entry.answer),keys,`${exam} №${number}`);
  }
  for(const task of added){
    assert.equal(checkTaskAnswer(task.answerDisplay,task.answerRule).correct,true,task.id);
    assert.equal(checkTaskAnswer(task.answerDisplay+"9",task.answerRule).correct,false,task.id);
    if(task.answerRule.type==="choices"&&task.answerRule.ordered)assert.equal(new Set(task.answerDisplay).size,task.answerDisplay.length,task.id);
  }
});

const filled={
  "village-e":["Е","В деревне зазеленели большие берёзы."],
  "morning-i":["И","Тихим утром лесник принёс сирени и поставил её в вазу."],
  "shore-a":["А","На берегу росли камыши и зелёная трава."],
  "snow-o":["О","На пороге лежал снег, а за окном горел фонарь."],
  "plant-a":["А","Садовник вырастил росток и прикоснулся к зелёным листьям."],
  "collect-i":["И","Мы собирали ягоды, замирали у ручья и любовались блестевшей водой."],
  "conjugation-i":["И","Ты видишь тропу, слышишь птиц, держишь компас и пишешь заметки."],
  "prefix-e":["Е","Мы прибыли на прекрасный берег и приклеили к карте отметку."],
  "suffix-i":["И","На столе лежали ключик, замочек, мячик и орешек."],
  "forest-e":["Е","В лесу темнело, свистел ветер и блестели капли."],
};
test("pack 2: all OGE missing-letter keys reconstructed from separately filled sentences",()=>{
  for(const[slug,[letter,sentence]]of Object.entries(filled)){
    const entry=russianPack2.find(({exam,entry})=>exam==="ОГЭ"&&entry.slug===`p2-${slug}`).entry;
    const mask=entry.prompt.split("\n")[1];
    const numbers=[...mask.matchAll(/\((\d)\)/g)].map(match=>match[1]);
    const pattern=mask.replace(/[.*+?^${}|[\]\\]/g,"\\$&").replace(/\(\d\)/g,"(.)");
    const match=sentence.match(new RegExp("^"+pattern+"$"));assert(match,slug);
    assert.equal(numbers.filter((_,i)=>match[i+1].toLocaleUpperCase("ru")===letter).join(""),entry.answer,slug);
  }
});

const stress=new Map([
  "баловАть","бАнты","включИт","красИвее","тОртов","облегчИть","прИнял","принялА","нАчали","цепОчка",
  "срЕдства","шАрфы","жалюзИ","занятА","свЁкла","слИвовый","звонИшь","договОр","киломЕтр","щавЕль","столЯр",
  "экспЕрт","аэропОрты","бухгАлтеры","оптОвый","кУхонный",
].map(word=>[word.toLocaleLowerCase("ru"),word]));
test("pack 2: stress selection keys reconstructed from the explicit normative word list",()=>{
  for(const {exam,entry}of russianPack2.filter(item=>item.exam==="ЕГЭ"&&item.entry.number===4)){
    const candidates=entry.prompt.split("\n").slice(1).map(line=>line.slice(3));
    assert.equal(candidates.length,5,exam);
    const key=candidates.flatMap((word,i)=>{const norm=stress.get(word.toLocaleLowerCase("ru"));assert(norm,word);return norm===word?[i+1]:[];}).join("");
    assert.equal(entry.answer,key,entry.slug);
  }
});

test("pack 2: all EGE spelling masks insert one letter and match the reviewed numeric sheet",()=>{
  assert.equal(spellingExercises.length,24);
  const seen=new Set();
  for(const exercise of spellingExercises){
    const rows=exercise.rows.map(row=>row.map(([mask,word])=>{
      assert.equal(mask.split("_").length,2);const hole=mask.indexOf("_");
      const letter=word[hole];assert.equal(mask.replace("_",letter),word,mask);return letter;
    }));
    const key=rows.flatMap((letters,i)=>letters.every(letter=>letter===letters[0])?[i+1]:[]).join("");
    const entry=russianPack2.find(item=>item.entry.slug===`p2-${exercise.slug}`).entry;
    assert.equal(entry.answer,key,exercise.slug);
    const signature=exercise.rows.map(row=>row.map(([,word])=>word).sort().join("|")).sort().join("/");
    assert(!seen.has(signature),exercise.slug);seen.add(signature);
  }
});

test("pack 2: 22 distinct complete source texts, bounded references, extractable lexical answers and punctuation positions",()=>{
  const passages=new Map();
  for(const {entry,exam}of russianPack2){
    if(entry.passage){
      const {id,sentences}=entry.passage;
      assert(sentences.length>=4);assert(sentences.join(" ").length>=300,id);
      assert(entry.references?.length);
      for(const ref of entry.references)assert(ref>=1&&ref<=sentences.length,id);
      if(passages.has(id))assert.deepEqual(passages.get(id),sentences);passages.set(id,sentences);
      if(entry.number===(exam==="ОГЭ"?12:25)){
        const text=entry.references.map(ref=>sentences[ref-1]).join(" ").toLocaleLowerCase("ru").replace(/[^\p{L}]/gu,"");
        assert(text.includes(entry.answer),entry.slug);
      }
    }
    if(entry.mode!=="word"&&entry.mode!=="ordered"){
      const markers=[...entry.prompt.matchAll(/\((\d)\)/g)].map(match=>match[1]);
      if(markers.length&&/позиц/i.test(entry.prompt)){assert.equal(new Set(markers).size,markers.length,entry.slug);for(const n of entry.answer)assert(markers.includes(n),entry.slug);}
      const options=[...entry.prompt.matchAll(/^([1-9])\) /gm)].map(match=>match[1]);
      if(options.length)for(const n of entry.answer)assert(options.includes(n),entry.slug);
    }
  }
  assert.equal(passages.size,22);
  assert.equal(new Set([...passages.values()].map(sentences=>sentences.join(" "))).size,22);
});

test("pack 2: all original 96 Russian entries and their indices survive unchanged",()=>{
  const old=createContentLoader({revision:"1af3ba9"})("src/lib/content/russian-bank.ts").russianTasks;
  const substantive=task=>Object.fromEntries(Object.entries(task).filter(([key])=>key!=="publication"));
  assert.deepEqual(russianTasks.slice(0,old.length).map(substantive),old.map(substantive));
});
