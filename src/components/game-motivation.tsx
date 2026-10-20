"use client";

import { Flame, Leaf, Sparkles } from "lucide-react";
import { gameConfig } from "@/lib/game-config";
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
        aria-valuetext={`${value.todayXP} XP сегодня. Ранг: ${value.rank.label}. Шкала до 150 XP, заработок не ограничен.`}
      >
        <span
          className={
            value.rank.id === "rainbow" ? "xp-fill xp-rainbow" : "xp-fill"
          }
          style={{
            width: `${value.dailyScaleValue / gameConfig.dailyVisualMaxXP * 100}%`,
            backgroundColor: value.rank.color,
          }}
        />
      </div>
      <div className="xp-scale-labels">
        <span>0 XP</span>
        <span>150 XP · последний ранг</span>
      </div>
    </div>
  );
}

export function GameMotivation({ summary }: { summary: GameSummary }) {
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
        <article className="game-card game-overall">
          <div className="game-card-top">
            <span className="game-card-label">Общий опыт за день</span>
            <span
              className="game-rank"
              style={{
                color: summary.rank.color,
                background: summary.rank.background,
              }}
            >
              <Leaf size={14} aria-hidden="true" />
              {summary.rank.label}
            </span>
          </div>
          <p className="game-xp">
            <strong>{summary.todayXP}</strong> XP <span>сегодня</span>
          </p>
          <XPScale value={summary} label="Общая дневная шкала XP" />
          <div className="game-card-bottom">
            <span>Всего {summary.totalXP} XP</span>
            <span className="game-streak">
              <Flame size={17} aria-hidden="true" />
              Серия верных: {summary.winStreak}
            </span>
          </div>
        </article>
        {summary.subjects.map((subject) => (
          <article className="game-card game-subject" key={subject.subjectId}>
            <div className="game-card-top">
              <span className="game-card-label">
                {subject.subjectId === "math" ? "Математика" : subject.subjectId}
              </span>
              <span className="game-subject-level">
                Уровень {subject.level.number}
              </span>
            </div>
            <p className="game-xp">
              <strong>{subject.todayXP}</strong> XP <span>сегодня</span>
            </p>
            <XPScale value={subject} label="Дневная шкала XP по математике" />
            <div className="game-card-bottom">
              <span>Всего {subject.totalXP} XP</span>
              <span>Серия верных: {subject.winStreak}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="game-verification-note" role="note">
        <Sparkles size={19} aria-hidden="true" />
        <p>
          XP — игровой опыт за самостоятельные ответы и подтверждённую самооценку.
          Это локальная демоверсия: опыт сохраняется в этом браузере, без аккаунта
          и синхронизации между устройствами.
        </p>
      </div>
      <details className="game-rules">
        <summary>Как работают опыт и серии</summary>
        <div>
          <p>
            XP — игровая мотивация, а не баллы экзамена и не оценка готовности.
            Одна общая шкала складывается из предметных. После 150 XP шкала
            заполнена, но опыт продолжает накапливаться.
          </p>
          <p>
            Рабочие настройки: новый уровень за каждые 100 XP; цвета и пороги
            рангов предварительные. Серия растёт после автоматически проверенного верного
            ответа первой части, включая исправление ошибки. Ошибка сбрасывает
            общую серию и серию этого предмета. Повторный просмотр и самооценка
            второй части серию не меняют.
          </p>
          <p>
            За первое самостоятельное верное решение номерного задания начисляется
            XP по сетке математики 2026 года из конфигурации проекта. Её онлайн-сверка
            ФИПИ недоступна. Просмотр готового решения до верного ответа исключает
            XP за эту задачу; повторная проверка дополнительных очков не даёт.
          </p>
          <p>
            Самооценка второй части даёт столько XP, сколько баллов ты подтвердил.
            Исправление оценки меняет только разницу, в том числе уменьшает опыт.
            Коррекция относится к исходному дню начисления, чтобы дневной баланс
            не становился отрицательным.
          </p>
        </div>
      </details>
    </section>
  );
}
