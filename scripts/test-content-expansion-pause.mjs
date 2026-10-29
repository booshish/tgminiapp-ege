import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";
import { assertTaskExpansionAllowed, importTasks, publishedCorpus } from "./import-tasks.mjs";
import { releasePilot } from "./release-task-pilot.mjs";
import { releaseProfileMath } from "./release-profile-math.mjs";
import { planSubtypeGeneration } from "./exam-generation-audit.mjs";
import { roundCycleRows } from "./round-cycle-originals.mjs";

const load = createContentLoader();
const policy = load("src/lib/subjects.ts");
// Read an existing task; never generate profile candidates for these policy tests.
const corpus = publishedCorpus();
const profile = corpus.find(t => t.subjectId === "math" && t.level === "profile");

test("profile expansion is paused independently of availability; exactly nine active directions remain schedulable", () => {
  assert.equal(policy.isActiveSubject("ЕГЭ", "math"), true);
  const { getExamDefinition } = load("src/lib/exams.ts");
  const directions = ["ОГЭ", "ЕГЭ"].flatMap(exam => policy.getActiveSubjects(exam).flatMap(([subjectId]) =>
    (exam === "ЕГЭ" && subjectId === "math" ? ["base", "profile"] : [null]).map(level => getExamDefinition({ examType: exam, subjectId, level }))));
  assert.equal(directions.length, 10);
  assert.equal(directions.filter(d => !policy.isContentExpansionPaused(d.id)).length, 9);
  assert.equal(directions.find(d => d.id === "ege-math-profile").available, true);
  assert.throws(() => planSubtypeGeneration({}, { modelId: "ege-math-profile", number: 4, subtype: "one-draw", count: 100 }), /Content expansion paused/);
  for (const task of corpus.filter(t => !(t.subjectId === "math" && t.level === "profile"))) assert.doesNotThrow(() => assertTaskExpansionAllowed(task));
});

test("existing round planner excludes profile quotas without changing other stable IDs", () => {
  const rows = roundCycleRows();
  assert.ok(rows.length > 0);
  assert.ok(rows.every(r => r.task.level !== "profile"));
  const evidence = new Map(JSON.parse(readFileSync("docs/round-cycle-verification.json", "utf8")).records.map(r => [r.id, r]));
  assert.ok(rows.every(r => evidence.has(r.task.id)));
});

test("release gates stop paused content before any review/index/shard writes, including historical batch IDs", async () => {
  const batchId = `pause-test-${randomUUID()}`;
  await assert.rejects(releasePilot({ tasks: [profile], batchId }), /Content expansion paused/);
  assert.equal(existsSync(resolve(projectRoot, ".content-staging/pilot-input", `${batchId}.jsonl`)), false);
  await assert.rejects(releaseProfileMath(), /Content expansion paused/);
  assert.throws(() => assertTaskExpansionAllowed({ ...profile, examVersionId: "ege-math-profile-2026" }), /Content expansion paused/);
});

test("JSONL rejects paused rows rather than staging them; rejection checkpoint resumes safely", async () => {
  const temp = mkdtempSync(resolve(tmpdir(), "tochka-pause-")), input = resolve(temp, "input.jsonl");
  const job = `pause-test-${randomUUID()}`, directory = resolve(projectRoot, ".content-staging", `import-${job}`);
  try {
    writeFileSync(input, JSON.stringify(profile) + "\n");
    const result = await importTasks({ input, job });
    assert.equal(result.counts.rejected, 1);
    assert.equal(result.counts.staged, 0);
    const records = JSON.parse(readFileSync(resolve(directory, "batch-0.json"), "utf8"));
    assert.ok(records[0].issues.includes("content-expansion-paused"));
    assert.deepEqual((await importTasks({ input, job })).counts, result.counts);
    // Simulate a pre-pause staged checkpoint using the SAME existing task ID.
    records[0].status = "staged";
    writeFileSync(resolve(directory, "batch-0.json"), JSON.stringify(records));
    await assert.rejects(importTasks({ input, job }), /Content expansion paused/);
  } finally {
    rmSync(temp, { recursive: true });
    rmSync(directory, { recursive: true, force: true });
  }
});
