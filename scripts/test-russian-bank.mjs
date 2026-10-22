import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createContentLoader, loadContent } from "./content-source-loader.mjs";
import { createComponentLoader } from "./component-source-loader.mjs";
import { contentReviewIssues } from "./content-review-evidence.mjs";
import "./russian-pack2-review.mjs";

const load=createContentLoader();
const {russianTasks}=load("src/lib/content/russian-bank.ts");
const {ogeRussianEntries}=load("src/lib/content/russian-oge.ts");
const {egeRussianEntries}=load("src/lib/content/russian-ege.ts");
const {russianModels}=load("src/lib/content/russian-model.ts");
const {practiceBank,tasks,checkTaskAnswer,getPracticeTasks}=load("src/lib/tasks.ts");
const {getPublicationDecision}=load("src/lib/content-publication.ts");
const {normalizeCatalogSelection,createPracticeSession,emptyTaskState}=load("src/lib/practice.ts");
const {parseStoredPractice,serializeStoredPractice}=load("src/lib/practice-storage.ts");
const {parseStudyRoute}=load("src/lib/navigation.ts");

// Separate, explicitly reviewed answer sheet; never generated from task.answerRule.
// This is an author's review, not independent expert/FIPI certification.
const reviewed={
  ОГЭ:{2:["135","134","134","123"],3:["125","123","124","123"],4:["123","123","123","123"],5:["123","124","123","12"],6:["135","134","123","134"],7:["135","135","235","1235"],8:["полотенец","обоим","богаче","сапог"],9:["шальмамы","сумкаизкожи","говорилвзволнованно","маминголос"],10:["135","134","134","135"],11:["4","3","3","3"],12:["потупилась","мигом","радушно","водитьзанос"]},
  ЕГЭ:{1:["но","сколько"],2:["1345","124"],3:["135","135"],4:["134","234"],5:["надеть","эффективным"],6:["свободная","обратно"],7:["лягте","яблок"],8:["12345","21435"],9:["134","134"],10:["124","124"],11:["123","124"],12:["124","123"],13:["123","125"],14:["134","123"],15:["13","23"],16:["234","134"],17:["123456","123"],18:["1234","345"],19:["123","14"],20:["123","13"],21:["13","135"],22:["12345","35124"],23:["135","134"],24:["124","123"],25:["непокладаярук","раздражение"],26:["5","5"]},
};

test("Russian bank has 154/208 complete original tasks and all 37 short-answer slots",()=>{
  assert.equal(russianTasks.length,362);assert.equal(ogeRussianEntries.length,44);assert.equal(egeRussianEntries.length,52);
  assert.equal(new Set(russianTasks.map(task=>task.id)).size,362);
  assert.equal(new Set(russianTasks.map(task=>task.prompt.normalize("NFC").replace(/\s+/g," ").trim())).size,362);
  for(const exam of ["ОГЭ","ЕГЭ"]){
    const model=russianModels.find(item=>item.examType===exam);
    assert.equal(model.numbers.length,exam==="ОГЭ"?13:27);
    for(const slot of model.numbers){
      const bank=getPracticeTasks({examType:exam,subjectId:"russian",examNumber:slot.number});
      if(slot.answerFormat==="extended"){assert.equal(bank.length,0);assert(slot.pendingReason);continue;}
      assert.equal(bank.length,exam==="ОГЭ"?14:8,`${exam}#${slot.number}`);
      for(const task of bank){assert.equal(task.part,slot.part);assert.equal(task.scoring.maxPrimaryScore,slot.maxPrimaryScore);}
    }
  }
  const oge=russianModels[0];assert.deepEqual([...new Set(oge.numbers.map(slot=>slot.part))],[1,2,3]);
  assert.equal(oge.numbers.reduce((sum,slot)=>sum+slot.maxPrimaryScore,0)+13,38);
  assert.equal(russianModels[1].numbers.reduce((sum,slot)=>sum+slot.maxPrimaryScore,0),50);
  for(const task of russianTasks){
    assert(task.prompt.length>90);assert(task.solution[0].text.length>80,task.id);
    assert.equal(task.requirementsReference.year,2027);assert.equal(task.provenance.source_type,"original");
    assert.equal(getPublicationDecision(task.publication).allowed,true,task.id);
  }
});

test("separate answer review accepts all keys and rejects genuinely changed answers",()=>{
  for(const exam of ["ОГЭ","ЕГЭ"])for(const[number,answers]of Object.entries(reviewed[exam])){
    const bank=russianTasks.filter(task=>task.examType[0]===exam&&task.examNumber===Number(number));
    answers.forEach((expected,index)=>{
      const task=bank[index];assert.equal(task.answerDisplay,expected,task.id);
      assert.equal(checkTaskAnswer(expected,task.answerRule).correct,true,task.id);
      assert.equal(checkTaskAnswer(expected+"9",task.answerRule).correct,false,task.id);
      if(task.answerRule.type==="text")assert.equal(checkTaskAnswer(expected.toLocaleUpperCase("ru"),task.answerRule).correct,true);
      else if(!task.answerRule.ordered)assert.equal(checkTaskAnswer([...expected].reverse().join(""),task.answerRule).correct,true);
    });
  }
});

// Independently filled spellings allow reconstruction of every spelling-row key.
const spelling={
  "roots-e":[["лесной","берега","земляной"],["растение","касаться","загорелый"],["примерять платье","замереть","заблестеть"],["вырос","загорелый","прикосновение"],["собирать","блистать","замереть"]],
  "roots-a":[["предлагать","касаться","растение"],["гореть","загар","коснуться"],["примирить друзей","собирать","блистать"],["заря","зарница","озарение"],["вырос","росток","вырастить"]],
  "prefix-sign":[["подъезд","объявление","съёмка"],["беззвучный","разбудить","избежать"],["приехать","приклеить","прекрасный"],["расписать","бесполезный","воспитать"],["съесть","вьюга","объём"]],
  "prefix-meaning":[["пришкольный","приоткрыть","прибрежный"],["преувеличить","прекрасный","преградить"],["подписать","надстроить","отбросить"],["бескрайний","рассказать","испечь"],["объявить","разъяснить","соловьи"]],
  "suffix-check":[["ключик","мячик"],["замочек","орешек"],["заботливый","улыбчивый"],["сонливый","плюшевый"],["грушевый","камышовый"]],
  "suffix-before-vowels":[["преодолевать","продлевать"],["ситцевый","глянцевый"],["тканевый","ключик"],["находчивый","застенчивый"],["орешек","мячик"]],
  "verbs-endings":[["видишь","строишь"],["борешься","стелешь"],["клеящий","тающий"],["держат","слышат"],["пишешь","дышишь"]],
  "participles":[["читаемый","проверяемый"],["строящий","клеящий"],["видимый","слышимый"],["борющийся","зависящий"],["пишущий","дышащий"]],
};
test("orthography row keys are recomputed from explicitly checked complete spellings",()=>{
  for(const[slug,words]of Object.entries(spelling)){
    const entry=egeRussianEntries.find(item=>item.slug===slug);
    const rows=entry.prompt.split("\n").filter(line=>/^[1-5]\) /.test(line));assert.equal(rows.length,5);
    const selected=[];
    rows.forEach((line,i)=>{
      const templates=line.slice(3).split(", ");assert.equal(templates.length,words[i].length);
      const letters=templates.map((template,j)=>{
        const match=template.match(/\((.)\/(.)\)/);assert(match,template);
        const possible=[match[1],match[2]].filter(letter=>template.replace(match[0],letter)===words[i][j]);
        assert.equal(possible.length,1,`${slug}: ${template} -> ${words[i][j]}`);return possible[0];
      });
      if(new Set(letters).size===1)selected.push(i+1);
    });assert.equal(entry.answer,selected.join(""),slug);
  }
});

test("source-text references are complete and all punctuation-position answers point to existing markers",()=>{
  const passages=new Map();
  for(const entry of [...ogeRussianEntries,...egeRussianEntries]){
    if(entry.passage){
      assert(entry.passage.sentences.length>=4);
      if(passages.has(entry.passage.id))assert.deepEqual(passages.get(entry.passage.id),entry.passage.sentences);
      passages.set(entry.passage.id,entry.passage.sentences);
      assert(entry.references.length>0);
      for(const number of entry.references)assert(number>=1&&number<=entry.passage.sentences.length);
    }
    if(/позици|места запятых/.test(entry.prompt)&&!entry.mode){
      const positions=[...entry.prompt.matchAll(/\((\d)\)/g)].map(match=>match[1]);
      if(positions.length)for(const digit of entry.answer)assert(positions.includes(digit),entry.slug);
    }
  }
  assert.equal(passages.size,8);
});

test("choice grading is strict about format, unordered for selections and ordered for correspondence",()=>{
  assert.equal(checkTaskAnswer("531",{type:"choices",value:"135",ordered:false}).correct,true);
  for(const input of ["1135","1,3,5","1 3 5","0","1/3"]){assert.equal(checkTaskAnswer(input,{type:"choices",value:"135",ordered:false}).valid,false,input);}
  assert.equal(checkTaskAnswer("21345",{type:"choices",value:"12345",ordered:true}).correct,false);
  assert.equal(checkTaskAnswer("12345",{type:"choices",value:"12345",ordered:true}).correct,true);
  assert.equal(checkTaskAnswer("0,8",{type:"number",value:"4/5"}).correct,true);
});

test("OGE part two uses the ordinary answer screen and preserves checked answers after reload",()=>{
  const selection=normalizeCatalogSelection({exam:"ОГЭ",subjectId:"russian",mode:"number",examNumber:8});
  assert.equal(selection.part,2);
  const task=getPracticeTasks({examType:"ОГЭ",subjectId:"russian",examNumber:8})[0];
  const session=createPracticeSession("russian-restore",selection,task.id);
  session.states[task.id]={...emptyTaskState(),answer:"полотенец",attempt:{id:"russian-check",correct:true}};
  const restored=parseStoredPractice(serializeStoredPractice({version:2,catalog:selection,activeId:session.id,sessions:{[session.id]:session},taskStates:session.states}));
  assert.equal(restored.taskStates[task.id].attempt.id,"russian-check");
  assert.equal(restored.taskStates[task.id].answer,"полотенец");
  const {TaskScreen}=createComponentLoader()("src/components/task-screen.tsx");
  const html=renderToStaticMarkup(createElement(TaskScreen,{task,exam:"ОГЭ",examNumber:8,value:emptyTaskState(),onChange(){},onAnswer(){},onSolutionViewed(){},onNext(){},onPrevious(){},onBack(){},canNext:true,canPrevious:false}));
  assert.match(html,/id="task-answer"/);assert.doesNotMatch(html,/Твоё развёрнутое решение/);
  assert.equal(parseStudyRoute("#/catalog?exam=ОГЭ&subject=russian&part=3",practiceBank.length).invalidContext,false);
  assert.equal(parseStudyRoute("#/catalog?exam=ОГЭ&subject=math&part=3",practiceBank.length).invalidContext,true);
});

test("all previously shipped mathematics and other subjects are byte-for-byte equivalent as data",()=>{
  const before=loadContent({revision:"1512d1b"});
  assert.deepEqual(practiceBank.filter(task=>task.subjectId!=="russian"),before.practiceBank);
  assert.deepEqual(tasks,before.tasks);
});

test("Russian publication uses a frozen answer/content snapshot and rejects unreviewed edits",()=>{
  const manifest=JSON.parse(readFileSync(new URL("../docs/russian-content-review.json",import.meta.url),"utf8"));
  assert.deepEqual(contentReviewIssues({tasks:russianTasks,theoryTopics:[]},manifest),[]);
  const changed=structuredClone(russianTasks);changed[0].answerRule.value="9";
  assert(contentReviewIssues({tasks:changed,theoryTopics:[]},manifest).some(issue=>issue.startsWith("stale content review:")));
});
