"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { CatalogSelection } from "@/lib/practice";
import { clearNumberThemes, getNumberTaxonomyOptions, taxonomyFilterKeys, type TaxonomyFilters } from "@/lib/task-taxonomy";
import "./number-training-filters.css";

/** One inline disclosure; route/session and the existing lazy loader own filtering. */
export function NumberTrainingFilters({ selection, onApply }: {
  selection: CatalogSelection;
  onApply: (selection: CatalogSelection) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  if (selection.mode !== "number" || !selection.examNumber) return null;
  const options = getNumberTaxonomyOptions({ ...selection, examType: selection.exam });
  const filtered = taxonomyFilterKeys.some(key => selection[key]);
  const themed = Boolean(selection.taxonomyTopicId || selection.subtopicId || selection.subtypeId);
  const selectedId = selection.subtypeId ?? selection.subtopicId ?? selection.taxonomyTopicId;
  const selectedTitle = selectedId ? [...options.topics, ...options.subtopics, ...options.subtypes].find(item => item.id === selectedId)?.title ?? "Выбранная тема недоступна" : "Все темы";
  const sources = options.sources.filter(source => source.count > 0);

  async function apply(filters: TaxonomyFilters) {
    if (busy) return;
    setBusy(true);
    try {
      await onApply({ ...selection, prototypeId: undefined, ...Object.fromEntries(taxonomyFilterKeys.map(key => [key, filters[key]])) });
    } finally {
      setBusy(false);
    }
  }
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  const selectOptions = (items: { id: string; title: string; count: number }[], value?: string) => <>
    {value && !items.some(item => item.id === value) && <option value={value} disabled>Выбор недоступен для этого номера</option>}
    {items.map(item => <option key={item.id} value={item.id}>{item.title} · {item.count}</option>)}
  </>;

  return <section className="number-training-filters" aria-label="Темы текущего номера"
    onKeyDown={event => { if (open && event.key === "Escape") { event.preventDefault(); close(); } }}>
    <div className="number-filter-toolbar">
      <button ref={trigger} type="button" className="button button-secondary number-topic-toggle"
        aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
        <SlidersHorizontal size={19} aria-hidden="true" />
        <span>Выбрать тему<span className="number-topic-current">{selectedTitle}</span></span>
        <ChevronDown size={18} aria-hidden="true" className={open ? "number-topic-chevron-open" : ""} />
      </button>
      <span className="number-filter-count" role="status">Заданий: {options.matching} из {options.total}{selection.sourceCategoryId ? " · фильтр источника" : ""}</span>
    </div>
    <div id={panelId} className="number-filter-panel" hidden={!open} aria-busy={busy}>
      <div className="number-filter-actions">
        <button type="button" className="button button-secondary" aria-pressed={!themed} disabled={busy}
          onClick={() => void apply(clearNumberThemes(selection))}>Все темы</button>
        <button type="button" className="text-button" onClick={close}>Закрыть выбор темы</button>
      </div>
      {options.needsReview === options.total && <p className="muted">Тематическая разбивка пока готовится. Все задания номера доступны в общем режиме.</p>}
      <fieldset className="number-filter-grid" disabled={busy}>
        <legend className="sr-only">Выбор темы и источника</legend>
        <label>Тема<select aria-label="Тема заданий" value={selection.taxonomyTopicId ?? ""} disabled={!options.topics.length && !selection.taxonomyTopicId}
          onChange={event => void apply({ ...clearNumberThemes(selection), taxonomyTopicId: event.target.value || undefined })}>
          <option value="">Все темы</option>{selectOptions(options.topics, selection.taxonomyTopicId)}
        </select></label>
        {(options.subtopics.length > 0 || selection.subtopicId) && <label>Подтема<select aria-label="Подтема заданий" value={selection.subtopicId ?? ""}
          onChange={event => void apply({ ...selection, subtopicId: event.target.value || undefined, subtypeId: undefined })}>
          <option value="">Все подтемы</option>{selectOptions(options.subtopics, selection.subtopicId)}
        </select></label>}
        <label>Подтип<select aria-label="Подтип заданий" value={selection.subtypeId ?? ""} disabled={!options.subtypes.length && !selection.subtypeId}
          onChange={event => void apply({ ...selection, subtypeId: event.target.value || undefined })}>
          <option value="">{options.subtypes.length ? "Все подтипы" : "Подтипы требуют проверки"}</option>{selectOptions(options.subtypes, selection.subtypeId)}
        </select></label>
        <label>Происхождение<select aria-label="Источник заданий" value={selection.sourceCategoryId ?? ""}
          onChange={event => void apply({ ...selection, sourceCategoryId: event.target.value || undefined })}>
          <option value="">Все источники</option>{selectOptions(sources, selection.sourceCategoryId)}
        </select></label>
      </fieldset>
      {options.needsReview > 0 && options.needsReview < options.total && <p className="muted">У {options.needsReview} заданий подробная классификация ещё уточняется. Они остаются доступны в режиме «Все темы»; список подтипов пока неполный.</p>}
      {filtered && <button type="button" className="text-button" disabled={busy} onClick={() => void apply({})}>Сбросить все фильтры</button>}
    </div>
    {filtered && options.matching === 0 && <div className="number-filter-empty" role="status">
      <p>В выбранной теме с такими фильтрами заданий пока нет. Можно вернуться ко всем темам этого номера.</p>
      <button type="button" className="button button-secondary" disabled={busy} onClick={() => void apply(clearNumberThemes(selection))}>Все темы</button>
      {selection.sourceCategoryId && <button type="button" className="text-button" disabled={busy} onClick={() => void apply({})}>Сбросить все фильтры</button>}
    </div>}
  </section>;
}
