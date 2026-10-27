"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";
import { MathFormula } from "@/components/math-formula";
import { ExamPicker, PageIntro } from "@/components/ui";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import type { Exam } from "@/lib/navigation";
import { getTheoryTopic, getPublishedTheoryTopics } from "@/lib/theory";
import { getExamDefinition, type ExamLevel } from "@/lib/exams";
import { getPracticeTasks } from "@/lib/tasks";
import { subjectTitle, type SubjectId } from "@/lib/subjects";
import "@/components/theory-screen.css";

type TheoryScreenProps = {
  exam: Exam;
  subjectId?: SubjectId;
  onSubjectChange?: (subject: SubjectId) => void;
  level?: ExamLevel | null;
  onLevelChange?: (level: ExamLevel) => void;
  topicId?: string;
  materialId?: string;
  focusMode?: boolean;
  onExamChange: (exam: Exam) => void;
  onOpenTopic: (topicId: string) => void;
  onOpenMaterial: (topicId: string, materialId: string) => void;
  onPractice: (topicId: string) => void;
  onBack: () => void;
  bookmarked?: boolean;
  onBookmark?: () => void;
};

export function TheoryScreen({
  exam,
  subjectId = "math",
  onSubjectChange,
  level = "profile",
  onLevelChange,
  topicId,
  materialId,
  focusMode = false,
  onExamChange,
  onOpenTopic,
  onOpenMaterial,
  onPractice,
  onBack,
  bookmarked = false,
  onBookmark,
}: TheoryScreenProps) {
  const isPhone = usePhoneLayout();
  const [query, setQuery] = useState("");
  const [part, setPart] = useState<1 | 2>(1);
  const [number, setNumber] = useState("");
  const definition = getExamDefinition({
    examType: exam,
    subjectId,
    level: subjectId === "math" && exam === "ЕГЭ" ? level ?? "profile" : undefined,
  });
  const normalizedQuery = query
    .trim()
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е");
  const matchingTaskTopics = number
    ? new Set(
        getPracticeTasks({
          examType: exam,
          subjectId,
          level: subjectId === "math" && exam === "ЕГЭ" ? level ?? "profile" : undefined,
          examNumber: Number(number),
        }).map((task) => getTheoryTopic(task.activeTheoryTopicId ?? task.topicId)?.id ?? task.topicId),
      )
    : undefined;
  const visibleTopics = getPublishedTheoryTopics().filter(
    (item) =>
      item.examType.includes(exam) &&
      item.subjectId === subjectId &&
      (subjectId !== "math" || item.coverage === "foundation" || exam !== "ЕГЭ" || (item.level ?? "profile") === (level ?? "profile")) &&
      item.part === part &&
      (!matchingTaskTopics || item.examNumbers?.includes(Number(number)) || (item.coverage === "foundation" && matchingTaskTopics.has(item.id))) &&
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
    (topicId && (!topic || topic.subjectId !== subjectId || !topic.examType.includes(exam) ||
      (subjectId === "math" && topic.coverage !== "foundation" && exam === "ЕГЭ" && (topic.level ?? "profile") !== (level ?? "profile")))) || (materialId && !isMaterial),
  );
  const levelCaption = subjectId === "math" && exam === "ЕГЭ" ? level === "base" ? " · база" : " · профиль" : "";

  const searchField = (
    <label className="theory-search">
      <span>Найти тему</span>
      <span className="theory-search-field">
        <Search size={20} aria-hidden="true" />
        <input
          type="search"
          placeholder={subjectId === "math" ? "Например, дроби или уравнения" : "Название темы или метода"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </span>
    </label>
  );

  const sourceDetails = topic ? (
    <details className="lesson-intro-note lesson-source-details">
      <summary>О материале <ChevronDown size={17} aria-hidden="true" /></summary>
      <p>
        {topic.source.label} · около {topic.readMinutes} минут.
        {topic.requirementsReference && <><br /><a href={topic.requirementsReference.url} target="_blank" rel="noreferrer">Источник требований: проект {topic.requirementsReference.year}, PDF с. {topic.requirementsReference.pdfPage}</a>. Прочитана копия; это не разрешение копировать задания.</>}
        {topic.coverage === "foundation"
          ? " Школьная база для ОГЭ и ЕГЭ."
          : ` ${exam}${levelCaption}, часть ${topic.part}.`}
        {" "}Это не официальный материал ФИПИ.
        {topic.part === 2 && " Пояснения по оформлению — авторские, официальные критерии здесь не воспроизводятся."}
      </p>
    </details>
  ) : null;

  const overviewContents = topic ? (
    <>
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
    </>
  ) : null;

  const overviewNote = topic ? (
    <div className="info-note">
      <Lightbulb size={20} aria-hidden="true" />
      <p>
        {topic.coverage === "foundation"
          ? "Базовая тема пригодится в разных экзаменационных задачах. Для практики выбери нужный экзамен."
          : "Разобраны отдельные методы и авторские примеры. Полный перечень подтипов и официальные критерии требуют отдельной сверки ФИПИ."}
      </p>
    </div>
  ) : null;

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
      className={`theory-page${topic ? " theory-reading-page" : " theory-catalog-page"}${focusMode && topic ? " theory-reading-focus" : ""}`}
    >
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        {isMaterial ? "К теме" : topic ? "К списку тем" : "Назад"}
      </button>

      {!topic ? (
        <>
          <PageIntro eyebrow="БИБЛИОТЕКА ЗНАНИЙ" title="Теория">
            {subjectId === "math" ? "Основные правила, формулы и пошаговые примеры по математике." : `Оригинальные объяснения и примеры: ${subjectTitle(subjectId)}. Не официальный банк.`}
          </PageIntro>
          {isPhone && searchField}
          <ExamPicker
            exam={exam}
            subjectId={subjectId}
            onSubjectChange={onSubjectChange ? (value) => { setNumber(""); setPart(1); onSubjectChange(value); } : undefined}
            onChange={(value) => {
              setNumber("");
              setPart(1);
              onExamChange(value);
            }}
          />
          <div className="theory-tools">
            {subjectId === "math" && exam === "ЕГЭ" && onLevelChange && <label className="theory-number-filter">
              <span>Уровень математики</span>
              <select aria-label="Уровень математики в теории" value={level ?? "profile"} onChange={(event) => {
                setPart(1); setNumber(""); onLevelChange(event.target.value as ExamLevel);
              }}>
                <option value="base">Базовый</option><option value="profile">Профильный</option>
              </select>
            </label>}
            {!isPhone && searchField}
            <div
              className="segmented theory-part-switch"
              role="group"
              aria-label="Часть экзамена"
            >
              {([1, 2] as const).filter((value) => definition?.numbers.some((entry) => entry.part === value)).map((value) => (
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
              {exam} · {subjectTitle(subjectId).toLocaleUpperCase("ru")}{levelCaption.toLocaleUpperCase("ru")} · ЧАСТЬ {part}
            </span>
            <h2>Выберите тему</h2>
            {!isPhone && <p>
              {subjectId === "math" ? "Авторские материалы по номерам проекта 2027 и школьной базе. Привязка проверена по совместимости; отдельные методы не означают полного охвата всех экзаменационных подтипов." : "Авторские учебные материалы по прочитанным разделам проекта 2027. Это не полный курс и не утверждённые критерии экзамена; источник требований указан в конспекте."}
            </p>}
          </div>
          <div className="topic-grid">
            {visibleTopics.length === 0 && <p className="info-note">Для выбранного предмета и фильтра готовых конспектов пока нет. Математика не подставляется вместо другого предмета.</p>}
            {visibleTopics.map((item, index) => (
                <button
                  type="button"
                  className="theory-topic-card"
                  key={item.id}
                  onClick={() => onOpenTopic(item.id)}
                >
                  {isPhone ? <>
                    <BookOpen className="theory-topic-book" size={22} aria-hidden="true" />
                    <span className="theory-topic-copy">
                      <strong>{item.title}</strong>
                      <span className="theory-topic-meta">
                        {item.examNumbers?.[0] ? `№${item.examNumbers[0]} · ` : "Школьная база · "}
                        ≈{item.readMinutes} мин
                      </span>
                    </span>
                    <ChevronRight size={19} aria-hidden="true" />
                  </> : <>
                  <span className="theory-topic-top">
                    <span className="note-number">
                      {item.examNumbers?.[0] ? `№${item.examNumbers[0]}` : String(index + 1).padStart(2, "0")}
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
                  </>}
                </button>
              ))}
          </div>

          {visibleTopics.length === 0 && (
            <section className="theory-empty" role="status">
              <BookOpen size={26} aria-hidden="true" />
              <h2>Подходящий материал пока не найден</h2>
              <p>
                {number
                  ? "Попробуй убрать поисковый запрос или открыть все материалы выбранной части."
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
          {isPhone && <details className="theory-mobile-details theory-catalog-about">
            <summary>О материалах <ChevronDown size={17} aria-hidden="true" /></summary>
            <p>{subjectId === "math" ? "Авторские материалы по номерам проекта 2027 и школьной базе. Привязка проверена по совместимости; отдельные методы не означают полного охвата всех экзаменационных подтипов." : "Авторские учебные материалы по проекту 2027. Это не полный курс и не официальные критерии; источник указан в конспекте."}</p>
          </details>}
        </>
      ) : (
        <>
          <nav className="lesson-breadcrumbs" aria-label="Путь к материалу">
            {isPhone ? <span>
              {exam} · {subjectTitle(subjectId)}{levelCaption} · Часть {topic.part}
              {topic.examNumbers?.[0] ? ` · №${topic.examNumbers[0]}` : " · Школьная база"}
            </span> : <>
            <span>{exam}</span>
            <ChevronRight size={13} aria-hidden="true" />
            <span>{subjectTitle(subjectId)}{levelCaption}</span>
            <ChevronRight size={13} aria-hidden="true" />
            <span>{topic.coverage === "foundation" ? "Школьная база" : `№${topic.examNumbers?.[0]}`} · часть {topic.part}</span>
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
            </>}
          </nav>
          {!isPhone && (
          <PageIntro
            eyebrow={
              isMaterial ? `КОНСПЕКТ · ${subjectTitle(subjectId).toLocaleUpperCase("ru")}` : `${exam} · ${subjectTitle(subjectId).toLocaleUpperCase("ru")}`
            }
            title={topic.title}
          >
            {topic.description}
          </PageIntro>
          )}

          {isMaterial ? (
            <article
              className="topic-lesson"
              aria-label={`Конспект: ${topic.title}`}
            >
              <TheoryCardHeader full readMinutes={topic.readMinutes} bookmarked={bookmarked} onBookmark={onBookmark} />
              {isPhone && <TheoryMobileTitle title={topic.title} description={topic.description} />}
              {!isPhone && sourceDetails}
              {topic.sections.map((section, index) => (
                <section className="lesson-section" key={section.title}>
                  <span className="eyebrow">ШАГ {index + 1}</span>
                  <h2>{section.title}</h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.formulas?.map((latex) => (
                    <TheoryFormula key={latex} latex={latex} />
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
                          {step.latex && <TheoryFormula latex={step.latex} />}
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
              {topic.learningChecks && (
                <section className="lesson-section lesson-learning-checks" aria-labelledby="lesson-checks-title">
                  <h2 id="lesson-checks-title">Проверь себя</h2>
                  <p>{topic.learningChecks.summary}</p>
                  <h3>Порядок действий</h3>
                  <ol className="example-steps">
                    {topic.learningChecks.algorithm.map((step) => <li key={step}><p>{step}</p></li>)}
                  </ol>
                  {topic.learningChecks.checks.map((check) => (
                    <div className="lesson-learning-check" key={check.id}>
                      <p>{check.question}</p>
                      <details>
                        <summary>Сверить объяснение</summary>
                        <p><strong>{check.answer}</strong></p>
                        {check.latex && <TheoryFormula latex={check.latex} />}
                        <p>{check.explanation}</p>
                      </details>
                    </div>
                  ))}
                </section>
              )}
              <TheoryPrerequisites ids={topic.prerequisites} onOpenTopic={onOpenTopic} />
              {Boolean(topic.knowledgeChecks?.length) && <section className="lesson-section lesson-knowledge-checks" aria-label="Самопроверка знаний">
                <span className="eyebrow">ПРОВЕРЬ ПОНИМАНИЕ</span>
                <h2>Самопроверка знаний</h2>
                {topic.knowledgeChecks?.map((item) => <div key={item.question}>
                  <p>{item.question}</p>
                  {item.latex && <TheoryFormula latex={item.latex} />}
                  <details><summary>Показать ответ и объяснение</summary><p><strong>{item.answer}</strong></p><p>{item.explanation}</p></details>
                </div>)}
              </section>}
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
              {isPhone && sourceDetails}
            </article>
          ) : (
            <div className="topic-overview">
              <section className="topic-overview-card">
                <TheoryCardHeader readMinutes={topic.readMinutes} bookmarked={bookmarked} onBookmark={onBookmark} />
                {isPhone && <TheoryMobileTitle title={topic.title} description={topic.description} />}
                <h2>Коротко о главном</h2>
                <p>{topic.sections[0]?.body[0]}</p>
                {topic.sections[0]?.formulas?.slice(0, 1).map((latex) => (
                  <TheoryFormula key={latex} latex={latex} />
                ))}
                {!isPhone && overviewContents}
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onOpenMaterial(topic.id, topic.materialId)}
                >
                  Разобрать подробнее <ArrowRight size={18} aria-hidden="true" />
                </button>
                {isPhone && <>
                  <button type="button" className="button button-secondary theory-mobile-practice" onClick={() => onPractice(topic.id)}>
                    К заданиям по теме <ArrowRight size={17} aria-hidden="true" />
                  </button>
                  <details className="theory-mobile-details theory-contents-details">
                    <summary>В полном конспекте <ChevronDown size={17} aria-hidden="true" /></summary>
                    {overviewContents}
                  </details>
                </>}
              </section>
              <TheoryPrerequisites ids={topic.prerequisites} onOpenTopic={onOpenTopic} />
              {isPhone ? (
                <details className="theory-mobile-details theory-overview-about">
                  <summary>О материале <ChevronDown size={17} aria-hidden="true" /></summary>
                  {overviewNote}
                </details>
              ) : overviewNote}
              {!isPhone && <button
                type="button"
                className="text-button"
                onClick={() => onPractice(topic.id)}
              >
                Сразу перейти к заданиям{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </button>}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function TheoryMobileTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="theory-mobile-title">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function TheoryCardHeader({ full = false, readMinutes, bookmarked, onBookmark }: {
  full?: boolean;
  readMinutes: number;
  bookmarked: boolean;
  onBookmark?: () => void;
}) {
  return (
    <header className="theory-card-header">
      <div className="theory-card-meta">
        <BookOpen size={22} aria-hidden="true" />
        <span>{full ? "Полный конспект" : "Краткий конспект"}<small>Авторский · ≈{readMinutes} мин</small></span>
      </div>
      {onBookmark && <BookmarkButton active={bookmarked} onClick={onBookmark} savedLabel="Сохранено" />}
    </header>
  );
}

/** Keep KaTeX intact; only genuinely wide expressions receive a scrolling cue. */
function TheoryFormula({ latex }: { latex: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const element = container.current;
    const formula = element?.querySelector<HTMLElement>(".math-block");
    if (!element || !formula) return;
    let active = true;
    const measure = () => {
      if (active) setOverflows(formula.scrollWidth > formula.clientWidth + 1);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(formula);
    const content = formula.querySelector(".katex-display");
    if (content) observer?.observe(content);
    measure();
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => { active = false; observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [latex]);
  return <div className="theory-formula" ref={container}>
    <MathFormula latex={latex} />
    {overflows && <p className="theory-formula-scroll-note">Прокрути формулу по горизонтали ↔</p>}
  </div>;
}


function TheoryPrerequisites({
  ids,
  onOpenTopic,
}: {
  ids: string[];
  onOpenTopic: (id: string) => void;
}) {
  const isPhone = usePhoneLayout();
  if (ids.length === 0) return null;
  const links = (
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
  );
  if (isPhone) return <details className="theory-mobile-details theory-prerequisites-details">
    <summary>Что пригодится <ChevronDown size={17} aria-hidden="true" /></summary>
    {links}
  </details>;
  return (
    <section className="topic-prerequisites" aria-label="Темы для повторения базы">
      <span className="eyebrow">ЕСЛИ НУЖНО ОСВЕЖИТЬ БАЗУ</span>
      <h2>Что пригодится</h2>
      {links}
    </section>
  );
}
