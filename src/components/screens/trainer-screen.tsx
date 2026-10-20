"use client";

import { ArrowRight, BookOpen, Lightbulb, Sparkles } from "lucide-react";
import { CoachIllustration } from "@/components/illustrations";
import { PageIntro } from "@/components/ui";
import { getAnalytics, type LearningState } from "@/lib/learning-events";
import { theoryTopics } from "@/lib/theory";

type TrainerScreenProps = {
  state: LearningState;
  isPremium: boolean;
  onPremium: () => void;
  onTheory: (topicId: string) => void;
  onStart: (topicId?: string) => void;
};

export function TrainerScreen({
  state,
  isPremium,
  onPremium,
  onTheory,
  onStart,
}: TrainerScreenProps) {
  if (!isPremium) {
    return (
      <>
        <PageIntro eyebrow="ПОВТОРЕНИЕ ПО ТЕМАМ" title="Мой тренер">
          Результаты по темам и переход к повторению доступны в Premium.
        </PageIntro>
        <section className="premium-gate trainer-gate">
          <CoachIllustration className="premium-coach" />
          <span className="tag">Возможности Premium</span>
          <h2>Повторение на основе ответов</h2>
          <p>
            Тренер объединяет результаты практики и помогает вернуться к темам с
            повторяющимися ошибками. Подробные результаты и переход к повторению
            доступны в Premium.
          </p>
          <p className="muted">
            Полная диагностика пробелов, персональный план и адаптивная
            тренировка — следующие этапы развития. Сейчас они не подключены.
          </p>
          <button className="button button-primary" onClick={onPremium}>
            Подробнее о Premium <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      </>
    );
  }

  const analytics = getAnalytics(state);
  const repeatedErrors = analytics.topics.filter(
    (topic) =>
      topic.attempts >= 3 && topic.attempts - topic.correctAnswers >= 2,
  );

  return (
    <>
      <PageIntro eyebrow="ДЕМОНСТРАЦИОННЫЙ PREMIUM" title="Мой тренер">
        Темы для повторения по сохранённым ответам.
      </PageIntro>
      <section className="premium-panel trainer-overview">
        <CoachIllustration className="premium-coach" />
        <div>
          <span className="eyebrow">ОПОРА НА РЕЗУЛЬТАТЫ ПРАКТИКИ</span>
          <h2>Повторение по результатам практики</h2>
          <p>
            Здесь собраны темы с повторяющимися ошибками в твоих ответах. Это
            ориентир для повторения, а не полная диагностика знаний и не оценка
            готовности к экзамену.
          </p>
          <p className="muted">
            Автоматический персональный план и адаптивный подбор заданий пока не
            подключены. Кнопки ниже открывают обычную практику по выбранной
            тобой теме.
          </p>
        </div>
      </section>
      <section className="analytics-section">
        <div className="section-title">
          <h2>Что стоит повторить</h2>
        </div>
        <p className="muted">
          Показываем тему после трёх проверенных ответов, если хотя бы два из
          них неверные. Небольшого числа ответов недостаточно для вывода обо
          всех знаниях по теме.
        </p>
        {repeatedErrors.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <Sparkles size={30} strokeWidth={1.4} aria-hidden="true" />
            </span>
            <h3>
              {analytics.attempts === 0
                ? "Сначала немного практики"
                : "Пока нет тем с повторяющимися ошибками"}
            </h3>
            <p>
              {analytics.attempts === 0
                ? "Проверь ответы на задания. Сохранённые результаты помогут выбрать тему для повторения."
                : "Это не означает, что все темы освоены. Ты можешь самостоятельно выбрать тему и продолжить занятия."}
            </p>
            <button className="button button-primary" onClick={() => onStart()}>
              Выбрать задания <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="topic-results">
            {repeatedErrors.map((result) => {
              const topic = theoryTopics.find(
                (item) => item.id === result.topicId,
              );
              const prerequisites = (topic?.prerequisites ?? [])
                .map((id) => theoryTopics.find((item) => item.id === id))
                .filter((item) => item !== undefined);
              return (
                <article className="topic-item" key={result.topicId}>
                  <div>
                    <strong>{topic?.title ?? "Тема практики"}</strong>
                    <span>
                      {result.accuracy === null ? "—" : `${result.accuracy}%`}
                    </span>
                  </div>
                  <p>
                    {result.correctAnswers} верных из {result.attempts} ответов.
                    Ошибок: {result.attempts - result.correctAnswers}.
                  </p>
                  <div className="topic-actions">
                    <button
                      className="text-button"
                      onClick={() => onTheory(result.topicId)}
                    >
                      <BookOpen size={16} aria-hidden="true" /> Повторить теорию
                    </button>
                    <button
                      className="text-button"
                      onClick={() => onStart(result.topicId)}
                    >
                      Практика по теме{" "}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                  {prerequisites.length > 0 && (
                    <div className="topic-prerequisites">
                      <p className="muted">
                        Для этой темы полезны основы ниже. Ошибки в них отдельно
                        не диагностировались — ты можешь повторить их по
                        желанию.
                      </p>
                      {prerequisites.map((prerequisite) => (
                        <button
                          className="text-button"
                          key={prerequisite.id}
                          onClick={() => onTheory(prerequisite.id)}
                        >
                          {prerequisite.title}
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <div className="info-note">
        <Lightbulb size={20} aria-hidden="true" />
        <p>
          Тренер не использует серверный ИИ. Сейчас он показывает простой
          ориентир по сохранённым ответам. Полная диагностика, персональный план
          и повторение с автоматическим подбором появятся после отдельной
          разработки и проверки.
        </p>
      </div>
    </>
  );
}
