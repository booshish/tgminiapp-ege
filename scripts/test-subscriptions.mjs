import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader } from "./content-source-loader.mjs";
const load = createContentLoader();
const config = load("src/lib/subscription-config.ts");
const model = load("src/lib/subscriptions.ts");
const { getSubscriptionPrice, normalizeSlotCount, supportedSubscriptionSubjects, subscriptionSeasons } = config;
const { getSubscriptionCalendar, previewSubscriptionPrice, addBillingMonths, getSubscriptionStatus,
  hasPremiumAccess, getBillingWindow, applySubjectChange, scheduleMonthlyPlanChange, premiumFeatureIds } = model;
const at = (value) => new Date(value);
const catalog = ["math", "physics", "russian", "history", "chemistry", "biology", "geography"].map((id) => ({ id, title: id }));
// Synthetic test schedules only. These are NOT published official exam dates.
const fixtures = [2026, 2027, 2028].map((year) => ({
  year, timezone: "Europe/Moscow", ogeMainPeriodEndsOn: `${year}-07-01`, egeMainPeriodEndsOn: `${year}-06-29`, seasonSalesCloseOn: null,
  verification: { status: "verified", sourceUrls: ["https://official.example.test/synthetic-schedule"], checkedAt: "2025-08-01T00:00:00Z" },
}));
const record = (changes = {}) => ({
  schemaVersion: 1, authority: "server", id: "sub-1", userId: "student-1", kind: "season",
  activatedAt: "2026-01-31T10:15:00.000Z", expiresAt: "2026-07-01T21:00:00.000Z",
  slotCount: 3, subjectIds: ["math", "physics"], autoRenew: false, nextChargeAt: null, replacementHistory: [], ...changes,
});

function replace(current, from, to, date, id) {
  const result = applySubjectChange(current, { kind: "replace", fromSubjectId: from, toSubjectId: to, requestId: id }, at(date), catalog);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.record;
}

test("subscription monthly prices are exact, 2 subjects use 3 slots, and growth has no invented flat cap", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((slots) => getSubscriptionPrice("monthly", slots)), [199, 299, 299, 499, 699, 899, 1099]);
  assert.equal(normalizeSlotCount(2), 3);
  for (const slots of [0, -1, 1.5, NaN, Infinity]) assert.equal(getSubscriptionPrice("monthly", slots), null);
  assert.equal(getSubscriptionPrice("annual", 1), null);
  assert.equal(getSubscriptionPrice("monthly", Number.MAX_SAFE_INTEGER), null);
});

test("season and summer prices are fixed agreed totals; 6+ has no fabricated price", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((slots) => getSubscriptionPrice("season", slots, "autumn")), [1499, 2299, 2299, 3799, 5299]);
  assert.deepEqual([1, 2, 3, 4, 5].map((slots) => getSubscriptionPrice("season", slots, "january")), [1099, 1599, 1599, 2699, 3799]);
  assert.deepEqual([1, 2, 3, 4, 5].map((slots) => getSubscriptionPrice("summer", slots)), [199, 299, 299, 399, 499]);
  for (const slots of [6, 7, 100]) {
    assert.equal(getSubscriptionPrice("season", slots, "autumn"), null);
    assert.equal(getSubscriptionPrice("season", slots, "january"), null);
    assert.equal(getSubscriptionPrice("summer", slots), null);
  }
});

test("season pricing switches exactly at Moscow New Year, not at UTC or the machine timezone", () => {
  const december = getSubscriptionCalendar(at("2026-12-31T20:59:59.999Z"), fixtures);
  const january = getSubscriptionCalendar(at("2026-12-31T21:00:00.000Z"), fixtures);
  assert.equal(december.seasonYear, 2027);
  assert.equal(january.seasonYear, 2027);
  assert.equal(december.phase, "autumn");
  assert.equal(january.phase, "january");
  assert.equal(previewSubscriptionPrice("season", 3, at("2026-09-01T00:00:00Z"), fixtures, catalog).rubles, 2299);
  assert.equal(previewSubscriptionPrice("season", 3, at("2026-12-31T20:59:59Z"), fixtures, catalog).rubles, 2299);
  for (const month of ["01", "02", "03", "04", "05"]) assert.equal(previewSubscriptionPrice("season", 3, at(`2027-${month}-20T12:00:00Z`), fixtures, catalog).rubles, 1599);
});

test("the latest MAIN-period reserve date remains valid through its full Moscow calendar day", () => {
  const last = getSubscriptionCalendar(at("2026-07-01T20:59:59.999Z"), fixtures);
  assert.deepEqual(last.availablePeriods, ["monthly", "season"]);
  assert.equal(last.seasonLastDate, "2026-07-01");
  assert.equal(last.seasonEndsAt, "2026-07-01T21:00:00.000Z");
  const summer = getSubscriptionCalendar(at("2026-07-01T21:00:00.000Z"), fixtures);
  assert.equal(summer.phase, "summer");
  assert.deepEqual(summer.availablePeriods, ["summer"]);
  assert.equal(summer.summerEndsAt, "2026-08-31T21:00:00.000Z");
  assert.equal(previewSubscriptionPrice("season", 1, at("2026-07-01T21:00:00Z"), fixtures, catalog).configurationAvailable, false);
  const swapped = fixtures.map((entry) => ({ ...entry, ogeMainPeriodEndsOn: entry.egeMainPeriodEndsOn, egeMainPeriodEndsOn: entry.ogeMainPeriodEndsOn }));
  assert.equal(getSubscriptionCalendar(at("2026-05-01T00:00:00Z"), swapped).seasonLastDate, "2026-07-01");
});

test("summer is fixed-price until September 1 begins and cannot leak into the next school year", () => {
  const july = previewSubscriptionPrice("summer", 5, at("2026-07-02T12:00:00Z"), fixtures, catalog);
  const august = previewSubscriptionPrice("summer", 5, at("2026-08-31T20:59:59.999Z"), fixtures, catalog);
  assert.equal(july.rubles, 499);
  assert.equal(august.rubles, 499);
  assert.equal(august.endsAt, "2026-08-31T21:00:00.000Z");
  assert.equal(august.configurationAvailable, true);
  const september = getSubscriptionCalendar(at("2026-08-31T21:00:00.000Z"), fixtures);
  assert.equal(september.phase, "autumn");
  assert.equal(september.seasonYear, 2027);
  assert.deepEqual(september.availablePeriods, ["monthly", "season"]);
  assert.equal(previewSubscriptionPrice("summer", 1, at("2026-08-31T21:00:00Z"), fixtures, catalog).configurationAvailable, false);
});

test("unverified, incomplete, mixed-year and autumn-resit configurations fail closed", () => {
  assert.ok(subscriptionSeasons.every((season) => season.ogeMainPeriodEndsOn === null && season.egeMainPeriodEndsOn === null && season.verification.status === "unverified"));
  for (const now of ["2026-10-21T11:00:00Z", "2027-01-01T00:00:00Z", "2027-08-20T00:00:00Z", "2028-12-01T00:00:00Z"]) {
    const calendar = getSubscriptionCalendar(at(now));
    assert.deepEqual(calendar.availablePeriods, ["monthly"]);
    assert.equal(calendar.phase, "unconfigured");
    assert.equal(calendar.seasonEndsAt, null);
    assert.ok(calendar.reason);
  }
  const source = fixtures[0];
  const bad = [
    { ...source, ogeMainPeriodEndsOn: null },
    { ...source, egeMainPeriodEndsOn: "2025-06-29" },
    { ...source, ogeMainPeriodEndsOn: "2026-09-15" },
    { ...source, ogeMainPeriodEndsOn: "2026-02-30" },
    { ...source, verification: { ...source.verification, status: "unverified" } },
    { ...source, verification: { ...source.verification, sourceUrls: [] } },
    { ...source, seasonSalesCloseOn: "2026-07-10" },
  ];
  for (const badConfig of bad) assert.equal(getSubscriptionCalendar(at("2026-04-01T00:00:00Z"), [badConfig]).scheduleVerified, false);
  assert.equal(getSubscriptionCalendar(at("2026-04-01T00:00:00Z"), [source, source]).scheduleVerified, false);
  assert.throws(() => getSubscriptionCalendar(new Date(NaN)));
});

test("a configured early sale cutoff never shortens an already paid season or invents summer", () => {
  const schedules = fixtures.map((season) => ({ ...season, seasonSalesCloseOn: `${season.year}-06-15` }));
  const before = getSubscriptionCalendar(at("2026-06-15T20:59:59.999Z"), schedules);
  const after = getSubscriptionCalendar(at("2026-06-15T21:00:00.000Z"), schedules);
  assert.ok(before.availablePeriods.includes("season"));
  assert.deepEqual(after.availablePeriods, ["monthly"]);
  assert.equal(after.phase, "january");
  assert.equal(after.seasonEndsAt, "2026-07-01T21:00:00.000Z");
});

test("live subject availability limits selectable capacity without duplicating OGE/EGE math", () => {
  assert.deepEqual(supportedSubscriptionSubjects.map((subject) => subject.id), ["math"]);
  const one = previewSubscriptionPrice("monthly", 1, at("2026-10-21T12:00:00Z"));
  const three = previewSubscriptionPrice("monthly", 2, at("2026-10-21T12:00:00Z"));
  assert.equal(one.configurationAvailable, true);
  assert.equal(three.slotCount, 3);
  assert.equal(three.rubles, 299);
  assert.equal(three.configurationAvailable, false);
  assert.equal(one.requiresServerConfirmation, true);
  assert.equal(previewSubscriptionPrice("monthly", 7, at("2026-10-21T12:00:00Z"), fixtures, catalog).configurationAvailable, true);
  assert.equal(previewSubscriptionPrice("summer", 6, at("2026-07-05T12:00:00Z"), fixtures, catalog).configurationAvailable, false);
});

test("billing months clamp calendar days without drifting activation or using the host timezone", () => {
  assert.equal(addBillingMonths("2026-01-31T10:15:30.123Z", 1), "2026-02-28T10:15:30.123Z");
  assert.equal(addBillingMonths("2026-01-31T10:15:30.123Z", 2), "2026-03-31T10:15:30.123Z");
  assert.equal(addBillingMonths("2028-01-31T10:15:00Z", 1), "2028-02-29T10:15:00.000Z");
  assert.equal(addBillingMonths("2026-12-31T21:15:00Z", 1), "2027-01-31T21:15:00.000Z");
  const prior = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    assert.equal(addBillingMonths("2026-01-31T10:15:00Z", 1), "2026-02-28T10:15:00.000Z");
    assert.equal(getSubscriptionCalendar(at("2026-12-31T21:00:00Z"), fixtures).phase, "january");
  } finally { if (prior === undefined) delete process.env.TZ; else process.env.TZ = prior; }
  assert.throws(() => addBillingMonths("2026-01-31T10:15:00", 1));
});

test("filling an empty third slot is free, deduplicated and does not consume a replacement", () => {
  const current = record();
  const untouched = JSON.stringify(current);
  const command = { kind: "assign", subjectId: "russian", requestId: "assign-1" };
  const result = applySubjectChange(current, command, at("2026-02-10T12:00:00Z"), catalog);
  assert.equal(result.ok, true);
  assert.deepEqual(result.record.subjectIds, ["math", "physics", "russian"]);
  assert.deepEqual(result.record.replacementHistory, []);
  assert.equal(JSON.stringify(current), untouched);
  assert.equal(applySubjectChange(result.record, command, at("2026-02-10T12:00:00Z"), catalog).changed, false);
  assert.equal(applySubjectChange(result.record, { ...command, subjectId: "history" }, at("2026-02-10T12:00:00Z"), catalog).code, "no-free-slot");
  assert.equal(applySubjectChange(current, command, at("2026-02-10T12:00:00Z")).code, "unsupported-subject");
});

test("one replacement is allowed per activation-anchored monthly window; unused windows never accumulate", () => {
  let current = record();
  const first = replace(current, "physics", "russian", "2026-02-01T12:00:00Z", "replace-1");
  let window = getBillingWindow(first, at("2026-02-20T12:00:00Z"));
  assert.equal(window.replacementUsed, true);
  assert.equal(window.nextReplacementAt, "2026-02-28T10:15:00.000Z");
  assert.equal(applySubjectChange(first, { kind: "replace", fromSubjectId: "russian", toSubjectId: "history", requestId: "replace-2" }, at("2026-02-28T10:14:59Z"), catalog).code, "replacement-used");
  current = replace(first, "russian", "history", "2026-02-28T10:15:00Z", "replace-2");
  window = getBillingWindow(current, at("2026-03-20T12:00:00Z"));
  assert.equal(window.startsAt, "2026-02-28T10:15:00.000Z");
  assert.equal(window.nextReplacementAt, "2026-03-31T10:15:00.000Z");
  current = replace(current, "history", "chemistry", "2026-05-10T12:00:00Z", "replace-3");
  assert.equal(applySubjectChange(current, { kind: "replace", fromSubjectId: "chemistry", toSubjectId: "physics", requestId: "replace-4" }, at("2026-05-11T12:00:00Z"), catalog).code, "replacement-used");
});

test("replaying a replacement request is idempotent, conflicting reuse is rejected, other data is intact", () => {
  const current = record();
  const command = { kind: "replace", fromSubjectId: "physics", toSubjectId: "russian", requestId: "stable-replace" };
  const first = applySubjectChange(current, command, at("2026-02-10T12:00:00Z"), catalog);
  const repeat = applySubjectChange(first.record, command, at("2026-02-11T12:00:00Z"), catalog);
  assert.equal(repeat.changed, false);
  assert.equal(repeat.record, first.record);
  assert.equal(first.record.replacementHistory.length, 1);
  assert.equal(applySubjectChange(first.record, { ...command, toSubjectId: "history" }, at("2026-02-11T12:00:00Z"), catalog).code, "request-conflict");
  assert.equal(first.record.expiresAt, current.expiresAt);
  assert.equal(first.record.slotCount, current.slotCount);
  assert.equal(getBillingWindow(first.record, at("2026-07-01T21:00:00Z")), null);
});

test("trial lasts exactly seven days, has no card/renewal, and all plan kinds share Premium feature access", () => {
  const start = "2026-05-01T12:00:00.000Z";
  const end = "2026-05-08T12:00:00.000Z";
  const trial = record({ kind: "trial", activatedAt: start, expiresAt: end });
  assert.equal(getSubscriptionStatus(trial, at(start)).status, "trial");
  assert.equal(getSubscriptionStatus(trial, at("2026-05-08T11:59:59.999Z")).isPremium, true);
  assert.equal(getSubscriptionStatus(trial, at(end)).status, "expired");
  assert.equal(getSubscriptionStatus(trial, at(end)).isPremium, false);
  assert.equal(getSubscriptionStatus({ ...trial, autoRenew: true, nextChargeAt: end }, at(start)).isPremium, false);
  assert.equal(getSubscriptionStatus({ ...trial, expiresAt: "2026-05-09T12:00:00Z" }, at(start)).isPremium, false);
  assert.equal(config.subscriptionPrices.trial.cardRequired, false);
  assert.equal(config.subscriptionPrices.trial.autoRenew, false);
  assert.equal(premiumFeatureIds.length, 5);
  for (const kind of ["monthly", "season", "summer", "trial"]) {
    const current = record({ kind, activatedAt: start, expiresAt: end });
    assert.equal(hasPremiumAccess(current, "math", at("2026-05-02T12:00:00Z"), catalog), true);
    assert.equal(hasPremiumAccess(current, "history", at("2026-05-02T12:00:00Z"), catalog), false);
  }
});

test("read-only status and expiration preserve subjects, XP, streaks and history; cancellation preserves paid access", () => {
  const current = record({ kind: "monthly", activatedAt: "2026-01-31T10:15:00Z", expiresAt: "2026-02-28T10:15:00Z", autoRenew: true, nextChargeAt: "2026-02-28T10:15:00Z" });
  const app = { subscription: current, learning: { xp: 187, streak: 4, events: [{ id: "old-attempt" }] } };
  const before = JSON.stringify(app);
  assert.equal(getSubscriptionStatus(null, at("2026-02-01T12:00:00Z")).status, "free");
  assert.equal(getSubscriptionStatus(current, at("2026-02-01T12:00:00Z")).status, "active");
  assert.equal(getSubscriptionStatus(current, at("2026-02-25T12:00:00Z")).status, "expiring");
  const expired = getSubscriptionStatus(current, at(current.expiresAt));
  assert.equal(expired.status, "expired");
  assert.equal(expired.isPremium, false);
  assert.deepEqual(expired.selectedSubjectIds, current.subjectIds);
  const canceledRenewal = { ...current, autoRenew: false, nextChargeAt: null };
  assert.equal(getSubscriptionStatus(canceledRenewal, at("2026-02-20T12:00:00Z")).isPremium, true);
  assert.equal(getSubscriptionStatus(canceledRenewal, at("2026-02-20T12:00:00Z")).nextChargeAt, null);
  assert.equal(JSON.stringify(app), before);
  assert.equal(hasPremiumAccess({ ...current, authority: "browser" }, "math", at("2026-02-01T12:00:00Z")), false);
});

test("plan-size changes are only scheduled for the next monthly period, never prorated top-ups", () => {
  const current = record({ kind: "monthly", expiresAt: "2026-02-28T10:15:00Z" });
  const result = scheduleMonthlyPlanChange(current, 4, ["math", "physics", "history"], at("2026-02-10T12:00:00Z"), catalog);
  assert.equal(result.ok, true);
  assert.equal(result.record.slotCount, 3);
  assert.deepEqual(result.record.subjectIds, current.subjectIds);
  assert.equal(result.record.pendingPlanChange.slotCount, 4);
  assert.equal(result.record.pendingPlanChange.effectiveAt, current.expiresAt);
  assert.equal(scheduleMonthlyPlanChange(record(), 4, [], at("2026-02-10T12:00:00Z"), catalog).code, "one-off-plan");
  assert.equal(scheduleMonthlyPlanChange(current, 4, [], at("2026-02-10T12:00:00Z")).code, "unsupported-capacity");
});

test("malformed replacement histories fail closed without exceptions; equivalent timezone timestamps use one window", () => {
  const now = at("2026-02-15T12:00:00Z");
  for (const broken of [null, {}, { requestId: "x" }, { requestId: "x", fromSubjectId: "math", toSubjectId: "physics", replacedAt: "invalid", windowStartedAt: "invalid" }]) {
    const invalid = record({ replacementHistory: [broken] });
    assert.equal(getSubscriptionStatus(invalid, now).status, "free");
    assert.equal(getBillingWindow(invalid, now), null);
    assert.equal(applySubjectChange(invalid, { kind: "assign", subjectId: "russian", requestId: "assign-safe" }, now, catalog).code, "invalid-record");
  }
  const current = record({ replacementHistory: [{ requestId: "offset-history", fromSubjectId: "history", toSubjectId: "physics",
    replacedAt: "2026-02-01T15:00:00+03:00", windowStartedAt: "2026-01-31T13:15:00+03:00" }] });
  assert.equal(getSubscriptionStatus(current, now).isPremium, true);
  assert.equal(getBillingWindow(current, now).replacementUsed, true);
  assert.equal(applySubjectChange(current, { kind: "replace", fromSubjectId: "physics", toSubjectId: "russian", requestId: "second" }, now, catalog).code, "replacement-used");
});
