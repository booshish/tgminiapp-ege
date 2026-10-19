"use client";

import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Lightbulb,
  ListChecks,
} from "lucide-react";
import { LearningIllustration } from "@/components/illustrations";
import { ExamPicker, PageIntro } from "@/components/ui";
import type { Exam, View } from "@/lib/navigation";

type CatalogScreenProps = {
  exam: Exam;
  onExamChange: (exam: Exam) => void;
  onStart: (index?: number) => void;
  onNavigate: (view: View) => void;
};

export function CatalogScreen({
  exam,
  onExamChange,
  onStart,
  onNavigate,
}: CatalogScreenProps) {
  return (
    <>
      <PageIntro eyebrow="ТВОЯ БИБЛИОТЕКА ЗНАНИЙ" title="Каталог">
        Выбери экзамен и двигайся от понимания к практике.
      </PageIntro>
      <ExamPicker exam={exam} onChange={onExamChange} />
      <section className="catalog-subject">
        <div className="subject-cover">
          <GraduationCap size={42} strokeWidth={1.2} />
          <div>
            <span className="eyebrow">{exam} · БАЗОВЫЕ ТЕМЫ</span>
            <h2>Математика</h2>
            <p>Разберёмся. Потренируемся. Запомним.</p>
          </div>
          <LearningIllustration className="catalog-art" />
        </div>
        <div className="catalog-options">
          <button onClick={() => onNavigate("theory")}>
            <span className="feature-icon">
              <BookOpen size={24} />
            </span>
            <span>
              <strong>Теория</strong>
              <small>4 коротких конспекта с примерами</small>
            </span>
            <ArrowRight size={20} />
          </button>
          <button onClick={() => onStart(0)}>
            <span className="feature-icon">
              <ListChecks size={24} />
            </span>
            <span>
              <strong>Задания</strong>
              <small>5 задач · ответы и понятные решения</small>
            </span>
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
      <div className="info-note">
        <Lightbulb size={20} />
        <p>
          В этой версии для ОГЭ и ЕГЭ доступны одинаковые базовые темы. Это
          знакомство с форматом приложения, а полный каталог появится позже.
        </p>
      </div>
    </>
  );
}
