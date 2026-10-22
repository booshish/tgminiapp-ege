"use client";

import { useId, useState } from "react";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import type { ExamDefinition } from "@/lib/exams";
import { getMockCoverage, getMockVariants, getUnfinishedMockSession, type MockState } from "@/lib/mock-exam";
import { tasks } from "@/lib/tasks";
import "./variant-launch-card.css";

type Props = {
  definition?: ExamDefinition;
  state?: MockState;
  ready?: boolean;
  onStart?: (variantNumber: number, replace: boolean) => void;
  onResume?: (sessionId: string) => void;
};

/** Uses the same attempt state and catalogue as the full learning-variant screen. */
export function VariantLaunchCard({ definition, state, ready = true, onStart, onResume }: Props) {
  const headingId = useId();
  const [chosenNumber, setChosenNumber] = useState(1);
  const [confirmNew, setConfirmNew] = useState(false);
  const variants = definition ? getMockVariants(definition, tasks) : [];
  const selected = variants.find((entry) => entry.number === chosenNumber) ?? variants[0];
  const unfinished = state && definition ? getUnfinishedMockSession(state, definition) : null;
  const coverage = definition ? getMockCoverage(definition, tasks) : null;
  const title = definition?.examType === "ОГЭ" ? "ОГЭ"
    : definition?.examType === "ЕГЭ" ? `ЕГЭ (${definition.level === "base" ? "база" : "профиль"})` : "по выбранному предмету";
  const answered = unfinished?.taskIds.filter((id) => unfinished.answers[id]?.trim()).length ?? 0;
  const available = Boolean(definition?.available && coverage?.canStart && selected);

  return (
    <section className="variant-launch-card" aria-labelledby={headingId}>
      <div className="variant-launch-copy">
        <h2 id={headingId}><ClipboardCheck size={21} aria-hidden="true" />Решить вариант {title}</h2>
        <p>Полный учебный вариант с таймером и проверкой.</p>
        {definition && available && selected && <p className="variant-launch-meta">{definition.numbers.length} заданий · {selected.durationMinutes} минут · бесплатно{definition.numbers.some((entry) => entry.part === 2) ? " · часть 2 — самопроверка" : ""}</p>}
      </div>
      {!ready ? <p role="status">Загружаем сохранённые варианты…</p> : <>
        {unfinished && <div className="variant-launch-resume">
          <p>Вариант {unfinished.variantNumber ? `№${unfinished.variantNumber}` : "из прежней подборки"} · ответов {answered} из {unfinished.taskIds.length}</p>
          <button type="button" className="button button-primary" disabled={!onResume} onClick={() => onResume?.(unfinished.id)}>Продолжить вариант <ArrowRight size={18} aria-hidden="true" /></button>
        </div>}
        {available && selected ? <div className="variant-launch-new">
          <label className="variant-number-picker">
            <span>Номер варианта</span>
            <select value={selected.number} onChange={(event) => { setChosenNumber(Number(event.target.value)); setConfirmNew(false); }}>
              {variants.map((variant) => <option key={variant.id} value={variant.number}>Вариант №{variant.number}</option>)}
            </select>
          </label>
          <button type="button" className={`button ${unfinished ? "button-secondary" : "button-primary"}`} disabled={!onStart} onClick={() => {
            if (unfinished) setConfirmNew(true);
            else onStart?.(selected.number, false);
          }}>{unfinished ? "Начать новый вариант" : "Начать вариант"} <ArrowRight size={18} aria-hidden="true" /></button>
        </div> : <p className="variant-launch-meta" role="status">Для выбранного экзамена пока нет полного учебного варианта.{coverage?.missingNumbers.length ? ` Не хватает заданий для №${coverage.missingNumbers.join(", №")}.` : ""}{coverage?.missingSharedCondition ? " Нет единой исходной ситуации для ОГЭ №1–5." : ""}{definition?.availabilityNote ? ` ${definition.availabilityNote}` : ""}</p>}
        {unfinished && confirmNew && available && selected && <div className="variant-launch-confirm" role="group" aria-label="Подтверждение нового варианта">
          <p>Начать вариант №{selected.number}? Начатая попытка останется в списке вариантов вместе с черновиками. Её таймер продолжит идти.</p>
          <div><button type="button" className="button button-secondary" onClick={() => setConfirmNew(false)}>Отмена</button><button type="button" className="button button-primary" onClick={() => { onStart?.(selected.number, true); setConfirmNew(false); }}>Начать новый</button></div>
        </div>}
      </>}
      {definition && <p className="variant-launch-standard">Учебная структура {definition.year} года. Соответствие требованиям 2027 года пока не подтверждено.</p>}
    </section>
  );
}
