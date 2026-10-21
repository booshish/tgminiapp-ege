"use client";

import { ArrowRight, CalendarDays, Layers3 } from "lucide-react";
import {
  getBillingWindow,
  getSubscriptionStatus,
  type SubscriptionRecord,
  type SubscriptionStatus,
} from "@/lib/subscriptions";
import { subscriptionPrices, subscriptionTimezone, supportedSubscriptionSubjects } from "@/lib/subscription-config";
import "./subscription-status-card.css";

type Props = {
  onPremium: () => void;
  /** Only a verified future server adapter may supply a subscription. Never read from localStorage. */
  subscription?: SubscriptionRecord | null;
  now?: Date;
  developerPreview?: boolean;
};

const statusLabels: Record<SubscriptionStatus, string> = {
  free: "Free",
  trial: "Пробный период",
  active: "Активный Premium",
  expiring: "Заканчивается",
  expired: "Истёк",
};
const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: subscriptionTimezone, day: "numeric", month: "long", year: "numeric",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
function dateLabel(iso: string) {
  return `${dateFormatter.format(new Date(iso))} МСК`;
}

/** Read-only account presentation; purchases and trial activation are deliberately absent. */
export function SubscriptionStatusCard({ onPremium, subscription = null, now = new Date(), developerPreview = false }: Props) {
  const status = getSubscriptionStatus(subscription, now);
  const billingWindow = subscription && status.isPremium ? getBillingWindow(subscription, now) : null;
  const subjectTitle = (id: string) => supportedSubscriptionSubjects.find((subject) => subject.id === id)?.title ?? id;
  const freeSlots = Math.max(0, status.slotCount - status.selectedSubjectIds.length);

  return (
    <section className="settings-card subscription-status-card" aria-labelledby="subscription-status-title">
      <div className="section-title">
        <h2 id="subscription-status-title">Подписка</h2>
        <span className="tag" data-subscription-status={status.status}>{statusLabels[status.status]}</span>
      </div>
      {status.status === "free" ? (
        <>
          <p>Теория, стандартные задания, проверка и решения после ответа остаются бесплатными. XP, серии, избранное и ручной список ошибок тоже доступны.</p>
          <div className="subscription-account-note">
            <Layers3 size={20} aria-hidden="true" />
            <p>Сейчас можно готовиться по математике. Предметы для Premium выбираются отдельно после подключения подписки.</p>
          </div>
          <p>Подписки и пробный доступ на {subscriptionPrices.trial.days} суток готовятся к запуску. Активировать их пока нельзя.</p>
        </>
      ) : (
        <>
          <p>{status.status === "expired"
            ? "Доступ Premium завершён. Бесплатные занятия продолжаются, а твои данные и выбранные предметы сохранены."
            : subscription?.kind === "trial"
              ? "Пробный Premium без привязки карты. После окончания автоматически включится Free, списаний не будет."
              : "Все доступные Premium-функции включены для выбранных предметов."}</p>
          <dl className="subscription-account-facts">
            {status.endsAt && <div><dt><CalendarDays size={18} aria-hidden="true" />{status.status === "expired" ? "Доступ завершился" : "Доступ заканчивается"}</dt><dd>{dateLabel(status.endsAt)}</dd></div>}
            <div><dt>Предметы Premium</dt><dd>{status.selectedSubjectIds.length ? status.selectedSubjectIds.map(subjectTitle).join(", ") : "Пока не выбраны"}</dd></div>
            <div><dt>Свободные слоты</dt><dd>{freeSlots} из {status.slotCount}</dd></div>
            {status.isPremium && billingWindow && <div><dt>Замена предмета</dt><dd>{billingWindow.replacementUsed
              ? billingWindow.nextReplacementAt ? `Следующая — ${dateLabel(billingWindow.nextReplacementAt)}` : "Замена уже использована до конца доступа"
              : "Одна замена доступна в текущем расчётном месяце"}</dd></div>}
            {status.isPremium && subscription?.kind === "monthly" && <div><dt>Автопродление</dt><dd>{status.autoRenew && status.nextChargeAt ? `Следующее списание — ${dateLabel(status.nextChargeAt)}` : "Выключено. Доступ сохранится до конца оплаченного периода."}</dd></div>}
          </dl>
          {subscription?.kind !== "monthly" && <p>Разовое подключение, без автопродления.</p>}
          <p>Управление предметами и продлением появится после подключения сервиса подписок.</p>
        </>
      )}
      {developerPreview && <p className="subscription-developer-note">Открыт демонстрационный интерфейс Premium для разработки. Он не изменяет статус подписки и не является пробным периодом или покупкой.</p>}
      <p>После окончания Premium история решений, XP и выбранные предметы не удаляются. Сейчас данные хранятся только в этом браузере.</p>
      <button type="button" className="text-button" onClick={onPremium}>Подробнее о Premium <ArrowRight size={18} aria-hidden="true" /></button>
    </section>
  );
}
