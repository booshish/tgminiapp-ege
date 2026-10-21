"use client";

import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { gameConfig, getStreakFlame } from "@/lib/game-config";
import type { GameSummary, SubjectGameSummary } from "@/lib/gamification";
import "./game-motivation.css";

function XPScale({
  value,
  label,
}: {
  value: SubjectGameSummary | GameSummary;
  label: string;
}) {
  return (
    <div className="xp-scale-wrap">
      <div
        className="xp-scale"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={gameConfig.dailyVisualMaxXP}
        aria-valuenow={value.dailyScaleValue}
        aria-valuetext={`${value.todayXP} XP сегодня. Цветовая шкала до 150 XP, заработок не ограничен.`}
      >
        <span
          className="xp-fill"
          style={{
            width: `${value.dailyScaleValue / gameConfig.dailyVisualMaxXP * 100}%`,
            backgroundColor: value.rank.color,
          }}
        />
      </div>
      <div className="xp-scale-labels">
        <span>150 XP</span>
      </div>
    </div>
  );
}

export function WinStreak({ value }: { value: number }) {
  const flame = getStreakFlame(value);
  return (
    <span className="game-streak">
      <span className="game-flame-slot" aria-hidden="true">
        <Flame
          className="game-flame"
          size={flame.size}
          color={flame.color}
          fill={flame.color}
          strokeWidth={1.5}
        />
      </span>
      <span>Серия верных: {value}</span>
    </span>
  );
}

/** The same free motivation counters, without exposing learning analytics. */
export function StreakSummary({
  summary,
  subjectId = "math",
  subjectTitle = "Математика",
  showOverall = true,
}: {
  summary: GameSummary;
  subjectId?: string;
  subjectTitle?: string;
  showOverall?: boolean;
}) {
  const subjectStreak = summary.subjects.find((subject) => subject.subjectId === subjectId)?.winStreak ?? 0;
  return (
    <div className="streak-summary" role="group" aria-label="Серии верных ответов">
      {showOverall && <div className="streak-summary-item">
        <span className="streak-summary-label">Общая серия</span>
        <WinStreak value={summary.winStreak} />
      </div>}
      <div className="streak-summary-item">
        <span className="streak-summary-label">{subjectTitle}</span>
        <WinStreak value={subjectStreak} />
      </div>
    </div>
  );
}

export function GameMotivation({
  summary,
  onHelp,
}: {
  summary: GameSummary;
  onHelp: () => void;
}) {
  return (
    <section className="game-section" aria-labelledby="game-heading">
      <div className="section-title game-heading">
        <div>
          <span className="eyebrow">МОТИВАЦИЯ · БЕСПЛАТНО</span>
          <h2 id="game-heading">Твой ритм</h2>
        </div>
        <span className="game-level">
          <Sparkles size={17} aria-hidden="true" /> Уровень {summary.level.number}
        </span>
      </div>
      <div className="game-grid">
        <div className="game-overall-group">
          <article className="game-card game-overall">
            <div className="game-card-top">
              <span className="game-card-label">Общий опыт за день</span>
            </div>
            <p className="game-xp">
              <strong>{summary.todayXP}</strong> XP <span>сегодня</span>
            </p>
            <XPScale value={summary} label="Общая дневная шкала XP" />
            <div className="game-card-bottom">
              <span>Всего {summary.totalXP} XP</span>
              <WinStreak value={summary.winStreak} />
            </div>
          </article>
          <p className="game-help-note">
            Не знаешь, как начисляются XP?{" "}
            <a
              className="game-help-link"
              href="#/help"
              onClick={(event) => {
                event.preventDefault();
                onHelp();
              }}
            >
              Узнать подробнее <ArrowRight size={16} aria-hidden="true" />
            </a>
          </p>
        </div>
        {summary.subjects.map((subject) => {
          const subjectTitle = subject.subjectId === "math"
            ? "Математика"
            : subject.subjectId;
          return (
            <article className="game-card game-subject" key={subject.subjectId}>
              <div className="game-card-top">
                <span className="game-card-label">{subjectTitle}</span>
                <span className="game-subject-level">
                  Уровень {subject.level.number}
                </span>
              </div>
              <p className="game-xp">
                <strong>{subject.todayXP}</strong> XP <span>сегодня</span>
              </p>
              <XPScale
                value={subject}
                label={`Дневная шкала XP: ${subjectTitle}`}
              />
              <div className="game-card-bottom">
                <span>Всего {subject.totalXP} XP</span>
                <WinStreak value={subject.winStreak} />
              </div>
            </article>
          );
        })}
      </div>
      <p className="game-local-note">
        XP сохраняются в этом браузере. Это игровой опыт, а не прогноз баллов экзамена.
      </p>
    </section>
  );
}
