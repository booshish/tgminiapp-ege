import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/help-navigation.ts", import.meta.url), "utf8");
const { outputText, diagnostics = [] } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  reportDiagnostics: true,
});
assert.equal(diagnostics.filter((entry) => entry.category === ts.DiagnosticCategory.Error).length, 0);
const {
  helpOriginStorageKey,
  encodeHelpOrigin,
  parseHelpOrigin,
  saveHelpOrigin,
  loadHelpOrigin,
  clearHelpOrigin,
} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function element(id, parentElement = null) {
  return { id, parentElement, isConnected: true };
}
function origin(overrides = {}) {
  return {
    hash: "#/profile",
    position: { left: 0, top: 1410.375, containers: [] },
    ...overrides,
  };
}

test("Help origin survives a page reload without persisting old DOM references", () => {
  const storage = memoryStorage();
  const oldParent = element("");
  const oldMain = element("main-content", oldParent);
  const saved = origin({ position: {
    left: 3.25,
    top: 1410.375,
    containers: [
      { element: oldMain, left: 0.125, top: 620.75 },
      { element: oldParent, left: 1.5, top: 88.25 },
    ],
  } });
  assert.equal(saveHelpOrigin(saved, storage), true);
  const raw = JSON.parse(storage.getItem(helpOriginStorageKey));
  assert.equal("element" in raw.position.containers[0], false);
  assert.deepEqual(raw.position.containers.map((entry) => entry.locator), ["id:main-content", "ancestor:1"]);

  const newParent = element("");
  const newMain = element("main-content", newParent);
  const reloaded = loadHelpOrigin(storage, { getElementById: (id) => id === "main-content" ? newMain : null });
  assert.equal(reloaded.hash, "#/profile");
  assert.equal(reloaded.position.top, 1410.375);
  assert.equal(reloaded.position.left, 3.25);
  assert.deepEqual(reloaded.position.containers, [
    { element: newMain, left: 0.125, top: 620.75 },
    { element: newParent, left: 1.5, top: 88.25 },
  ]);
  assert.notEqual(reloaded.position.containers[0].element, oldMain);
});

test("Deep theory and practice routes retain their exact selection and session", () => {
  for (const hash of [
    "",
    "#/home",
    "#/theory?topic=fractions&material=fractions-basics",
    "#/catalog?exam=%D0%9E%D0%93%D0%AD&mode=number&number=19",
    "#/tasks/49?exam=%D0%95%D0%93%D0%AD&level=profile&number=19&session=study-123",
    "#/premium",
  ]) {
    const raw = encodeHelpOrigin(origin({ hash }));
    assert.equal(parseHelpOrigin(raw).hash, hash);
  }
});

test("External targets, recursive Help origins and malformed fragments cannot be stored", () => {
  const storage = memoryStorage();
  assert.equal(saveHelpOrigin(origin(), storage), true);
  const knownGood = storage.getItem(helpOriginStorageKey);
  for (const hash of [
    "https://example.com/", "javascript:alert(1)", "//example.com", "/profile",
    "#/help", "#/help?section=x", "#/unknown", "#/tasks/-1", "#/tasks/1/other",
    "#/profile\n", "#/home?section=one#two", `#/home?${"a".repeat(4096)}`,
  ]) {
    assert.equal(encodeHelpOrigin(origin({ hash })), null, hash);
    assert.equal(saveHelpOrigin(origin({ hash }), storage), false, hash);
    assert.equal(storage.getItem(helpOriginStorageKey), knownGood);
  }
});

test("Corrupt schemas and unsafe window positions never become a return destination", () => {
  const valid = JSON.parse(encodeHelpOrigin(origin()));
  for (const raw of [
    null, "{broken", "[]", "null", JSON.stringify({ ...valid, version: 2 }),
    JSON.stringify({ ...valid, hash: "#/help" }),
    JSON.stringify({ ...valid, position: { ...valid.position, top: -1 } }),
    JSON.stringify({ ...valid, position: { ...valid.position, left: 10_000_001 } }),
    JSON.stringify({ ...valid, position: { ...valid.position, top: "1410" } }),
    JSON.stringify({ ...valid, position: { ...valid.position, containers: {} } }),
  ]) assert.equal(parseHelpOrigin(raw), null, String(raw));
  assert.equal(encodeHelpOrigin(origin({ position: { left: 0, top: NaN, containers: [] } })), null);
});

test("Only safe container IDs and bounded ancestor depths are restored", () => {
  const value = JSON.parse(encodeHelpOrigin(origin()));
  value.position.containers = [
    { locator: "id:main-content", left: 0, top: 88.625 },
    { locator: "id:main-content", left: 0, top: 999 },
    { locator: "body > div:nth-child(1)", left: 0, top: 3 },
    { locator: "id:main-content;alert(1)", left: 0, top: 4 },
    { locator: "ancestor:999", left: 0, top: 5 },
    { locator: "ancestor:1", left: 0, top: -1 },
  ];
  const parsed = parseHelpOrigin(JSON.stringify(value));
  assert.deepEqual(parsed.position.containers, [{ locator: "id:main-content", left: 0, top: 88.625 }]);
  const storage = memoryStorage();
  storage.setItem(helpOriginStorageKey, JSON.stringify(value));
  assert.deepEqual(loadHelpOrigin(storage, { getElementById: () => null }).position, {
    left: 0, top: 1410.375, containers: [],
  });
});

test("Consumed Help origins are cleared rather than reused for unrelated later visits", () => {
  const storage = memoryStorage();
  assert.equal(saveHelpOrigin(origin(), storage), true);
  assert.notEqual(loadHelpOrigin(storage), null);
  assert.equal(clearHelpOrigin(storage), true);
  assert.equal(loadHelpOrigin(storage), null);
});

test("Blocked sessionStorage and server rendering preserve a safe no-origin fallback", () => {
  const blocked = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
  assert.equal(saveHelpOrigin(origin(), blocked), false);
  assert.equal(loadHelpOrigin(blocked), null);
  assert.equal(clearHelpOrigin(blocked), false);
  assert.equal(saveHelpOrigin(origin()), false);
  assert.equal(loadHelpOrigin(), null);
  assert.equal(clearHelpOrigin(), false);
});
