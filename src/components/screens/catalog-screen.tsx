"use client";

import { ArrowRight, BookOpen, Hash, ListFilter, Shuffle } from "lucide-react";
import { ExamPicker, PageIntro } from "@/components/ui";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { getExamDefinition } from "@/lib/exams";
import type { CatalogSelection } from "@/lib/practice";
import { getPracticeTasks, prototypes, taskTopicLabels } from "@/lib/tasks";
import { getTheoryTopic, theoryTopics } from "@/lib/theory";
import { StreakSummary } from "@/components/game-motivation";
import type { GameSummary } from "@/lib/gamification";
import "@/components/catalog-screen.css";

type CatalogScreenProps = {
  selection: CatalogSelection;
  onChange: (selection: CatalogSelection) => void;
  onStart: (selection: CatalogSelection) => void;
  onTheory: (topicId?: string) => void;
  onShuffle?: () => void;
  game: GameSummary;
};

export function CatalogScreen({
  selection,
  onChange,
  onStart,
  onTheory,
  onShuffle,
  game,
}: CatalogScreenProps) {
  const isPhone = usePhoneLayout();
  const definition = getExamDefinition({
    examType: selection.exam,
    subjectId: selection.subjectId,
    level: selection.level,
  });
  const filter = {
    examType: selection.exam,
    subjectId: selection.subjectId,
    level: selection.level,
  };
  const availableTasks = getPracticeTasks(filter);
  const availableTopics = theoryTopics
    .filter((topic) => topic.examType.includes(selection.exam))
    .map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      hasTheory: true,
    }));
  // Published practice can precede a theory article; keep those topics discoverable.
  for (const task of availableTasks) {
    if (availableTopics.some((topic) => topic.id === task.topicId)) continue;
    availableTopics.push({
      id: task.topicId,
      title: taskTopicLabels[task.topicId] ?? task.title,
      description: "Авторские задания · Самопроверка по образцу решения.",
      hasTheory: Boolean(getTheoryTopic(task.topicId)),
    });
  }
  const availablePrototypes = prototypes.filter(
    (prototype) =>
      getPracticeTasks({ ...filter, prototypeId: prototype.id }).length > 0,
  );
  const chosenPrototype = availablePrototypes.find(
    (prototype) => prototype.id === selection.prototypeId,
  );

  function changeExam(exam: CatalogSelection["exam"]) {
    if (exam === selection.exam) return;
    onChange({
      exam,
      subjectId: "math",
      level: exam === "ЕГЭ" ? "profile" : undefined,
      mode: selection.mode,
    });
  }

  function changeMode(mode: CatalogSelection["mode"]) {
    if (mode === selection.mode) return;
    onChange({
      ...selection,
      mode,
      examNumber: undefined,
      topicId: undefined,
      prototypeId: undefined,
      part: undefined,
    });
  }

  const practiceExtras = (<>
      <StreakSummary summary={game} subjectId={selection.subjectId} showOverall={false} />
      {onShuffle && definition?.available && (
        <div className="random-practice-action">
          <button type="button" className="button button-secondary" onClick={onShuffle}>
            <Shuffle size={19} aria-hidden="true" /> Случайная практика · {selection.exam}
          </button>
          <p>Подборка по всему экзамену. Сначала варианты, которые ты ещё не проверял.</p>
        </div>
      )}
  </>);

  return (
    <section className={`exam-catalog catalog-${selection.mode}-mode`} aria-label="Каталог заданий">
      <PageIntro eyebrow="САМОСТОЯТЕЛЬНАЯ ПРАКТИКА" title="Задания">
        Выбери экзамен, затем номер задания или учебную тему.
      </PageIntro>

      <ExamPicker exam={selection.exam} onChange={changeExam} />
      {!isPhone && practiceExtras}

      {selection.exam === "ЕГЭ" && (
        <section
          className="catalog-level-card"
          aria-labelledby="catalog-level-title"
        >
          <h2 id="catalog-level-title">Математика · Профильный уровень</h2>
          {!isPhone && <p>
            В этой версии готовимся к профильной математике. Базовый уровень
            появится после проверки структуры и материалов.
          </p>}
          {selection.level === "base" && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                onChange({
                  ...selection,
                  level: "profile",
                  examNumber: undefined,
                  topicId: undefined,
                  prototypeId: undefined,
                  part: undefined,
                })
              }
            >
              Выбрать профильный уровень
            </button>
          )}
        </section>
      )}

      <div
        className="segmented catalog-mode-switch"
        role="group"
        aria-label="Способ выбора заданий"
      >
        <button
          type="button"
          className={selection.mode === "number" ? "selected" : ""}
          aria-pressed={selection.mode === "number"}
          onClick={() => changeMode("number")}
        >
          <Hash size={19} aria-hidden="true" /> По номеру
        </button>
        <button
          type="button"
          className={selection.mode === "topic" ? "selected" : ""}
          aria-pressed={selection.mode === "topic"}
          onClick={() => changeMode("topic")}
        >
          <ListFilter size={19} aria-hidden="true" /> По теме
        </button>
      </div>

      <div className="catalog-list-heading">
        <span className="eyebrow">
          {definition?.title ?? `${selection.exam} · Математика`}
        </span>
        <h2>
          {selection.mode === "number" ? "Номера заданий" : "Учебные темы"}
        </h2>
        <p>
          {selection.mode === "number"
            ? "У одного номера могут быть разные темы. В практике будет указана тема каждой задачи."
            : "Общие школьные темы с заданиями выбранного экзамена и уровня."}
        </p>
      </div>

      {selection.mode === "topic" && (
        <label className="catalog-prototype-filter" htmlFor="catalog-prototype">
          <span>Тип задания</span>
          <select
            id="catalog-prototype"
            className="practice-filter-select"
            value={chosenPrototype?.id ?? ""}
            onChange={(event) => {
              const prototype = availablePrototypes.find(
                (item) => item.id === event.target.value,
              );
              onChange({
                ...selection,
                prototypeId: prototype?.id,
                topicId: prototype?.topicId,
                examNumber: undefined,
                part: undefined,
              });
            }}
          >
            <option value="">Все типы заданий</option>
            {availablePrototypes.map((prototype) => (
              <option key={prototype.id} value={prototype.id}>
                {prototype.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {selection.mode === "number" ? (
        definition && definition.available !== false ? (
          <div className="catalog-parts">
            {([1, 2] as const).map((part) => (
              <section
                key={part}
                className="catalog-part"
                aria-labelledby={`catalog-part-${part}`}
              >
                <div className="catalog-part-heading">
                  <h3 id={`catalog-part-${part}`}>Часть {part}</h3>
                  <p>
                    {part === 1
                      ? "Задания с коротким ответом"
                      : "Задания с развёрнутым решением"}
                  </p>
                </div>
                <div className="catalog-number-grid">
                  {definition.numbers
                    .filter((item) => item.part === part)
                    .map((item) => {
                    const cardSelection: CatalogSelection = {
                      ...selection,
                      examNumber: item.number,
                      part: item.part,
                      topicId: undefined,
                      prototypeId: undefined,
                    };
                    const hasTasks =
                      getPracticeTasks({ ...filter, examNumber: item.number })
                        .length > 0;
                    return (
                      <button
                        type="button"
                        key={item.number}
                        data-catalog-number={item.number}
                        className={`catalog-number-card${selection.examNumber === item.number ? " catalog-card-selected" : ""}`}
                        aria-pressed={selection.examNumber === item.number}
                        onClick={() => onStart(cardSelection)}
                      >
                        <span className="catalog-card-top">
                          <span className="catalog-number-badge">№{item.number}</span>
                          <ArrowRight size={19} aria-hidden="true" />
                        </span>
                        <span className="catalog-card-title">{item.title}</span>
                        <span className="catalog-card-status">
                          {hasTasks
                            ? item.part === 2 ? "Самопроверка" : "Открыть практику"
                            : "Задания скоро появятся"}
                        </span>
                      </button>
                    );
                    })}
                </div>
                {part === 2 && (
                  <p className="catalog-part-note">
                    Развёрнутые решения проверяешь самостоятельно по образцу.
                    Самооценка не является автоматической оценкой экзамена.
                  </p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="catalog-empty" role="status">
            <h3>Каталог пока недоступен</h3>
            <p>
              Выбери другой экзамен или уровень. Подборки здесь не подменяются
              заданиями другого экзамена.
            </p>
          </div>
        )
      ) : (
        <div className="catalog-topic-grid">
          {availableTopics
            .filter(
              (topic) =>
                !chosenPrototype || topic.id === chosenPrototype.topicId,
            )
            .map((topic) => {
              const cardSelection: CatalogSelection = {
                ...selection,
                topicId: topic.id,
                examNumber: undefined,
                part: undefined,
                prototypeId:
                  chosenPrototype?.topicId === topic.id
                    ? chosenPrototype.id
                    : undefined,
              };
              const hasTasks =
                getPracticeTasks({
                  ...filter,
                  topicId: topic.id,
                  prototypeId: cardSelection.prototypeId,
                }).length > 0;
              return (
                <button
                  type="button"
                  key={topic.id}
                  data-catalog-topic={topic.id}
                  className={`catalog-topic-card${selection.topicId === topic.id ? " catalog-card-selected" : ""}`}
                  aria-pressed={selection.topicId === topic.id}
                  onClick={() => onStart(cardSelection)}
                >
                  <span className="catalog-card-top">
                    <span className="feature-icon">
                      <BookOpen size={23} aria-hidden="true" />
                    </span>
                    <ArrowRight size={19} aria-hidden="true" />
                  </span>
                  <span className="catalog-card-title">{topic.title}</span>
                  <span className="catalog-card-description">
                    {topic.description}
                  </span>
                  <span className="catalog-card-status">
                    {hasTasks
                      ? topic.hasTheory ? "Открыть практику" : "Самопроверка"
                      : "Задания скоро появятся"}
                  </span>
                </button>
              );
            })}
        </div>
      )}

      {isPhone && practiceExtras}

      <section className="catalog-theory-link">
        <div>
          <h2>Сначала разобраться в теме</h2>
          <p>
            Правила, формулы и пошаговые примеры доступны в бесплатной теории.
          </p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={() =>
            onTheory(
              selection.mode === "topic" &&
              selection.topicId &&
              Boolean(getTheoryTopic(selection.topicId))
                ? selection.topicId
                : undefined,
            )
          }
        >
          <BookOpen size={19} aria-hidden="true" /> Открыть теорию
        </button>
      </section>

      {definition && (
        <aside
          className="catalog-scope-note"
          aria-label="О демонстрационном каталоге"
        >
          {isPhone && selection.exam === "ЕГЭ" && <p>
            Доступна профильная математика. Базовый уровень появится после проверки структуры и материалов.
          </p>}
          <p>
            Авторские учебные задания. Практика бесплатная и без дневных
            ограничений.
          </p>
          {definition.verificationStatus === "not-verified-online" && (
            <p>{definition.verificationNote}</p>
          )}
          <details>
            <summary>Материалы ФИПИ</summary>
            <ul>
              {definition.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </aside>
      )}
    </section>
  );
}
