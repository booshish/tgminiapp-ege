"use client";

import { ArrowLeft, ArrowRight, Check, Leaf, Sparkles } from "lucide-react";
import { CoachIllustration } from "@/components/illustrations";
import { PageIntro } from "@/components/ui";
import { proposedMonthlyPrices } from "@/lib/subscription-config";

type PremiumScreenProps = { onBack: () => void };

const comparison = [
  { label: "Короткие конспекты по математике", free: true },
  { label: "Задания с проверкой и решениями", free: true },
  { label: "Игровые XP, уровни и серии", free: true },
  { label: "Избранное и ручной список «Мои ошибки»", free: true },
  { label: "Учебные варианты с таймером", free: true },
  { label: "Подробная статистика ответов", free: false },
  { label: "Подробный анализ ошибок по темам", free: false },
  { label: "Динамика занятий по датам", free: false },
  { label: "Темы с повторяющимися ошибками", free: false },
  { label: "Интервальное повторение и рекомендации сложности", free: false },
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
                <th scope="col">Функции</th>
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
            В деморежиме работают интервальные повторения и рекомендации
            сложности по прозрачным правилам. Полная диагностика пробелов,
            персональный учебный план и облачная синхронизация остаются в планах.
          </p>
        </div>
      </section>
      <section
        className="analytics-section"
        aria-labelledby="planned-prices-title"
      >
        <div className="section-title">
          <h2 id="planned-prices-title">Подписка · планируется</h2>
        </div>
        <div className="premium-comparison">
          <table>
            <caption className="sr-only">
              Предварительные месячные тарифы Premium
            </caption>
            <thead>
              <tr>
                <th scope="col">Предметы</th>
                <th scope="col">Проектная цена</th>
              </tr>
            </thead>
            <tbody>
              {proposedMonthlyPrices.map((price) => (
                <tr key={price.label}>
                  <th scope="row">{price.label}</th>
                  <td>{price.rubles} ₽/мес.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="quiet-note">
          Это предварительная концепция тарифов. Сейчас доступна только математика.
          Оплата и оформление подписки не подключены; XP одинаковы для Free и Premium.
        </p>
      </section>
      <button className="button button-primary" onClick={onBack}>
        Вернуться к обучению <ArrowRight size={18} aria-hidden="true" />
      </button>
    </>
  );
}
