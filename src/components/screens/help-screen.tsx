"use client";

import { ArrowLeft, ChevronDown, CircleHelp } from "lucide-react";
import { PageIntro } from "@/components/ui";
import { helpSections } from "@/lib/help-content";
import "./help-screen.css";

export function HelpScreen({ onBack }: { onBack: () => void }) {
  return (
    <section className="help-screen" aria-label="Помощь и объяснения">
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={20} aria-hidden="true" /> Назад
      </button>
      <PageIntro eyebrow="СПРАВКА ТОЧКИ" title="Помощь и объяснения">
        Как устроены опыт, шкалы и серии. Открой нужный вопрос — ответ останется
        на этой странице.
      </PageIntro>

      <nav className="help-contents" aria-label="Темы справки">
        {helpSections.map((section) => (
          <a key={section.id} href={`#/help?section=${section.id}`} onClick={(event) => {
            event.preventDefault();
            document.getElementById(`help-${section.id}`)?.scrollIntoView({ block: "start", behavior: "auto" });
            document.getElementById(`help-${section.id}`)?.focus({ preventScroll: true });
          }}>
            {section.title}
          </a>
        ))}
      </nav>

      <div className="help-sections">
        {helpSections.map((section) => (
          <section
            key={section.id}
            className="help-section"
            id={`help-${section.id}`}
            aria-labelledby={`help-title-${section.id}`}
            tabIndex={-1}
          >
            <div className="help-section-heading">
              <CircleHelp size={22} aria-hidden="true" />
              <div>
                <h2 id={`help-title-${section.id}`}>{section.title}</h2>
                <p>{section.description}</p>
              </div>
            </div>
            <div className="help-questions">
              {section.questions.map((question) => (
                <details key={question.id} className="help-question">
                  <summary>
                    <span>{question.title}</span>
                    <ChevronDown size={21} aria-hidden="true" />
                  </summary>
                  <div className="help-answer">
                    {question.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {question.list && (
                      <ul>{question.list.map((item) => <li key={item}>{item}</li>)}</ul>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="help-local-note">
        Ответы относятся к текущей локальной демоверсии «Точки». Аккаунты,
        облачное хранение и оплата пока не подключены.
      </p>
    </section>
  );
}
