"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LearningState } from "@/lib/learning-events";
import { getPracticeBankView, type Task } from "@/lib/tasks";
import { practiceContextKey, type CatalogSelection, type PracticeTaskState } from "@/lib/practice";
import { ensureTaskIds } from "@/lib/task-packages";
import { emptyPracticeView, parsePracticeView, practicePage, practicePageSize, practiceStatuses, practiceStatus, practiceViewStorageKey, visiblePracticeIds, type PracticeViewPreferences, type PracticeViewPosition } from "@/lib/practice-view";
import { captureViewportPosition, restoreViewportPosition } from "@/lib/viewport-position";
import { NumberTrainingFilters } from "./number-training-filters";
import { TaskCondition } from "./task-condition";
import { taxonomyFilterKeys } from "@/lib/task-taxonomy";
import "./practice-workspace.css";

type Navigation={onNext:()=>void;canNext:boolean;onPrevious:()=>void;canPrevious:boolean};
type Props={selection:CatalogSelection;taskIds:string[];task?:Task;drafts:Record<string,PracticeTaskState>;learning:LearningState;historical?:boolean;
  focusExit?:ReactNode;onApply:(selection:CatalogSelection)=>Promise<void>;onOpenTask:(id:string)=>Promise<boolean|void>;onBack:()=>void;children:(nav:Navigation)=>ReactNode};
const zeroPosition=():PracticeViewPosition=>({page:0,top:0,ancestors:[]});

/** Presentation only: the existing session, drafts and answer engine remain authoritative. */
export function PracticeWorkspace({selection,taskIds,task,drafts,learning,historical,focusExit,onApply,onOpenTask,onBack,children}:Props){
  const key=practiceContextKey(selection);
  const [preferences,setPreferences]=useState<PracticeViewPreferences>(emptyPracticeView);
  const [initialized,setInitialized]=useState(false);
  const [storageWarning,setStorageWarning]=useState(false);
  const [pageReady,setPageReady]=useState("");
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const [opening,setOpening]=useState(false);
  const latest=useRef(preferences);
  const canPersist=useRef(false);
  const previousKey=useRef(key);
  const pinned=useRef<string|undefined>(undefined);
  const restoring=useRef(false);
  const openRef=useRef(onOpenTask);
  openRef.current=onOpenTask;
  const update=useCallback((change:(previous:PracticeViewPreferences)=>PracticeViewPreferences)=>{
    const next=change(latest.current);
    next.positions=Object.fromEntries(Object.entries(next.positions).slice(-50));
    latest.current=next;setPreferences(next);
    if(canPersist.current)try{localStorage.setItem(practiceViewStorageKey,JSON.stringify(next));}catch{setStorageWarning(true);}
  },[]);
  useEffect(()=>{
    try{const restored=parsePracticeView(localStorage.getItem(practiceViewStorageKey));latest.current=restored;setPreferences(restored);canPersist.current=true;}
    catch{setStorageWarning(true);}
    setInitialized(true);
  },[]);
  useEffect(()=>{
    if(previousKey.current===key)return;
    previousKey.current=key;pinned.current=undefined;
    // An explicit theme change resets below; Back/Forward restores this
    // context's saved feed page rather than erasing its presentation state.
  },[key]);

  const statuses=useMemo(()=>practiceStatuses(learning,drafts),[learning,drafts]);
  const ids=useMemo(()=>visiblePracticeIds(taskIds,statuses,preferences.hideSolved&&!historical),[taskIds,statuses,preferences.hideSolved,historical]);
  const completed=task?practiceStatus(statuses,task.id).completed:false;
  useEffect(()=>{if(task&&!completed)pinned.current=task.id;},[task,completed,preferences.hideSolved]);
  const showTask=Boolean(task&&(historical||!preferences.hideSolved||!completed||pinned.current===task.id));
  const position=preferences.positions[key]??zeroPosition();
  const page=practicePage(ids,position.page);
  const pageKey=JSON.stringify([key,preferences.hideSolved,page.ids]);
  useEffect(()=>{
    if(!initialized||preferences.mode!=="feed")return;
    let alive=true;setError("");
    const requested=JSON.parse(pageKey)[2] as string[];
    ensureTaskIds(requested).then(()=>{if(alive)setPageReady(pageKey);}).catch(()=>{if(alive)setError("Не удалось загрузить страницу ленты. Черновики сохранены.");});
    return()=>{alive=false;};
  // pageKey includes the exact bounded list, not all conditions in the bank.
  },[initialized,preferences.mode,pageKey,retry]);

  const remember=useCallback(()=>{
    if(latest.current.mode!=="feed"||restoring.current)return;
    const viewport=captureViewportPosition();
    update(p=>({...p,positions:{...p.positions,[key]:{page:practicePage(ids,p.positions[key]?.page??0).page,top:viewport.top,ancestors:viewport.containers.map(c=>c.top)}}}));
  },[key,ids,update]);
  useEffect(()=>{
    if(!initialized||preferences.mode!=="feed"||pageReady!==pageKey)return;
    const saved=latest.current.positions[key]??zeroPosition();
    restoring.current=true;
    let frame2=0,frame3=0;
    const frame=requestAnimationFrame(()=>{frame2=requestAnimationFrame(()=>{
      const viewport=captureViewportPosition();
      restoreViewportPosition({...viewport,top:saved.top,containers:viewport.containers.map((c,i)=>({...c,top:saved.ancestors[i]??0}))});
      frame3=requestAnimationFrame(()=>{restoring.current=false;});
    });});
    return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(frame2);cancelAnimationFrame(frame3);restoring.current=false;};
  },[initialized,preferences.mode,key,pageReady,pageKey]);
  useEffect(()=>{
    if(!initialized||preferences.mode!=="feed"||pageReady!==pageKey)return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const scroll=()=>{if(!restoring.current){clearTimeout(timer);timer=setTimeout(remember,120);}};
    const hide=()=>remember();
    window.addEventListener("scroll",scroll,true);window.addEventListener("pagehide",hide);
    return()=>{clearTimeout(timer);window.removeEventListener("scroll",scroll,true);window.removeEventListener("pagehide",hide);};
  },[initialized,preferences.mode,pageReady,pageKey,remember]);

  const initialId=!task&&ids.length?ids[0]:undefined;
  useEffect(()=>{if(initialized&&preferences.mode==="one"&&initialId)void openRef.current(initialId);},[initialized,preferences.mode,initialId]);
  const chooseMode=(mode:"one"|"feed")=>{
    remember();
    update(p=>({...p,mode,positions:mode==="feed"&&!p.positions[key]?{...p.positions,[key]:{...zeroPosition(),page:Math.max(0,Math.floor(ids.indexOf(task?.id??"")/practicePageSize))}}:p.positions}));
  };
  const setHide=(hideSolved:boolean)=>{pinned.current=undefined;update(p=>({...p,hideSolved,positions:{...p.positions,[key]:zeroPosition()}}));};
  const turnPage=(next:number)=>update(p=>({...p,positions:{...p.positions,[key]:{...zeroPosition(),page:next}}}));
  async function solve(id:string){
    if(opening)return;
    remember();setOpening(true);setError("");
    try{if(await onOpenTask(id)!==false)update(p=>({...p,mode:"one"}));else setError("Не удалось открыть задание. Повторите выбор.");}
    finally{setOpening(false);}
  }
  const index=task?taskIds.indexOf(task.id):-1;
  const previousId=[...ids].reverse().find(id=>taskIds.indexOf(id)<index);
  const nextId=ids.find(id=>taskIds.indexOf(id)>index);
  const nav:Navigation={onNext:()=>{if(nextId)void onOpenTask(nextId);},canNext:Boolean(nextId),onPrevious:()=>{if(previousId)void onOpenTask(previousId);},canPrevious:Boolean(previousId)};
  const bank=new Map(getPracticeBankView().map(t=>[t.id,t]));
  const chooseTheme=()=>{
    const button=document.querySelector<HTMLButtonElement>(".number-topic-toggle");
    if(button){if(button.getAttribute("aria-expanded")==="false")button.click();button.focus();button.scrollIntoView({block:"center",behavior:"auto"});}else onBack();
  };
  if(!initialized)return <p role="status">Открываем практику…</p>;

  return <section className="practice-workspace" aria-label="Практика выбранного номера">
    <div className="practice-view-controls">
      <div className="segmented-control" role="group" aria-label="Режим практики">
        <button type="button" aria-pressed={preferences.mode==="one"} onClick={()=>chooseMode("one")}>По одному</button>
        <button type="button" aria-pressed={preferences.mode==="feed"} onClick={()=>chooseMode("feed")}>Лента</button>
      </div>
      <label className="practice-hide-solved"><input type="checkbox" checked={preferences.hideSolved} onChange={event=>setHide(event.target.checked)}/>Скрыть решённые</label>
      {focusExit}
    </div>
    <div className="practice-content" id="practice-content">
    {!historical&&<NumberTrainingFilters selection={selection} onApply={async selected=>{
      remember();const nextKey=practiceContextKey(selected);update(p=>({...p,positions:{...p.positions,[nextKey]:zeroPosition()}}));await onApply(selected);
    }}/>}
    {storageWarning&&<p role="status">Не удалось сохранить настройки просмотра. Черновики и результаты хранятся отдельно и не сбрасываются.</p>}
    {error&&<p role="alert">{error} <button type="button" className="text-button" onClick={()=>setRetry(value=>value+1)}>Повторить загрузку</button></p>}
    {ids.length===0&&<section className="empty-state practice-empty" role="status">
      <h2>{preferences.hideSolved&&taskIds.length?"Нерешённых заданий в этой подборке больше нет":taxonomyFilterKeys.some(field=>selection[field])?"По выбранным фильтрам заданий нет":"В этой подборке заданий пока нет"}</h2>
      {preferences.hideSolved&&<button type="button" className="button button-secondary" onClick={()=>setHide(false)}>Показать решённые</button>}
      <button type="button" className="button button-secondary" onClick={chooseTheme}>Выбрать другую тему</button>
    </section>}
    {preferences.mode==="one"?<>
      {showTask?children(nav):task&&ids.length>0?<section className="empty-state practice-empty">
        <p>Текущее задание скрыто фильтром решённых. Его ответ и история сохранены.</p>
        <button type="button" className="button button-secondary" onClick={()=>setHide(false)}>Показать решённые</button>
        <button type="button" className="button button-secondary" onClick={()=>void onOpenTask(nextId??ids[0])}>Перейти к нерешённым</button>
      </section>:initialId?<p role="status">Открываем задание… <button type="button" className="text-button" onClick={()=>void onOpenTask(initialId)}>Повторить</button></p>:null}
      <button type="button" className="button button-secondary practice-return-feed" onClick={()=>chooseMode("feed")}>Вернуться в ленту</button>
    </>:<>
      {ids.length>0&&pageReady!==pageKey&&!error&&<p role="status">Загружаем страницу ленты…</p>}
      {pageReady===pageKey&&<div className="practice-feed" aria-label="Условия заданий">
        {page.ids.map((id,offset)=>{const item=bank.get(id);return item?<article className="task-card practice-feed-card" key={id} data-feed-task={id}>
          <header><h2>{item.examNumber?`Задание №${item.examNumber}`:"Учебное задание"}</h2><span className="practice-task-status">{practiceStatus(statuses,id).label}</span></header>
          <TaskCondition task={item}/>
          {item.answerRule.type==="self"&&<p className="muted">Развёрнутый ответ · самопроверка, не экспертная оценка.</p>}
          <button type="button" className="button button-primary" disabled={opening} aria-label={`Решить задание ${page.page*practicePageSize+offset+1} из ленты`} onClick={()=>void solve(id)}>Решить</button>
        </article>:null;})}
      </div>}
      {ids.length>0&&<nav className="practice-feed-pagination" aria-label="Страницы ленты">
        <button type="button" className="button button-secondary" disabled={!page.previous||pageReady!==pageKey} onClick={()=>turnPage(page.page-1)}>Назад по ленте</button>
        <span>Страница {page.page+1}</span>
        <button type="button" className="button button-secondary" disabled={!page.next||pageReady!==pageKey} onClick={()=>turnPage(page.page+1)}>Дальше по ленте</button>
      </nav>}
    </>}
    </div>
  </section>;
}
