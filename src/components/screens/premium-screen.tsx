"use client";

import { ArrowLeft, ArrowRight, Check, Leaf, Sparkles } from "lucide-react";
import { CoachIllustration } from "@/components/illustrations";
import { PageIntro } from "@/components/ui";

type PremiumScreenProps = { onBack: () => void };

const comparison = [
  { label: "Короткие конспекты по математике", free: true },
  { label: "Задания с проверкой и решениями", free: true },
  { label: "Подробная статистика ответов", free: false },
  { label: "Результаты по темам и история ошибок", free: false },
  { label: "Динамика занятий по датам", free: false },
  { label: "Темы с повторяющимися ошибками", free: false },
];

export function PremiumScreen({ onBack }: PremiumScreenProps) {
  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" /> Назад
      </button>
      <PageIntro
        eyebrow="БЕСПЛАТНЫЙ РЕЖИМ И PREMIUM"
        title="Возможности Premium"
      >
        Сравнение функций, доступных в текущей демоверсии.
      </PageIntro>
      <section className="premium-panel premium-intro">
        <CoachIllustration className="premium-coach" />
        <div>
          <span className="tag">
            <Sparkles size={14} aria-hidden="true" /> Premium
          </span>
          <h2>Статистика и повторение по темам</h2>
          <p>
            Подробные результаты помогают посмотреть на свою практику, вернуться
            к ошибкам и самостоятельно выбрать следующую тему.
          </p>
          <p className="muted">
            Это знакомство с возможностями приложения. Авторизация, оплата и
            серверная подписка пока не подключены. Купить или активировать
            подписку на этой странице нельзя.
          </p>
        </div>
      </section>
      <section className="analytics-section">
        <div className="section-title">
          <h2>Что работает в демоверсии</h2>
        </div>
        <div className="premium-comparison">
          <table>
            <caption className="sr-only">
              Сравнение бесплатного режима и Premium
            </caption>
            <thead>
              <tr>
                <th scope="col">Возможности</th>
                <th scope="col">Бесплатно</th>
                <th scope="col">Premium</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((feature) => (
                <tr key={feature.label}>
                  <th scope="row">{feature.label}</th>
                  <td>
                    {feature.free ? (
                      <>
                        <Check size={18} aria-hidden="true" />
                        <span className="sr-only">Доступно</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">Не входит</span>
                      </>
                    )}
                  </td>
                  <td>
                    <Check size={18} aria-hidden="true" />
                    <span className="sr-only">
                      Доступно в демонстрационном режиме
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="quiet-note">
          Возможности Premium сейчас можно проверить только в специальном
          демонстрационном режиме разработчика. Это не действующая платная
          подписка. Оплата пока не подключена.
        </p>
      </section>
      <section className="recommendation-card">
        <span className="recommendation-icon">
          <Leaf size={25} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <span className="eyebrow">СЛЕДУЮЩИЕ ЭТАПЫ РАЗВИТИЯ</span>
          <h2>Функции в разработке</h2>
          <p>
            В планах диагностика пробелов, персональный учебный маршрут,
            адаптивные тренировки и повторение основ предыдущих классов. Эти
            функции пока не подключены и не входят в работающую демонстрацию.
          </p>
        </div>
      </section>
      <button className="button button-primary" onClick={onBack}>
        Вернуться к обучению <ArrowRight size={18} aria-hidden="true" />
      </button>
    </>
  );
}
