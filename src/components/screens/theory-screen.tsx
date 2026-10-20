"use client";

import { useState } from "react";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { MathFormula } from "@/components/math-formula";
import { ExamPicker, PageIntro } from "@/components/ui";
import type { Exam } from "@/lib/navigation";
import { getTheoryTopic, theoryTopics } from "@/lib/theory";
import { getExamDefinition } from "@/lib/exams";
import { getPracticeTasks } from "@/lib/tasks";
import "@/components/theory-screen.css";

type TheoryScreenProps = {
  exam: Exam;
  topicId?: string;
  materialId?: string;
  focusMode?: boolean;
  onExamChange: (exam: Exam) => void;
  onOpenTopic: (topicId: string) => void;
  onOpenMaterial: (topicId: string, materialId: string) => void;
  onPractice: (topicId: string) => void;
  onBack: () => void;
};

export function TheoryScreen({
  exam,
  topicId,
  materialId,
  focusMode = false,
  onExamChange,
  onOpenTopic,
  onOpenMaterial,
  onPractice,
  onBack,
}: TheoryScreenProps) {
  const [query, setQuery] = useState("");
  const [part, setPart] = useState<1 | 2>(1);
  const [number, setNumber] = useState("");
  const definition = getExamDefinition({
    examType: exam,
    level: exam === "ЕГЭ" ? "profile" : undefined,
  });
  const normalizedQuery = query
    .trim()
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е");
  const matchingTaskTopics = number
    ? new Set(
        getPracticeTasks({
          examType: exam,
          level: exam === "ЕГЭ" ? "profile" : undefined,
          examNumber: Number(number),
        }).map((task) => task.topicId),
      )
    : undefined;
  const visibleTopics = theoryTopics.filter(
    (item) =>
      item.examType.includes(exam) &&
      item.part === part &&
      (!matchingTaskTopics || matchingTaskTopics.has(item.id)) &&
      (!normalizedQuery ||
        [item.title, item.description, ...item.sections.map((section) => section.title)]
          .join(" ")
          .toLocaleLowerCase("ru")
          .replaceAll("ё", "е")
          .includes(normalizedQuery)),
  );
  const topic = topicId ? getTheoryTopic(topicId) : undefined;
  const isMaterial = Boolean(topic && materialId === topic.materialId);
  const unavailable = Boolean(
    (topicId && !topic) || (materialId && !isMaterial),
  );

  if (unavailable) {
    return (
      <section className="theory-page">
        <button type="button" className="back-link" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" /> Назад
        </button>
        <PageIntro eyebrow="ТЕОРИЯ" title="Материал не найден">
          Возможно, ссылка устарела. Вернитесь к выбору темы и откройте конспект
          снова.
        </PageIntro>
        {topic && (
          <button
            type="button"
            className="primary-button"
            onClick={() => onOpenTopic(topic.id)}
          >
            К теме «{topic.title}» <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </section>
    );
  }

  return (
    <section
      className={`theory-page${focusMode && topic ? " theory-reading-focus" : ""}`}
    >
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        {isMaterial ? "К теме" : topic ? "К списку тем" : "Назад"}
      </button>

      {!topic ? (
        <>
          <PageIntro eyebrow="БИБЛИОТЕКА ЗНАНИЙ" title="Теория">
            Основные правила, формулы и пошаговые примеры по математике.
          </PageIntro>
          <ExamPicker
            exam={exam}
            onChange={(value) => {
              setNumber("");
              setPart(1);
              onExamChange(value);
            }}
          />
          <div className="theory-tools">
            <label className="theory-search">
              <span>Найти тему</span>
              <span className="theory-search-field">
                <Search size={20} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Например, дроби или уравнения"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </span>
            </label>
            <div
              className="segmented theory-part-switch"
              role="group"
              aria-label="Часть экзамена"
            >
              {([1, 2] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={part === value ? "selected" : ""}
                  aria-pressed={part === value}
                  onClick={() => {
                    setPart(value);
                    setNumber("");
                  }}
                >
                  Часть {value}
                </button>
              ))}
            </div>
            <label className="theory-number-filter">
              <span>Материалы к номеру</span>
              <select
                value={number}
                onChange={(event) => setNumber(event.target.value)}
              >
                <option value="">Все темы части {part}</option>
                {definition?.numbers
                  .filter((item) => item.part === part)
                  .map((item) => (
                    <option key={item.number} value={item.number}>
                      №{item.number} · {item.title}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="theory-section-heading">
            <span className="eyebrow">
              {exam} · МАТЕМАТИКА{exam === "ЕГЭ" ? " · ПРОФИЛЬ" : ""} · ЧАСТЬ {part}
            </span>
            <h2>Выберите тему</h2>
            <p>
              Авторские конспекты по школьной базе для ОГЭ и ЕГЭ. Связь с
              номерами предварительная: это демобиблиотека, а не полный
              экзаменационный курс.
            </p>
          </div>
          <div className="topic-grid">
            {visibleTopics.map((item, index) => (
                <button
                  type="button"
                  className="theory-topic-card"
                  key={item.id}
                  onClick={() => onOpenTopic(item.id)}
                >
                  <span className="theory-topic-top">
                    <span className="note-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <ChevronRight size={20} aria-hidden="true" />
                  </span>
                  <strong>{item.title}</strong>
                  <span className="theory-topic-description">
                    {item.description}
                  </span>
                  <span className="theory-topic-meta">
                    <BookOpen size={15} aria-hidden="true" /> Конспект и{" "}
                    {item.examples.length} разбора · ≈{item.readMinutes} мин
                  </span>
                </button>
              ))}
          </div>
          {visibleTopics.length === 0 && (
            <section className="theory-empty" role="status">
              <BookOpen size={26} aria-hidden="true" />
              <h2>
                {part === 2
                  ? "Глубокие материалы ещё готовятся"
                  : "Подходящий материал пока не найден"}
              </h2>
              <p>
                {part === 2
                  ? "Для второй части нужны отдельные методы, примеры оформления и проверенные источники. Общую базу можно повторить в первой части; официальные критерии пока не опубликованы в приложении."
                  : number
                    ? "В демобиблиотеке пока нет связанного конспекта к этому номеру. Открой все темы или измени поиск."
                    : "Попробуй более короткий запрос или открой все темы."}
              </p>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setPart(1);
                  setNumber("");
                  setQuery("");
                }}
              >
                К базовым темам
              </button>
            </section>
          )}
        </>
      ) : (
        <>
          <nav className="lesson-breadcrumbs" aria-label="Путь к материалу">
            <span>{exam}</span>
            <ChevronRight size={13} aria-hidden="true" />
            <span>Математика{exam === "ЕГЭ" ? " · профиль" : ""}</span>
            <ChevronRight size={13} aria-hidden="true" />
            <span>Школьная база · часть {topic.part}</span>
            <ChevronRight size={13} aria-hidden="true" />
            <span aria-current={!isMaterial ? "page" : undefined}>
              {topic.title}
            </span>
            {isMaterial && (
              <>
                <ChevronRight size={13} aria-hidden="true" />
                <span aria-current="page">Конспект</span>
              </>
            )}
          </nav>
          <PageIntro
            eyebrow={
              isMaterial ? "КОНСПЕКТ · МАТЕМАТИКА" : `${exam} · МАТЕМАТИКА`
            }
            title={topic.title}
          >
            {topic.description}
          </PageIntro>

          {isMaterial ? (
            <article
              className="topic-lesson"
              aria-label={`Конспект: ${topic.title}`}
            >
              <div className="lesson-intro-note">
                <BookOpen size={19} aria-hidden="true" />
                <p>
                  {topic.source.label} · около {topic.readMinutes} минут.
                  Школьная база для ОГЭ и ЕГЭ; это не официальный материал ФИПИ.
                </p>
              </div>
              {topic.sections.map((section, index) => (
                <section className="lesson-section" key={section.title}>
                  <span className="eyebrow">ШАГ {index + 1}</span>
                  <h2>{section.title}</h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.formulas?.map((latex) => (
                    <MathFormula key={latex} latex={latex} />
                  ))}
                </section>
              ))}

              <section
                className="lesson-examples"
                aria-labelledby="lesson-examples-title"
              >
                <span className="eyebrow">ОТ ПРАВИЛА К РЕШЕНИЮ</span>
                <h2 id="lesson-examples-title">Разберём на примерах</h2>
                {topic.examples.map((example, index) => (
                  <article className="lesson-example" key={example.title}>
                    <span className="lesson-example-label">
                      Пример {index + 1}
                    </span>
                    <h3>{example.title}</h3>
                    <ol className="example-steps">
                      {example.steps.map((step, stepIndex) => (
                        <li key={stepIndex}>
                          <p>{step.text}</p>
                          {step.latex && <MathFormula latex={step.latex} />}
                        </li>
                      ))}
                    </ol>
                    <div className="example-answer">
                      <Check size={17} aria-hidden="true" />
                      <span>
                        Ответ: <strong>{example.answer}</strong>
                      </span>
                    </div>
                  </article>
                ))}
              </section>

              <section
                className="lesson-difficulties"
                aria-labelledby="lesson-difficulties-title"
              >
                <Lightbulb size={22} aria-hidden="true" />
                <div>
                  <h2 id="lesson-difficulties-title">
                    На что обратить внимание
                  </h2>
                  <ul>
                    {topic.difficulties.map((difficulty) => (
                      <li key={difficulty}>{difficulty}</li>
                    ))}
                  </ul>
                </div>
              </section>
              <TheoryPrerequisites ids={topic.prerequisites} onOpenTopic={onOpenTopic} />
              <div className="lesson-practice">
                <div>
                  <h2>Теперь твоя очередь</h2>
                  <p>Закрепи правила на заданиях по этой теме.</p>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onPractice(topic.id)}
                >
                  Перейти к заданиям <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </article>
          ) : (
            <div className="topic-overview">
              <section className="topic-overview-card">
                <span className="feature-icon">
                  <BookOpen size={25} aria-hidden="true" />
                </span>
                <span className="theory-author-label">
                  Авторский конспект · школьная база · ≈{topic.readMinutes} мин
                </span>
                <h2>Коротко о главном</h2>
                <p>{topic.sections[0]?.body[0]}</p>
                {topic.sections[0]?.formulas?.slice(0, 1).map((latex) => (
                  <MathFormula key={latex} latex={latex} />
                ))}
                <p>
                  Внутри — основные правила, {topic.examples.length} разобранных
                  примера и частые затруднения.
                </p>
                <ul className="topic-outline">
                  {topic.sections.map((section) => (
                    <li key={section.title}>
                      <Check size={16} aria-hidden="true" />
                      {section.title}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onOpenMaterial(topic.id, topic.materialId)}
                >
                  Разобрать подробнее <ArrowRight size={18} aria-hidden="true" />
                </button>
              </section>
              <TheoryPrerequisites ids={topic.prerequisites} onOpenTopic={onOpenTopic} />
              <div className="info-note">
                <Lightbulb size={20} aria-hidden="true" />
                <p>
                  Эта тема полезна и для ОГЭ, и для ЕГЭ. В демоверсии показаны
                  общие основы, без обещания полного покрытия экзамена.
                </p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => onPractice(topic.id)}
              >
                Сразу перейти к заданиям{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}


function TheoryPrerequisites({
  ids,
  onOpenTopic,
}: {
  ids: string[];
  onOpenTopic: (id: string) => void;
}) {
  if (ids.length === 0) return null;
  return (
    <section className="topic-prerequisites" aria-label="Темы для повторения базы">
      <span className="eyebrow">ЕСЛИ НУЖНО ОСВЕЖИТЬ БАЗУ</span>
      <h2>Что пригодится</h2>
      <div className="prerequisite-links">
        {ids.map((id) => {
          const prerequisite = getTheoryTopic(id);
          return prerequisite ? (
            <button
              type="button"
              className="text-button"
              key={id}
              onClick={() => onOpenTopic(id)}
            >
              {prerequisite.title}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : null;
        })}
      </div>
    </section>
  );
}
