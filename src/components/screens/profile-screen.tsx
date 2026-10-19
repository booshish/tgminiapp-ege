"use client";

import {
  ArrowRight,
  CircleCheck,
  GraduationCap,
  LockKeyhole,
  Sparkles,
  UserRound,
} from "lucide-react";
import { PageIntro } from "@/components/ui";
import type { DemoProgress } from "@/lib/demo";
import type { View } from "@/lib/navigation";

type ProfileScreenProps = {
  progress: DemoProgress;
  onNavigate: (view: View) => void;
};

export function ProfileScreen({ progress, onNavigate }: ProfileScreenProps) {
  const solved = new Set(
    progress.records
      .filter((record) => record.correct)
      .map((record) => record.taskId),
  ).size;

  return (
    <>
      <PageIntro eyebrow="ТВОЁ ПРОСТРАНСТВО" title="Профиль ученика">
        Здесь начинается твоя история подготовки.
      </PageIntro>
      <section className="profile-card">
        <div className="profile-avatar">
          <UserRound size={35} strokeWidth={1.5} />
        </div>
        <h2>Будем знакомы, ученик!</h2>
        <span className="tag">Гостевой демопрофиль</span>
        <p>
          Пока можно заниматься без регистрации. Авторизация появится позже —
          тогда твой прогресс сможет быть с тобой на разных устройствах.
        </p>
        <div className="profile-details">
          <span>
            <GraduationCap size={19} /> Твой экзамен
          </span>
          <strong>{progress.exam} · Математика</strong>
        </div>
        <div className="profile-details">
          <span>
            <CircleCheck size={19} /> Решено в демоверсии
          </span>
          <strong>{solved} из 5</strong>
        </div>
        <button
          className="button button-primary"
          onClick={() => onNavigate("catalog")}
        >
          Продолжить свой путь <ArrowRight size={18} />
        </button>
      </section>
      <section className="premium-card">
        <span className="premium-icon">
          <Sparkles size={24} />
        </span>
        <div>
          <h2>
            Premium <span className="tag">Скоро</span>
          </h2>
          <p>
            Анализ ошибок, персональный план и повторение основ — в будущих
            версиях. Тарифы пока не определены.
          </p>
        </div>
        <LockKeyhole size={19} className="muted" />
      </section>
      <p className="quiet-note">
        Все разделы этой демоверсии открыты. Оплаты и подписок пока нет.
      </p>
    </>
  );
}
