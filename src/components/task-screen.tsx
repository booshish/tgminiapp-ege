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
import "./task-screen.css";

type TaskScreenProps = {
  task: Task;
  exam: Exam;
  onAnswer: (task: Task, input: string, correct: boolean) => string;
  onSolutionViewed: (task: Task, attemptId: string) => void;
  onNext: () => void;
  onBack: () => void;
};

type CheckedAttempt = {
  id: string;
  correct: boolean;
};

/** A new task always starts with a blank answer and a closed solution. */
export function TaskScreen(props: TaskScreenProps) {
  return <TaskAttempt key={props.task.id} {...props} />;
}

function TaskAttempt({
  task,
  exam,
  onAnswer,
  onSolutionViewed,
  onNext,
  onBack,
}: TaskScreenProps) {
  const [answer, setAnswer] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [attempt, setAttempt] = useState<CheckedAttempt | null>(null);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const submittedAttemptRef = useRef<CheckedAttempt | null>(null);
  const solutionViewedRef = useRef(false);
  const isSetAnswer = task.answerRule.type === "set";

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittedAttemptRef.current) return;

    const result = checkTaskAnswer(answer, task.answerRule);
    if (!result.valid) {
      setValidationMessage(
        result.message ?? "Введите ответ в указанном формате.",
      );
      return;
    }

    setValidationMessage("");
    const id = onAnswer(task, answer, result.correct);
    const checkedAttempt = { id, correct: result.correct };
    submittedAttemptRef.current = checkedAttempt;
    setAttempt(checkedAttempt);
  }

  function toggleSolution() {
    if (!attempt) return;

    if (!solutionVisible && !solutionViewedRef.current) {
      solutionViewedRef.current = true;
      onSolutionViewed(task, attempt.id);
    }
    setSolutionVisible((visible) => !visible);
  }

  return (
    <section className="task-screen" aria-labelledby="task-heading">
      <div className="task-topbar">
        <button type="button" className="back-link" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
          Назад
        </button>
      </div>

      <header className="task-heading-block">
        <p className="eyebrow">Математика · {exam}</p>
        <h1 id="task-heading">{task.title}</h1>
      </header>

      <div className="task-card">
        <p className="task-prompt">{task.prompt}</p>

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
              value={answer}
              readOnly={attempt !== null}
              onChange={(event) => {
                setAnswer(event.target.value);
                setValidationMessage("");
              }}
              placeholder="Введите ответ"
              aria-invalid={Boolean(validationMessage)}
              aria-describedby={
                validationMessage ? "task-input-error" : "task-input-help"
              }
            />
          </div>
          <p id="task-input-help" className="task-input-help">
            {isSetAnswer
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
            <p
              className={`task-verdict ${attempt.correct ? "task-verdict-correct" : "task-verdict-incorrect"}`}
            >
              {attempt.correct ? (
                <CheckCircle2 size={23} aria-hidden="true" />
              ) : (
                <CircleX size={23} aria-hidden="true" />
              )}
              <strong>{attempt.correct ? "Верно!" : "Неверно"}</strong>
            </p>
          )}
        </div>

        {attempt && (
          <div className="task-actions">
            <button
              type="button"
              className="button button-secondary task-solution-button"
              onClick={toggleSolution}
              aria-expanded={solutionVisible}
              aria-controls="task-solution"
            >
              <BookOpen size={20} aria-hidden="true" />
              {solutionVisible ? "Скрыть решение" : "Посмотреть решение"}
            </button>
            <button
              type="button"
              className="button button-primary task-next-button"
              onClick={onNext}
            >
              Следующее задание
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

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
        </section>
      )}
    </section>
  );
}
