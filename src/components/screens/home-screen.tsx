"use client";

import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CircleX,
  ClipboardCheck,
  CalendarClock,
  ListChecks,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { LearningIllustration } from "@/components/illustrations";
import { ExamPicker, FeatureCard, PageIntro } from "@/components/ui";
import type { Exam, View } from "@/lib/navigation";
import { GameMotivation } from "@/components/game-motivation";
import type { GameSummary } from "@/lib/gamification";
import "./home-profile-mobile.css";

type Props = {
  exam: Exam;
  onExamChange: (exam: Exam) => void;
  onStart: () => void;
  onNavigate: (view: View) => void;
  game: GameSummary;
  onHelp: () => void;
  resumeLabel?: string;
};

export function HomeScreen({ exam, onExamChange, onStart, onNavigate, game, onHelp, resumeLabel }: Props) {
  return (
    <div className="home-screen-layout">
      <PageIntro eyebrow="ТОЧКА · МАТЕМАТИКА" title="Твоя подготовка">
        <span className="home-wide-copy">Разбирай темы и решай задания в удобном порядке.</span>
        <span className="home-phone-context">{exam} · Математика{exam === "ЕГЭ" ? " · Профиль" : ""}</span>
      </PageIntro>
      <section className="course-hero" aria-labelledby="course-title">
        <div className="hero-copy">
          <span className="tag">Теория и практика</span>
          <h2 id="course-title">
            <span className="home-wide-copy">{exam} · Математика</span>
            <span className="home-phone-copy">{resumeLabel ? "Продолжить решение" : "Начать подготовку"}</span>
          </h2>
          <p>
            {resumeLabel ?? "Выбери тему для повторения или начни самостоятельную практику."}
          </p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={onStart}>
              {resumeLabel ? "Продолжить решение" : "Выбрать задания"} <ArrowRight size={18} />
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
      <div className="home-exam-picker"><ExamPicker exam={exam} onChange={onExamChange} /></div>
      <section className="home-quick-access" aria-labelledby="home-quick-title">
        <h2 id="home-quick-title">Быстрый доступ</h2>
        <div className="home-quick-grid">
          {([
            { view: "mistakes", label: "Мои ошибки", icon: CircleX },
            { view: "favorites", label: "Избранное", icon: Bookmark },
            { view: "mock", label: "Учебный вариант", icon: ClipboardCheck },
          ] as const).map(({ view, label, icon: Icon }) => (
            <button key={view} type="button" className="home-quick-link" onClick={() => onNavigate(view)}>
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
      <GameMotivation summary={game} onHelp={onHelp} />
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
          <FeatureCard icon={Bookmark} label="Избранное" description="Сохранённые задания и конспекты" onClick={() => onNavigate("favorites")} />
          <FeatureCard icon={CircleX} label="Мои ошибки" description="Вернуться к задачам и разобрать теорию" onClick={() => onNavigate("mistakes")} />
          <FeatureCard icon={ClipboardCheck} label="Учебный вариант" description="Таймер, задания и сохранение ответов" onClick={() => onNavigate("mock")} />
          <FeatureCard icon={CalendarClock} label="Умное повторение" description="Новые аналогичные задачи в Premium" onClick={() => onNavigate("review")} />
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
      <button type="button" className="text-button home-premium-link" onClick={() => onNavigate("premium")}>
        Возможности Premium <ArrowRight size={17} aria-hidden="true" />
      </button>
    </div>
  );
}
