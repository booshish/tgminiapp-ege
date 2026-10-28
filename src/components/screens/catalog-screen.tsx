"use client";

import { ArrowRight, BookOpen, Bookmark, CircleX, ClipboardCheck, Hash, ListFilter, Shuffle } from "lucide-react";
import { ExamPicker, PageIntro, FeatureCard } from "@/components/ui";
import { getActiveSubjects as getSubjects, subjectTitle, type SubjectId } from "@/lib/subjects";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { getExamDefinition } from "@/lib/exams";
import { VariantLaunchCard } from "@/components/variant-launch-card";
import type { MockState } from "@/lib/mock-exam";
import type { CatalogSelection } from "@/lib/practice";
import { taxonomyFilterKeys } from "@/lib/task-taxonomy";
import { getPracticeTasks, getPracticeTaskCount, practicePrototypes as prototypes, taskTopicLabels } from "@/lib/tasks";
import { getTheoryTopic, allTheoryTopics as theoryTopics } from "@/lib/theory";
import { StreakSummary } from "@/components/game-motivation";
import type { GameSummary } from "@/lib/gamification";
import "@/components/catalog-screen.css";

type CatalogScreenProps = {
  selection: CatalogSelection;
  onChange: (selection: CatalogSelection) => void;
  onStart: (selection: CatalogSelection) => void;
  onTheory: (topicId?: string) => void;
  onShuffle?: () => void;
  mockState?: MockState;
  mockReady?: boolean;
  onVariant?: (variantNumber: number, replace: boolean) => void;
  onResumeVariant?: (sessionId: string) => void;
  onOpenVariants?: () => void;
  onMistakes?: () => void;
  onSaved?: () => void;
  onContinue?: () => void;
  resumeLabel?: string;
  game: GameSummary;
};

export function CatalogScreen({
  selection,
  onChange,
  onStart:startPractice,
  onTheory,
  onShuffle,
  mockState,
  mockReady,
  onVariant,
  onResumeVariant,
  onOpenVariants,
  onMistakes,
  onSaved,
  onContinue,
  resumeLabel,
  game,
}: CatalogScreenProps) {
  const onStart=(next:CatalogSelection)=>startPractice({...next,...Object.fromEntries(taxonomyFilterKeys.map(key=>[key,undefined]))});
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
    .filter((topic) => topic.subjectId === selection.subjectId)
    .filter((topic) => topic.examType.includes(selection.exam))
    .filter((topic) => selection.subjectId !== "math" || selection.exam !== "ЕГЭ" || topic.coverage !== "exam-topic" || (topic.level ?? "profile") === (selection.level ?? "profile"))
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
      getPracticeTaskCount({ ...filter, prototypeId: prototype.id }) > 0,
  );
  const chosenPrototype = availablePrototypes.find(
    (prototype) => prototype.id === selection.prototypeId,
  );

  function changeExam(exam: CatalogSelection["exam"]) {
    if (exam === selection.exam) return;
    onChange({
      exam,
      subjectId: exam === "ОГЭ" && selection.subjectId === "chinese" ? "math" : selection.subjectId,
      level: exam === "ЕГЭ" && selection.subjectId === "math" ? "profile" : undefined,
      mode: selection.mode,
    });
  }

  function changeSubject(subjectId: SubjectId) {
    onChange({ exam: selection.exam, subjectId, mode: "number", level: subjectId === "math" && selection.exam === "ЕГЭ" ? "profile" : undefined });
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

      <ExamPicker exam={selection.exam} onChange={changeExam} subjectId={selection.subjectId} onSubjectChange={changeSubject} />
      <nav className="preparation-modes" aria-label="Режим подготовки">
        <div className="preparation-mode">
          <button type="button" onClick={() => {
            changeMode("number");
            document.querySelector(".catalog-list-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}><Hash size={22} aria-hidden="true" /><strong>По номерам</strong><span>Выбрать номер и решить задание</span></button>
          {onContinue && <button type="button" className="preparation-continue" onClick={onContinue}>Продолжить{resumeLabel && <span>{resumeLabel}</span>}</button>}
        </div>
        <div className="preparation-mode"><button type="button" onClick={onOpenVariants} disabled={!onOpenVariants || selection.subjectId !== "math"}>
          <ClipboardCheck size={22} aria-hidden="true" /><strong>Решить вариант</strong>
          <span>{selection.subjectId === "math" ? "Выбор, продолжение и результаты" : "Варианты по предмету готовятся"}</span>
        </button></div>
        <div className="preparation-mode"><button type="button" onClick={onMistakes} disabled={!onMistakes}><CircleX size={22} aria-hidden="true" /><strong>Работа над ошибками</strong><span>История ошибок и повторное решение</span></button></div>
        <div className="preparation-mode"><button type="button" onClick={onSaved} disabled={!onSaved}><Bookmark size={22} aria-hidden="true" /><strong>Сохранённые задания</strong><span>Вернуться к своим закладкам</span></button></div>
      </nav>
      <details className="catalog-subjects">
        <summary>Все предметы {selection.exam}</summary>
        <div className="catalog-topic-grid">
          {getSubjects(selection.exam).map(([id, title]) => <FeatureCard key={id} icon={BookOpen} label={title}
            description={id === "math" ? "Действующая математика" : id === "informatics" || id === "russian" || (id === "physics" && selection.exam === "ЕГЭ") ? "Проект 2027 · задания и открытые пробелы" : "Структура и задания готовятся"}
            onClick={() => changeSubject(id)} />)}
        </div>
      </details>
      {selection.subjectId !== "math" && <div className="info-note" role="status"><p>
        {definition ? definition.verificationNote : `${subjectTitle(selection.subjectId)}: спецификация ещё не сверена. Номера и баллы появятся после проверки источников; заданий другого предмета здесь нет.`}
      </p></div>}

      {selection.exam === "ЕГЭ" && selection.subjectId === "math" && (
        <section
          className="catalog-level-card"
          aria-labelledby="catalog-level-title"
        >
          <h2 id="catalog-level-title">Математика · {selection.level === "base" ? "Базовый уровень" : "Профильный уровень"}</h2>
          <div className="segmented catalog-level-switch" role="group" aria-label="Уровень математики ЕГЭ">
            {(["base", "profile"] as const).map((level) => <button key={level} type="button"
              className={(selection.level ?? "profile") === level ? "selected" : ""}
              aria-pressed={(selection.level ?? "profile") === level}
              onClick={() => onChange({ ...selection, level, examNumber: undefined, topicId: undefined, prototypeId: undefined, part: undefined })}
            >{level === "base" ? "База" : "Профиль"}</button>)}
          </div>
          {!isPhone && !getExamDefinition({ examType: "ЕГЭ", level: "base" })?.available && <p>Материалы базового уровня готовятся. Выбор базы покажет фактическую доступность без подмены профильными заданиями.</p>}
        </section>
      )}

      {selection.subjectId === "math" && <VariantLaunchCard key={`${selection.exam}-${selection.level ?? ""}-${selection.subjectId}`}
        definition={definition} state={mockState} ready={mockReady}
        onStart={onVariant} onResume={onResumeVariant} />}
      {!isPhone && selection.subjectId === "math" && practiceExtras}

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
          {definition?.title ?? `${selection.exam} · ${subjectTitle(selection.subjectId)}`}
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
          <span>Авторская подборка</span>
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
            <option value="">Все подборки</option>
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
            {([1, 2, 3] as const).filter((part) => definition.numbers.some((item) => item.part === part)).map((part) => (
              <section
                key={part}
                className="catalog-part"
                aria-labelledby={`catalog-part-${part}`}
              >
                <div className="catalog-part-heading">
                  <h3 id={`catalog-part-${part}`}>Часть {part}</h3>
                  <p>
                    {definition.numbers.filter(item => item.part === part).every(item => item.answerFormat === "short")
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
                    const taskCount =
                      getPracticeTaskCount({ ...filter, examNumber: item.number });
                    return (
                      <button
                        type="button"
                        key={item.number}
                        disabled={taskCount === 0}
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
                          {taskCount > 0
                            ? `Задач: ${taskCount} · ${item.answerFormat === "extended" ? "самопроверка" : "открыть практику"}`
                            : item.pendingReason ?? "Авторское задание ещё не подготовлено"}
                        </span>
                      </button>
                    );
                    })}
                </div>
                {definition.numbers.some(item => item.part === part && item.answerFormat === "extended") && (
                  <p className="catalog-part-note">
                    Развёрнутые решения проверяешь самостоятельно по образцу.
                    Самопроверка не является автоматической оценкой экзамена.
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
                getPracticeTaskCount({
                  ...filter,
                  topicId: topic.id,
                  prototypeId: cardSelection.prototypeId,
                }) > 0;
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

      {isPhone && selection.subjectId === "math" && practiceExtras}

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
