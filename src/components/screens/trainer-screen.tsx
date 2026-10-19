"use client";

import { ArrowRight, Lightbulb, ShieldCheck, Sparkles } from "lucide-react";
import { CoachIllustration } from "@/components/illustrations";
import { Meter, PageIntro } from "@/components/ui";
import { topicStats } from "@/lib/demo";
import type { View } from "@/lib/navigation";

type TrainerScreenProps = {
  onStart: (index?: number) => void;
  onNavigate: (view: View) => void;
};

export function TrainerScreen({ onStart, onNavigate }: TrainerScreenProps) {
  return (
    <>
      <PageIntro eyebrow="ПОДДЕРЖКА НА КАЖДОМ ШАГЕ" title="Персональный тренер">
        Большая цель становится ближе, когда есть понятный маршрут.
      </PageIntro>
      <div className="demo-notice">
        <Sparkles size={17} />
        <p>
          Знакомство с возможностями. Все проценты ниже — пример, реальный
          анализ ошибок пока не подключён.
        </p>
      </div>
      <div className="trainer-layout">
        <section className="readiness-card">
          <div>
            <span className="eyebrow">ПРИМЕР ГОТОВНОСТИ К ЭКЗАМЕНУ</span>
            <h2>
              Хорошее начало.
              <br />
              Продолжим расти?
            </h2>
          </div>
          <div className="readiness-visual">
            <div className="readiness-ring">
              <span>
                52<small>%</small>
                <em>пример</em>
              </span>
            </div>
            <CoachIllustration className="readiness-coach" />
          </div>
          <p>
            Не обязательно уметь всё сразу.
            <br />
            Начнём с того, что даст опору.
          </p>
          <button className="button button-primary" onClick={() => onStart(2)}>
            Начать тренировку <ArrowRight size={18} />
          </button>
        </section>
        <section className="topic-card">
          <div className="section-title">
            <h2>Твои точки роста</h2>
            <span className="tag">Пример</span>
          </div>
          <p className="muted">Темы, которым можно уделить внимание</p>
          <div className="topic-list">
            {topicStats.map((topic) => (
              <div className="topic-item" key={topic.label}>
                <div>
                  <strong>{topic.label}</strong>
                  <span>{topic.value}%</span>
                </div>
                <Meter
                  value={topic.value}
                  label={`${topic.label} — пример ${topic.value} процентов`}
                />
                <small>{topic.description}</small>
              </div>
            ))}
          </div>
          <div className="strength-note">
            <ShieldCheck size={21} />
            <p>
              <strong>Сильная сторона — геометрия</strong>
              <span>В этом примере она станет опорой для следующих тем.</span>
            </p>
          </div>
        </section>
      </div>
      <section className="recommendation-card">
        <span className="recommendation-icon">
          <Lightbulb size={25} strokeWidth={1.5} />
        </span>
        <div>
          <span className="eyebrow">ШАГ НАЗАД — ТОЖЕ ДВИЖЕНИЕ ВПЕРЁД</span>
          <h2>Крепкие основы дают уверенность</h2>
          <p>
            Повтори дроби и действия с числами из предыдущих классов. С ними
            уравнения и новые темы станут понятнее.
          </p>
          <button className="text-button" onClick={() => onNavigate("theory")}>
            Повторить основы <ArrowRight size={17} />
          </button>
        </div>
      </section>
      <p className="quiet-note">
        В будущем здесь появятся анализ ошибок и персональный план. Сейчас
        тренер показывает идею интерфейса и запускает обычные демозадачи.
      </p>
    </>
  );
}
