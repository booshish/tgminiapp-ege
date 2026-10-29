"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ClipboardCheck } from "lucide-react";
import { MathFormula } from "@/components/math-formula";
import type { TaskScreenProps } from "./task-screen";
import { BookmarkButton } from "./bookmark-button";
import { TaskCondition } from "./task-condition";
import { subjectTitle } from "@/lib/subjects";
import "./self-assessment-screen.css";

/** A voluntary self-assessment is never an automatically checked correct answer. */
export function SelfAssessmentScreen({
  task,
  exam,
  levelLabel,
  examNumber,
  topicTitle,
  value,
  onChange,
  maxPrimaryScore,
  selfAssessment,
  onSelfAssessment,
  onNext,
  canNext,
  onPrevious,
  canPrevious,
  onBack,
  focusMode = false,
  bookmarked = false,
  onBookmark,
}: TaskScreenProps) {
  const [feedback, setFeedback] = useState("");
  const confirmedScore = useRef<number | null>(null);
  const sampleVisible = value.selfSolutionVisible === true || selfAssessment != null;
  const maxScore =
    typeof maxPrimaryScore === "number" &&
    Number.isInteger(maxPrimaryScore) &&
    maxPrimaryScore > 0 &&
    maxPrimaryScore <= 100
      ? maxPrimaryScore
      : null;
  const draft = value.selfDraftScore ?? selfAssessment?.score ?? 0;
  const draftScore = maxScore === null ? 0 : Math.max(0, Math.min(maxScore, draft));

  useEffect(() => {
    confirmedScore.current = null;
  }, [selfAssessment?.score]);

  function confirmAssessment() {
    if (
      maxScore === null ||
      !onSelfAssessment ||
      confirmedScore.current === draftScore ||
      selfAssessment?.score === draftScore
    )
      return;

    confirmedScore.current = draftScore;
    try {
      const result = onSelfAssessment(task, draftScore);
      if (result.deltaXP > 0) {
        setFeedback(`Самопроверка сохранена. +${result.deltaXP} XP`);
      } else if (result.deltaXP < 0) {
        setFeedback(`Самопроверка исправлена. ${result.deltaXP} XP`);
      } else {
        setFeedback("Самопроверка сохранена. XP не изменились.");
      }
    } catch {
      confirmedScore.current = null;
      setFeedback("Не удалось сохранить самопроверку. Попробуй подтвердить ещё раз.");
    }
  }

  return (
    <section
      className="task-screen self-assessment-screen"
      aria-labelledby="task-heading"
    >
      <div className="task-topbar">
        <button type="button" className="back-link" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />К выбору заданий
        </button>
        {onBookmark && <BookmarkButton active={bookmarked} onClick={onBookmark} />}
      </div>
      <header className="task-heading-block">
        <p className="eyebrow">
          {exam} · {subjectTitle(task.subjectId)}{levelLabel ? ` · ${levelLabel}` : ""}
        </p>
        <h1 id="task-heading">{task.availability === "history-only" ? "Сохранённое задание" : `Задание №${examNumber}`}</h1>
        <p className="task-topic">Тема: {topicTitle}</p>
        {task.availability === "history-only" && <p role="note">Сохранённое задание прежней модели, вне актуальной номерной практики 2027. Критерии относятся к исходному заданию.</p>}
        <p className="task-source">
          {task.source.label} · {task.examYear} · Часть 2 · Самопроверка
        </p>
      </header>

      <div className="task-card">
        <TaskCondition task={task}/>
        <div className="self-work-field">
          <label htmlFor="self-work">Твоё решение (необязательно)</label>
          <textarea
            id="self-work"
            name="solution"
            rows={5}
            maxLength={20_000}
            value={value.selfWork ?? ""}
            onChange={(event) =>
              onChange({ ...value, selfWork: event.target.value })
            }
            placeholder="Можно записать ход решения здесь или решить на бумаге"
            aria-describedby="self-work-help"
          />
          <p id="self-work-help" className="task-input-help">
            Развёрнутое решение не проверяется автоматически. После решения сверь
            свой ход с образцом и выбери баллы самостоятельно.
          </p>
        </div>
        {!sampleVisible && (
          <button
            type="button"
            className="button button-primary task-check-button"
            onClick={() => onChange({ ...value, selfSolutionVisible: true })}
          >
            <ClipboardCheck size={20} aria-hidden="true" />
            Проверить самостоятельно
          </button>
        )}
        {selfAssessment && (
          <div className="self-saved-grade" role="note">
            <ClipboardCheck size={21} aria-hidden="true" />
            <div>
              <strong>
                Самопроверка: {selfAssessment.score} из {selfAssessment.maxScore} баллов
              </strong>
              <p>
                {focusMode
                  ? "Это самопроверка, не автоматическая проверка."
                  : `Игровой опыт за эту задачу: ${selfAssessment.score} XP. Это не результат проверки экзаменатором.`}
              </p>
            </div>
          </div>
        )}
      </div>

      {sampleVisible && (
        <>
          <section
            id="task-solution"
            className="task-solution-panel"
            aria-labelledby="task-solution-heading"
          >
            <h2 id="task-solution-heading">Образец решения</h2>
            <p className="self-author-note">
              Авторский разбор для самопроверки. Официальные критерии здесь не
              воспроизводятся.
            </p>
            <ol className="task-solution-steps">
              {task.solution.map((step, index) => (
                <li key={`${task.id}-solution-${index}`}>
                  <p>{step.text}</p>
                  {step.latex && (
                    <div className="task-solution-formula">
                      <MathFormula latex={step.latex} block />
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <div className="task-final-answer">
              <span>Ответ</span>
              <strong>{task.answerDisplay}</strong>
            </div>
            {!!task.selfCheckNotes?.length && (
              <div className="self-check-notes">
                <h3>Ориентиры для самопроверки</h3>
                <p>Авторские рекомендации, не официальная шкала критериев.</p>
                <ul>
                  {task.selfCheckNotes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </div>
            )}
            {task.criteriaSourceUrl && (
              <p className="self-criteria-link">
                <a
                  href={task.criteriaSourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Материалы ФИПИ: спецификации и критерии
                </a>
                <span>
                  Ссылка откроется в новой вкладке. Критерии нужно сверить для своего экзамена и года.
                </span>
              </p>
            )}
          </section>

          <section
            className="task-solution-panel self-score-panel"
            aria-labelledby="self-score-heading"
          >
            <h2 id="self-score-heading">Оцени своё решение</h2>
            {maxScore === null ? (
              <p className="self-author-note">
                Для этого задания баллы ещё не настроены. Разбор доступен бесплатно,
                XP пока не начисляются.
              </p>
            ) : (
              <>
                <fieldset className="self-score-picker">
                  <legend>Первичные баллы — твоя самопроверка</legend>
                  <div role="group" aria-label="Количество баллов за решение">
                    {Array.from({ length: maxScore + 1 }, (_, score) => (
                      <button
                        type="button"
                        key={score}
                        aria-pressed={score === draftScore}
                        className={score === draftScore ? "selected" : ""}
                        onClick={() => {
                          if (score === draftScore) return;
                          confirmedScore.current = null;
                          setFeedback("");
                          onChange({ ...value, selfDraftScore: score });
                        }}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <p className="self-score-preview">
                  Самопроверка: {draftScore} из {maxScore} баллов
                </p>
                <p className="self-score-explanation">
                  1 балл самопроверки = 1 игровой XP. При исправлении оценки меняется
                  только разница. Самопроверка не влияет на серию верных ответов.
                </p>
                <button
                  type="button"
                  className="button button-primary task-check-button"
                  disabled={!onSelfAssessment || selfAssessment?.score === draftScore}
                  onClick={confirmAssessment}
                >
                  Подтвердить самопроверку
                </button>
                {selfAssessment && (
                  <p className="task-input-help">
                    Можно выбрать другие баллы и подтвердить исправление.
                  </p>
                )}
              </>
            )}
            <p
              className="self-assessment-feedback"
              role="status"
              aria-live="polite"
            >
              {focusMode && feedback && !feedback.startsWith("Не удалось")
                ? `${feedback.split(".")[0]}.`
                : feedback}
            </p>
          </section>
        </>
      )}

      <nav
        className="task-sequence-navigation self-sequence-navigation"
        aria-label="Переходы между заданиями"
      >
        <button
          type="button"
          className="button button-secondary task-previous-button"
          aria-label="Предыдущее задание"
          onClick={onPrevious}
          disabled={!canPrevious}
        >
          <ArrowLeft size={20} aria-hidden="true" />Назад
        </button>
          <button
            type="button"
            className="button button-secondary task-skip-button"
            onClick={onNext}
            disabled={!canNext}
          >
            Пропустить / Следующее<ArrowRight size={20} aria-hidden="true" />
          </button>
      </nav>
      <p className="self-local-note">
        Самопроверка и XP сохраняются только в этом браузере. Это локальная демоверсия.
      </p>
    </section>
  );
}
