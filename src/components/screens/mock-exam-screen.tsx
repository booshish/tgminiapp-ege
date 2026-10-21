"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Clock3, ClipboardCheck } from "lucide-react";
import { PageIntro, ExamPicker } from "@/components/ui";
import { MathFormula } from "@/components/math-formula";
import { TriangleDiagram } from "@/components/illustrations";
import { useMockExam, type MockCallbacks } from "@/hooks/use-mock-exam";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { getAvailableExamDefinitions } from "@/lib/exams";
import { tasks, type Task } from "@/lib/tasks";
import type { Exam } from "@/lib/navigation";
import { elapsedMockMilliseconds, getMockCoverage, mockDurationMinutes, mockDurationNote, mockScoreSummary, remainingMockMilliseconds } from "@/lib/mock-exam";
import "../mock-exam.css";

type Props = MockCallbacks & {
  exam: Exam;
  onBack: () => void;
  onOpenTheory: (topicId: string) => void;
  onExamChange?: (exam: Exam) => void;
};

function duration(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 3600).toString().padStart(2, "0")}:${Math.floor(seconds % 3600 / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function MockExamScreen({ exam, onBack, onOpenTheory, onExamChange, ...callbacks }: Props) {
  const phoneLayout = usePhoneLayout();
  const mock = useMockExam(callbacks);
  const [selectedExam, setSelectedExam] = useState(exam);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [selfDrafts, setSelfDrafts] = useState<Record<string, number>>({});
  const [showAllHistory, setShowAllHistory] = useState(false);
  const definitions = getAvailableExamDefinitions();
  const definition = definitions.find((entry) => entry.examType === selectedExam);
  const session = mock.active;
  const sessionDefinition = session ? definitions.find((entry) => entry.versionId === session.examVersionId) : null;
  const task = session ? tasks.find((entry) => entry.id === session.taskIds[session.position]) : null;
  const finished = session?.finishedAt !== null;
  const history = mock.state.sessions.filter((entry) => entry.finishedAt !== null).slice().reverse();
  const unfinished = mock.state.sessions.find((entry) => entry.finishedAt === null);
  const coverage = definition ? getMockCoverage(definition, tasks) : null;
  const summary = session ? mockScoreSummary(session, tasks) : null;

  useEffect(() => {
    if (sessionDefinition) onExamChange?.(sessionDefinition.examType);
  }, [sessionDefinition, onExamChange]);

  if (!mock.ready) return <p role="status">Загружаем сохранённые варианты…</p>;

  const numberNavigation = session && task && sessionDefinition && summary ? (
    <nav className="mock-number-list" aria-label="Номера учебного варианта">
      {session.taskIds.map((id, index) => {
        const entry = tasks.find((item) => item.id === id)!;
        const result = session.results[id];
        const status = finished ? entry.part === 2 ? session.selfScores[id] !== undefined ? "самооценка сохранена" : "нужна самооценка" : result?.correct ? "верно" : result?.valid ? "неверно" : "ответ не засчитан" : session.answers[id]?.trim() ? "есть ответ" : "без ответа";
        const badge = !finished ? null : entry.part === 2
          ? session.selfScores[id] === undefined ? "Оценить" : `${session.selfScores[id]}/${entry.scoring.maxPrimaryScore}`
          : `${result?.primaryScore ?? 0}/${entry.scoring.maxPrimaryScore}`;
        return (
          <button
            key={id}
            type="button"
            aria-current={session.position === index ? "step" : undefined}
            className={session.position === index ? "selected" : session.answers[id]?.trim() ? "has-answer" : ""}
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
          : "Авторские задания по предварительной структуре 2026 года. Это учебная тренировка, а не подтверждённый официальный пробник ФИПИ."}
      </PageIntro>
      {mock.storageWarning && <p className="info-note" role="alert">Браузер не разрешил сохранить данные или прежняя запись требует восстановления. Она не перезаписана. Текущая работа может сохраниться только до закрытия страницы.</p>}
      {mock.actionError && <div className="mock-error" role="alert"><p>{mock.actionError}</p>{session?.finishedAt !== null && session && <button type="button" className="button button-secondary" onClick={mock.retryPublish}>Сохранить результаты</button>}</div>}
      {!session ? (
        <>
          <section className="mock-card">
            <h2>Выбери экзамен</h2>
            <ExamPicker exam={selectedExam} onChange={(value) => { setSelectedExam(value); onExamChange?.(value); }} />
            <p>{definition?.title}. В учебном варианте — по одному заданию каждого доступного номера, с общей исходной ситуацией для ОГЭ №1–5.</p>
            <p><Clock3 size={18} aria-hidden="true" /> {mockDurationMinutes} минут на выполнение. {mockDurationNote}</p>
            <p>Ответы сохраняются в этом браузере. Можно пропускать задания и возвращаться к ним. Решения откроются только после завершения. Вторую часть ты оцениваешь самостоятельно.</p>
            {!coverage?.canStart && <p className="info-note">Вариант пока недоступен: {coverage?.missingNumbers.length ? `нет проверенных авторских задач для №${coverage.missingNumbers.join(", №")}. ` : ""}{coverage?.missingSharedCondition ? "Нет согласованной группы условий ОГЭ №1–5. " : ""}Задачи другого экзамена не подставляются.</p>}
            {unfinished ? <button type="button" className="button button-primary" onClick={() => mock.open(unfinished.id)}>Продолжить начатый вариант <ArrowRight size={18} aria-hidden="true" /></button> : <button type="button" className="button button-primary" disabled={!definition || !coverage?.canStart} onClick={() => { if (definition) mock.start(definition); }}>Начать учебный вариант <ArrowRight size={18} aria-hidden="true" /></button>}
          </section>
          <section className="mock-card">
            <h2>История вариантов</h2>
            <p>Только на этом устройстве, без аккаунта и облачной синхронизации. Базовые результаты каждого варианта доступны бесплатно.</p>
            {history.length === 0 ? <p className="info-note">Завершённые варианты появятся здесь.</p> : <ul className="mock-history">
              {(showAllHistory ? history : history.slice(0, 10)).map((entry) => {
                const title = definitions.find((item) => item.versionId === entry.examVersionId)?.title;
                const score = mockScoreSummary(entry, tasks);
                return <li key={entry.id}><button type="button" onClick={() => mock.open(entry.id)}><span><strong>{title}</strong><span>{new Date(entry.startedAt).toLocaleString("ru-RU")}</span></span><span>{score.automatic} автоматически{score.self ? ` + ${score.self} самооценка` : ""}<ArrowRight size={18} aria-hidden="true" /></span></button></li>;
              })}
            </ul>}
            {!showAllHistory && history.length > 10 && <button type="button" className="text-button" onClick={() => setShowAllHistory(true)}>Показать всю историю</button>}
          </section>
        </>
      ) : task && sessionDefinition && summary ? (
        <>
          <section className="mock-card mock-session-header">
            <h2>{sessionDefinition.title}</h2>
            <p className="mock-clock"><Clock3 size={21} aria-hidden="true" />{finished ? `Время работы: ${duration(elapsedMockMilliseconds(session, mock.now))}` : `Осталось ${duration(remainingMockMilliseconds(session, mock.now))}`}</p>
            {finished ? <>
              <p role="status">{session.finishReason === "timeout" ? "Учебное время истекло. Ответы сохранены." : "Вариант завершён. Ответы сохранены."}</p>
              <p>Первичные баллы за автопроверку: <strong>{summary.automatic}</strong> · самооценка второй части: <strong>{summary.self}</strong>.</p>
              <p>Сумма: {summary.total} из {summary.maximum} по предварительной сетке. {summary.pendingSelf > 0 ? `Осталось оценить заданий второй части: ${summary.pendingSelf}.` : "Вторая часть отмечена как самооценка."} Это не тестовые баллы и не прогноз экзамена.</p>
            </> : <p>Введено ответов: {session.taskIds.filter((id) => session.answers[id]?.trim()).length} из {session.taskIds.length}. Переключение номеров сохраняет ввод.</p>}
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
            {task.part === 1 && <p id="mock-answer-format" className="mock-secondary">{task.answerRule.type === "set" ? "Все значения — через точку с запятой." : "Число, десятичная запятая или точка, обыкновенная дробь."}</p>}
            {finished && <>
              {task.part === 1 && <p className="mock-verdict" role="status">{session.results[task.id]?.correct ? "Верно" : session.results[task.id]?.valid ? "Неверно" : session.answers[task.id]?.trim() ? "Ответ не засчитан: неподходящий формат" : "Ответ не дан"} · {session.results[task.id]?.primaryScore ?? 0} из {task.scoring.maxPrimaryScore} первичных баллов</p>}
              {!session.revealedTaskIds.includes(task.id) ? <button type="button" className="button button-secondary" onClick={() => mock.reveal(task)}><ClipboardCheck size={19} aria-hidden="true" />{task.part === 2 ? "Проверить самостоятельно" : "Посмотреть решение"}</button> : <Solution task={task} />}
              {session.revealedTaskIds.includes(task.id) && task.part === 2 && task.scoring.maxPrimaryScore !== null && <div className="mock-self-assessment">
                <h3>Самооценка</h3>
                <p>Авторские ориентиры помогают сравнить ход решения. Они не заменяют официальные критерии или проверку преподавателем.</p>
                <fieldset><legend>Выбери баллы за своё решение</legend><div className="mock-score-options">{Array.from({ length: task.scoring.maxPrimaryScore + 1 }, (_, score) => <label key={score}><input type="radio" name={`self-${task.id}`} value={score} checked={(selfDrafts[`${session.id}-${task.id}`] ?? session.selfScores[task.id] ?? 0) === score} onChange={() => setSelfDrafts((prior) => ({ ...prior, [`${session.id}-${task.id}`]: score }))} /><span>{score}</span></label>)}</div></fieldset>
                <p>Самооценка: {selfDrafts[`${session.id}-${task.id}`] ?? session.selfScores[task.id] ?? 0} из {task.scoring.maxPrimaryScore} баллов.</p>
                <button type="button" className="button button-primary" onClick={() => mock.assess(task, selfDrafts[`${session.id}-${task.id}`] ?? session.selfScores[task.id] ?? 0)}><Check size={18} aria-hidden="true" />Подтвердить самооценку</button>
                {session.selfScores[task.id] !== undefined && <p role="status">Сохранена самооценка: {session.selfScores[task.id]} из {task.scoring.maxPrimaryScore}. При исправлении XP меняются только на разницу.</p>}
              </div>}
              {session.revealedTaskIds.includes(task.id) && <button type="button" className="text-button" onClick={() => onOpenTheory(task.topicId)}><BookOpen size={18} aria-hidden="true" />Повторить связанную теорию</button>}
            </>}
            <div className="mock-task-navigation">
              <button type="button" className="button button-secondary" disabled={session.position === 0} onClick={() => mock.position(session.position - 1)}><ArrowLeft size={18} aria-hidden="true" />Предыдущее</button>
              <button type="button" className="button button-secondary" disabled={session.position === session.taskIds.length - 1} onClick={() => mock.position(session.position + 1)}>Следующее <ArrowRight size={18} aria-hidden="true" /></button>
            </div>
          </article>
          {!finished && <section className="mock-card">
            {!confirmFinish ? <button type="button" className="button button-primary" onClick={() => setConfirmFinish(true)}>Завершить вариант</button> : <div className="mock-finish-confirm"><h2>Завершить сейчас?</h2><p>Введённые ответы будут проверены. Неотвеченные задания получат 0 баллов; вторую часть можно будет оценить самостоятельно.</p><div><button type="button" className="button button-secondary" onClick={() => setConfirmFinish(false)}>Продолжить работу</button><button type="button" className="button button-primary" onClick={() => { mock.finish(); setConfirmFinish(false); }}>Завершить и проверить</button></div></div>}
          </section>}
          {phoneLayout && (
            <details className="mock-source-note">
              <summary>О формате учебного варианта</summary>
              <p>Авторские задания по предварительной структуре 2026 года. Это учебная тренировка, а не подтверждённый официальный пробник ФИПИ.</p>
              <p>{mockDurationNote}</p>
              <p>Ответы сохраняются в этом браузере. Вторую часть ты оцениваешь самостоятельно.</p>
            </details>
          )}
        </>
      ) : <p className="info-note">Материал этого варианта временно недоступен. Сохранённые данные не удалены.</p>}
    </section>
  );
}

function Solution({ task }: { task: Task }) {
  return <section className="mock-solution"><h3>Авторский образец решения</h3><ol>{task.solution.map((step, index) => <li key={index}><p>{step.text}</p>{step.latex && <MathFormula latex={step.latex} />}</li>)}</ol><p><strong>Ответ:</strong> {task.answerDisplay}</p>{task.selfCheckNotes && <><h3>На что обратить внимание при самооценке</h3><ul>{task.selfCheckNotes.map((note) => <li key={note}>{note}</li>)}</ul></>}{task.criteriaSourceUrl && <p><a className="text-button" href={task.criteriaSourceUrl} target="_blank" rel="noreferrer">Материалы ФИПИ</a> · официальные критерии этого авторского задания не опубликованы.</p>}</section>;
}
