import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createContentLoader } from "./content-source-loader.mjs";
import { createComponentLoader } from "./component-source-loader.mjs";
import { contentReviewIssues } from "./content-review-evidence.mjs";

const load = createContentLoader();
const { subjectTheoryTopics } = load("src/lib/content/subject-theory.ts");
const { physicsTasks } = load("src/lib/content/physics-bank.ts");
const { practiceBank, tasks, getPracticeTasks, checkTaskAnswer } = load("src/lib/tasks.ts");
const { theoryTopics, allTheoryTopics, getTheoryTopic } = load("src/lib/theory.ts");
const { subjectExamDefinitions } = load("src/lib/subject-models.ts");
const { getPublicationDecision, } = load("src/lib/content-publication.ts");
const nonMath = practiceBank.filter(task => task.subjectId !== "math");

test("subject release keeps mathematics intact and validates every new resource and review fingerprint", () => {
  assert.equal(tasks.length, 881); assert.equal(theoryTopics.length, 73);
  assert.equal(nonMath.length, 35); assert.equal(subjectTheoryTopics.length, 35);
  assert.equal(allTheoryTopics.length, 108);
  const manifest = JSON.parse(readFileSync(new URL("../docs/subject-content-review.json", import.meta.url), "utf8"));
  assert.deepEqual(contentReviewIssues({ tasks: nonMath, theoryTopics: subjectTheoryTopics }, manifest), []);
  for (const item of [...nonMath, ...subjectTheoryTopics]) assert.equal(getPublicationDecision(item.publication).allowed, true, item.id);
  const mutated = structuredClone(subjectTheoryTopics); mutated[0].examples[0].answer = "wrong";
  assert(contentReviewIssues({ tasks: nonMath, theoryTopics: mutated }, manifest).some(issue => issue.startsWith("stale content review:")));
  assert.equal(new Set(allTheoryTopics.map(topic => topic.id)).size, 108);
  for (const topic of subjectTheoryTopics) {
    assert(topic.sections[0].body.join(" ").length > 100, topic.id);
    assert(topic.sections[1].body.join(" ").length > 60, topic.id);
    assert(topic.examples.length >= 1 && topic.examples[0].steps.length >= 2, topic.id);
    assert(topic.difficulties.length >= 2, topic.id);
    assert.equal(topic.requirementsReference.year, 2027);
    assert.equal(topic.requirementsReference.status, "draft-copy-reviewed");
    assert.equal(getTheoryTopic(topic.id).materialId, topic.materialId);
    const pool = getPracticeTasks({ examType: topic.examType[0], subjectId: topic.subjectId, examNumber: topic.examNumbers[0] });
    assert(pool.some(task => task.topicId === topic.id), topic.id);
  }
});

test("physics model and four unique numerical tasks follow the reviewed project, not an invented scale", () => {
  const model = subjectExamDefinitions.find(exam => exam.subjectId === "physics");
  assert.equal(model.year, 2027); assert.equal(model.numbers.length, 26);
  assert.equal(model.numbers.reduce((sum, slot) => sum + slot.maxPrimaryScore, 0), 45);
  assert.equal(model.numbers.filter(slot => slot.part === 1).length, 20);
  assert.equal(model.numbers.filter(slot => slot.pendingReason).length, 22);
  const independent = [7 + (-4)*3 + (2/2)*3**2, (27-9)/6, (2*5+3*(-1))/(2+3), (18*.4)/12];
  physicsTasks.forEach((task, i) => {
    assert.equal(checkTaskAnswer(String(independent[i]), task.answerRule).correct, true, task.id);
    assert.equal(checkTaskAnswer(String(independent[i]+1), task.answerRule).correct, false, task.id);
    assert.equal(task.requirementsReference.pdfPage, 2);
    assert.equal(task.examNumber, i+1); assert(task.solution[0].text.length > 100);
  });
  assert.deepEqual(getPracticeTasks({examType:"ОГЭ",subjectId:"physics"}), []);
});

test("all 35 worked examples are independently recomputed, including words, bits, graphs and game quantifiers", () => {
  const topic = (prefix, n) => getTheoryTopic(`${prefix}-n${n}`).examples[0].answer;
  const eq = (prefix,n,answer) => assert.equal(topic(prefix,n),String(answer),`${prefix}#${n}`);
  const og = "oge-informatics", eg = "ege-informatics", ph = "ege-physics";
  eq(og,1,`${240*16/8} байт`);
  const codes={0:"Л",10:"М",11:"Н"};let bits="110100",decoded="";
  while(bits){const code=bits[0]==="0"?"0":bits.slice(0,2);decoded+=codes[code];bits=bits.slice(code.length);}eq(og,2,decoded);
  eq(og,3,Array.from({length:20},(_,i)=>i-5).find(x=>!(x<=4)&&x<9));
  eq(og,4,Math.min(11,6+2));eq(og,5,(25+3)/4);
  let value=1;while(value<10)value=2*value+1;eq(og,6,value);
  eq(og,7,new URL("data/map.txt","https://study.example/").href);
  eq(og,8,70+50-20);
  const paths=(graph,a,b)=>a===b?1:(graph[a]??[]).reduce((sum,next)=>sum+paths(graph,next,b),0);
  eq(og,9,paths({a:["b","c"],b:["g"],c:["g"],g:["d"]},"a","d"));eq(og,10,parseInt("10110",2));
  eq(og,11,"Лес шумит. В лесной тени виден лес".toLowerCase().split(/[^\p{L}]+/u).filter(x=>x==="лес").length);
  eq(og,12,[["a.txt",12],["b.txt",10],["c.csv",30]].filter(([name,size])=>name.endsWith(".txt")&&size>10).length);
  eq(eg,1,Math.min(4+3+2,4+10,12+2));
  let truth=0;for(let x=0;x<2;x++)for(let y=0;y<2;y++)if(!x||y)truth++;eq(eg,2,truth);
  const prefixFree=words=>words.every((word,i)=>words.every((other,j)=>i===j||!other.startsWith(word)));
  assert(prefixFree(["0","10","11"]));assert(!prefixFree(["0","10","1"]));eq(eg,4,"11");
  eq(eg,5,parseInt((6).toString(2)+"10",2));eq(eg,6,(5-1)*(4-1));eq(eg,7,64*32*3/8);
  let words=0;for(const a of "ABC")for(const b of "ABC")for(const c of "ABC")if([a,b,c].filter(x=>x==="A").length===1)words++;eq(eg,8,words);
  eq(eg,10,256-248);eq(eg,11,Math.ceil(5*Math.ceil(Math.log2(17))/8));
  let row="11111";while(row.includes("11"))row=row.replace("11","2");eq(eg,12,[...row].reduce((sum,x)=>sum+Number(x),0));
  const programs=x=>x===5?1:x>5?0:programs(x+1)+programs(x*2);eq(eg,13,programs(2));
  eq(eg,14,[...(3**4+2*3**2+1).toString(3)].filter(x=>x==="0").length);
  eq(eg,15,Array.from({length:12},(_,i)=>i).find(A=>Array.from({length:20},(_,i)=>i-5).every(x=>!(x<5)||x<A)));
  let f=2;for(let n=1;n<=3;n++)f=3*f+1;eq(eg,16,f);
  eq(eg,19,Array.from({length:9},(_,i)=>i+1).filter(s=>[s+1,s+3].some(x=>x>=10)).join(", "));
  const moves=s=>[s+1,s+2],win1=s=>moves(s).some(x=>x>=7),lose1=s=>!win1(s)&&moves(s).every(win1),win2=s=>!win1(s)&&moves(s).some(lose1);
  eq(eg,20,Array.from({length:6},(_,i)=>i+1).filter(win2).join(", "));
  assert(moves(1).every(win2));assert(moves(1).every(s=>!win1(s)));eq(eg,21,"Да, но не всегда первым");
  eq(eg,23,3*2);eq(eg,25,Array.from({length:36},(_,i)=>i+1).filter(x=>36%x===0).length);
  eq(ph,1,`${-2+3*2+2*2**2/2} м`);eq(ph,2,`${(15-7)/4} м/с²`);eq(ph,3,`${(1*6+2*0)/(1+2)} м/с`);
  eq(ph,4,`${String((8*3)/(10*12)).replace(".",",")} м`);
});

test("shared theory UI never mixes subjects and displays source, original example, empty state and subject picker", () => {
  const { TheoryScreen } = createComponentLoader()("src/components/screens/theory-screen.tsx");
  const props={exam:"ЕГЭ",subjectId:"physics",onExamChange(){},onSubjectChange(){},onOpenTopic(){},onOpenMaterial(){},onPractice(){},onBack(){}};
  const catalog=renderToStaticMarkup(createElement(TheoryScreen,props));
  assert.match(catalog,/Физика/);assert.match(catalog,/Координата и проекция скорости/);
  assert.doesNotMatch(catalog,/Обыкновенные дроби|Маска IPv4/);
  const material=renderToStaticMarkup(createElement(TheoryScreen,{...props,topicId:"ege-physics-n1",materialId:"ege-physics-n1-guide"}));
  assert.match(material,/Источник требований/);assert.match(material,/8 м/);assert.match(material,/Физика/);
  const empty=renderToStaticMarkup(createElement(TheoryScreen,{...props,subjectId:"russian"}));
  assert.match(empty,/готовых конспектов пока нет/);assert.doesNotMatch(empty,/Координата и проекция скорости/);
  const wrong=renderToStaticMarkup(createElement(TheoryScreen,{...props,subjectId:"russian",topicId:"ege-physics-n1"}));
  assert.match(wrong,/Материал не найден/);
});
