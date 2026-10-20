"use client";

import {
  ArrowRight,
  BookOpen,
  ListChecks,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { LearningIllustration } from "@/components/illustrations";
import { ExamPicker, FeatureCard, PageIntro } from "@/components/ui";
import type { Exam, View } from "@/lib/navigation";

type Props = {
  exam: Exam;
  onExamChange: (exam: Exam) => void;
  onStart: () => void;
  onNavigate: (view: View) => void;
};

export function HomeScreen({ exam, onExamChange, onStart, onNavigate }: Props) {
  return (
    <>
      <PageIntro eyebrow="ТОЧКА · МАТЕМАТИКА" title="Твоя подготовка">
        Разбирай темы и решай задания в удобном порядке.
      </PageIntro>
      <section className="course-hero" aria-labelledby="course-title">
        <div className="hero-copy">
          <span className="tag">Теория и практика</span>
          <h2 id="course-title">{exam} · Математика</h2>
          <p>
            Выбери тему для повторения или продолжи самостоятельную практику.
          </p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={onStart}>
              Продолжить подготовку <ArrowRight size={18} />
            </button>
            <button
              className="button button-secondary"
              onClick={() => onNavigate("theory")}
            >
              Открыть теорию
            </button>
          </div>
        </div>
        <LearningIllustration className="hero-illustration" />
      </section>
      <ExamPicker exam={exam} onChange={onExamChange} />
      <section className="feature-section" aria-labelledby="sections-title">
        <div className="section-title">
          <h2 id="sections-title">Материалы и возможности</h2>
        </div>
        <div className="feature-grid">
          <FeatureCard
            icon={BookOpen}
            label="Теория"
            description="Объяснения, формулы и разобранные примеры"
            onClick={() => onNavigate("theory")}
          />
          <FeatureCard
            icon={ListChecks}
            label="Задания"
            description="Выбор темы, проверка ответа и разбор решения"
            onClick={() => onNavigate("catalog")}
          />
          <FeatureCard
            icon={TrendingUp}
            label="Прогресс"
            description="Результаты и история ответов в Premium"
            onClick={() => onNavigate("progress")}
          />
          <FeatureCard
            icon={Sparkles}
            label="Мой тренер"
            description="Интерфейс повторения тем для Premium"
            onClick={() => onNavigate("trainer")}
            tone="feature-trainer"
          />
        </div>
      </section>
      <section className="premium-summary">
        <div>
          <span className="eyebrow">PREMIUM</span>
          <h2>Больше информации о подготовке</h2>
          <p>
            Результаты, история ошибок и инструменты повторения. Бесплатная
            теория и доступные задания остаются открытыми.
          </p>
        </div>
        <button
          className="button button-secondary"
          onClick={() => onNavigate("premium")}
        >
          Подробнее о Premium <ArrowRight size={18} />
        </button>
      </section>
    </>
  );
}
