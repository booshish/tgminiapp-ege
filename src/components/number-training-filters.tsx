"use client";
import { useState } from "react";
import type { CatalogSelection } from "@/lib/practice";
import { getNumberTaxonomyOptions,taxonomyFilterKeys,type TaxonomyFilters } from "@/lib/task-taxonomy";
import "./number-training-filters.css";

/** One shared disclosure for every subject, using metadata rather than task bodies. */
export function NumberTrainingFilters({selection,onApply}:{selection:CatalogSelection;onApply:(selection:CatalogSelection)=>void}){
  const [draft,setDraft]=useState<TaxonomyFilters>(()=>Object.fromEntries(taxonomyFilterKeys.map(key=>[key,selection[key]])));
  if(selection.mode!=="number"||!selection.examNumber)return null;
  const options=getNumberTaxonomyOptions({...selection,...draft,examType:selection.exam});
  const filtered=taxonomyFilterKeys.some(key=>selection[key]);
  const apply=(filters:TaxonomyFilters)=>onApply({...selection,prototypeId:undefined,subtypeId:undefined,taxonomyTopicId:undefined,subtopicId:undefined,sourceCategoryId:undefined,...filters});
  return <details className="number-training-filters" open={filtered||undefined}>
    <summary>Настроить тренировку №{selection.examNumber} · {filtered?"выбраны фильтры":"все задания номера"}</summary>
    <form onSubmit={event=>{event.preventDefault();apply(draft);}}>
      <div className="number-filter-grid">
        <label>Тема<select aria-label="Тема заданий" value={draft.taxonomyTopicId??""} onChange={e=>setDraft({...draft,taxonomyTopicId:e.target.value||undefined,subtopicId:undefined,subtypeId:undefined})}>
          <option value="">Все темы</option>{options.topics.map(t=><option key={t.id} value={t.id}>{t.title} · {t.count}</option>)}
        </select></label>
        <label>Подтема<select aria-label="Подтема заданий" value={draft.subtopicId??""} disabled={!options.subtopics.length} onChange={e=>setDraft({...draft,subtopicId:e.target.value||undefined,subtypeId:undefined})}>
          <option value="">{options.subtopics.length?"Все подтемы":"Подтемы требуют проверки"}</option>{options.subtopics.filter(t=>!draft.taxonomyTopicId||t.parentId===draft.taxonomyTopicId).map(t=><option key={t.id} value={t.id}>{t.title} · {t.count}</option>)}
        </select></label>
        <label>Подтип<select aria-label="Подтип заданий" value={draft.subtypeId??""} disabled={!options.subtypes.length} onChange={e=>setDraft({...draft,subtypeId:e.target.value||undefined})}>
          <option value="">{options.subtypes.length?"Все подтипы":"Подтипы требуют проверки"}</option>{options.subtypes.map(t=><option key={t.id} value={t.id}>{t.title} · {t.count}</option>)}
        </select></label>
        <label>Происхождение<select aria-label="Источник заданий" value={draft.sourceCategoryId??""} onChange={e=>setDraft({...draft,sourceCategoryId:e.target.value||undefined})}>
          <option value="">Все источники</option>{options.sources.map(s=><option key={s.id} value={s.id} disabled={!s.count}>{s.title} · {s.count}</option>)}
        </select></label>
      </div>
      <p>По выбранным фильтрам: {options.matching} из {options.total}. Источник — происхождение материала, не экзаменационный подтип.</p>
      {options.needsReview>0&&<p className="muted">У {options.needsReview} заданий подробная классификация ещё уточняется. Общая тренировка включает их; список подтипов не объявляется полным.</p>}
      <div className="number-filter-actions"><button type="submit" className="button button-secondary">Применить фильтры</button><button type="button" className="text-button" onClick={()=>apply({})}>Все задания номера</button></div>
    </form>
  </details>;
}
