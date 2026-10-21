"use client";

import {
  ArrowRight,
  ChartNoAxesCombined,
  CircleCheck,
  ListChecks,
  ShieldCheck,
  Sprout,
  Target,
} from "lucide-react";
import { Meter, PageIntro } from "@/components/ui";
import { getAnalytics, type LearningState } from "@/lib/learning-events";
import { tasks } from "@/lib/tasks";
import { theoryTopics } from "@/lib/theory";
import { StreakSummary } from "@/components/game-motivation";
import type { GameSummary } from "@/lib/gamification";

type ProgressScreenProps = {
  state: LearningState;
  isPremium: boolean;
  onPremium: () => void;
  onStart: (topicId?: string) => void;
  game: GameSummary;
};

function topicTitle(topicId: string) {
  return (
    theoryTopics.find((topic) => topic.id === topicId)?.title ?? "Другая тема"
  );
}

function formatDate(value: string, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата недоступна";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    ...(includeTime ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(date);
}

export function ProgressScreen({
  state,
  isPremium,
  onPremium,
  onStart,
  game,
}: ProgressScreenProps) {
  if (!isPremium) {
    return (
      <>
        <PageIntro eyebrow="РЕЗУЛЬТАТЫ ПРАКТИКИ" title="Мои результаты">
          Статистика ответов, история ошибок и динамика занятий доступны в
          Premium.
        </PageIntro>
        <StreakSummary summary={game} />
        <section className="premium-gate">
          <span className="feature-icon">
            <ChartNoAxesCombined size={28} aria-hidden="true" />
          </span>
          <span className="tag">Возможности Premium</span>
          <h2>Статистика ответов в Premium</h2>
          <p>
            Подробные результаты, история ошибок и динамика занятий доступны в
            Premium. Здесь можно будет увидеть, как меняется твоя практика, и
            вернуться к темам, которые требуют внимания.
          </p>
          <button className="button button-primary" onClick={onPremium}>
            Подробнее о Premium <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      </>
    );
  }

  const analytics = getAnalytics(state);
  const recentErrors = [...analytics.errors].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <>
      <PageIntro eyebrow="ДЕМОНСТРАЦИОННЫЙ PREMIUM" title="Мои результаты">
        Реальные ответы из этого браузера. Без примерных процентов и оценок
        готовности к экзамену.
      </PageIntro>
      <StreakSummary summary={game} />
      <div className="stats-grid">
        <section className="stat-card">
          <span className="feature-icon">
            <CircleCheck size={22} aria-hidden="true" />
          </span>
          <strong>{analytics.solved}</strong>
          <h2>Решено заданий</h2>
          <p>Уникальные задания, на которые дан хотя бы один верный ответ</p>
        </section>
        <section className="stat-card">
          <span className="feature-icon">
            <Target size={22} aria-hidden="true" />
          </span>
          <strong>
            {analytics.accuracy === null ? "—" : `${analytics.accuracy}%`}
          </strong>
          <h2>Точность ответов</h2>
          <p>
            {analytics.attempts
              ? `${analytics.correctAnswers} верных из ${analytics.attempts} проверенных ответов`
              : "Появится после первой проверки ответа"}
          </p>
        </section>
        <section className="stat-card">
          <span className="feature-icon">
            <ListChecks size={22} aria-hidden="true" />
          </span>
          <strong>{analytics.attempts}</strong>
          <h2>Всего попыток</h2>
          <p>Каждая проверка числового ответа считается отдельной попыткой</p>
        </section>
      </div>
      {state.legacyRecords.length > 0 && (
        <div className="info-note">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>
            Итоги прежней демоверсии включены в общие счётчики и результаты по
            темам. У них нет точных дат и истории ответов, поэтому динамика и
            история ошибок содержат только новые проверки. В старых итогах
            известен один успешный ответ на каждую решённую задачу.
          </p>
        </div>
      )}

      {analytics.attempts === 0 ? (
        <section className="results-card">
          <div className="empty-state">
            <span className="empty-icon">
              <Sprout size={36} strokeWidth={1.3} aria-hidden="true" />
            </span>
            <h2>Результатов пока нет</h2>
            <p>
              Проверь ответ на задание. После этого здесь появятся результаты по
              темам и история занятий.
            </p>
            <button className="button button-primary" onClick={() => onStart()}>
              Перейти к заданиям <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="analytics-section">
            <div className="section-title">
              <h2>Результаты по темам</h2>
            </div>
            <p className="muted">
              Доля верных ответов в каждой теме. Это результаты практики, а не
              оценка освоения всей темы.
            </p>
            <div className="topic-results">
              {analytics.topics
                .filter((topic) => topic.attempts > 0)
                .map((topic) => (
                  <article className="topic-item" key={topic.topicId}>
                    <div>
                      <strong>{topicTitle(topic.topicId)}</strong>
                      <span>
                        {topic.accuracy === null ? "—" : `${topic.accuracy}%`}
                      </span>
                    </div>
                    <Meter
                      value={topic.accuracy ?? 0}
                      label={`Доля верных ответов: ${topicTitle(topic.topicId)}`}
                    />
                    <small>
                      {topic.correctAnswers} верных из {topic.attempts} ответов
                    </small>
                    <button
                      className="text-button"
                      onClick={() => onStart(topic.topicId)}
                    >
                      Потренироваться{" "}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </article>
                ))}
            </div>
          </section>
          <section className="analytics-section">
            <div className="section-title">
              <h2>Динамика занятий</h2>
            </div>
            <p className="muted">
              Только дни, в которые ты проверял ответы. Даты и время указаны по
              всемирному времени (UTC). Пропущенные дни не дополняются
              примерными значениями.
            </p>
            {analytics.timeline.length === 0 ? (
              <p className="muted">
                Новых проверок с сохранёнными датами пока нет.
              </p>
            ) : (
              <div className="analytics-timeline">
                <table>
                  <caption className="sr-only">
                    Проверенные и верные ответы по датам
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Дата</th>
                      <th scope="col">Ответов</th>
                      <th scope="col">Верных</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.timeline.map((day) => (
                      <tr key={day.date}>
                        <th scope="row">{formatDate(day.date)}</th>
                        <td>{day.attempts}</td>
                        <td>{day.correctAnswers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="analytics-section">
            <div className="section-title">
              <h2>История ошибок</h2>
            </div>
            {recentErrors.length === 0 ? (
              <p className="muted">
                Среди новых сохранённых ответов пока нет ошибок. История ответов
                прежней демоверсии не восстанавливается.
              </p>
            ) : (
              <ol className="error-list">
                {recentErrors.map((event) => (
                  <li key={event.id}>
                    <div>
                      <strong>
                        {tasks.find((task) => task.id === event.taskId)
                          ?.title ?? "Задание по теме"}
                      </strong>
                      <p>
                        {topicTitle(event.topicId)} · {event.examType}
                      </p>
                      <p>
                        Твой ответ: <strong>{event.answer}</strong>
                      </p>
                      <time dateTime={event.createdAt}>
                        {formatDate(event.createdAt, true)}
                      </time>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => onStart(event.topicId)}
                    >
                      Практика по теме{" "}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
      <div className="progress-storage">
        <span>
          <ShieldCheck size={17} aria-hidden="true" /> Результаты хранятся в
          этом браузере на этом устройстве
        </span>
        <span>Просмотров решений: {analytics.solutionViews}</span>
      </div>
      <p className="quiet-note">
        Уникальные решённые задания и количество верных ответов — разные
        показатели. Повторные проверки входят в попытки и долю верных ответов.
        Просмотр решения сам по себе не считается верным ответом.
      </p>
    </>
  );
}
