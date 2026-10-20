import { ArrowUpRight, ChevronDown, Flower2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Exam } from "@/lib/navigation";

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <Flower2 size={31} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span>
        точка<span className="brand-dot">.</span>
      </span>
    </div>
  );
}

export function Meter({ value, label }: { value: number; label: string }) {
  const percentage = Math.min(100, Math.max(0, value));
  return (
    <div
      className="meter"
      role="progressbar"
      aria-label={label}
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${percentage}%` }} />
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  );
}

export function ExamPicker({
  exam,
  onChange,
}: {
  exam: Exam;
  onChange: (exam: Exam) => void;
}) {
  return (
    <div className="course-picker">
      <div>
        <span className="picker-caption">Готовлюсь к</span>
        <div className="segmented" role="group" aria-label="Выбор экзамена">
          {(["ОГЭ", "ЕГЭ"] as const).map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={exam === option}
              className={exam === option ? "selected" : ""}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <span className="picker-divider" aria-hidden="true" />
      <label className="subject-picker">
        <span className="picker-caption">Предмет</span>
        <span className="select-wrap">
          <select aria-label="Выберите предмет" defaultValue="math">
            <option value="math">Математика</option>
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </span>
      </label>
    </div>
  );
}

export function FeatureCard({
  icon: Icon,
  label,
  description,
  onClick,
  tone = "",
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  tone?: string;
}) {
  return (
    <button type="button" className={`feature-card ${tone}`} onClick={onClick}>
      <span className="feature-top">
        <span className="feature-icon">
          <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <ArrowUpRight size={19} className="feature-arrow" aria-hidden="true" />
      </span>
      <span className="feature-title">{label}</span>
      <span className="feature-description">{description}</span>
    </button>
  );
}
