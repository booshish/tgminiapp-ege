import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader } from "./content-source-loader.mjs";

const load = createContentLoader();
const { tasks } = load("src/lib/tasks.ts");
const { legacyExamDefinitions } = load("src/lib/exams.ts");
const { getMockCoverage, createMockSession, parseMockState, updateMockAnswer, finishMockSession } = load("src/lib/mock-exam.ts");
const definitions = legacyExamDefinitions.filter(d=>d.available);
const definition = definitions.find((exam) => exam.examType === "ЕГЭ" && exam.level === "profile");
const task = tasks.find((entry) => entry.examVersionId === definition.versionId && entry.part === 1);
const start = Date.parse("2026-10-21T10:00:00Z");

test("new mock coverage excludes unknown sources, unreviewed math, drafts, missing and mismatched publication metadata", () => {
  assert.equal(getMockCoverage(definition, [task]).available.length, 1);
  for (const change of [
    (entry) => { entry.publication.provenance.sourceIds = ["unknown-source"]; },
    (entry) => { entry.publication.validation.status = "requires-expert-review"; },
    (entry) => { entry.publication.releaseStatus = "draft"; },
    (entry) => { entry.publication.id = "some-other-task"; },
    (entry) => { delete entry.publication; },
  ]) {
    const denied = structuredClone(task); change(denied);
    const coverage = getMockCoverage(definition, [denied]);
    assert.deepEqual(coverage.available, []);
    assert.equal(coverage.canStart, false);
  }
});

test("new mock sessions never select denied records or count them as complete coverage", () => {
  const blockedNumber = task.examNumber;
  const bank = tasks.map((entry) => entry.examVersionId === definition.versionId && entry.examNumber === blockedNumber
    ? { ...entry, publication: { ...entry.publication, releaseStatus: "draft" } } : entry);
  assert.ok(getMockCoverage(definition, bank).missingNumbers.includes(blockedNumber));
  assert.throws(() => createMockSession("denied-number", definition, bank, [], start), /Not enough content/);
  const bankWithDeniedCopy = [...tasks, { ...task, id: "denied-copy", publication: { ...task.publication, id: "denied-copy", releaseStatus: "draft" } }];
  const selected = createMockSession("allowed-selection", definition, bankWithDeniedCopy, [], start);
  assert.equal(selected.taskIds.includes("denied-copy"), false);
});

test("publication withdrawal does not delete existing session IDs, drafts, results, positions or deadlines on reload", () => {
  let session = createMockSession("legacy-publication-history", definition, tasks, [], start);
  const firstId = session.taskIds[0];
  const first = tasks.find((entry) => entry.id === firstId);
  session = updateMockAnswer(session, firstId, first.answerDisplay, start + 1000);
  session = { ...session, position: 2 };
  const withdrawnBank = tasks.map((entry) => entry.id === firstId
    ? { ...entry, publication: { ...entry.publication, provenance: { ...entry.publication.provenance, sourceIds: ["withdrawn-source"] } } } : entry);
  assert.equal(getMockCoverage(definition, withdrawnBank).available.some((entry) => entry.id === firstId), false);
  for (const existing of [session, finishMockSession(session, tasks, start + 2000)]) {
    const raw = JSON.stringify({ version: 1, activeId: existing.id, sessions: [existing] });
    const restored = parseMockState(raw, withdrawnBank, definitions);
    assert.equal(restored.activeId, existing.id);
    assert.deepEqual(restored.sessions[0], existing);
  }
});
