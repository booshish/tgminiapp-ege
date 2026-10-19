"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Sprout,
  Target,
} from "lucide-react";
import { Meter, PageIntro } from "@/components/ui";
import { tasks, type DemoProgress } from "@/lib/demo";

type ProgressScreenProps = {
  progress: DemoProgress;
  onStart: (index?: number) => void;
  onReset: () => void;
};

export function ProgressScreen({
  progress,
  onStart,
  onReset,
}: ProgressScreenProps) {
  const [resetConfirm, setResetConfirm] = useState(false);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const solved = new Set(
    progress.records
      .filter((record) => record.correct)
      .map((record) => record.taskId),
  ).size;
  const attempts = progress.records.reduce(
    (sum, record) => sum + record.attempts,
    0,
  );
  const accuracy = attempts ? Math.round((solved / attempts) * 100) : 0;

  useEffect(() => {
    if (resetConfirm) cancelButtonRef.current?.focus();
  }, [resetConfirm]);

  function cancelReset() {
    setResetConfirm(false);
    resetButtonRef.current?.focus();
  }

  return (
    <>
      <PageIntro eyebrow="КАЖДЫЙ ШАГ ИМЕЕТ ЗНАЧЕНИЕ" title="Твой прогресс">
        Здесь только твои результаты в этой демоверсии.
      </PageIntro>
      <div className="stats-grid">
        <section className="stat-card">
          <span className="feature-icon">
            <CircleCheck size={22} />
          </span>
          <strong>
            {solved}
            <small> / 5</small>
          </strong>
          <h2>Решено задач</h2>
          <p>Уникальные задачи с верным ответом</p>
        </section>
        <section className="stat-card">
          <span className="feature-icon">
            <Target size={22} />
          </span>
          <strong>{attempts ? `${accuracy}%` : "—"}</strong>
          <h2>Верных ответов</h2>
          <p>
            {attempts
              ? `${solved} верных из ${attempts} проверенных попыток`
              : "Появится после первой проверки"}
          </p>
        </section>
        <section className="stat-card">
          <span className="feature-icon">
            <ListChecks size={22} />
          </span>
          <strong>{attempts}</strong>
          <h2>Попыток</h2>
          <p>Ошибаться и пробовать снова — нормально</p>
        </section>
      </div>
      <section className="results-card">
        <div className="section-title">
          <h2>Твоя практика</h2>
          <span>{solved} из 5 решено</span>
        </div>
        <Meter
          value={(solved / tasks.length) * 100}
          label="Решённые задачи демоверсии"
        />
        {attempts === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <Sprout size={36} strokeWidth={1.3} />
            </span>
            <h3>Всё начинается с первого шага</h3>
            <p>Реши первую задачу — и здесь появится твой прогресс.</p>
            <button
              className="button button-primary"
              onClick={() => onStart(0)}
            >
              К первой задаче <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="result-list">
            {tasks.map((task, index) => {
              const record = progress.records.find(
                (item) => item.taskId === task.id,
              );
              return (
                <button key={task.id} onClick={() => onStart(index)}>
                  <span
                    className={`result-icon ${record?.correct ? "done" : ""}`}
                  >
                    {record?.correct ? (
                      <Check size={19} />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </span>
                  <span>
                    <strong>{task.title}</strong>
                    <small>
                      {task.topic} ·{" "}
                      {record?.correct
                        ? "Решено верно"
                        : record
                          ? "Можно попробовать ещё"
                          : "Ещё не начато"}
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              );
            })}
          </div>
        )}
      </section>
      <div className="progress-storage">
        <span>
          <ShieldCheck size={17} /> Сохраняется в этом браузере на этом
          устройстве
        </span>
        {attempts > 0 && (
          <button
            ref={resetButtonRef}
            className="subtle-button"
            onClick={() => setResetConfirm(true)}
          >
            <RotateCcw size={14} /> Сбросить
          </button>
        )}
      </div>
      {resetConfirm && (
        <div
          className="reset-confirm"
          role="alertdialog"
          aria-labelledby="reset-confirm-title"
          aria-describedby="reset-confirm-description"
          onKeyDown={(event) => {
            if (event.key === "Escape") cancelReset();
          }}
        >
          <p id="reset-confirm-title">
            Сбросить все результаты демозадач на этом устройстве?
          </p>
          <span id="reset-confirm-description" className="sr-only">
            Все проверенные попытки и решённые задачи будут удалены из этого
            браузера.
          </span>
          <div>
            <button
              ref={cancelButtonRef}
              className="button button-secondary"
              onClick={cancelReset}
            >
              Отмена
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                onReset();
                setResetConfirm(false);
              }}
            >
              Да, сбросить
            </button>
          </div>
        </div>
      )}
    </>
  );
}
