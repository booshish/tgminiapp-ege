"use client";

import { useState } from "react";
import { ArrowRight, Bookmark as BookmarkIcon, BookOpen, CalendarClock, Check, RotateCcw, Trash2 } from "lucide-react";
import { PageIntro } from "@/components/ui";
import { tasks, taskTopicLabels, type Exam, type Task } from "@/lib/tasks";
import { theoryTopics, getTheoryTopic } from "@/lib/theory";
import type { LearningEvent } from "@/lib/learning-events";
import type { StudyToolsController } from "@/hooks/use-study-tools";
import {
  getDifficultyRecommendations, getMistakes, getReviewItems, resolveBookmark,
} from "@/lib/study-tools";
import "@/components/study-tools.css";

type StudyToolsScreenProps = {
  mode: "favorites" | "mistakes" | "review";
  events: readonly LearningEvent[];
  isPremium: boolean;
  tools: StudyToolsController;
  onTask: (taskId: string) => void;
  onTheory: (topicId: string) => void;
  onPremium: () => void;
};
const catalog = { tasks, topics: theoryTopics, resolveTopic: getTheoryTopic };
const titleForTopic = (id: string) => getTheoryTopic(id)?.title ?? taskTopicLabels[id] ?? "Практика по теме";
const numberLabel = (task: Task) => task.examNumber === null ? "Базовое упражнение" : `№${task.examNumber}`;
const examLabel = (exam: Exam) => exam === "ЕГЭ" ? "ЕГЭ · Математика · Профиль" : "ОГЭ · Математика";

export function StudyToolsScreen({ mode, events, isPremium, tools, onTask, onTheory, onPremium }: StudyToolsScreenProps) {
  const [exam, setExam] = useState<"all" | Exam>("all");
  const [kind, setKind] = useState<"all" | "task" | "theory">("all");
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const title = mode === "favorites" ? "Избранное" : mode === "mistakes" ? "Мои ошибки" : "Умное повторение";
  const description = mode === "favorites"
    ? "Сохраняй задания и конспекты, чтобы вернуться к ним позже."
    : mode === "mistakes"
      ? "Ручной возврат к заданиям, в которых был неверный ответ."
      : "Повторение навыков на новых задачах и добровольные рекомендации по сложности.";

  if (mode === "review" && !isPremium) return (
    <section className="study-tools-page">
      <PageIntro eyebrow="ПОВТОРЕНИЕ НАВЫКОВ" title={title}>{description}</PageIntro>
      <section className="study-tool-card premium-gate">
        <CalendarClock size={30} aria-hidden="true" />
        <h2>Новые похожие задачи — в Premium</h2>
        <p>Интервалы повторения меняются по результатам самостоятельных ответов. Подбор предлагает новые варианты по тому же навыку. Выбор остаётся за тобой.</p>
        <p>Ручной список «Мои ошибки», теория и обычная практика бесплатны.</p>
        <button type="button" className="button button-primary" onClick={onPremium}>Подробнее о Premium <ArrowRight size={18} aria-hidden="true" /></button>
      </section>
    </section>
  );

  const bookmarks = tools.bookmarks.filter((item) => (exam === "all" || item.examType === exam) && (kind === "all" || item.kind === kind));
  const mistakes = mode === "mistakes" ? getMistakes(events, tasks).filter((item) =>
    (exam === "all" || item.task.examType[0] === exam) && (!unresolvedOnly || !item.corrected)) : [];
  const reviews = mode === "review" ? getReviewItems(events, tasks, isPremium).filter((item) => exam === "all" || item.task.examType[0] === exam) : [];
  const recommendations = mode === "review" ? getDifficultyRecommendations(events, tasks, theoryTopics, isPremium)
    .filter((item) => exam === "all" || item.task.examType[0] === exam) : [];

  return (
    <section className="study-tools-page">
      <PageIntro eyebrow={mode === "review" ? "ДЕМОНСТРАЦИОННЫЙ PREMIUM" : "МОЯ ПОДГОТОВКА"} title={title}>{description}</PageIntro>
      <p className="study-tools-local-note">Сохраняется только в этом браузере. Аккаунты и перенос между устройствами пока не подключены.</p>
      {tools.storageWarning && <p className="study-tools-warning" role="alert">Не удалось прочитать или сохранить закладки. Изменения могут остаться только до закрытия страницы; прежние недоступные данные автоматически не перезаписываются.</p>}
      <div className="study-tools-filters">
        <label>Экзамен
          <select aria-label="Экзамен" value={exam} onChange={(event) => setExam(event.target.value as "all" | Exam)}>
            <option value="all">ОГЭ и ЕГЭ</option><option value="ОГЭ">ОГЭ</option><option value="ЕГЭ">ЕГЭ · Профиль</option>
          </select>
        </label>
        <label>Предмет
          <select value="math" aria-label="Предмет: математика" disabled><option value="math">Математика</option></select>
        </label>
        {mode === "favorites" && <label>Материал
          <select aria-label="Материал" value={kind} onChange={(event) => setKind(event.target.value as "all" | "task" | "theory")}>
            <option value="all">Всё избранное</option><option value="task">Задания</option><option value="theory">Теория</option>
          </select>
        </label>}
      </div>

      {mode === "favorites" && (!tools.ready ? <p role="status">Загружаем закладки…</p> : bookmarks.length === 0 ? (
        <div className="study-tool-card study-tools-empty"><BookmarkIcon size={28} aria-hidden="true" /><h2>Здесь пока нет материалов</h2><p>На странице задания или конспекта нажми «Сохранить». Если закладки уже есть, попробуй другой фильтр.</p></div>
      ) : <div className="study-tools-list">{bookmarks.map((bookmark) => {
        const material = resolveBookmark(bookmark, catalog);
        if (!material) return null;
        const task = bookmark.kind === "task" ? tasks.find((item) => item.id === bookmark.itemId) : undefined;
        return <article className="study-tool-card" key={bookmark.key}>
          <span className="study-tool-meta">{examLabel(bookmark.examType)}{task ? ` · ${numberLabel(task)}` : " · Теория"}</span>
          <h2>{material.title}</h2>
          {task && <p>{titleForTopic(task.topicId)}</p>}
          <div className="study-tool-actions">
            <button type="button" className="button button-primary" onClick={() => bookmark.kind === "task" ? onTask(bookmark.itemId) : onTheory(bookmark.itemId)}>Открыть <ArrowRight size={18} aria-hidden="true" /></button>
            <button type="button" className="text-button" onClick={() => tools.removeBookmark(bookmark.key)} aria-label={`Убрать из избранного: ${material.title}`}><Trash2 size={17} aria-hidden="true" /> Убрать</button>
          </div>
        </article>;
      })}</div>)}

      {mode === "mistakes" && <>
        <label className="study-tools-checkbox"><input type="checkbox" checked={unresolvedOnly} onChange={(event) => setUnresolvedOnly(event.target.checked)} /> Только ещё не исправленные</label>
        {mistakes.length === 0 ? <div className="study-tool-card study-tools-empty"><Check size={28} aria-hidden="true" /><h2>Подходящих ошибок пока нет</h2><p>Здесь появятся задания после неверной автоматической проверки. Самооценка второй части в этот список не входит.</p></div>
          : <div className="study-tools-list">{mistakes.map(({ task, corrected }) => <article className="study-tool-card" key={task.id}>
            <span className="study-tool-meta">{examLabel(task.examType[0])} · {numberLabel(task)}</span>
            <h2>{task.title}</h2><p>{titleForTopic(task.topicId)}</p>
            {corrected && <span className="tag">Ответ исправлен</span>}
            <div className="study-tool-actions">
              <button type="button" className="button button-primary" onClick={() => onTask(task.id)}>Открыть задание <ArrowRight size={18} aria-hidden="true" /></button>
              {getTheoryTopic(task.topicId) && <button type="button" className="text-button" onClick={() => onTheory(getTheoryTopic(task.topicId)!.id)}><BookOpen size={18} aria-hidden="true" /> Связанная теория</button>}
            </div>
          </article>)}</div>}
      </>}

      {mode === "review" && <>
        <div className="study-tool-card study-review-explanation">
          <h2>Как выбирается повторение</h2>
          <p>После ошибки навык возвращается через день. Верный первый ответ на новый вариант увеличивает интервал до 3, 7, 14 и 30 дней; новая ошибка возвращает его к одному дню. Самооценка, повторные проверки и ответы после просмотра решения не меняют интервалы.</p>
          <p>Это прозрачное учебное правило, а не диагноз. Банк конечный: если новых аналогичных задач нет, предлагаем теорию и прямо сообщаем об ограничении.</p>
        </div>
        <h2 className="study-tools-section-title">Что повторить</h2>
        {reviews.length === 0 ? <div className="study-tool-card"><p>Пока нет навыков с ошибками в самостоятельных проверках. Продолжай обычную практику: рекомендации появятся по реальным ответам.</p></div>
          : <div className="study-tools-list">{reviews.map((item) => <article className="study-tool-card" key={item.key}>
            <span className="study-tool-meta">{examLabel(item.task.examType[0])} · {numberLabel(item.task)}</span>
            <h3>{titleForTopic(item.task.topicId)}</h3>
            <p>{item.due ? "Можно повторить сейчас" : `Следующее повторение: ${new Date(item.dueAt).toLocaleDateString("ru-RU")}`}</p>
            <div className="study-tool-actions">
              {getTheoryTopic(item.task.topicId) && <button type="button" className="text-button" onClick={() => onTheory(getTheoryTopic(item.task.topicId)!.id)}><BookOpen size={18} aria-hidden="true" /> Повторить теорию</button>}
              {item.nextTask ? <button type="button" className="button button-primary" onClick={() => onTask(item.nextTask!.id)}><RotateCcw size={17} aria-hidden="true" /> Новый похожий вариант</button> : <p className="muted">Новых похожих вариантов в банке пока нет. Можно повторить теорию; прежнюю задачу не выдаём за новую.</p>}
            </div>
          </article>)}</div>}
        <h2 className="study-tools-section-title">Подходящий следующий шаг</h2>
        <p className="study-tools-local-note">Рекомендации появляются после шести разных самостоятельных задач в теме. Сложность — авторская маркировка, пока без статистической калибровки.</p>
        {recommendations.length === 0 ? <div className="study-tool-card"><p>Пока недостаточно устойчивых данных или нет подходящего нового варианта. Сложность не меняется автоматически.</p></div>
          : <div className="study-tools-list">{recommendations.map((item) => <article className="study-tool-card" key={item.key}>
            <span className="study-tool-meta">{examLabel(item.task.examType[0])}</span><h3>{titleForTopic(item.topicId)}</h3>
            <p>{item.kind === "advance" ? "Можно попробовать задачу сложнее: в последних шести независимых ответах как минимум пять верных." : "В последних шести независимых ответах было несколько ошибок. Можно сначала повторить базовое объяснение."}</p>
            <div className="study-tool-actions">
              <button type="button" className="text-button" onClick={() => onTheory(item.theoryTopicId)}><BookOpen size={18} aria-hidden="true" /> {item.kind === "advance" ? "Теория темы" : "Повторить основы"}</button>
              {item.nextTask && <button type="button" className="button button-primary" onClick={() => onTask(item.nextTask!.id)}>Выбрать предложенную задачу <ArrowRight size={18} aria-hidden="true" /></button>}
            </div>
          </article>)}</div>}
      </>}
    </section>
  );
}
