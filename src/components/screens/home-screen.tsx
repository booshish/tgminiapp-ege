"use client";

import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Leaf,
  ListChecks,
  Sparkles,
  Sprout,
  TrendingUp,
} from "lucide-react";
import {
  CoachIllustration,
  LearningIllustration,
} from "@/components/illustrations";
import { ExamPicker, FeatureCard, Meter } from "@/components/ui";
import type { Exam, View } from "@/lib/navigation";

type HomeScreenProps = {
  exam: Exam;
  onExamChange: (exam: Exam) => void;
  onStart: (index?: number) => void;
  onNavigate: (view: View) => void;
};

export function HomeScreen({
  exam,
  onExamChange,
  onStart,
  onNavigate,
}: HomeScreenProps) {
  return (
    <>
      <header className="home-intro">
        <div>
          <div className="greeting-topline">
            <span className="eyebrow">ТВОЁ МЕСТО ДЛЯ РОСТА</span>
            <span className="tiny-leaf">
              <Leaf size={16} /> В своём темпе
            </span>
          </div>
          <h1>
            Привет!{" "}
            <span className="greeting-spark">
              <Sparkles size={27} strokeWidth={1.4} />
            </span>
          </h1>
          <p>Каждый маленький шаг приближает к большой цели.</p>
        </div>
      </header>
      <div className="home-hero-grid">
        <section className="course-hero" aria-labelledby="course-title">
          <div className="hero-copy">
            <span className="hero-tag">
              <span /> ТВОЙ УЧЕБНЫЙ МАРШРУТ
            </span>
            <h2 id="course-title">
              {exam} <span>•</span> Математика
            </h2>
            <p className="hero-subtitle">Всё получится. Давай шаг за шагом.</p>
            <div className="hero-progress">
              <div className="hero-progress-label">
                <span>Пример прогресса</span>
                <strong>
                  68<span>%</span>
                </strong>
              </div>
              <Meter
                value={68}
                label="Пример учебного прогресса — 68 процентов"
              />
            </div>
            <button
              className="button button-primary continue-button"
              onClick={() => onStart()}
            >
              Продолжить обучение <ArrowRight size={18} />
            </button>
          </div>
          <LearningIllustration className="hero-illustration" />
          <span className="hero-orbit" />
        </section>
        <section className="daily-card">
          <div className="daily-top">
            <span className="daily-icon">
              <Sprout size={22} strokeWidth={1.6} />
            </span>
            <span className="eyebrow">НЕМНОГО КАЖДЫЙ ДЕНЬ</span>
          </div>
          <h2>
            Хороший день,
            <br />
            чтобы стать увереннее
          </h2>
          <p>
            Не нужно знать всё сразу.
            <br />
            Начни с пяти небольших задач.
          </p>
          <div className="daily-meta">
            <span>
              <ListChecks size={16} /> 5 заданий
            </span>
            <span>
              <Clock3 size={15} /> ≈ 10 минут
            </span>
          </div>
          <button className="text-button" onClick={() => onStart(0)}>
            Начать практику <ArrowUpRight size={17} />
          </button>
        </section>
      </div>
      <ExamPicker exam={exam} onChange={onExamChange} />
      <section className="feature-section" aria-labelledby="start-title">
        <div className="section-title">
          <h2 id="start-title">С чего начнём?</h2>
          <span>Всё нужное — под рукой</span>
        </div>
        <div className="feature-grid">
          <FeatureCard
            icon={BookOpen}
            label="Теория"
            description="Сложное — простыми словами"
            onClick={() => onNavigate("theory")}
          />
          <FeatureCard
            icon={ListChecks}
            label="Задания"
            description="От знаний к практике"
            onClick={() => onStart()}
          />
          <FeatureCard
            icon={TrendingUp}
            label="Прогресс"
            description="Замечай свои маленькие победы"
            onClick={() => onNavigate("progress")}
          />
          <FeatureCard
            icon={Sparkles}
            label="Персональный тренер"
            description="Найди точку для роста"
            onClick={() => onNavigate("trainer")}
            tone="feature-trainer"
          />
        </div>
      </section>
      <section className="trainer-banner">
        <div className="banner-illustration">
          <CoachIllustration />
        </div>
        <div className="trainer-banner-copy">
          <span className="eyebrow">УЧИТЬСЯ ЛЕГЧЕ С ПОДДЕРЖКОЙ</span>
          <h2>У каждого свой путь. Найдём твой.</h2>
          <p>Знакомься с персональным тренером — пока в деморежиме.</p>
        </div>
        <button
          className="button button-secondary"
          onClick={() => onNavigate("trainer")}
        >
          Познакомиться <ArrowRight size={17} />
        </button>
      </section>
      <div className="home-footnote">
        <Leaf size={14} />
        <span>Без спешки и сравнений. Только ты и твой прогресс.</span>
        <span className="footnote-line" />
      </div>
    </>
  );
}
