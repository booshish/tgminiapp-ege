import { getAvailableExamDefinitions } from "./exams";

export type SubscriptionPeriod = "monthly" | "season" | "summer";
export type SeasonPricePhase = "autumn" | "january";
export const subscriptionTimezone = "Europe/Moscow" as const;

/** Agreed product prices. They are not a checkout or a payment entitlement. */
export const subscriptionPrices = {
  currency: "RUB",
  monthly: { one: 199, upToThree: 299, eachAdditionalAboveThree: 200 },
  season: {
    autumn: { 1: 1499, 3: 2299, 4: 3799, 5: 5299 },
    january: { 1: 1099, 3: 1599, 4: 2699, 5: 3799 },
  },
  summer: { 1: 199, 3: 299, 4: 399, 5: 499 },
  trial: { days: 7, slots: 3, cardRequired: false, autoRenew: false },
} as const;

export type SubscriptionSubject = { id: string; title: string };
const subjectTitles: Readonly<Record<string, string>> = { math: "Математика" };
/** OGE and EGE mathematics are the same subject, not two paid slots. */
export const supportedSubscriptionSubjects: readonly SubscriptionSubject[] = [
  ...new Set(getAvailableExamDefinitions().map((exam) => exam.subjectId)),
].map((id) => ({ id, title: subjectTitles[id] ?? id }));

export type ExamSeasonConfig = {
  year: number;
  timezone: typeof subscriptionTimezone;
  /** Calendar dates YYYY-MM-DD, including reserve days of the MAIN period only. */
  ogeMainPeriodEndsOn: string | null;
  egeMainPeriodEndsOn: string | null;
  /** Optional inclusive sale cutoff. Null means the confirmed season's final day. */
  seasonSalesCloseOn: string | null;
  verification: {
    status: "unverified" | "verified";
    sourceUrls: readonly string[];
    checkedAt: string | null;
  };
};

/** Official schedules are unavailable in this environment: dates must not be guessed. */
export const subscriptionSeasons: readonly ExamSeasonConfig[] = [2026, 2027].map((year) => ({
  year,
  timezone: subscriptionTimezone,
  ogeMainPeriodEndsOn: null,
  egeMainPeriodEndsOn: null,
  seasonSalesCloseOn: null,
  verification: { status: "unverified", sourceUrls: [], checkedAt: null },
}));

/** Two selected subjects use the same up-to-three-slot product as three subjects. */
export function normalizeSlotCount(slots: number): number | null {
  return Number.isSafeInteger(slots) && slots > 0 ? (slots === 2 ? 3 : slots) : null;
}

export function getSubscriptionPrice(
  period: SubscriptionPeriod,
  slots: number,
  phase: SeasonPricePhase = "autumn",
): number | null {
  if (!["monthly", "season", "summer"].includes(period)) return null;
  const capacity = normalizeSlotCount(slots);
  if (capacity === null) return null;
  if (period === "monthly") {
    const price = capacity === 1 ? subscriptionPrices.monthly.one :
      subscriptionPrices.monthly.upToThree + (capacity - 3) * subscriptionPrices.monthly.eachAdditionalAboveThree;
    return Number.isSafeInteger(price) && price > 0 ? price : null;
  }
  const prices: Readonly<Record<number, number>> = period === "season"
    ? subscriptionPrices.season[phase] : subscriptionPrices.summer;
  return prices?.[capacity] ?? null;
}
