"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, CircleHelp, Layers3, LockKeyhole, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { CoachIllustration } from "@/components/illustrations";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import {
  getSubscriptionPrice, subscriptionPrices, subscriptionTimezone,
  selectableSubscriptionSubjects as supportedSubscriptionSubjects, type ExamSeasonConfig, type SubscriptionPeriod,
} from "@/lib/subscription-config";
import { getSubscriptionCalendar } from "@/lib/subscriptions";
import "../premium-screen.css";

type PremiumScreenProps = {
  onBack: () => void;
  onProfile?: () => void;
  /** An explicit clock/config may be supplied by a future server or isolated UI tests. */
  previewNow?: Date;
  seasons?: readonly ExamSeasonConfig[];
};

const periodLabels: Record<SubscriptionPeriod, string> = {
  monthly: "1 месяц", season: "До конца экзаменов", summer: "Точка Лето",
};
const priceFormat = new Intl.NumberFormat("ru-RU");
const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  timeZone: subscriptionTimezone, day: "numeric", month: "long", year: "numeric",
});

/** Refresh at the next Moscow midnight as well as when returning to this tab. */
function nextClockRefresh(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: subscriptionTimezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const seconds = read("hour") * 3600 + read("minute") * 60 + read("second");
  return Math.max(25, Math.min(60_000, (86400 - seconds) * 1000 - now.getMilliseconds() + 10));
}

export function PremiumScreen({ onBack, onProfile, previewNow, seasons }: PremiumScreenProps) {
  const isPhone = usePhoneLayout();
  // The first server/client render is identical; device time is only an informational preview.
  const [clock, setClock] = useState<Date | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<SubscriptionPeriod>("monthly");
  const [selectedCustomSlots, setSelectedCustomSlots] = useState(4);
  useEffect(() => {
    if (previewNow) return;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      setClock(now);
      timer = setTimeout(refresh, nextClockRefresh(now));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [previewNow]);

  const now = previewNow ?? clock;
  const calendar = now ? getSubscriptionCalendar(now, seasons) : null;
  // In autumn an upcoming season may be previewed, but never sold without its official end date.
  const previewSeason = calendar?.phase === "unconfigured" && calendar.seasonPricePhase === "autumn";
  const periods: SubscriptionPeriod[] = !calendar ? ["monthly"] : calendar.phase === "summer"
    ? ["summer"] : previewSeason ? ["monthly", "season"] : calendar.availablePeriods;
  const period = periods.includes(selectedPeriod) ? selectedPeriod : periods[0] ?? "monthly";
  const pricePhase = calendar?.seasonPricePhase ?? "autumn";
  const supportedCount = supportedSubscriptionSubjects.length;
  const customOptions = Array.from({ length: Math.max(0, supportedCount - 3) }, (_, index) => index + 4)
    .filter((slots) => getSubscriptionPrice(period, slots, pricePhase) !== null);
  const customSlots = customOptions.includes(selectedCustomSlots) ? selectedCustomSlots : customOptions[0] ?? 4;
  const plans = [
    { id: "start", title: "Старт", subtitle: "1 предмет", slots: 1, detail: "Когда хочешь сосредоточиться на одном предмете." },
    { id: "optimal", title: "Оптимальный", subtitle: "До 3 предметов", slots: 3, detail: "Можно выбрать два предмета, а третий слот заполнить позже." },
    { id: "custom", title: "Свой набор", subtitle: "4 и более предметов", slots: customSlots, detail: "" },
  ];
  const dateNote = !calendar ? "Уточняем доступные сроки подписки…" : period === "monthly"
    ? "Один расчётный месяц с активации. Точную дату окончания покажем перед оформлением."
    : period === "summer" && calendar
      ? `Доступ до ${dateFormat.format(new Date(calendar.summerEndsAt))}, 00:00 МСК. Разовый платёж за весь оставшийся летний период, без автопродления.`
      : calendar?.seasonEndsAt
        ? `Доступ по ${dateFormat.format(new Date(Date.parse(calendar.seasonEndsAt) - 1))} включительно, до 23:59:59 МСК. Разовый платёж, без автопродления.`
        : `Дата окончания сезона ${calendar?.seasonYear ?? ""} пока уточняется по официальному расписанию ОГЭ и ЕГЭ с резервными днями основного периода. Сезонную подписку пока нельзя оформить.`;

  const features = (
      <section className="premium-feature-section" aria-labelledby="premium-features-title">
        <h2 id="premium-features-title">Один набор возможностей — в каждом тарифе</h2>
        <p className="premium-secondary">Включая «Точка Лето». Различаются только число предметов и срок доступа.</p>
        <div className="premium-feature-grid">
          <article>
            <ChartNoAxesCombined size={24} strokeWidth={1.7} aria-hidden="true" />
            <h3>Анализ ошибок и прогресса</h3>
            <p>Результаты по темам, история ответов и динамика подготовки.</p>
            <span className="premium-feature-state">Работает в деморежиме</span>
          </article>
          <article>
            <RefreshCw size={24} strokeWidth={1.7} aria-hidden="true" />
            <h3>Повторение в тренере</h3>
            <p>Новые похожие задания и интервалы повторения по сохранённым ответам.</p>
            <span className="premium-feature-state">Работает в деморежиме</span>
          </article>
          <article>
            <Sparkles size={24} strokeWidth={1.7} aria-hidden="true" />
            <h3>Мой тренер</h3>
            <p>Рекомендации сложности доступны в деморежиме. Индивидуальный план ещё готовится.</p>
            <span className="premium-feature-state">Реализовано частично</span>
          </article>
        </div>
      </section>
  );
  const pricingNotes = (
    <>
        <div className="premium-period-note" aria-live="polite">
          <CalendarDays size={21} aria-hidden="true" />
          <div>
            <p>{dateNote}</p>
            {period === "season" && <p className="premium-secondary">{pricePhase === "autumn" ? "Осенняя цена фиксирована с сентября по декабрь." : "Январская цена фиксирована до окончания продаж сезона."} Она не уменьшается каждый день.</p>}
            {calendar?.phase === "unconfigured" && period === "monthly" && <p className="premium-secondary">{calendar.reason} Сезонные даты и доступность летнего тарифа подтвердим после проверки расписания.</p>}
          </div>
        </div>
        <p className="premium-catalog-note">
          {supportedCount === 1 ? `Сейчас доступна только ${supportedSubscriptionSubjects[0].title.toLocaleLowerCase("ru")}. Цены наборов на несколько предметов показаны для знакомства; выбрать такой набор пока нельзя.`
            : `Доступных предметов: ${supportedCount}. Выбрать можно только предметы, уже опубликованные в приложении.`}
        </p>
    </>
  );

  return (
    <section className="premium-landing" aria-labelledby="premium-title">
      <button type="button" className="back-link" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />Назад</button>
      <header className="premium-landing-hero">
        <div>
          <span className="eyebrow">БОЛЬШЕ ПОДДЕРЖКИ В ПОДГОТОВКЕ</span>
          <h1 id="premium-title">Точка Плюс</h1>
          <p>Разбирайся в ошибках, возвращайся к нужным темам и следи за результатами подготовки.</p>
        </div>
        <CoachIllustration className="premium-landing-mascot" />
      </header>

      {!isPhone && features}

      <section className="premium-pricing" aria-labelledby="premium-pricing-title">
        <div className="premium-pricing-heading">
          <div>
            <span className="eyebrow">ТАРИФЫ ГОТОВЯТСЯ К ЗАПУСКУ</span>
            <h2 id="premium-pricing-title">{period === "summer" ? "Точка Лето" : "Выбери удобный срок"}</h2>
          </div>
          <div className="premium-period-options" role="group" aria-label="Срок подписки" aria-busy={!calendar}>
            {calendar ? periods.map((option) => <button key={option} type="button" aria-pressed={period === option}
              className={period === option ? "selected" : ""} onClick={() => setSelectedPeriod(option)}>{periodLabels[option]}</button>) : <span className="premium-period-loading" role="status">Уточняем сроки…</span>}
          </div>
        </div>
        {!isPhone && pricingNotes}
        <div className="premium-plan-grid">
          {plans.map((plan) => {
            const price = calendar ? getSubscriptionPrice(period, plan.slots, pricePhase) : null;
            const enoughSubjects = plan.slots <= supportedCount;
            return <article key={plan.id} className={`premium-plan${plan.id === "optimal" ? " premium-plan-featured" : ""}`} aria-labelledby={`premium-plan-${plan.id}`}>
              {plan.id === "optimal" && <span className="premium-plan-recommendation"><Check size={15} aria-hidden="true" />Выгодный выбор</span>}
              <div className="premium-plan-heading"><h3 id={`premium-plan-${plan.id}`}>{plan.title}</h3><p>Точка Плюс · {plan.slots} {plan.slots === 1 ? "предмет" : plan.slots < 5 ? "предмета" : "предметов"}</p><p>{plan.subtitle}</p></div>
              <div className="premium-plan-price" aria-live="polite"><strong>{!calendar ? "—" : price === null ? "Не определена" : `${priceFormat.format(price)} ₽`}</strong><span>{!calendar ? "Уточняем срок" : period === "monthly" ? "в месяц" : "за весь период"}</span></div>
              {plan.id === "custom" && <div className="premium-custom-selection">
                <label htmlFor="premium-custom-slots">Количество предметов</label>
                <div className="premium-custom-select-wrap"><select id="premium-custom-slots" disabled={customOptions.length === 0} value={customOptions.length ? customSlots : ""}
                  onChange={(event) => setSelectedCustomSlots(Number(event.target.value))} aria-describedby="premium-custom-note">
                  {customOptions.length ? customOptions.map((slots) => <option key={slots} value={slots}>{slots} предметов</option>) : <option value="">Пока недоступно</option>}
                </select><ChevronDown size={19} aria-hidden="true" /></div>
                <p id="premium-custom-note" className="premium-secondary">{customOptions.length === 0 ? "Пример цены на 4 предмета. Набор пока недоступен." : period !== "monthly" ? "Для этого срока доступны только наборы с утверждённой ценой." : "Стоимость зависит от числа слотов."}</p>
              </div>}
              {plan.detail && <p className="premium-plan-description">{plan.detail}</p>}
              <p className="premium-plan-includes"><Check size={18} aria-hidden="true" />Все доступные функции Плюса</p>
              <div className="premium-plan-footer">
                {!enoughSubjects && plan.id !== "custom" && <p className="premium-secondary">Станет доступен, когда появятся новые предметы.</p>}
                <button type="button" className="button premium-unavailable-button" disabled title="Оплата пока недоступна" aria-describedby="premium-payment-note"><LockKeyhole size={17} aria-hidden="true" />Подключить Плюс</button>
              </div>
            </article>;
          })}
        </div>
        {isPhone && pricingNotes}
        <p id="premium-payment-note" className="premium-payment-note">Оплата пока недоступна. Это информационная страница. Оплата, аккаунты и серверная проверка подписки ещё не подключены. Точную стоимость и срок при покупке будет подтверждать сервер.</p>
      </section>

      {isPhone && features}

      <section className="premium-trial" aria-labelledby="premium-trial-title">
        <div>
          <span className="eyebrow">ПРОБНЫЙ ПЕРИОД · ПЛАНИРУЕТСЯ</span>
          <h2 id="premium-trial-title">{subscriptionPrices.trial.days} дней Плюса</h2>
          <p>Подписка «Плюс» на {subscriptionPrices.trial.slots} выбранных предмета. Затем — Free без списаний, с сохранением данных.</p>
          <p className="premium-secondary">Один пробный период на пользователя. Он появится после подключения аккаунтов, проверки права на пробу и нужного набора предметов.</p>
          <details className="premium-trial-terms">
            <summary>Условия пробного периода</summary>
            <p className="premium-secondary">По текущей модели привязка карты не требуется. Доступ заканчивается через {subscriptionPrices.trial.days} суток после активации, без списаний и автоматического продления. Сейчас активировать пробный период нельзя.</p>
          </details>
        </div>
        <button type="button" className="button premium-unavailable-button" disabled>Пробный период скоро</button>
      </section>

      <section className="premium-rules" aria-label="Как будет работать подписка">
        <article><Layers3 size={23} aria-hidden="true" /><div><h3>Предметы занимают слоты</h3><p>Свободный слот можно будет заполнить позже без доплаты. Один выбранный предмет — заменить раз за расчётный месяц. Неиспользованные замены не накапливаются.</p></div></article>
        <article><ShieldCheck size={23} aria-hidden="true" /><div><h3>Подготовка сохраняется</h3><p>После окончания подписки «Плюс» останутся XP, серии, ответы и выбранные предметы. Бесплатная подготовка продолжится, а данные Плюса вновь откроются после продления.</p></div></article>
      </section>

      <details className="premium-development">
        <summary><span><CircleHelp size={21} aria-hidden="true" />Функции в разработке</span><ChevronDown size={20} aria-hidden="true" /></summary>
        <div>
          <p>Индивидуальный учебный план, полноценная диагностика причин ошибок и отдельные обучающие задания с подсказками ещё не готовы. Сейчас в деморежиме работают анализ результатов, повторение и рекомендации по прозрачным правилам.</p>
          <p>Для продаж нужны аккаунты, проверка прав на сервере и платёжный сервис. Месячное автопродление появится только после его подключения: с датой списания и возможностью отключить. Сезонный и летний тарифы — разовые, без автопродления.</p>
          <p>Расширение набора предметов в месячном тарифе возможно будет только со следующего оплачиваемого периода. Для разовых покупок автоматическая смена тарифа пока не предусмотрена.</p>
        </div>
      </details>
      <section className="premium-free-note" aria-labelledby="premium-free-title">
        <h2 id="premium-free-title">Бесплатная подготовка остаётся бесплатной</h2>
        <p>Вся теория, стандартные задания без лимита, проверка и решения после ответа, XP, серии, закладки, ручные «Мои ошибки» и базовые результаты учебных вариантов. Плюс не добавляет множителей XP.</p>
      </section>
      <div className="premium-page-actions">
        <button type="button" className="button button-primary" onClick={onBack}>Вернуться к обучению<ArrowRight size={18} aria-hidden="true" /></button>
        {onProfile && <button type="button" className="text-button" onClick={onProfile}>Моя подписка в профиле<ArrowRight size={18} aria-hidden="true" /></button>}
      </div>
    </section>
  );
}
