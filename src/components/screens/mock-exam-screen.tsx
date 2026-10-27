"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Clock3, ClipboardCheck } from "lucide-react";
import { PageIntro, ExamPicker } from "@/components/ui";
import { MathFormula } from "@/components/math-formula";
import { TriangleDiagram } from "@/components/illustrations";
import type { MockExamController } from "@/hooks/use-mock-exam";
import { VariantLaunchCard } from "@/components/variant-launch-card";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { examDefinitions, getExamDefinitionByVersion, type ExamLevel } from "@/lib/exams";
import { tasks as sourceTasks, getPracticeBankView, type Task } from "@/lib/tasks";
import type { Exam } from "@/lib/navigation";
import { elapsedMockMilliseconds, getMockTaskStatus, mockDurationNote, mockScoreSummary, remainingMockMilliseconds } from "@/lib/mock-exam";
import "../mock-exam.css";

type Props = {
  mock: MockExamController;
  exam: Exam;
  level?: ExamLevel;
  onBack: () => void;
  onOpenTheory: (topicId: string) => void;
  onSelectionChange?: (exam: Exam, level?: ExamLevel) => void;
};

function duration(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 3600).toString().padStart(2, "0")}:${Math.floor(seconds % 3600 / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function MockExamScreen({ mock, exam, level, onBack, onOpenTheory, onSelectionChange }: Props) {
  const phoneLayout = usePhoneLayout();
  const [selectedExam, setSelectedExam] = useState(exam);
  const [selectedLevel, setSelectedLevel] = useState<ExamLevel>(level ?? "profile");
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [selfDrafts, setSelfDrafts] = useState<Record<string, number>>({});
  const [showAllHistory, setShowAllHistory] = useState(false);
  const definition = examDefinitions.find((entry) => entry.examType === selectedExam && entry.level === (selectedExam === "ЕГЭ" ? selectedLevel : null));
  const session = mock.active;
  const tasks=session?.examVersionId.endsWith("2027-draft")?getPracticeBankView():sourceTasks;
  const sessionDefinition = session ? getExamDefinitionByVersion(session.examVersionId) : null;
  const task = session ? tasks.find((entry) => entry.id === session.taskIds[session.position]) : null;
  const finished = Boolean(session && session.finishedAt !== null);
  const history = mock.state.sessions.filter((entry) => entry.finishedAt !== null).slice().reverse();
  const unfinished = mock.state.sessions.filter((entry) => entry.finishedAt === null).slice().reverse();
  const summary = session ? mockScoreSummary(session, tasks) : null;

  function openSession(id: string) {
    const entry = mock.state.sessions.find((attempt) => attempt.id === id);
    const context = entry && getExamDefinitionByVersion(entry.examVersionId);
    if (context) {
      setSelectedExam(context.examType);
      setSelectedLevel(context.level ?? "profile");
      onSelectionChange?.(context.examType, context.level ?? undefined);
    }
    mock.open(id);
  }

  if (!mock.ready) return <p role="status">Загружаем сохранённые варианты…</p>;

  const numberNavigation = session && task && sessionDefinition && summary ? (
    <nav className="mock-number-list" aria-label="Номера учебного варианта">
      {session.taskIds.map((id, index) => {
        const entry = tasks.find((item) => item.id === id)!;
        const result = session.results[id];
        if (!entry) return null;
        const taskStatus = getMockTaskStatus(session, id);
        const status = finished ? entry.part === 2 ? session.selfScores[id] !== undefined ? "баллы самопроверки сохранены" : "нужна самопроверка" : result?.correct ? "верно" : result?.valid ? "неверно" : "ответ не засчитан" : taskStatus === "skipped" ? "пропущено" : taskStatus === "answered" ? "есть ответ" : "не решено";
        const badge = !finished ? taskStatus === "skipped" ? "Пропущено" : taskStatus === "answered" ? "Ответ" : "—" : entry.part === 2
          ? session.selfScores[id] === undefined ? "Оценить" : `${session.selfScores[id]}/${entry.scoring.maxPrimaryScore}`
          : `${result?.primaryScore ?? 0}/${entry.scoring.maxPrimaryScore}`;
        return (
          <button
            key={id}
            type="button"
            aria-current={session.position === index ? "step" : undefined}
            className={[session.position === index ? "selected" : "", taskStatus === "answered" ? "has-answer" : taskStatus === "skipped" ? "is-skipped" : ""].filter(Boolean).join(" ")}
            onClick={() => { mock.position(index); setConfirmFinish(false); }}
          >
            <span className="sr-only">Задание </span>
            <span>№{entry.examNumber}</span>
            {badge && <small>{badge}</small>}
            <span className="sr-only">, {status}</span>
          </button>
        );
      })}
    </nav>
  ) : null;

  return (
    <section className="mock-page">
      <button type="button" className="back-link" onClick={() => { if (session) { mock.open(null); setConfirmFinish(false); } else onBack(); }}>
        <ArrowLeft size={19} aria-hidden="true" />{session ? "К вариантам и истории" : "Назад"}
      </button>
      <PageIntro eyebrow="САМОСТОЯТЕЛЬНАЯ ПОДГОТОВКА" title={session ? "Учебный вариант" : "Учебные варианты"}>
        {phoneLayout && session
          ? "Авторский учебный вариант."
          : "Авторские задания по проектам структуры 2027 года. Полный вариант доступен только при покрытии всех номеров и критериев."}
      </PageIntro>
      {mock.storageWarning && <p className="info-note" role="alert">Браузер не разрешил сохранить данные или прежняя запись требует восстановления. Она не перезаписана. Текущая работа может сохраниться только до закрытия страницы.</p>}
      {sessionDefinition&&sessionDefinition.year<2027&&<p className="info-note">Ранее начатая попытка сохранена в исходном составе. Новая подготовка использует проект 2027; эта попытка не объявляется актуальным полным пробником.</p>}
      {mock.actionError && <div className="mock-error" role="alert"><p>{mock.actionError}</p>{session?.finishedAt !== null && session && <button type="button" className="button button-secondary" onClick={mock.retryPublish}>Сохранить результаты</button>}</div>}
      {!session ? (
        <>
          <section className="mock-card">
            <h2>Выбери экзамен</h2>
            <ExamPicker exam={selectedExam} onChange={(value) => { setSelectedExam(value); onSelectionChange?.(value, value === "ЕГЭ" ? selectedLevel : undefined); }} />
            {selectedExam === "ЕГЭ" && <div className="segmented mock-level-switch" role="group" aria-label="Уровень математики ЕГЭ">{(["base", "profile"] as const).map((value) => <button key={value} type="button" aria-pressed={selectedLevel === value} className={selectedLevel === value ? "selected" : ""} onClick={() => { setSelectedLevel(value); onSelectionChange?.("ЕГЭ", value); }}>{value === "base" ? "База" : "Профиль"}</button>)}</div>}
            <p>{definition?.title}. Все номера учебной структуры, с общей исходной ситуацией для ОГЭ №1–5.</p>
            <p>{mockDurationNote}</p>
            <p>Ответы сохраняются в этом браузере. Можно пропускать задания и возвращаться к ним. Решения откроются только после завершения. {definition?.numbers.some((entry) => entry.part === 2) ? "Вторую часть ты оцениваешь самостоятельно." : "Все задания — с кратким ответом."}</p>
          </section>
          <VariantLaunchCard key={definition?.id ?? "unknown"} definition={definition} state={mock.state} ready={mock.ready}
            onStart={(number, replace) => { if (definition) mock.start(definition, number, { replace }); }} onResume={openSession} />
          {unfinished.length > 0 && <section className="mock-card">
            <h2>Начатые варианты</h2>
            <p>Каждую попытку можно продолжить. Таймеры идут с момента начала, в том числе после выхода.</p>
            <ul className="mock-history">{unfinished.map((entry) => {
              const title = getExamDefinitionByVersion(entry.examVersionId)?.title ?? "Сохранённый учебный вариант";
              const answered = entry.taskIds.filter((id) => entry.answers[id]?.trim()).length;
              return <li key={entry.id}><button type="button" onClick={() => openSession(entry.id)}><span><strong>{title}{entry.variantNumber ? ` · №${entry.variantNumber}` : ""}</strong><span>{new Date(entry.startedAt).toLocaleString("ru-RU")}</span></span><span>Ответов {answered} из {entry.taskIds.length}<ArrowRight size={18} aria-hidden="true" /></span></button></li>;
            })}</ul>
          </section>}
          <section className="mock-card">
            <h2>История вариантов</h2>
            <p>Только на этом устройстве, без аккаунта и облачной синхронизации. Базовые результаты каждого варианта доступны бесплатно.</p>
            {history.length === 0 ? <p className="info-note">Завершённые варианты появятся здесь.</p> : <ul className="mock-history">
              {(showAllHistory ? history : history.slice(0, 10)).map((entry) => {
                const title = getExamDefinitionByVersion(entry.examVersionId)?.title;
                const score = mockScoreSummary(entry, tasks);
                return <li key={entry.id}><button type="button" onClick={() => openSession(entry.id)}><span><strong>{title}{entry.variantNumber ? ` · №${entry.variantNumber}` : ""}</strong><span>{new Date(entry.startedAt).toLocaleString("ru-RU")}</span></span><span>{score.automatic} автоматически{score.self ? ` + ${score.self} баллы самопроверки` : ""}<ArrowRight size={18} aria-hidden="true" /></span></button></li>;
              })}
            </ul>}
            {!showAllHistory && history.length > 10 && <button type="button" className="text-button" onClick={() => setShowAllHistory(true)}>Показать всю историю</button>}
          </section>
        </>
      ) : task && sessionDefinition && summary ? (
        <>
          <section className="mock-card mock-session-header">
            <h2>{sessionDefinition.title}{session.variantNumber ? ` · Вариант №${session.variantNumber}` : ""}</h2>
            <p className="mock-clock"><Clock3 size={21} aria-hidden="true" />{finished ? `Время работы: ${duration(elapsedMockMilliseconds(session, mock.now))}` : `Осталось ${duration(remainingMockMilliseconds(session, mock.now))}`}</p>
            {finished ? <>
              <p role="status">{session.finishReason === "timeout" ? "Учебное время истекло. Ответы сохранены." : "Вариант завершён. Ответы сохранены."}</p>
              <p>Первичные баллы за автопроверку: <strong>{summary.automatic}</strong>{sessionDefinition.numbers.some((entry) => entry.part === 2) && <> · баллы самопроверки второй части: <strong>{summary.self}</strong></>}.</p>
              <p>Сумма: {summary.total} из {summary.maximum} по предварительной сетке. {summary.pendingSelf > 0 ? `Осталось оценить заданий второй части: ${summary.pendingSelf}.` : sessionDefinition.numbers.some((entry) => entry.part === 2) ? "Вторая часть отмечена как самопроверка." : "Все задания проверяются по краткому ответу."} Это не тестовые баллы и не прогноз экзамена.</p>
            </> : <p>Введено ответов: {session.taskIds.filter((id) => session.answers[id]?.trim()).length} из {session.taskIds.length} · пропущено: {session.skippedTaskIds?.length ?? 0}. Переключение номеров сохраняет ввод.</p>}
            {phoneLayout ? (
              <details className="mock-number-disclosure">
                <summary>
                  <span>Выбрать номер</span>
                  <span>№{task.examNumber} <ChevronDown size={18} aria-hidden="true" /></span>
                </summary>
                {numberNavigation}
              </details>
            ) : numberNavigation}
          </section>
          <article className="mock-card mock-task" aria-labelledby="mock-task-title">
            <p className="eyebrow">{sessionDefinition.examType} · МАТЕМАТИКА · ЧАСТЬ {task.part}</p>
            <h2 id="mock-task-title">Задание №{task.examNumber}</h2>
            <p className="task-prompt">{task.prompt}</p>
            {task.conditionLatex && <MathFormula latex={task.conditionLatex} />}
            {task.diagram && <TriangleDiagram adjacent={task.diagram.adjacent} opposite={task.diagram.opposite} />}
            <label className="mock-answer-label" htmlFor="mock-answer">{task.part === 2 ? "Твоё решение или заметки" : "Твой ответ"}</label>
            {task.part === 2 ? <textarea id="mock-answer" rows={6} maxLength={20_000} value={session.answers[task.id] ?? ""} readOnly={finished} onChange={(event) => mock.answer(task.id, event.target.value)} placeholder="Можно записать решение здесь или решить на бумаге" /> : <input id="mock-answer" type="text" inputMode={task.answerRule.type === "set" ? "text" : "decimal"} maxLength={1024} value={session.answers[task.id] ?? ""} readOnly={finished} onChange={(event) => mock.answer(task.id, event.target.value)} autoComplete="off" aria-describedby="mock-answer-format" />}
            {task.part === 1 && <p id="mock-answer-format" className="mock-secondary">{session.answerFormatVersion === 1 ? task.examEntryFormat === "digit-sequence" ? "Номера подряд, без пробелов и разделителей, в порядке из условия." : "Целое число или конечная десятичная дробь. Запятая или точка, без единиц измерения." : task.answerRule.type === "set" ? "Все значения — через точку с запятой." : "Число, десятичная запятая или точка, обыкновенная дробь."}</p>}
            {finished && <>
              {task.part === 1 && <p className="mock-verdict" role="status">{session.results[task.id]?.correct ? "Верно" : session.results[task.id]?.valid ? "Неверно" : session.results[task.id]?.message ?? (session.answers[task.id]?.trim() ? "Ответ не засчитан: неподходящий формат" : "Ответ не дан")} · {session.results[task.id]?.primaryScore ?? 0} из {task.scoring.maxPrimaryScore} первичных баллов</p>}
              {!session.revealedTaskIds.includes(task.id) ? <button type="button" className="button button-secondary" onClick={() => mock.reveal(task)}><ClipboardCheck size={19} aria-hidden="true" />{task.part === 2 ? "Проверить самостоятельно" : "Посмотреть решение"}</button> : <Solution task={task} />}
              {session.revealedTaskIds.includes(task.id) && task.part === 2 && task.scoring.maxPrimaryScore !== null && <div className="mock-self-assessment">
                <h3>Баллы самопроверки</h3>
                <p>Авторские ориентиры помогают сравнить ход решения. Они не заменяют официальные критерии или проверку преподавателем.</p>
                <fieldset><legend>Выбери баллы за своё решение</legend><div className="mock-score-options">{Array.from({ length: task.scoring.maxPrimaryScore + 1 }, (_, score) => <label key={score}><input type="radio" name={`self-${task.id}`} value={score} checked={(selfDrafts[`${session.id}-${task.id}`] ?? session.selfScores[task.id] ?? 0) === score} onChange={() => setSelfDrafts((prior) => ({ ...prior, [`${session.id}-${task.id}`]: score }))} /><span>{score}</span></label>)}</div></fieldset>
                <p>Баллы самопроверки: {selfDrafts[`${session.id}-${task.id}`] ?? session.selfScores[task.id] ?? 0} из {task.scoring.maxPrimaryScore}.</p>
                <button type="button" className="button button-primary" onClick={() => mock.assess(task, selfDrafts[`${session.id}-${task.id}`] ?? session.selfScores[task.id] ?? 0)}><Check size={18} aria-hidden="true" />Подтвердить самооценку</button>
                {session.selfScores[task.id] !== undefined && <p role="status">Сохранена самооценка: {session.selfScores[task.id]} из {task.scoring.maxPrimaryScore}. При исправлении XP меняются только на разницу.</p>}
              </div>}
              {session.revealedTaskIds.includes(task.id) && <button type="button" className="text-button" onClick={() => onOpenTheory(task.topicId)}><BookOpen size={18} aria-hidden="true" />Повторить связанную теорию</button>}
            </>}
            <div className="mock-task-navigation">
              <button type="button" className="button button-secondary" disabled={session.position === 0} onClick={() => mock.position(session.position - 1)}><ArrowLeft size={18} aria-hidden="true" />Предыдущее</button>
              {!finished && <button type="button" className="button button-secondary" onClick={() => { mock.skip(task.id); if (session.position < session.taskIds.length - 1) mock.position(session.position + 1); }}>Пропустить</button>}
              <button type="button" className="button button-secondary" disabled={session.position === session.taskIds.length - 1} onClick={() => mock.position(session.position + 1)}>Следующее <ArrowRight size={18} aria-hidden="true" /></button>
            </div>
          </article>
          {!finished && <section className="mock-card">
            {!confirmFinish ? <button type="button" className="button button-primary" onClick={() => setConfirmFinish(true)}>Завершить вариант</button> : <div className="mock-finish-confirm"><h2>Завершить сейчас?</h2><p>Введённые краткие ответы будут проверены. Неотвеченные задания получат 0 баллов.{sessionDefinition.numbers.some((entry) => entry.part === 2) ? " Вторую часть можно будет оценить самостоятельно." : ""}</p><div><button type="button" className="button button-secondary" onClick={() => setConfirmFinish(false)}>Продолжить работу</button><button type="button" className="button button-primary" onClick={() => { mock.finish(); setConfirmFinish(false); }}>Завершить и проверить</button></div></div>}
          </section>}
          {phoneLayout && (
            <details className="mock-source-note">
              <summary>О формате учебного варианта</summary>
              <p>Авторские задания по {sessionDefinition.year === 2027 ? "проекту структуры 2027" : "исходной модели сохранённой попытки"}. Это учебная тренировка, а не подтверждённый официальный пробник ФИПИ.</p>
              <p>{mockDurationNote}</p>
              <p>Ответы сохраняются в этом браузере.{sessionDefinition.numbers.some((entry) => entry.part === 2) ? " Вторую часть ты оцениваешь самостоятельно." : " Все задания — с кратким ответом."}</p>
            </details>
          )}
        </>
      ) : <p className="info-note">Материал этого варианта временно недоступен. Сохранённые данные не удалены.</p>}
    </section>
  );
}

function Solution({ task }: { task: Task }) {
  return <section className="mock-solution"><h3>Авторский образец решения</h3><ol>{task.solution.map((step, index) => <li key={index}><p>{step.text}</p>{step.latex && <MathFormula latex={step.latex} />}</li>)}</ol><p><strong>Ответ:</strong> {task.answerDisplay}</p>{task.selfCheckNotes && <><h3>На что обратить внимание при самопроверке</h3><ul>{task.selfCheckNotes.map((note) => <li key={note}>{note}</li>)}</ul></>}{task.criteriaSourceUrl && <p><a className="text-button" href={task.criteriaSourceUrl} target="_blank" rel="noreferrer">Материалы ФИПИ</a> · официальные критерии этого авторского задания не опубликованы.</p>}</section>;
}
