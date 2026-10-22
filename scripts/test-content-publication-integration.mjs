import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createContentLoader, loadContent } from "./content-source-loader.mjs";
import { contentIntegrityIssues, exportSeed } from "./content-report.mjs";
import { buildStagedFoundationBundle, writeStagedBundle } from "./stage-foundation-candidates.mjs";

const content = loadContent();
const load = createContentLoader();
const { foundationCandidates } = load("src/lib/content/foundation-candidates.ts");

test("public content records explicit provenance; seed rejects unknown, draft and missing review evidence", () => {
  assert.deepEqual(contentIntegrityIssues(content), []);
  for (const mutate of [
    (task) => { task.publication.provenance.sourceIds = ["unknown-import"]; },
    (task) => { task.publication.releaseStatus = "draft"; },
    (task) => { task.publication.validation.evidence = ["scripts/nonexistent-review.mjs"]; },
    (task) => { task.publication.validation.evidence = ["scripts/../../package.json"]; },
    (task) => { task.publication.validation.status = "requires-expert-review"; },
  ]) {
    const tasks = structuredClone(content.tasks);
    mutate(tasks[0]);
    assert.throws(() => exportSeed({ ...content, tasks }), /Seed blocked/);
  }
});

test("foundation draft shards are deterministic across input reordering and excluded from public seed", () => {
  const first = buildStagedFoundationBundle();
  assert.deepEqual(first, buildStagedFoundationBundle([...foundationCandidates].reverse()));
  const index = JSON.parse(first.get("index.json"));
  assert.equal(index.publication, "draft-only"); assert.equal(index.total, 32); assert.equal(index.shards.length, 8);
  const publicIds = new Set(JSON.parse(exportSeed(content).json).tasks.map((task) => task.id));
  for (const item of foundationCandidates) assert.equal(publicIds.has(item.id), false);
  const dir = mkdtempSync(join(tmpdir(), "tochka-drafts-"));
  try {
    const target = join(dir, "batch"); writeStagedBundle(target, first);
    for (const [file, json] of first) assert.equal(readFileSync(join(target, file), "utf8"), json);
    assert.throws(() => writeStagedBundle(target, first), /already exists/);
    assert.equal(readFileSync(join(target, "index.json"), "utf8"), first.get("index.json"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("draft staging does not waive unknown rights or allow guessed exam fields", () => {
  for (const mutate of [
    (item) => { item.publication.provenance.sourceIds = ["fipi-oge-structure"]; },
    (item) => { item.publication.validation.status = "pending"; },
    (item) => { item.examNumber = 6; },
    (item) => { item.releaseStatus = "published"; },
  ]) {
    const items = structuredClone(foundationCandidates); mutate(items[0]);
    assert.throws(() => buildStagedFoundationBundle(items));
  }
});

test("foundation enrichments keep historical task IDs, article IDs and give 16 additional examples and 16 control questions", () => {
  const baseline = JSON.parse(readFileSync(new URL("../docs/math-expansion-baseline.json", import.meta.url), "utf8"));
  assert.equal(content.tasks.length, 881);
  assert.equal(content.theoryTopics.length, 73);
  assert.equal(content.theoryTopics.filter((topic) => topic.level !== "base").reduce((sum, topic) => sum + topic.examples.length, 0), 120);
  const enriched = content.theoryTopics.filter((topic) => topic.learningChecks);
  assert.equal(enriched.length, 8);
  assert.equal(enriched.reduce((sum, topic) => sum + topic.learningChecks.checks.length, 0), 16);
  assert.equal(baseline.revision.startsWith("ca6389a"), true);
  assert.equal(new Set(content.tasks.map((task) => task.id)).size, 881);
  const before = loadContent({ revision: baseline.revision });
  assert.deepEqual(content.tasks.slice(0, 448).map((task) => task.id), before.tasks.map((task) => task.id));
  assert.deepEqual(content.tasks.slice(0, 448).map((task) => task.answerRule), before.tasks.map((task) => task.answerRule));
  assert.deepEqual(content.theoryTopics.slice(0, 52).map((topic) => [topic.id, topic.materialId]), before.theoryTopics.map((topic) => [topic.id, topic.materialId]));
  for (const oldTopic of before.theoryTopics) {
    const topic = content.theoryTopics.find((item) => item.id === oldTopic.id);
    assert.deepEqual(topic.examples.slice(0, oldTopic.examples.length), oldTopic.examples);
  }
});
