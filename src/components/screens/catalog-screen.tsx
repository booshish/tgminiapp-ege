"use client";

import { ArrowRight, BookOpen, SlidersHorizontal } from "lucide-react";
import { ExamPicker, PageIntro } from "@/components/ui";
import { getPracticeTasks, prototypes } from "@/lib/tasks";
import { theoryTopics } from "@/lib/theory";
import type { Exam } from "@/lib/navigation";

type CatalogScreenProps = {
  exam: Exam;
  topicId?: string;
  prototypeId?: string;
  onExamChange: (exam: Exam) => void;
  onSelectionChange: (topicId?: string, prototypeId?: string) => void;
  onStart: (topicId?: string, prototypeId?: string) => void;
  onTheory: (topicId?: string) => void;
};

export function CatalogScreen({
  exam,
  topicId,
  prototypeId,
  onExamChange,
  onSelectionChange,
  onStart,
  onTheory,
}: CatalogScreenProps) {
  const availableTopics = theoryTopics.filter((topic) =>
    topic.examType.includes(exam),
  );
  const selectedTopic = availableTopics.find((topic) => topic.id === topicId);
  const availablePrototypes = prototypes.filter(
    (prototype) =>
      (!selectedTopic || prototype.topicId === selectedTopic.id) &&
      getPracticeTasks({ examType: exam, prototypeId: prototype.id }).length >
        0,
  );
  const selectedPrototype = availablePrototypes.find(
    (prototype) => prototype.id === prototypeId,
  );
  const selectedTasks = getPracticeTasks({
    examType: exam,
    topicId: selectedTopic?.id,
    prototypeId: selectedPrototype?.id,
  });

  function selectTopic(value: string) {
    onSelectionChange(value || undefined, undefined);
  }

  function selectPrototype(value: string) {
    const prototype = availablePrototypes.find((item) => item.id === value);
    onSelectionChange(prototype?.topicId ?? selectedTopic?.id, prototype?.id);
  }

  return (
    <>
      <PageIntro eyebrow="ТЕОРИЯ И ПРАКТИКА" title="Задания">
        Выбери экзамен, тему и тип задания для самостоятельной практики.
      </PageIntro>

      <ExamPicker exam={exam} onChange={onExamChange} />

      <section
        className="practice-picker-card"
        aria-labelledby="practice-picker-title"
      >
        <div className="practice-picker-heading">
          <span className="feature-icon">
            <SlidersHorizontal size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 id="practice-picker-title">Что потренируем?</h2>
            <p>Можно выбрать одну тему или практиковаться по всем.</p>
          </div>
        </div>

        <div className="practice-filter-grid">
          <label className="practice-filter-field" htmlFor="practice-topic">
            <span>Тема</span>
            <select
              className="practice-filter-select"
              id="practice-topic"
              value={selectedTopic?.id ?? ""}
              onChange={(event) => selectTopic(event.target.value)}
            >
              <option value="">Все темы</option>
              {availableTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
          </label>

          <label className="practice-filter-field" htmlFor="practice-prototype">
            <span>Тип задания</span>
            <select
              className="practice-filter-select"
              id="practice-prototype"
              value={selectedPrototype?.id ?? ""}
              onChange={(event) => selectPrototype(event.target.value)}
            >
              <option value="">Все типы заданий</option>
              {availablePrototypes.map((prototype) => (
                <option key={prototype.id} value={prototype.id}>
                  {prototype.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="practice-selection-summary">
          <span>{exam} · Математика</span>
          <p>
            {selectedTopic?.title ?? "Все темы"}
            {selectedPrototype
              ? ` · ${selectedPrototype.title}`
              : " · Все типы заданий"}
          </p>
        </div>

        {selectedTasks.length === 0 && (
          <p className="practice-empty-note" role="status">
            Для этого выбора пока нет заданий. Выбери другую тему или тип
            задания.
          </p>
        )}

        <div className="practice-picker-actions">
          <button
            type="button"
            className="button button-primary"
            disabled={selectedTasks.length === 0}
            onClick={() => onStart(selectedTopic?.id, selectedPrototype?.id)}
          >
            Начать практику
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => onTheory(selectedTopic?.id)}
          >
            <BookOpen size={20} aria-hidden="true" />
            Открыть теорию
          </button>
        </div>
      </section>
      <p className="quiet-note">
        Это учебная демоподборка. После прохождения выбранных заданий они
        повторяются. Ограничений на практику нет.
      </p>
    </>
  );
}
