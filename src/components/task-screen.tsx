"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleX,
  PencilLine,
} from "lucide-react";
import { TriangleDiagram } from "@/components/illustrations";
import { MathFormula } from "@/components/math-formula";
import { checkTaskAnswer, type Task } from "@/lib/tasks";
import type { Exam } from "@/lib/navigation";
import type { PracticeTaskState } from "@/lib/practice";
import { SelfAssessmentScreen } from "./self-assessment-screen";
import { BookmarkButton } from "./bookmark-button";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { subjectTitle } from "@/lib/subjects";
import "./task-screen.css";

export type TaskScreenProps = {
  task: Task;
  exam: Exam;
  levelLabel?: string;
  examNumber?: number | null;
  topicTitle: string;
  value: PracticeTaskState;
  onChange: (value: PracticeTaskState) => void;
  onAnswer: (task: Task, input: string, correct: boolean, solutionSeen?: boolean) => {
    id: string;
    xpAwarded: number;
  };
  onSolutionViewed: (task: Task, attemptId: string) => void;
  maxPrimaryScore?: number | null;
  selfAssessment?: { score: number; maxScore: number } | null;
  onSelfAssessment?: (task: Task, score: number) => {
    score: number;
    maxScore: number;
    deltaXP: number;
  };
  onNext: () => void;
  canNext: boolean;
  onPrevious: () => void;
  canPrevious: boolean;
  onBack: () => void;
  focusMode?: boolean;
  bookmarked?: boolean;
  onBookmark?: () => void;
};

/** Drafts belong to the practice session; revisiting a task never checks it again. */
export function TaskScreen(props: TaskScreenProps) {
  if (props.task.answerRule.type === "self") {
    return <SelfAssessmentScreen key={props.task.id} {...props} />;
  }
  return <TaskAttempt key={props.task.id} {...props} />;
}

function TaskAttempt({
  task,
  exam,
  levelLabel,
  examNumber,
  topicTitle,
  value,
  onChange,
  onAnswer,
  onSolutionViewed,
  maxPrimaryScore,
  onNext,
  canNext,
  onPrevious,
  canPrevious,
  onBack,
  focusMode = false,
  bookmarked = false,
  onBookmark,
}: TaskScreenProps) {
  const phoneLayout = usePhoneLayout();
  const { answer, validationMessage, attempt } = value;
  const solutionVisible = attempt !== null && value.solutionVisible;
  const submittedAttemptRef = useRef(value.attempt);
  const solutionViewedRef = useRef(value.solutionViewed);
  const [awardedXP, setAwardedXP] = useState(0);
  const isSetAnswer = task.answerRule.type === "set";
  const maxScore =
    typeof maxPrimaryScore === "number" && Number.isSafeInteger(maxPrimaryScore) && maxPrimaryScore > 0
      ? maxPrimaryScore
      : null;

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (attempt || submittedAttemptRef.current) return;

    const result = checkTaskAnswer(answer, task.answerRule);
    if (!result.valid) {
      onChange({
        ...value,
        validationMessage:
          result.message ?? "Введите ответ в указанном формате.",
      });
      return;
    }

    const recorded = onAnswer(
      task,
      answer,
      result.correct,
      value.solutionViewed || solutionViewedRef.current,
    );
    const checkedAttempt = { id: recorded.id, correct: result.correct };
    submittedAttemptRef.current = checkedAttempt;
    setAwardedXP(recorded.xpAwarded);
    onChange({
      ...value,
      validationMessage: "",
      attempt: checkedAttempt,
      solutionVisible: false,
      solutionViewed: value.solutionViewed || solutionViewedRef.current,
    });
  }

  function toggleSolution() {
    if (!attempt) return;

    const firstView =
      !solutionVisible && !value.solutionViewed && !solutionViewedRef.current;
    if (firstView) {
      solutionViewedRef.current = true;
      onSolutionViewed(task, attempt.id);
    }
    onChange({
      ...value,
      solutionVisible: !solutionVisible,
      solutionViewed: value.solutionViewed || firstView,
    });
  }

  return (
    <section className="task-screen" data-subject={task.subjectId} aria-labelledby="task-heading">
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
        <h1 id="task-heading">
          {examNumber ? `Задание №${examNumber}` : "Учебное задание"}
        </h1>
        <p className="task-topic">Тема: {topicTitle}</p>
        <p className="task-source">
          {task.source.label} · {task.examYear}
          {task.part ? ` · Часть ${task.part}` : " · Базовая тема"}
        </p>
        {!examNumber && <p className="task-title">{task.title}</p>}
      </header>

      <div className="task-card">
        <p className="task-prompt">{task.prompt}</p>
        {task.resources && <section aria-label="Материалы задания"><h2>Материалы задания</h2><ul>
          {task.resources.map((resource) => <li key={resource.name}><a download={resource.name} href={`data:text/plain;charset=utf-8,${encodeURIComponent(resource.content)}`}>{resource.name} · скачать</a></li>)}
        </ul></section>}

        {task.diagram?.type === "right-triangle" && (
          <div className="task-diagram-wrap">
            <TriangleDiagram
              adjacent={task.diagram.adjacent}
              opposite={task.diagram.opposite}
            />
            <span className="task-diagram-caption">Рисунок к условию</span>
          </div>
        )}

        {task.conditionLatex && (
          <div className="task-formula">
            <MathFormula latex={task.conditionLatex} block />
          </div>
        )}

        <form className="task-answer-form" onSubmit={checkAnswer} noValidate>
          <label htmlFor="task-answer">Твой ответ</label>
          <div
            className={`task-input-wrap${validationMessage ? " task-input-invalid" : ""}${attempt ? " task-input-checked" : ""}`}
          >
            <PencilLine
              className="task-input-icon"
              size={20}
              aria-hidden="true"
            />
            <input
              id="task-answer"
              name="answer"
              type="text"
              inputMode="text"
              enterKeyHint="done"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={256}
              value={answer}
              readOnly={attempt?.correct === true}
              onChange={(event) => {
                if (attempt?.correct || event.target.value === answer) return;
                submittedAttemptRef.current = null;
                setAwardedXP(0);
                onChange({
                  ...value,
                  answer: event.target.value,
                  validationMessage: "",
                  attempt: null,
                  solutionVisible: false,
                  solutionViewed: value.solutionViewed || solutionViewedRef.current,
                });
              }}
              placeholder="Введите ответ"
              aria-invalid={Boolean(validationMessage)}
              aria-describedby={
                validationMessage ? "task-input-error" : "task-input-help"
              }
            />
          </div>
          <p id="task-input-help" className="task-input-help">
            {task.answerRule.type === "choices" ? task.answerRule.ordered ? "Цифры подряд в порядке букв из условия." : "Номера подряд без повторов; порядок не важен." : task.answerRule.type === "text" ? "Формат ответа указан в условии. Порядок символов и слов важен." : isSetAnswer
              ? "Запишите все корни через точку с запятой. Порядок не важен."
              : "Можно записать число или дробь. Точка и запятая равнозначны."}
          </p>
          {validationMessage && (
            <p id="task-input-error" className="task-input-error" role="alert">
              {validationMessage}
            </p>
          )}
          {!attempt && (
            <button
              type="submit"
              className="button button-primary task-check-button"
            >
              Проверить ответ
            </button>
          )}
        </form>

        <div
          className="task-feedback-region"
          aria-live="polite"
          aria-atomic="true"
        >
          {attempt && (
            <>
              <p
                className={`task-verdict ${attempt.correct ? "task-verdict-correct" : "task-verdict-incorrect"}`}
              >
                {attempt.correct ? (
                  <CheckCircle2 size={23} aria-hidden="true" />
                ) : (
                  <CircleX size={23} aria-hidden="true" />
                )}
                <strong>
                  {attempt.correct ? "Верно!" : "Неверно"}
                  {attempt.correct && awardedXP > 0 && !focusMode && (
                    <span className="task-xp-award"> +{awardedXP} XP</span>
                  )}
                </strong>
              </p>
              {phoneLayout && !attempt.correct && (
                <p className="task-correction-note">
                  Можно исправить ответ в поле или посмотреть разбор.
                </p>
              )}
              <div className="task-primary-score" role="note">
                {maxScore !== null ? (
                  <>
                    <p>Проверка ответа: {attempt.correct ? maxScore : 0} из {maxScore} баллов</p>
                    <p>Учебная проверка, не официальный результат экзамена.</p>
                  </>
                ) : (
                  <p>
                    {examNumber
                      ? "Для этого задания баллы ещё не настроены. XP не начисляются."
                      : "Это упражнение по базовой теме без экзаменационного номера. XP за него не начисляются."}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {attempt && (
          <div className="task-actions">
            <button
              type="button"
              className={`button ${phoneLayout && !attempt.correct && !solutionVisible ? "button-primary" : "button-secondary"} task-solution-button`}
              onClick={toggleSolution}
              aria-expanded={solutionVisible}
              aria-controls="task-solution"
            >
              <BookOpen size={20} aria-hidden="true" />
              {solutionVisible ? "Скрыть решение" : "Посмотреть решение"}
            </button>
            {(!phoneLayout || !solutionVisible) && <button
              type="button"
              className={`button ${phoneLayout && !attempt.correct ? "button-secondary" : "button-primary"} task-next-button`}
              onClick={onNext}
              disabled={!canNext}
            >
              Следующее задание
              <ArrowRight size={20} aria-hidden="true" />
            </button>}
          </div>
        )}
      </div>

      {(!phoneLayout || !solutionVisible) && <nav
        className="task-sequence-navigation"
        aria-label="Переходы между заданиями"
      >
        <button
          type="button"
          className="button button-secondary task-previous-button"
          onClick={onPrevious}
          disabled={!canPrevious}
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Предыдущее задание
        </button>
      </nav>}

      {solutionVisible && (
        <section
          id="task-solution"
          className="task-solution-panel"
          aria-labelledby="task-solution-heading"
        >
          <h2 id="task-solution-heading">Решение</h2>
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
          {phoneLayout && (
            <nav className="task-solution-navigation" aria-label="Переходы после решения">
              <button
                type="button"
                className="button button-primary task-next-button"
                onClick={onNext}
                disabled={!canNext}
              >
                Следующее задание <ArrowRight size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="button button-secondary task-previous-button"
                onClick={onPrevious}
                disabled={!canPrevious}
              >
                <ArrowLeft size={20} aria-hidden="true" /> Предыдущее задание
              </button>
            </nav>
          )}
        </section>
      )}
    </section>
  );
}
