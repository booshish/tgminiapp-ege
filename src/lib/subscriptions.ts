import {
  getSubscriptionPrice, normalizeSlotCount, subscriptionPrices, subscriptionSeasons,
  subscriptionTimezone, supportedSubscriptionSubjects,
  type ExamSeasonConfig, type SeasonPricePhase, type SubscriptionPeriod, type SubscriptionSubject,
} from "./subscription-config";

export type { SubscriptionPeriod, ExamSeasonConfig, SubscriptionSubject } from "./subscription-config";

export type SubscriptionCalendar = {
  seasonYear: number;
  phase: "autumn" | "january" | "summer" | "unconfigured";
  seasonPricePhase: SeasonPricePhase;
  availablePeriods: SubscriptionPeriod[];
  seasonEndsAt: string | null;
  seasonLastDate: string | null;
  summerEndsAt: string;
  scheduleVerified: boolean;
  reason: string | null;
};

export type SubscriptionKind = SubscriptionPeriod | "trial";
export type SubscriptionStatus = "free" | "trial" | "active" | "expiring" | "expired";
export type SubjectReplacement = {
  requestId: string;
  fromSubjectId: string;
  toSubjectId: string;
  replacedAt: string;
  windowStartedAt: string;
};

/** A future verified server snapshot. This project neither issues nor stores one locally. */
export type SubscriptionRecord = {
  schemaVersion: 1;
  id: string;
  userId: string;
  kind: SubscriptionKind;
  activatedAt: string;
  /** Exclusive boundary: access is no longer valid exactly at this instant. */
  expiresAt: string;
  slotCount: number;
  subjectIds: string[];
  autoRenew: boolean;
  nextChargeAt: string | null;
  replacementHistory: SubjectReplacement[];
  pendingPlanChange?: { slotCount: number; effectiveAt: string; subjectIds: string[] } | null;
  authority: "server";
};

export type SubscriptionStatusView = {
  status: SubscriptionStatus;
  isPremium: boolean;
  endsAt: string | null;
  selectedSubjectIds: string[];
  slotCount: number;
  autoRenew: boolean;
  nextChargeAt: string | null;
};

export type BillingWindow = {
  index: number;
  startsAt: string;
  endsAt: string;
  replacementUsed: boolean;
  nextReplacementAt: string | null;
};

const dayMilliseconds = 86_400_000;
const moscowFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: subscriptionTimezone, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
type CalendarParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; millisecond: number };

function timestamp(value: string | Date): number {
  return value instanceof Date ? value.getTime() : /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : Number.NaN;
}
function partsInMoscow(value: string | Date): CalendarParts {
  const time = timestamp(value);
  if (!Number.isFinite(time)) throw new Error("Invalid subscription time");
  const parts = Object.fromEntries(moscowFormatter.formatToParts(new Date(time)).map((part) => [part.type, part.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second),
    millisecond: new Date(time).getUTCMilliseconds() };
}
function fromMoscowParts(parts: CalendarParts): Date {
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond);
  let guess = utc;
  // Resolve the IANA zone offset rather than depending on the machine's local zone.
  for (let index = 0; index < 3; index += 1) {
    const local = partsInMoscow(new Date(guess));
    const asUTC = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second, local.millisecond);
    const next = utc - (asUTC - guess);
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}
function calendarDate(value: string | null): { year: number; month: number; day: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
    ? { year, month, day } : null;
}
function midnight(year: number, month: number, day: number) {
  const normalized = new Date(Date.UTC(year, month - 1, day));
  return fromMoscowParts({ year: normalized.getUTCFullYear(), month: normalized.getUTCMonth() + 1,
    day: normalized.getUTCDate(), hour: 0, minute: 0, second: 0, millisecond: 0 });
}
function dayAfter(value: string) {
  const parts = calendarDate(value);
  if (!parts) throw new Error("Invalid season date");
  return midnight(parts.year, parts.month, parts.day + 1);
}

/** Month windows stay anchored to activation (Jan 31 → Feb 28 → Mar 31). */
export function addBillingMonths(activatedAt: string, months: number): string {
  if (!Number.isSafeInteger(months) || months < 0) throw new Error("Invalid billing month offset");
  const start = partsInMoscow(activatedAt);
  const monthStart = new Date(Date.UTC(start.year, start.month - 1 + months, 1));
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return fromMoscowParts({ ...start, year, month, day: Math.min(start.day, lastDay) }).toISOString();
}

function verifiedSeason(config: ExamSeasonConfig | undefined) {
  if (!config || config.timezone !== subscriptionTimezone || config.verification.status !== "verified" ||
      !config.verification.checkedAt || !Number.isFinite(Date.parse(config.verification.checkedAt)) ||
      !config.verification.sourceUrls.length || !config.verification.sourceUrls.every((url) => /^https:\/\//.test(url))) return null;
  const oge = calendarDate(config.ogeMainPeriodEndsOn);
  const ege = calendarDate(config.egeMainPeriodEndsOn);
  if (!oge || !ege || oge.year !== config.year || ege.year !== config.year || oge.month >= 9 || ege.month >= 9) return null;
  const lastDate = config.ogeMainPeriodEndsOn! > config.egeMainPeriodEndsOn! ? config.ogeMainPeriodEndsOn! : config.egeMainPeriodEndsOn!;
  const closeDate = config.seasonSalesCloseOn ?? lastDate;
  const close = calendarDate(closeDate);
  if (!close || close.year !== config.year || closeDate > lastDate) return null;
  return { lastDate, endsAt: dayAfter(lastDate).toISOString(), salesCloseAt: dayAfter(closeDate).toISOString() };
}

/** Browser preview only. A real purchase must use an authoritative server clock. */
export function getSubscriptionCalendar(now: Date, seasons: readonly ExamSeasonConfig[] = subscriptionSeasons): SubscriptionCalendar {
  const local = partsInMoscow(now);
  const seasonYear = local.month >= 9 ? local.year + 1 : local.year;
  const seasonPricePhase = local.month >= 9 ? "autumn" : "january";
  const configs = seasons.filter((entry) => entry.year === seasonYear);
  const verified = configs.length === 1 ? verifiedSeason(configs[0]) : null;
  const summerEndsAt = midnight(seasonYear, 9, 1).toISOString();
  if (!verified) return {
    seasonYear, phase: "unconfigured", seasonPricePhase, availablePeriods: ["monthly"],
    seasonEndsAt: null, seasonLastDate: null, summerEndsAt, scheduleVerified: false,
    reason: `Официальные даты завершения основного периода ОГЭ и ЕГЭ ${seasonYear} года ещё не внесены. Сезонные и летние продажи не открыты.`,
  };
  const ended = now.getTime() >= Date.parse(verified.endsAt);
  if (ended && now.getTime() < Date.parse(summerEndsAt)) return {
    seasonYear, phase: "summer", seasonPricePhase, availablePeriods: ["summer"],
    seasonEndsAt: verified.endsAt, seasonLastDate: verified.lastDate, summerEndsAt,
    scheduleVerified: true, reason: null,
  };
  const salesOpen = now.getTime() < Date.parse(verified.salesCloseAt) && !ended;
  return {
    seasonYear, phase: seasonPricePhase, seasonPricePhase,
    availablePeriods: salesOpen ? ["monthly", "season"] : ["monthly"],
    seasonEndsAt: verified.endsAt, seasonLastDate: verified.lastDate, summerEndsAt,
    scheduleVerified: true, reason: salesOpen ? null : "Продажа сезонной подписки завершена. Уже оплаченный доступ действует до указанной даты.",
  };
}

export type SubscriptionPricePreview = {
  period: SubscriptionPeriod;
  slotCount: number | null;
  rubles: number | null;
  currency: "RUB";
  startsAt: string;
  endsAt: string | null;
  configurationAvailable: boolean;
  unavailableReasons: string[];
  requiresServerConfirmation: true;
  autoRenewAllowed: boolean;
};

export function previewSubscriptionPrice(
  period: SubscriptionPeriod, slots: number, now: Date,
  seasons: readonly ExamSeasonConfig[] = subscriptionSeasons,
  subjects: readonly SubscriptionSubject[] = supportedSubscriptionSubjects,
): SubscriptionPricePreview {
  const calendar = getSubscriptionCalendar(now, seasons);
  const capacity = normalizeSlotCount(slots);
  const price = getSubscriptionPrice(period, slots, calendar.seasonPricePhase);
  const reasons: string[] = [];
  const availableSubjectCount = new Set(subjects.map((subject) => subject.id)).size;
  if (capacity === null) reasons.push("Некорректное количество предметов.");
  else if (capacity > availableSubjectCount) reasons.push("В приложении пока недостаточно поддерживаемых предметов для этого количества слотов.");
  if (price === null) reasons.push("Цена для такого количества предметов и срока не определена.");
  if (!calendar.availablePeriods.includes(period)) reasons.push(calendar.reason ?? "Этот срок сейчас не предлагается.");
  const endsAt = period === "monthly" ? addBillingMonths(now.toISOString(), 1)
    : period === "season" ? calendar.seasonEndsAt : calendar.scheduleVerified ? calendar.summerEndsAt : null;
  if (endsAt === null || Date.parse(endsAt) <= now.getTime()) reasons.push("Будущая дата окончания доступа не подтверждена.");
  return { period, slotCount: capacity, rubles: price, currency: "RUB", startsAt: now.toISOString(), endsAt,
    configurationAvailable: reasons.length === 0, unavailableReasons: reasons,
    requiresServerConfirmation: true, autoRenewAllowed: period === "monthly" };
}

function validRecord(record: SubscriptionRecord): boolean {
  if (!record || typeof record !== "object") return false;
  const start = timestamp(record.activatedAt);
  const end = timestamp(record.expiresAt);
  if (record.schemaVersion !== 1 || record.authority !== "server" || !record.id || !record.userId ||
      !["monthly", "season", "summer", "trial"].includes(record.kind) ||
      !Number.isFinite(start) || !Number.isFinite(end) || start >= end || typeof record.autoRenew !== "boolean" ||
      normalizeSlotCount(record.slotCount) !== record.slotCount || !Array.isArray(record.subjectIds) ||
      new Set(record.subjectIds).size !== record.subjectIds.length || record.subjectIds.length > record.slotCount ||
      record.subjectIds.some((id) => !id || typeof id !== "string") || !Array.isArray(record.replacementHistory)) return false;
  const requestIds = new Set<string>();
  for (const replacement of record.replacementHistory) {
    if (!replacement || typeof replacement !== "object" ||
        typeof replacement.requestId !== "string" || !/^[a-zA-Z0-9:_-]{1,160}$/.test(replacement.requestId) ||
        requestIds.has(replacement.requestId) || typeof replacement.fromSubjectId !== "string" || !replacement.fromSubjectId ||
        typeof replacement.toSubjectId !== "string" || !replacement.toSubjectId || replacement.fromSubjectId === replacement.toSubjectId ||
        typeof replacement.replacedAt !== "string" || typeof replacement.windowStartedAt !== "string") return false;
    const replaced = timestamp(replacement.replacedAt);
    const windowStart = timestamp(replacement.windowStartedAt);
    if (!Number.isFinite(replaced) || !Number.isFinite(windowStart) ||
        replaced < start || replaced >= end || windowStart < start || windowStart > replaced) return false;
    requestIds.add(replacement.requestId);
  }
  if (record.kind !== "monthly" && (record.autoRenew || record.nextChargeAt !== null || record.pendingPlanChange)) return false;
  if (record.kind === "trial" && (record.slotCount !== subscriptionPrices.trial.slots || end - start !== subscriptionPrices.trial.days * dayMilliseconds)) return false;
  if (record.autoRenew && (!record.nextChargeAt || timestamp(record.nextChargeAt) !== end)) return false;
  if (!record.autoRenew && record.nextChargeAt !== null) return false;
  return true;
}

/** Expiration is a read-only projection. No XP, selections or learning events are deleted. */
export function getSubscriptionStatus(record: SubscriptionRecord | null, now: Date): SubscriptionStatusView {
  const free: SubscriptionStatusView = { status: "free", isPremium: false, endsAt: null,
    selectedSubjectIds: [], slotCount: 0, autoRenew: false, nextChargeAt: null };
  if (!record || !validRecord(record) || !Number.isFinite(now.getTime())) return free;
  const end = timestamp(record.expiresAt);
  const active = now.getTime() >= timestamp(record.activatedAt) && now.getTime() < end;
  const status: SubscriptionStatus = now.getTime() >= end ? "expired" : !active ? "free" :
    record.kind === "trial" ? "trial" : end - now.getTime() <= 7 * dayMilliseconds ? "expiring" : "active";
  return { status, isPremium: active, endsAt: record.expiresAt, selectedSubjectIds: [...record.subjectIds],
    slotCount: record.slotCount, autoRenew: active && record.kind === "monthly" && record.autoRenew,
    nextChargeAt: active && record.kind === "monthly" && record.autoRenew ? record.nextChargeAt : null };
}

/** Every plan, including summer/trial, grants the same feature set for selected subjects. */
export const premiumFeatureIds = ["error-analysis", "coach", "smart-review", "guided-practice", "progress-analytics"] as const;
export type PremiumFeatureId = typeof premiumFeatureIds[number];
export function hasPremiumAccess(
  record: SubscriptionRecord | null, subjectId: string, now: Date,
  subjects: readonly SubscriptionSubject[] = supportedSubscriptionSubjects,
): boolean {
  return Boolean(record && getSubscriptionStatus(record, now).isPremium &&
    record.subjectIds.includes(subjectId) && subjects.some((subject) => subject.id === subjectId));
}

export function getBillingWindow(record: SubscriptionRecord, now: Date): BillingWindow | null {
  if (!getSubscriptionStatus(record, now).isPremium) return null;
  const start = partsInMoscow(record.activatedAt);
  const current = partsInMoscow(now);
  let index = Math.max(0, (current.year - start.year) * 12 + current.month - start.month);
  if (now.getTime() < Date.parse(addBillingMonths(record.activatedAt, index))) index -= 1;
  if (index < 0) return null;
  const startsAt = addBillingMonths(record.activatedAt, index);
  const next = addBillingMonths(record.activatedAt, index + 1);
  const endsAt = new Date(Math.min(Date.parse(next), Date.parse(record.expiresAt))).toISOString();
  const replacementUsed = record.replacementHistory.some((replacement) =>
    timestamp(replacement.replacedAt) >= Date.parse(startsAt) && timestamp(replacement.replacedAt) < Date.parse(endsAt));
  return { index, startsAt, endsAt, replacementUsed,
    nextReplacementAt: replacementUsed && Date.parse(next) < Date.parse(record.expiresAt) ? next : null };
}

export type SubjectChange =
  | { kind: "assign"; subjectId: string; requestId: string }
  | { kind: "replace"; fromSubjectId: string; toSubjectId: string; requestId: string };
export type SubscriptionMutationResult =
  | { ok: true; record: SubscriptionRecord; changed: boolean }
  | { ok: false; record: SubscriptionRecord; code: string; reason: string };

/** Pure server-domain reducer, not a client entitlement activation mechanism. */
export function applySubjectChange(
  record: SubscriptionRecord, command: SubjectChange, now: Date,
  subjects: readonly SubscriptionSubject[] = supportedSubscriptionSubjects,
): SubscriptionMutationResult {
  const fail = (code: string, reason: string): SubscriptionMutationResult => ({ ok: false, record, code, reason });
  if (!validRecord(record)) return fail("invalid-record", "Данные подписки требуют проверки на сервере.");
  if (!/^[a-zA-Z0-9:_-]{1,160}$/.test(command.requestId)) return fail("invalid-request", "Нужен корректный идентификатор операции.");
  const previous = record.replacementHistory.find((entry) => entry.requestId === command.requestId);
  if (previous) return command.kind === "replace" && previous.fromSubjectId === command.fromSubjectId && previous.toSubjectId === command.toSubjectId
    ? { ok: true, record, changed: false } : fail("request-conflict", "Этот идентификатор уже относится к другой операции.");
  const window = getBillingWindow(record, now);
  if (!window) return fail("inactive", "Изменить предметы можно только во время действующей подписки «Плюс».");
  const target = command.kind === "assign" ? command.subjectId : command.toSubjectId;
  if (!subjects.some((subject) => subject.id === target)) return fail("unsupported-subject", "Этот предмет пока не поддерживается.");
  if (command.kind === "assign") {
    if (record.subjectIds.includes(target)) return { ok: true, record, changed: false };
    if (record.subjectIds.length >= record.slotCount) return fail("no-free-slot", "Свободных слотов нет. Можно использовать замену предмета.");
    return { ok: true, changed: true, record: { ...record, subjectIds: [...record.subjectIds, target] } };
  }
  if (!record.subjectIds.includes(command.fromSubjectId) || record.subjectIds.includes(target))
    return fail("invalid-replacement", "Выбери подключённый предмет и другой доступный предмет для замены.");
  if (window.replacementUsed) return fail("replacement-used", "В этом расчётном месяце замена уже использована. Неиспользованные замены не накапливаются.");
  return { ok: true, changed: true, record: {
    ...record,
    subjectIds: record.subjectIds.map((id) => id === command.fromSubjectId ? target : id),
    replacementHistory: [...record.replacementHistory, {
      requestId: command.requestId, fromSubjectId: command.fromSubjectId, toSubjectId: target,
      replacedAt: now.toISOString(), windowStartedAt: window.startsAt,
    }],
  } };
}

/** No mid-period top-up. This only schedules a future recurring period, never charges. */
export function scheduleMonthlyPlanChange(
  record: SubscriptionRecord, nextSlots: number, nextSubjectIds: readonly string[], now: Date,
  subjects: readonly SubscriptionSubject[] = supportedSubscriptionSubjects,
): SubscriptionMutationResult {
  const fail = (code: string, reason: string): SubscriptionMutationResult => ({ ok: false, record, code, reason });
  if (record.kind !== "monthly") return fail("one-off-plan", "Для разовой сезонной или летней покупки автоматическая смена тарифа не предусмотрена.");
  if (!getSubscriptionStatus(record, now).isPremium) return fail("inactive", "Нет действующего месячного периода.");
  const capacity = normalizeSlotCount(nextSlots);
  if (!capacity || capacity > new Set(subjects.map((subject) => subject.id)).size || getSubscriptionPrice("monthly", capacity) === null)
    return fail("unsupported-capacity", "Такое количество слотов пока недоступно.");
  if (new Set(nextSubjectIds).size !== nextSubjectIds.length || nextSubjectIds.length > capacity ||
      nextSubjectIds.some((id) => !subjects.some((subject) => subject.id === id))) return fail("invalid-subjects", "Укажи доступные предметы в пределах нового тарифа.");
  return { ok: true, changed: true, record: { ...record,
    pendingPlanChange: { slotCount: capacity, effectiveAt: record.expiresAt, subjectIds: [...nextSubjectIds] },
  } };
}

export type TrialEligibility = {
  status: "eligible" | "already-used" | "verification-required" | "unavailable";
  checkedAt: string;
  authority: "server";
  explanation: string;
};
export type SubscriptionSnapshot = {
  serverNow: string;
  subscription: SubscriptionRecord | null;
  trialEligibility: TrialEligibility;
  supportedSubjects: SubscriptionSubject[];
};
export type PurchaseQuoteRequest = {
  period: SubscriptionPeriod;
  slotCount: number;
};
export type VerifiedPurchaseQuote = {
  id: string;
  authority: "server";
  configVersion: string;
  period: SubscriptionPeriod;
  slotCount: number;
  amountRubles: number;
  currency: "RUB";
  startsAt: string;
  expiresAt: string;
  validUntil: string;
  autoRenewAllowed: boolean;
};

/** Future authenticated server boundary. No endpoint, provider or fake success is implemented. */
export interface SubscriptionService {
  getSnapshot(): Promise<SubscriptionSnapshot>;
  quote(request: PurchaseQuoteRequest): Promise<VerifiedPurchaseQuote>;
  beginCheckout(request: { quoteId: string; idempotencyKey: string; consentToAutoRenew: boolean }): Promise<{ checkoutUrl: string }>;
  requestTrial(request: { selectedSubjectIds: string[]; idempotencyKey: string }): Promise<SubscriptionSnapshot>;
  changeSubjects(command: SubjectChange): Promise<SubscriptionSnapshot>;
  scheduleNextMonthlyPlan(request: { slotCount: number; selectedSubjectIds: string[]; idempotencyKey: string }): Promise<SubscriptionSnapshot>;
  setMonthlyAutoRenew(request: { enabled: boolean; idempotencyKey: string }): Promise<SubscriptionSnapshot>;
}
