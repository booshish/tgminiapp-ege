import type { LearningState } from "./learning-events";
import type { PracticeTaskState } from "./practice";
import { checkTaskAnswer, getPracticeBankView } from "./tasks";

export const practiceViewStorageKey="tochka-practice-view-v1";
export const practicePageSize=12;
export type PracticeStatus={kind:"new"|"draft"|"incorrect"|"correct"|"self-assessed";label:string;completed:boolean};
const fresh:PracticeStatus={kind:"new",label:"Не решено",completed:false};

/** Read-only projection of existing verified ledgers. Looking/skipping is never completion. */
export function practiceStatuses(state:LearningState,drafts:Record<string,PracticeTaskState>={}):Map<string,PracticeStatus>{
  const statuses=new Map<string,PracticeStatus>();
  const answer=(id:string,correct:boolean)=>{
    if(statuses.get(id)?.completed&&!correct)return;
    statuses.set(id,{kind:correct?"correct":"incorrect",label:correct?"Решено":"Неверный ответ",completed:correct});
  };
  for(const record of state.legacyRecords)answer(record.taskId,record.correct);
  for(const check of state.game.checks)answer(check.taskId,check.correct);
  for(const event of state.events)if(event.kind==="answer_checked")answer(event.taskId,event.correct);
  const loaded=new Map(getPracticeBankView().map(t=>[t.id,t]));
  for(const [id,draft]of Object.entries(drafts)){
    if(statuses.get(id)?.completed)continue;
    const task=loaded.get(id);
    if(draft.attempt&&task&&task.answerRule.type!=="self"){
      const checked=checkTaskAnswer(draft.answer,task.answerRule);
      if(checked.valid&&checked.correct===draft.attempt.correct)answer(id,checked.correct);
    }
    if(!statuses.has(id)&&(draft.answer||draft.selfWork))statuses.set(id,{kind:"draft",label:"Черновик",completed:false});
  }
  for(const assessment of state.game.xpEvents)if(assessment.kind==="self_assessment"){
    statuses.set(assessment.taskId,{kind:"self-assessed",label:`Самопроверка: ${assessment.score} из ${assessment.scoring.maxPrimaryScore}`,completed:true});
  }
  return statuses;
}
export function practiceStatus(statuses:Map<string,PracticeStatus>,id:string):PracticeStatus{return statuses.get(id)??fresh;}
export function visiblePracticeIds(ids:readonly string[],statuses:Map<string,PracticeStatus>,hideSolved:boolean){
  return ids.filter(id=>!hideSolved||!practiceStatus(statuses,id).completed);
}
export function practicePage(ids:readonly string[],requested:number){
  const page=Math.min(Math.max(0,Math.floor(requested)||0),Math.max(0,Math.ceil(ids.length/practicePageSize)-1));
  return {page,ids:ids.slice(page*practicePageSize,(page+1)*practicePageSize),previous:page>0,next:(page+1)*practicePageSize<ids.length};
}
export type PracticeViewPosition={page:number;top:number;ancestors:number[]};
export type PracticeViewPreferences={version:1;mode:"one"|"feed";hideSolved:boolean;positions:Record<string,PracticeViewPosition>};
export function emptyPracticeView():PracticeViewPreferences{return {version:1,mode:"one",hideSolved:true,positions:{}};}
export function parsePracticeView(raw:string|null):PracticeViewPreferences{
  if(raw===null)return emptyPracticeView();
  if(raw.length>200_000)throw Error("Unsupported practice view settings");
  const value=JSON.parse(raw);
  if(!value||value.version!==1||!value.positions||typeof value.positions!=="object"||Array.isArray(value.positions))throw Error("Unsupported practice view settings");
  const coordinate=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=10_000_000;
  const positions:PracticeViewPreferences["positions"]={};
  for(const [key,p]of Object.entries(value.positions).slice(-50)){
    const position=p as PracticeViewPosition;
    if(key.length>1000||!position||!Number.isInteger(position.page)||position.page<0||position.page>10000||!coordinate(position.top)||!Array.isArray(position.ancestors)||position.ancestors.length>20||!position.ancestors.every(coordinate))continue;
    positions[key]={page:position.page,top:position.top,ancestors:position.ancestors};
  }
  return {version:1,mode:value.mode==="feed"?"feed":"one",hideSolved:typeof value.hideSolved==="boolean"?value.hideSolved:true,positions};
}
