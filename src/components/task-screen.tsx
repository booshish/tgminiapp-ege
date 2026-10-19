"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  PencilLine,
  Sprout,
} from "lucide-react";
import {
  isCorrectAnswer,
  normalizeAnswer,
  tasks,
  type ProgressRecord,
} from "@/lib/demo";
import { TriangleDiagram } from "@/components/illustrations";
import "./task-screen.css";

type TaskScreenProps = {
  taskIndex: number;
  records: ProgressRecord[];
  exam: string;
  onAnswer: (taskId: string, correct: boolean) => void;
  onNext: (index: number) => void;
  onFinish: () => void;
  onBack: () => void;
};

export function TaskScreen({
  taskIndex,
  records,
  exam,
  onAnswer,
  onNext,
  onFinish,
  onBack,
}: TaskScreenProps) {
  const task = tasks[taskIndex] ?? tasks[0];
  const solvedTaskIds = new Set(
    records.filter((record) => record.correct).map((record) => record.taskId),
  );
  const alreadySolved = solvedTaskIds.has(task.id);
  const formattedAnswer = task.answer.toLocaleString("ru-RU", {
    maximumFractionDigits: 9,
  });
  const [answer, setAnswer] = useState(alreadySolved ? formattedAnswer : "");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(
    alreadySolved ? "correct" : null,
  );
  const [validationMessage, setValidationMessage] = useState("");
  const [showHint, setShowHint] = useState(false);
  const correct = alreadySolved || feedback === "correct";
  const checked = correct || feedback !== null;
  const completedSteps = tasks.filter((item) =>
    solvedTaskIds.has(item.id),
  ).length;
  const isLast = taskIndex === tasks.length - 1;

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (correct) return;

    if (normalizeAnswer(answer) === null) {
      setValidationMessage(
        answer.trim()
          ? "Введите число, например 0,8, или дробь, например 4/5."
          : "Сначала запишите свой ответ.",
      );
      return;
    }

    setValidationMessage("");
    const result = isCorrectAnswer(answer, task.answer);
    setFeedback(result ? "correct" : "incorrect");
    onAnswer(task.id, result);
  }

  return (
    <section className="task-screen" aria-labelledby="task-heading">
      <div className="task-topbar">
        <button type="button" className="back-link" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          Назад
        </button>
        <span className="task-focus-label">Время сосредоточиться</span>
        <span className="task-focus-dot" aria-hidden="true" />
      </div>

      <header className="task-heading-block">
        <p className="eyebrow">Математика · {exam}</p>
        <div className="task-heading-row">
          <h1 id="task-heading">
            Задание {taskIndex + 1} из {tasks.length}
          </h1>
          <span className="task-step-count">
            {String(taskIndex + 1).padStart(2, "0")}
            <span> / {String(tasks.length).padStart(2, "0")}</span>
          </span>
        </div>
        <div
          className="task-progress"
          role="progressbar"
          aria-label="Решено задач в демоверсии"
          aria-valuemin={0}
          aria-valuemax={tasks.length}
          aria-valuenow={completedSteps}
        >
          {tasks.map((item) => (
            <span
              key={item.id}
              className={
                solvedTaskIds.has(item.id)
                  ? "task-progress-step task-progress-done"
                  : item.id === task.id
                    ? "task-progress-step task-progress-current"
                    : "task-progress-step"
              }
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="task-heading-description">
          Маленький шаг к большой цели.
        </p>
      </header>

      <div className="task-card">
        <div className="task-card-top">
          <span className="task-topic">{task.topic}</span>
          <span className="task-demo-label">Демо-задание</span>
        </div>
        <h2 className="task-title">{task.title}</h2>
        <p className="task-prompt">{task.prompt}</p>

        {task.kind === "triangle" ? (
          <div className="task-diagram-wrap">
            <TriangleDiagram />
            <span className="task-diagram-caption">Рисунок к условию</span>
          </div>
        ) : (
          <div className={`task-formula task-formula-${task.kind}`}>
            {task.kind === "fraction" ? (
              <span
                className="task-fraction-expression"
                role="img"
                aria-label="Одна четвёртая плюс три восьмых"
              >
                <span className="task-fraction" aria-hidden="true">
                  <span>1</span>
                  <span>4</span>
                </span>
                <span className="task-fraction-plus" aria-hidden="true">
                  +
                </span>
                <span className="task-fraction" aria-hidden="true">
                  <span>3</span>
                  <span>8</span>
                </span>
              </span>
            ) : (
              task.formula
            )}
          </div>
        )}

        <form onSubmit={checkAnswer} className="task-answer-form" noValidate>
          <label htmlFor="task-answer">Ваш ответ</label>
          <div
            className={`task-input-wrap${correct ? " task-input-correct" : ""}${validationMessage ? " task-input-invalid" : ""}`}
          >
            <PencilLine
              className="task-input-icon"
              size={18}
              aria-hidden="true"
            />
            <input
              id="task-answer"
              name="answer"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              value={answer}
              readOnly={correct}
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
            {correct && (
              <Check
                size={20}
                className="task-answer-check"
                aria-hidden="true"
              />
            )}
          </div>
          <p id="task-input-help" className="task-input-help">
            Число с запятой, точкой или дробь — например 4/5.
          </p>
          {validationMessage && (
            <p id="task-input-error" className="task-input-error" role="alert">
              {validationMessage}
            </p>
          )}
          <button
            type="submit"
            className="button button-primary task-check-button"
            disabled={correct}
          >
            {correct ? (
              <Check size={18} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={18} aria-hidden="true" />
            )}
            {correct ? "Ответ засчитан" : "Проверить"}
          </button>
        </form>

        <div className="task-hint">
          <button
            type="button"
            className="task-hint-toggle"
            onClick={() => setShowHint(!showHint)}
            aria-expanded={showHint}
            aria-controls="task-hint-content"
          >
            <Lightbulb size={18} aria-hidden="true" />
            <span>{showHint ? "Скрыть подсказку" : "Нужна подсказка?"}</span>
            <ChevronDown
              size={16}
              className={showHint ? "task-chevron-open" : ""}
              aria-hidden="true"
            />
          </button>
          {showHint && (
            <p id="task-hint-content" className="task-hint-content">
              {task.hint}
            </p>
          )}
        </div>

        <div
          className="task-feedback-region"
          aria-live="polite"
          aria-atomic="true"
        >
          {checked && (
            <div
              className={`task-feedback ${correct ? "task-feedback-correct" : "task-feedback-retry"}`}
            >
              <div className="task-feedback-title">
                {correct ? (
                  <CheckCircle2 size={20} aria-hidden="true" />
                ) : (
                  <Lightbulb size={20} aria-hidden="true" />
                )}
                <h3>
                  {correct
                    ? "Всё верно. Так держать!"
                    : "Пока не совсем. Разберём вместе"}
                </h3>
              </div>
              <p className="task-solution">{task.solution}</p>
              <p className="task-correct-answer">
                Верный ответ: <strong>{formattedAnswer}</strong>
              </p>
              {!correct && (
                <p className="task-retry-note">
                  Можно исправить ответ и проверить ещё раз.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="button button-primary task-next-button"
        disabled={!checked}
        aria-describedby={!checked ? "task-next-help" : undefined}
        onClick={() => (isLast ? onFinish() : onNext(taskIndex + 1))}
      >
        {isLast ? "Посмотреть результат" : "Следующее задание"}
        <ArrowRight size={19} aria-hidden="true" />
      </button>
      {!checked && (
        <p id="task-next-help" className="task-next-help">
          Сначала проверь ответ
        </p>
      )}

      <p className="task-encouragement">
        <Sprout size={17} aria-hidden="true" />В своём темпе. Каждая попытка —
        это опыт.
      </p>
    </section>
  );
}
