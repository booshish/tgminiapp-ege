import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Evaluate only local TS/TSX. Styles are checked in the browser; no new test dependency.
const root = fileURLToPath(new URL("../", import.meta.url));
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  let path = resolve(root, file);
  if (!extname(path)) path += existsSync(`${path}.tsx`) ? ".tsx" : ".ts";
  if (path.endsWith(".css")) return {};
  if (cache.has(path)) return cache.get(path).exports;
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  });
  const sourceModule = { exports: {} };
  cache.set(path, sourceModule);
  const requireSource = (id) => id.startsWith("@/") ? load(resolve(root, "src", id.slice(2)))
    : id.startsWith(".") ? load(resolve(dirname(path), id)) : nativeRequire(id);
  new Function("require", "module", "exports", outputText)(requireSource, sourceModule, sourceModule.exports);
  return sourceModule.exports;
}
const { PremiumScreen } = load("src/components/screens/premium-screen.tsx");
const { SubscriptionStatusCard } = load("src/components/subscription-status-card.tsx");
const noop = () => {};
const render = (component, props) => renderToStaticMarkup(createElement(component, props));
const landing = (props = {}) => render(PremiumScreen, { onBack: noop, onProfile: noop, ...props });
const plain = (html) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
// Synthetic calendar, not an assertion about official 2027 exam dates.
const seasons = [{ year: 2027, timezone: "Europe/Moscow", ogeMainPeriodEndsOn: "2027-07-01", egeMainPeriodEndsOn: "2027-07-03", seasonSalesCloseOn: null,
  verification: { status: "verified", sourceUrls: ["https://official.example.test/fixture"], checkedAt: "2026-10-01T00:00:00Z" } }];
const subscription = (changes = {}) => ({ schemaVersion: 1, authority: "server", id: "server-sub", userId: "user",
  kind: "monthly", activatedAt: "2027-01-01T09:00:00Z", expiresAt: "2027-02-01T09:00:00Z",
  slotCount: 1, subjectIds: ["math"], autoRenew: false, nextChargeAt: null, replacementHistory: [], ...changes });

test("Premium landing renders three informational plans without fake checkout or unavailable subjects", () => {
  const html = landing({ previewNow: new Date("2026-10-21T12:00:00Z") });
  const text = plain(html);
  for (const title of ["Точка Premium", "Старт", "Оптимальный", "Свой набор", "Выгодный выбор"]) assert.ok(text.includes(title));
  assert.equal((html.match(/class="premium-plan(?: premium-plan-featured)?"/g) ?? []).length, 3);
  assert.equal((html.match(/<button[^>]*disabled=""/g) ?? []).length, 4);
  assert.match(html, /<select[^>]*id="premium-custom-slots"[^>]*disabled=""/);
  assert.match(text, /только математика/);
  for (const price of [199, 299, 499]) assert.ok(text.includes(`${price} ₽`));
  assert.doesNotMatch(text, /Самый популярный|[679] месяцев|годов(?:ой|ая) тариф|[67] предметов/i);
  assert.doesNotMatch(html, /<table/);
  assert.match(text, /Оплата, аккаунты и серверная проверка подписки ещё не подключены/);
  assert.match(text, /Бесплатная подготовка остаётся бесплатной/);
});

test("first render waits for the browser clock instead of flashing stale server prices", () => {
  const html = landing();
  assert.match(html, /aria-busy="true"/);
  assert.match(plain(html), /Уточняем сроки/);
  assert.doesNotMatch(plain(html), /199 ₽|299 ₽|1499 ₽/);
});

test("summer UI shows one-off full-period prices and a precise Moscow end time", () => {
  const html = landing({ previewNow: new Date("2027-08-31T20:00:00Z"), seasons });
  const text = plain(html);
  assert.match(text, /Точка Лето/);
  assert.match(text, /1 сентября 2027 г\., 00:00 МСК/);
  assert.equal((text.match(/за весь период/g) ?? []).length, 3);
  for (const price of [199, 299, 399]) assert.ok(text.includes(`${price} ₽`));
  assert.doesNotMatch(html, /<span>в месяц<\/span>/);
  assert.doesNotMatch(html, />До конца экзаменов<\/button>/);
  assert.match(text, /Один набор возможностей — в каждом тарифе/);
});

test("unverified January calendar does not offer a possibly expired season or summer", () => {
  for (const month of ["01", "07", "08"]) {
    const html = landing({ previewNow: new Date(`2027-${month}-21T12:00:00Z`) });
    assert.match(html, />1 месяц<\/button>/);
    assert.doesNotMatch(html, />До конца экзаменов<\/button>|>Точка Лето<\/button>/);
    assert.match(plain(html), /даты завершения основного периода/);
  }
});

test("profile separates a developer preview from a real Free subscription", () => {
  const html = render(SubscriptionStatusCard, { onPremium: noop, developerPreview: true });
  assert.match(html, /data-subscription-status="free"/);
  assert.match(plain(html), /не изменяет статус подписки/);
  assert.match(plain(html), /Активировать их пока нельзя/);
  assert.doesNotMatch(plain(html), /Следующее списание/);
});

test("profile renders trusted active, expiring and expired states without deleting selected subjects", () => {
  const record = subscription();
  const before = JSON.stringify(record);
  for (const [now, status] of [["2027-01-10T12:00:00Z", "active"], ["2027-01-30T12:00:00Z", "expiring"], ["2027-02-01T09:00:00Z", "expired"]]) {
    const html = render(SubscriptionStatusCard, { onPremium: noop, subscription: record, now: new Date(now) });
    assert.match(html, new RegExp(`data-subscription-status="${status}"`));
    assert.match(plain(html), /Математика/);
    assert.match(plain(html), /1 февраля 2027 г\./);
    assert.match(plain(html), /12:00 МСК/);
    if (status === "expired") assert.doesNotMatch(plain(html), /Следующее списание/);
    else assert.match(plain(html), /Выключено. Доступ сохранится/);
  }
  assert.equal(JSON.stringify(record), before);
});

test("trial status is read-only and explains automatic Free without charges", () => {
  const record = subscription({ kind: "trial", slotCount: 3, expiresAt: "2027-01-08T09:00:00Z" });
  const html = render(SubscriptionStatusCard, { onPremium: noop, subscription: record, now: new Date("2027-01-03T12:00:00Z") });
  assert.match(html, /data-subscription-status="trial"/);
  assert.match(plain(html), /автоматически включится Free, списаний не будет/);
  assert.match(plain(html), /2 из 3/);
  assert.doesNotMatch(plain(html), /Следующее списание/);
});

test("trial headline has no card marketing while terms remain transparent and inactive", () => {
  const html = landing({ previewNow: new Date("2026-10-21T12:00:00Z") });
  assert.match(html, /id="premium-trial-title">7 дней Premium<\/h2>/);
  assert.doesNotMatch(html, /Premium без карты|1 ₽/);
  assert.match(html, /class="premium-trial-terms"/);
  assert.match(plain(html), /привязка карты не требуется/);
  assert.match(plain(html), /без списаний и автоматического продления/);
  assert.match(plain(html), /активировать пробный период нельзя/);
});
