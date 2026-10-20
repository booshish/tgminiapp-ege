"use client";

import {
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

type TheoryScreenProps = {
  exam: Exam;
  topicId?: string;
  materialId?: string;
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
  onExamChange,
  onOpenTopic,
  onOpenMaterial,
  onPractice,
  onBack,
}: TheoryScreenProps) {
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
    <section className="theory-page">
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        {isMaterial ? "К теме" : topic ? "К списку тем" : "Назад"}
      </button>

      {!topic ? (
        <>
          <PageIntro eyebrow="БИБЛИОТЕКА ЗНАНИЙ" title="Теория">
            Основные правила, формулы и пошаговые примеры по математике.
          </PageIntro>
          <ExamPicker exam={exam} onChange={onExamChange} />
          <div className="theory-section-heading">
            <span className="eyebrow">{exam} · МАТЕМАТИКА</span>
            <h2>Выберите тему</h2>
            <p>
              Восемь конспектов по общей базе для ОГЭ и ЕГЭ. Это демобиблиотека,
              а не полный экзаменационный курс.
            </p>
          </div>
          <div className="topic-grid">
            {theoryTopics
              .filter((item) => item.examType.includes(exam))
              .map((item, index) => (
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
                    {item.examples.length} разбора
                  </span>
                </button>
              ))}
          </div>
        </>
      ) : (
        <>
          <nav className="lesson-breadcrumbs" aria-label="Путь к материалу">
            <span>{exam}</span>
            <ChevronRight size={13} aria-hidden="true" />
            <span>Математика</span>
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
                  Общая база для ОГЭ и ЕГЭ. Читайте в своём темпе, затем
                  попробуйте задания по этой теме.
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
                <h2>Разобраться по шагам</h2>
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
                  Открыть материал <ArrowRight size={18} aria-hidden="true" />
                </button>
              </section>
              {topic.prerequisites.length > 0 && (
                <section
                  className="topic-prerequisites"
                  aria-labelledby="prerequisites-title"
                >
                  <span className="eyebrow">ЕСЛИ НУЖНО ОСВЕЖИТЬ БАЗУ</span>
                  <h2 id="prerequisites-title">Что пригодится</h2>
                  <div className="prerequisite-links">
                    {topic.prerequisites.map((id) => {
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
              )}
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
