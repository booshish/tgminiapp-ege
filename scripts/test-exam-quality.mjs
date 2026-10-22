import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { buildExamQuality, buildProvenanceRegistry } from "./exam-quality.mjs";
import { createContentLoader, loadContent } from "./content-source-loader.mjs";

test("Quality report distinguishes actual coverage, automated checks, expert review and unverified 2027", () => {
  const report = buildExamQuality();
  assert.equal(report.complete, false);
  assert.deepEqual(report.issues, []);
  assert.equal(report.exams.length, 3);
  for (const exam of report.exams) {
    assert.equal(exam.fullConfiguredVariants.length, 5);
    assert.equal(exam.confirmed2027Variants, 0);
    assert.equal(exam.theoryCoverageNumbers, exam.numbers.length);
    for (const row of exam.numbers) {
      assert(row.taskCount >= 5);
      assert.equal(row.tasksWithPassedAutomatedChecks, null);
      assert.equal(row.expertReviewedTaskCount, 0);
      assert.equal(row.minimum20Gap, Math.max(0, 20 - row.taskCount));
    }
  }
});

test("All pre-expansion task indices, IDs and mathematical answers remain unchanged", () => {
  const load = createContentLoader();
  const { legacyTaskOrder, legacyTaskAnswersSha256 } = load("src/lib/content/legacy-task-order.ts");
  const { tasks } = load("src/lib/tasks.ts");
  assert.equal(legacyTaskOrder.length, 448);
  assert.deepEqual(tasks.slice(0, 448).map((task) => task.id), legacyTaskOrder);
  assert.equal(createHash("sha256").update(JSON.stringify(tasks.slice(0, 448).map((task) => [task.id, task.answerRule, task.answerDisplay]))).digest("hex"), legacyTaskAnswersSha256);
  assert.equal(tasks.find((task) => task.id === "decimal-division").availability, "history-only");
});

test("Content validator catches number, exam, scoring and answer-format damage", () => {
  const content = loadContent();
  const target = content.tasks.find((task) => task.availability !== "history-only" && task.examNumber !== null);
  const damaged = { ...content, tasks: content.tasks.map((task) => task.id === target.id ? {
    ...task, examYear: 2099, part: task.part === 1 ? 2 : 1,
    scoring: { ...task.scoring, maxPrimaryScore: -1 }, answerFormat: "extended",
  } : task) };
  const issues = buildExamQuality(damaged).issues;
  for (const category of ["exam metadata", "number metadata", "answer format", "score range"]) {
    assert(issues.includes(`${category}:${target.id}`), `${category} not validated`);
  }
});

test("Provenance registry references complete authorship declarations without fabricating licences", () => {
  const content = loadContent();
  const registry = buildProvenanceRegistry(content);
  assert.equal(registry.records.length, content.tasks.length + content.theoryTopics.length);
  assert.equal(new Set(registry.records.map((entry) => `${entry.kind}:${entry.id}`)).size, registry.records.length);
  for (const entry of registry.records) {
    const policy = registry.policies[entry.provenancePolicy];
    assert.equal(policy.source_type, "original");
    assert.equal(policy.license, null);
    assert.equal(policy.permission, "created-for-project");
    assert(policy.author.length > 0 && policy.creation_method.length > 0);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
  }
});
