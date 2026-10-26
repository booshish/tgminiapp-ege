import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createContentLoader } from "./content-source-loader.mjs";
import { entries } from "./original-informatics-pilot.mjs";
import { compute } from "./release-task-pilot.mjs";
import { structuralIssues } from "./import-tasks.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";

test("12 real original tasks have independent keys, source records, exact review and valid mappings", () => {
  const load = createContentLoader();
  const { taskPackageIndex } = load("src/lib/task-package-index.ts");
  const { getPublicationDecision } = load("src/lib/content-publication.ts");
  const reviews = JSON.parse(readFileSync(new URL("../docs/pilot-task-review.json", import.meta.url))).reviews;
  const all = [];
  for (const shard of taskPackageIndex) {
    const body = readFileSync(new URL(`../public/task-packages/${shard.file}`, import.meta.url), "utf8");
    assert.equal(createHash("sha256").update(body).digest("hex"), shard.sha256);
    all.push(...JSON.parse(body).filter(t => t.id.startsWith("oge-informatics-pilot-")));
  }
  assert.equal(all.length, 12);
  assert.equal(new Set(all.map((t) => t.id)).size, 12);
  all.forEach((task, i) => {
    assert.equal(task.prompt, entries[i][1]);
    assert.equal(String(compute(entries[i][4])), task.answerDisplay);
    assert.deepEqual(structuralIssues(task), []);
    assert.equal(getPublicationDecision(task.publication).allowed, true);
    assert.equal(reviews.find((r) => r.id === task.id)?.sha256, contentFingerprint(task));
  });
});

test("lazy loader fetches only requested number, deduplicates concurrent/repeated fetches and appends without reordering", async () => {
  const load = createContentLoader();
  const bank = load("src/lib/tasks.ts");
  const { ensureTaskPackages } = load("src/lib/task-packages.ts");
  const previous = bank.practiceBank.map((t) => t.id);
  const filter = { examType: "ОГЭ", subjectId: "informatics", examNumber: 1 };
  const count = bank.getPracticeTasks(filter).length;
  const { taskPackageIndex } = load("src/lib/task-package-index.ts");
  const relevant = taskPackageIndex.filter(p => p.tasks.some(t => t.subjectId === "informatics" && t.examType[0] === "ОГЭ" && t.examNumber === 1));
  const additional = relevant.reduce((n,p) => n+p.tasks.length,0);
  assert.equal(bank.getPracticeTaskCount(filter), count + additional);
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(url);
    return new Response(readFileSync(new URL(`../public${url}`, import.meta.url), "utf8"));
  };
  try {
    await ensureTaskPackages();
    assert.equal(requests.length, 0);
    await Promise.all([ensureTaskPackages(filter), ensureTaskPackages(filter)]);
    await ensureTaskPackages(filter);
    assert.equal(requests.length, relevant.length);
    assert.equal(bank.getPracticeTasks(filter).length, count + additional);
    assert.equal(bank.getPracticeTaskCount(filter), count + additional);
    assert.deepEqual(bank.practiceBank.slice(0, previous.length).map((t) => t.id), previous);
    assert.equal(bank.getPracticeTasks({ ...filter, examNumber: 3 }).filter((t) => t.id.includes("pilot")).length, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("corrupt or unavailable shards never register; saved ID restores only its shard and failure is retryable", async () => {
  const load = createContentLoader();
  const bank = load("src/lib/tasks.ts");
  const { ensureTaskPackages } = load("src/lib/task-packages.ts");
  const initial = bank.practiceBank.length;
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("[]");
    await assert.rejects(ensureTaskPackages(undefined, "oge-informatics-pilot-20261026-12"), /повреждён/);
    assert.equal(bank.practiceBank.length, initial);
    globalThis.fetch = async (url) => new Response(readFileSync(new URL(`../public${url}`, import.meta.url), "utf8"));
    await ensureTaskPackages(undefined, "oge-informatics-pilot-20261026-12");
    assert.equal(bank.practiceBank.length, initial + 2);
    assert.equal(bank.checkTaskAnswer("181", bank.practiceBank.at(-1).answerRule).correct, true);
    assert.equal(bank.checkTaskAnswer("180", bank.practiceBank.at(-1).answerRule).correct, false);
    const { parseLearningState, emptyLearningState } = load("src/lib/learning-events.ts");
    const { appendCheckedAnswer } = load("src/lib/learning-mutations.ts");
    const result = appendCheckedAnswer(emptyLearningState, bank.practiceBank.at(-1), "181", true, "pilot-history-check");
    const once = parseLearningState(JSON.stringify(result.state));
    assert.equal(once.events.length, 1);
    assert.equal(once.events[0].subjectId, "informatics");
    assert.deepEqual(parseLearningState(JSON.stringify(once)).events, once.events);
  } finally { globalThis.fetch = originalFetch; }
});
