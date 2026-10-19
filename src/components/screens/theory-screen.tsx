"use client";

import { ArrowLeft, ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import { PageIntro } from "@/components/ui";
import { theoryNotes } from "@/lib/demo";
import type { Exam } from "@/lib/navigation";

type TheoryScreenProps = {
  exam: Exam;
  onStart: (index?: number) => void;
  onBack: () => void;
};

// Явная связь с практикой сохраняется при изменении порядка конспектов.
const practiceTaskByNoteId: Record<string, number> = {
  "right-triangle": 0,
  "linear-equations": 1,
  fractions: 2,
  percentages: 4,
};

export function TheoryScreen({ exam, onStart, onBack }: TheoryScreenProps) {
  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={17} /> Назад
      </button>
      <PageIntro eyebrow={`${exam} · МАТЕМАТИКА`} title="Понять — уже полдела">
        Короткие конспекты, к которым удобно возвращаться.
      </PageIntro>
      <div className="theory-grid">
        {theoryNotes.map((note, index) => (
          <details className="theory-note" key={note.id} open={index === 0}>
            <summary>
              <span className="note-number">0{index + 1}</span>
              <span>
                <small>{note.topic}</small>
                <strong>{note.title}</strong>
              </span>
              <ChevronDown size={19} />
            </summary>
            <div className="theory-body">
              <p>{note.body}</p>
              <div className="theory-formula">{note.formula}</div>
              <span className="eyebrow">НА ПРИМЕРЕ</span>
              <p>{note.example}</p>
              <button
                className="text-button"
                onClick={() => onStart(practiceTaskByNoteId[note.id] ?? 0)}
              >
                Закрепить на практике <ArrowRight size={17} />
              </button>
            </div>
          </details>
        ))}
      </div>
      <div className="info-note">
        <BookOpen size={20} />
        <p>
          Четыре демоконспекта по базовым темам. Здесь можно освежить знания
          перед первой практикой.
        </p>
      </div>
    </>
  );
}
