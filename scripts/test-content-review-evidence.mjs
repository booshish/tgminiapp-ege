import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createContentLoader, loadContent } from "./content-source-loader.mjs";
import { contentFingerprint, contentReviewIssues, readContentReviewManifest } from "./content-review-evidence.mjs";

const load = createContentLoader();
const content = loadContent();
const { originalPublication } = load("src/lib/content/original-publication.ts");
const { getPublicationDecision } = load("src/lib/content-publication.ts");
const { reviewedOriginalIds } = load("src/lib/content/original-publication-ids.ts");

test("frozen original IDs remain intact and expansion has explicit review records", () => {
  const manifest = readContentReviewManifest();
  assert.equal(manifest.taskCount, 881);
  assert.equal(manifest.subjectTaskCount, 31);
  assert.equal(manifest.theoryCount, 73);
  assert.equal(manifest.records.length, 985);
  assert.deepEqual(contentReviewIssues(content, manifest), []);
  assert.equal(Object.values(reviewedOriginalIds).flat().length, 500);
});

test("an arbitrary new ID and a known ID in a different collection remain unreviewed drafts", () => {
  for (const collection of Object.keys(reviewedOriginalIds)) {
    const candidate = originalPublication("never-reviewed-new-task", collection);
    assert.equal(candidate.releaseStatus, "draft");
    assert.equal(candidate.validation.status, "pending");
    assert.equal(candidate.validation.checkedAt, undefined);
    assert.deepEqual(candidate.validation.evidence, []);
    assert.equal(getPublicationDecision(candidate).allowed, false);
  }
  const wrongCollection = originalPublication(reviewedOriginalIds["ege-bank"][0], "oge-bank");
  assert.equal(getPublicationDecision(wrongCollection).allowed, false);
});

test("mutations to actual task conditions, answers, solutions, scoring and revision invalidate review", () => {
  const original = content.tasks.find((task) => task.answerRule.type === "number");
  for (const mutate of [
    (task) => { task.prompt += " Изменённое условие."; },
    (task) => { task.answerRule.value = "99999"; },
    (task) => { task.solution[0].text += " Изменённое объяснение."; },
    (task) => { task.scoring.maxPrimaryScore += 1; },
    (task) => { task.source.revision += 1; },
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    const issues = contentReviewIssues({ ...content, tasks: content.tasks.map((task) => task.id === changed.id ? changed : task) });
    assert.ok(issues.includes(`stale content review: task:${original.id}`));
  }
});

test("enriched theory examples and control answers are part of the reviewed content", () => {
  const original = content.theoryTopics.find((topic) => topic.learningChecks);
  assert.ok(original);
  for (const mutate of [
    (topic) => { topic.examples.at(-1).answer = "Непроверенная замена"; },
    (topic) => { topic.learningChecks.checks[0].answer = "Непроверенная замена"; },
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    const issues = contentReviewIssues({ ...content, theoryTopics: content.theoryTopics.map((topic) => topic.id === changed.id ? changed : topic) });
    assert.ok(issues.includes(`stale content review: theory:${original.id}`));
  }
});

test("missing/duplicate reviews, copied publication metadata and changed evidence fail closed", () => {
  const original = content.tasks[0];
  const copied = { ...original, id: "never-reviewed-new-task" };
  assert.ok(contentReviewIssues({ ...content, tasks: [...content.tasks, copied] }).includes("unreviewed content: task:never-reviewed-new-task"));
  const missing = readContentReviewManifest();
  missing.records = missing.records.filter((record) => record.id !== original.id);
  assert.ok(contentReviewIssues(content, missing).includes(`unreviewed content: task:${original.id}`));
  const duplicated = readContentReviewManifest();
  duplicated.records.push(duplicated.records[0]);
  assert.ok(contentReviewIssues(content, duplicated).some((issue) => issue.startsWith("duplicate content review:")));
  const changed = structuredClone(original);
  changed.publication.validation.evidence = ["scripts/test-unrelated.mjs"];
  assert.ok(contentReviewIssues({ ...content, tasks: content.tasks.map((task) => task.id === original.id ? changed : task) }).includes(`content review evidence mismatch: task:${original.id}`));
});

test("fingerprint is independent of key order/publication metadata, preserves mathematical content", () => {
  const original = content.tasks[0];
  const reordered = Object.fromEntries(Object.entries(original).reverse());
  assert.equal(contentFingerprint(reordered), contentFingerprint(original));
  assert.equal(contentFingerprint({ ...original, publication: { releaseStatus: "draft" } }), contentFingerprint(original));
  assert.notEqual(contentFingerprint({ ...original, answerDisplay: "9999" }), contentFingerprint(original));
  assert.throws(() => contentFingerprint({ ...original, impossible: Number.NaN }));
});

test("invalid manifest structures cannot grant publication and production client has no review hashes", () => {
  for (const manifest of [null, {}, { schemaVersion: 1, algorithm: "sha256-canonical-content-v1", records: [null] }]) {
    assert.ok(contentReviewIssues(content, manifest).length > 0);
  }
  const moduleText = readFileSync(new URL("../src/lib/content/original-publication.ts", import.meta.url), "utf8");
  assert.equal(moduleText.includes("content-review-manifest"), false);
  assert.equal(moduleText.includes("node:crypto"), false);
});
