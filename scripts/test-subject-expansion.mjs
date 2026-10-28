import assert from "node:assert/strict";
import test from "node:test";
import { contentReviewIssues } from "./content-review-evidence.mjs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createContentLoader } from "./content-source-loader.mjs";
import { createComponentLoader } from "./component-source-loader.mjs";

const load = createContentLoader();

test("subject content passes the same publication and frozen review gates as mathematics", () => {
  const { informaticsTasks } = load("src/lib/content/informatics-bank.ts");
  const { getPublicationDecision } = load("src/lib/content-publication.ts");
  for (const task of informaticsTasks) assert.equal(getPublicationDecision(task.publication).allowed, true, task.id);
  assert.deepEqual(contentReviewIssues({ tasks: informaticsTasks, theoryTopics: [] }), []);
});
const { getSubjects } = load("src/lib/subjects.ts");
const { subjectExamDefinitions } = load("src/lib/subject-models.ts");
const { informaticsTasks } = load("src/lib/content/informatics-bank.ts");
const { tasks, practiceBank, getPracticeTasks, checkTaskAnswer } = load("src/lib/tasks.ts");
const { normalizeCatalogSelection, createPracticeSession } = load("src/lib/practice.ts");
const { parseStudyRoute } = load("src/lib/navigation.ts");
const { parseStoredPractice, serializeStoredPractice } = load("src/lib/practice-storage.ts");

test("All requested subjects are unique and Chinese is EGE-only; math bank remains separate", () => {
  assert.equal(getSubjects("ОГЭ").length, 14);
  assert.equal(getSubjects("ЕГЭ").length, 15);
  assert(!getSubjects("ОГЭ").some(([id]) => id === "chinese"));
  for (const exam of ["ОГЭ", "ЕГЭ"]) assert.equal(new Set(getSubjects(exam).map(([id]) => id)).size, getSubjects(exam).length);
  assert.equal(tasks.length, 881);
  assert(tasks.every((task) => task.subjectId === "math"));
  assert.deepEqual(practiceBank.slice(0, tasks.length), tasks);
});

test("Source-reviewed informatics models cover 16/27 slots and explicitly list every unfinished resource", () => {
  assert.equal(informaticsTasks.length, 31);
  assert.equal(new Set(practiceBank.map((task) => task.id)).size, practiceBank.length);
  for (const model of subjectExamDefinitions.filter(model => model.subjectId === "informatics")) {
    assert.equal(model.year, 2027);
    assert.equal(model.verificationStatus, "draft-source-reviewed");
    assert.equal(model.numbers.length, model.examType === "ОГЭ" ? 16 : 27);
    assert.equal(model.numbers.reduce((sum, slot) => sum + slot.maxPrimaryScore, 0), model.examType === "ОГЭ" ? 21 : 29);
    for (const slot of model.numbers) {
      assert(slot.sourceReference.url.endsWith(".pdf"));
      assert(slot.sourceReference.pdfPage >= 7);
      const pool = getPracticeTasks({ examType: model.examType, subjectId: model.subjectId, examNumber: slot.number });
      if (!pool.length) { assert(slot.pendingReason, `${model.id}#${slot.number}: silent gap`); continue; }
      assert.equal(pool.length, 1);
      const task = pool[0];
      assert.equal(task.part, slot.part); assert.equal(task.scoring.maxPrimaryScore, slot.maxPrimaryScore);
      assert.equal(task.examVersionId, model.versionId); assert.equal(task.level, null);
      assert(task.prompt.length > 50 && task.solution[0].text.length > 35);
      assert.equal(task.provenance.creation_method, "original-individual-task");
    }
  }
});

test("All 31 original answers agree with independent execution, counting and graph calculations", () => {
  const paths = (edges, node, destination) => node === destination ? 1 : (edges[node] ?? []).reduce((sum, next) => sum + paths(edges, next, destination), 0);
  const dijkstra = (edges, start, end) => {
    const dist = { [start]: 0 }, queue = [[0, start]];
    while (queue.length) {
      queue.sort((a, b) => b[0] - a[0]); const [d, node] = queue.pop();
      if (node === end) return d;
      for (const [next, cost] of edges[node] ?? []) if (dist[next] === undefined || d + cost < dist[next]) { dist[next] = d + cost; queue.push([d + cost, next]); }
    }
  };
  const decimalGraph = { a: [["b", 4], ["c", 9]], b: [["a", 4], ["c", 2], ["d", 8]], c: [["a", 9], ["b", 2], ["d", 3]], d: [["b", 8], ["c", 3]] };
  const valueGraph = { a: [["b", 3], ["c", 8]], b: [["a", 3], ["c", 2], ["d", 9]], c: [["a", 8], ["b", 2], ["d", 4], ["e", 10]], d: [["b", 9], ["c", 4], ["e", 1]] };
  let a = 2, b = 5; while (a < 20) { a += b; b++; }
  const decode = (bits) => { let result = ""; while (bits) { const key = bits[0] === "0" ? "0" : bits.slice(0, 2); result += ({ 0: "А", 10: "Б", 11: "В" })[key]; bits = bits.slice(key.length); } return result; };
  const ogeExpected = { 1: 1024 * 16 / 8, 2: decode("010110"), 3: Array.from({length:30}, (_,i)=>i-10).find(x=>!(x<7)&&x<12), 4: dijkstra(decimalGraph,"a","d"), 5: ((1+2)*3)+2, 6:a, 7:"1234567", 8:900+800-350, 9: paths({a:["b","c"],b:["d","e"],c:["d"],d:["f"],e:["f"]},"a","f"), 10:parseInt("110101",2) };
  const words = [];
  for (const x of "АБВГД") for (const y of "АБВГД") for (const z of "АБВГД") for (const w of "АБВГД") if ([x,y,z,w].filter(v=>v==="А").length===1) words.push(x+y+z+w);
  let binary=(5).toString(2); for(let i=0;i<2;i++) binary += [...binary].filter(v=>v==="1").length%2;
  let editor="2".repeat(10); while(editor.includes("222")) editor=editor.replace("222","5");
  const f=[0,1]; for(let i=2;i<=7;i++)f[i]=f[i-1]+2*f[i-2];
  const algorithmPaths=(x)=>x===11?1:x>11?0:algorithmPaths(x+1)+algorithmPaths(x*2);
  const truth=[];for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)if((x&&!y)||z)truth.push([x,y,z]);
  const validA=[];for(let A=0;A<=15;A++)if(Array.from({length:16},(_,x)=>x).every(x=>(x&13)!==0||(x&A)===0))validA.push(A);
  const moves=(s)=>[s+1,s*2], win1=(s)=>moves(s).some(n=>n>=21);
  const lose1=(s)=>!win1(s)&&moves(s).every(win1);
  const win2=(s)=>!win1(s)&&moves(s).some(lose1);
  const starts=Array.from({length:20},(_,i)=>i+1);
  const n19=starts.find(s=>!win1(s)&&moves(s).some(n=>n<21&&win1(n)));
  const n20=starts.filter(win2).join(" ");
  const n21=starts.filter(s=>!win1(s)&&moves(s).every(n=>win1(n)||win2(n))&&!moves(s).every(win1));
  assert.equal(n21.length,1);
  let divisorAnswer=101;const divisors=n=>Array.from({length:n},(_,i)=>i+1).filter(d=>n%d===0).length;while(divisors(divisorAnswer)!==6)divisorAnswer++;
  const egeExpected={1:dijkstra(valueGraph,"a","e"),2:truth.length,4:2,5:parseInt(binary,2),6:3*2,7:128*64*5/8/1024,8:words.length,10:2**(32-28),11:12*Math.ceil(Math.log2(33))*1024/8/1024,12:[...editor].reduce((s,d)=>s+Number(d),0),13:algorithmPaths(3),14:[...(3**8+3**5+2).toString(3)].filter(x=>x==="0").length,15:Math.max(...validA),16:f[7],19:n19,20:n20,21:n21[0],23:paths({a:["b","c"],b:["d"],c:["d"]},"a","d"),25:divisorAnswer};
  for (const task of informaticsTasks) {
    let expected = (task.examType[0] === "ОГЭ" ? ogeExpected : egeExpected)[task.examNumber];
    if(task.examType[0]==="ОГЭ"&&task.examNumber===11)expected=task.resources[0].content.toLocaleLowerCase("ru").split(/[^\p{L}]+/u).filter(word=>word==="мост").length;
    if(task.examType[0]==="ОГЭ"&&task.examNumber===12)expected=task.resources.filter(r=>r.name.endsWith(".txt")&&new TextEncoder().encode(r.content).length>10).length;
    assert.notEqual(expected,undefined,task.id);
    assert.equal(checkTaskAnswer(String(expected),task.answerRule).correct,true,task.id);
    assert.equal(checkTaskAnswer(`${expected}999`,task.answerRule).correct,false,task.id);
  }
});

test("Subject routes, isolated sessions, answers and position survive the existing storage schema", () => {
  const selection=normalizeCatalogSelection({exam:"ЕГЭ",subjectId:"informatics",mode:"number",examNumber:20,level:"profile"});
  assert.equal(selection.level,undefined);
  const task=getPracticeTasks({examType:"ЕГЭ",subjectId:"informatics",examNumber:20})[0];
  const session=createPracticeSession("informatics-session",selection,task.id);
  session.states[task.id]={answer:"5 9",validationMessage:"",attempt:{id:"subject-answer",correct:true},solutionVisible:true,solutionViewed:true};
  const raw=serializeStoredPractice({version:2,catalog:selection,activeId:session.id,sessions:{[session.id]:session},taskStates:session.states});
  const restored=parseStoredPractice(raw);
  assert.equal(restored.catalog.subjectId,"informatics");
  assert.equal(restored.taskStates[task.id].attempt.correct,true);
  assert.equal(restored.sessions[session.id].taskIds[0],task.id);
  assert.equal(parseStudyRoute("#/catalog?exam=ЕГЭ&subject=informatics",practiceBank.length).invalidContext,false);
  assert.equal(parseStudyRoute("#/catalog?exam=ОГЭ&subject=chinese",practiceBank.length).invalidContext,true);
  assert.deepEqual(getPracticeTasks({examType:"ОГЭ",subjectId:"biology"}),[]);
});

test("Existing catalogue and task components render subjects, pending resources and real downloadable material", () => {
  const components=createComponentLoader();
  const {CatalogScreen}=components("src/components/screens/catalog-screen.tsx");
  const {TaskScreen}=components("src/components/task-screen.tsx");
  const noop=()=>{};const game=components("src/lib/gamification.ts").getGameSummary(components("src/lib/learning-events.ts").emptyLearningState.game);
  for(const exam of ["ОГЭ","ЕГЭ"]){
    const html=renderToStaticMarkup(createElement(CatalogScreen,{selection:{exam,subjectId:"informatics",mode:"number"},onChange:noop,onStart:noop,onTheory:noop,game}));
    assert.equal((html.match(/class="feature-card /g)||[]).length,exam==="ОГЭ"?6:3);
    assert.equal((html.match(/data-catalog-number=/g)||[]).length,exam==="ОГЭ"?16:27);
    assert.doesNotMatch(html,/class="variant-launch-card"|catalog-level-switch/);
    assert.match(html,/disabled=""/);
  }
  const task=informaticsTasks.find(t=>t.examType[0]==="ОГЭ"&&t.examNumber===11);
  const html=renderToStaticMarkup(createElement(TaskScreen,{task,exam:"ОГЭ",examNumber:11,topicTitle:task.title,value:{answer:"",attempt:null},onChange:noop,onAnswer:noop,onSolutionViewed:noop,onNext:noop,onPrevious:noop,onBack:noop,canNext:false,canPrevious:false}));
  assert.match(html,/Информатика/);assert.match(html,/download="notes.txt"/);assert.match(html,/data:text\/plain/);assert.doesNotMatch(html,/ОГЭ · Математика/);
});
