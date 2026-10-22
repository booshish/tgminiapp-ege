import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildCoverage, contentIntegrityIssues, exportSeed } from "./content-report.mjs";
import { loadContent, createContentLoader } from "./content-source-loader.mjs";

const baseline = JSON.parse(readFileSync(new URL("../docs/content-baseline.json", import.meta.url), "utf8"));
const content = loadContent();
const coverage = buildCoverage(content);

test("coverage keeps the recorded baseline and all historical task indices", () => {
  assert.equal(baseline.revision, "1c8d914");
  assert.equal(baseline.totals.activeTasks, 34);
  assert.equal(baseline.totals.uniqueTheory, 8);
  assert.equal(baseline.totals.numbersWithTasks, 13);
  assert.deepEqual(content.tasks.slice(0, baseline.taskOrder.length).map((task) => task.id), baseline.taskOrder);
  assert.equal(coverage.totals.inactiveTasks, 16);
});

test("every supported number has tasks, usable theory, a solution and an explicit check mode", () => {
  assert.equal(coverage.rows.length, 65);
  assert.equal(coverage.exams.length, 3);
  assert.deepEqual(contentIntegrityIssues(content, coverage), []);
  for (const row of coverage.rows) {
    assert.equal(row.automaticCount + row.selfAssessmentCount, row.taskCount);
    assert.equal(row.topicCoverage.reduce((sum, topic) => sum + topic.taskCount, 0), row.taskCount);
    if (row.part === 2) assert.equal(row.automaticCount, 0);
  }
  assert.equal(coverage.rows.reduce((sum, row) => sum + row.taskCount, 0) + coverage.totals.unnumberedActiveTasks, coverage.totals.activeTasks);
});

test("legacy theory aliases resolve without inflating the material count", () => {
  assert.equal(content.getTheoryTopic("trigonometric-equations")?.id, "ege-profile-number-13");
  assert.equal(content.getTheoryTopic("number-theory")?.id, "ege-profile-number-19");
  assert.equal(new Set(content.theoryTopics.map((topic) => topic.materialId)).size, content.theoryTopics.length);
  const row = coverage.rows.find((item) => item.level === "profile" && item.number === 13);
  assert.equal(row.theoryCount, 1);
});

test("catalog seed is deterministic, complete and contains no learner events", () => {
  const first = exportSeed(content);
  const second = exportSeed(loadContent());
  assert.equal(first.json, second.json);
  assert.equal(first.sha256, second.sha256);
  const exported = JSON.parse(first.json);
  assert.equal(exported.schemaVersion, 2);
  assert.equal(exported.sourceRegistry.find((source) => source.id === "tochka-project-original").licenseType, "project-original");
  assert.equal(exported.contentReview.records.length, 985);
  assert.equal(exported.tasks.length, content.tasks.length);
  assert.equal(exported.theory.length, content.theoryTopics.length);
  assert.equal(exported.theoryTopicAliases["number-theory"], "ege-profile-number-19");
  assert.equal("events" in exported, false);
  assert.equal("users" in exported, false);
  assert.equal("attempts" in exported, false);
});

test("forecast remains an unapproved research contract with no active UI estimator", () => {
  const { scoreForecastProposal } = createContentLoader()("src/lib/score-forecast.ts");
  assert.equal(scoreForecastProposal.enabled, false);
  assert.equal(scoreForecastProposal.uiAvailable, false);
  assert.equal(scoreForecastProposal.status, "not-approved");
  assert(scoreForecastProposal.excludedSignals.includes("xp"));
  assert(scoreForecastProposal.excludedSignals.includes("subscription-tier"));
  assert(scoreForecastProposal.releasePrerequisites.includes("independent-outcome-validation"));
});
