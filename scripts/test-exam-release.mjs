import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createContentLoader } from "./content-source-loader.mjs";
import { inspectExamReleases, inspectLocalOfficialEvidence } from "./exam-release-check.mjs";

const load = createContentLoader();
const { examVerificationRecords, validateVerifiedExamManifest } = load("src/lib/exam-verification.ts");
const { buildFixedExamVariants, validateFixedExamVariant, contentSha256 } = load("src/lib/exam-variant-manifest.ts");
const { tasks } = load("src/lib/tasks.ts");
const date = "2026-10-21";
const bytes = Buffer.from("Synthetic test fixture, never an official FIPI document.");
const digest = createHash("sha256").update(bytes).digest("hex");

// Deliberately tiny synthetic structure, never exported to the application or presented as a real exam.
function fixture(examType = "ЕГЭ", level = "profile") {
  const oge = examType === "ОГЭ";
  const examVersionId = oge ? "oge-math-2026" : `ege-math-${level}-2026`;
  const count = oge ? 6 : 3;
  const hasExtended = oge || level === "profile";
  const documents = ["specification", "codifier", ...(hasExtended ? ["assessment-criteria"] : [])].map((kind) => ({
    id: `synthetic-${kind}`, kind, title: `SYNTHETIC TEST ${kind}`, url: `https://fipi.ru/test-fixture/${kind}.pdf`,
    examVersionId, year: 2026, evidencePath: `docs/official/test-${kind}.pdf`, sha256: digest, usage: "structure-reference-only",
  }));
  const manifest = {
    schemaVersion: 1, status: "verified", examVersionId, examType, subjectId: "math", level: oge ? null : level, year: 2026,
    documents, officialNumbers: Array.from({ length: count }, (_, index) => {
      const extended = hasExtended && index === count - 1;
      return { number: index + 1, title: `Synthetic skill ${index + 1}`, part: extended ? 2 : 1, answerFormat: extended ? "extended" : "short",
        maxPrimaryScore: extended ? 2 : 1, skills: ["Synthetic test only"], subtopics: ["Synthetic subtopic"], criterionDocumentId: extended ? "synthetic-assessment-criteria" : null };
    }),
    officialDurationMinutes: 45, totalMaxPrimaryScore: count + (hasExtended ? 1 : 0),
    instructions: ["Synthetic test instructions, not an official duration or structure."], permittedTools: [], toolsReviewed: true,
    sharedConditionGroups: oge ? [[1, 2, 3, 4, 5]] : [],
    manualReview: { reviewedBy: "SYNTHETIC TEST REVIEWER", reviewedAt: `${date}T12:00:00Z`, evidencePath: "docs/official/synthetic-review.md" },
  };
  const bank = manifest.officialNumbers.flatMap((number) => Array.from({ length: 5 }, (_, index) => {
    const id = `synthetic-${oge ? "oge" : level}-${number.number}-${index}`;
    const publication = {
      id, provenance: { sourceIds: ["tochka-project-original"], authorship: "project-original", sourceFiles: ["scripts/test-exam-release.mjs"], attribution: ["Авторский материал проекта «Точка»"] },
      validation: { status: number.part === 2 ? "expert-reviewed" : "automated-reviewed", checkedAt: date, evidence: ["scripts/test-exam-release.mjs — synthetic fixture, not an actual expert review"] }, releaseStatus: "ready",
    };
    return { ...tasks[0], id, publication, examType: [examType], examYear: 2026, examVersionId, level: manifest.level,
      examNumber: number.number, part: number.part, answerFormat: number.part === 1 ? "number" : "extended",
      answerRule: number.part === 1 ? { type: "number", value: String(index) } : { type: "self" },
      prompt: `SYNTHETIC TEST TASK ${number.number} / ${index}`, answerDisplay: String(index), solution: [{ text: "Synthetic test solution" }],
      scoring: { status: "verified", maxPrimaryScore: number.maxPrimaryScore },
      ...(oge && number.number <= 5 ? { sharedConditionId: `synthetic-group-${index}` } : {}),
    };
  }));
  const reviews = bank.map((task) => ({ taskId: task.id, taskRevision: task.source.revision, contentSha256: contentSha256(task),
    ...(task.part === 2 ? { criteriaApplicability: { documentId: "synthetic-assessment-criteria", explanation: "SYNTHETIC TEST only, not a real criteria review." } } : {}),
  }));
  const options = { officialManifest: manifest, bank, reviews, releaseId: `synthetic-edition-${oge ? "oge" : level}`, createdAt: `${date}T13:00:00Z`, asOf: date };
  return { manifest, bank, reviews, options };
}

test("all three real exam releases are blocked; unknown official values remain null", () => {
  assert.equal(examVerificationRecords.length, 3);
  const report = inspectExamReleases();
  assert.equal(report.fullMathematicsReleaseReady, false);
  for (const record of examVerificationRecords) {
    assert.equal(record.officialNumbers, null);
    assert.equal(record.officialDurationMinutes, null);
    assert.equal(record.totalMaxPrimaryScore, null);
    assert.equal(validateVerifiedExamManifest(record).valid, false);
    assert.deepEqual(buildFixedExamVariants({ ...fixture().options, officialManifest: record }).variants, []);
  }
});

test("verified metadata needs correct identity, reviewed documents, number table, exact score total and instructions", () => {
  const { manifest } = fixture();
  assert.equal(validateVerifiedExamManifest(manifest).valid, true);
  for (const modify of [
    (m) => { m.year = 2027; }, (m) => { m.level = "base"; }, (m) => { m.documents = []; },
    (m) => { m.officialDurationMinutes = null; }, (m) => { m.manualReview = null; },
    (m) => { m.officialNumbers[1].number = 1; }, (m) => { m.totalMaxPrimaryScore += 1; },
    (m) => { m.officialNumbers[0].part = "1"; }, (m) => { m.instructions = []; },
    (m) => { m.documents[0].url = "https://fipi.ru.evil.invalid/fake.pdf"; },
    (m) => { m.documents[0].sha256 = "unknown"; }, (m) => { m.sharedConditionGroups = [[1, 2], [2, 3]]; },
  ]) {
    const changed = structuredClone(manifest); modify(changed);
    assert.equal(validateVerifiedExamManifest(changed).valid, false);
  }
});

test("local document hashes and actual manual review evidence are required, with path traversal blocked", () => {
  const root = mkdtempSync(join(tmpdir(), "tochka-evidence-test-"));
  const { manifest } = fixture();
  try {
    assert.ok(inspectLocalOfficialEvidence(manifest, root).some((issue) => issue.startsWith("local-evidence-missing")));
    mkdirSync(join(root, "docs/official"), { recursive: true });
    for (const doc of manifest.documents) writeFileSync(join(root, doc.evidencePath), bytes);
    writeFileSync(join(root, manifest.manualReview.evidencePath), "Synthetic explicit manual review evidence for a test; no official content was examined.");
    assert.deepEqual(inspectLocalOfficialEvidence(manifest, root), []);
    writeFileSync(join(root, manifest.documents[0].evidencePath), "changed bytes");
    assert.ok(inspectLocalOfficialEvidence(manifest, root).includes("document-sha256-mismatch:synthetic-specification"));
    const changed = structuredClone(manifest); changed.documents[0].evidencePath = "docs/official/../../secret";
    assert.equal(validateVerifiedExamManifest(changed).valid, false);
    writeFileSync(join(root, "outside.pdf"), bytes);
    symlinkSync(join(root, "outside.pdf"), join(root, "docs/official/link.pdf"));
    changed.documents[0].evidencePath = "docs/official/link.pdf";
    assert.ok(inspectLocalOfficialEvidence(changed, root).includes("evidence-outside-review-directory:docs/official/link.pdf"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("five fixed variants remain identical after task-bank reorder, with no repeated task across their editions", () => {
  for (const args of [["ЕГЭ", "profile"], ["ЕГЭ", "base"], ["ОГЭ", null]]) {
    const { options, manifest, bank, reviews } = fixture(...args);
    const first = buildFixedExamVariants(options);
    assert.deepEqual(first.issues, []); assert.equal(first.variants.length, 5);
    assert.deepEqual(buildFixedExamVariants({ ...options, bank: [...bank].reverse() }).variants, first.variants);
    const ids = first.variants.flatMap((variant) => variant.taskIds);
    assert.equal(new Set(ids).size, ids.length);
    for (const variant of first.variants) assert.deepEqual(validateFixedExamVariant(variant, manifest, bank, reviews, undefined, date), []);
  }
});

test("unreviewed rights, draft status, changed bytes and missing expert criteria exclude tasks without partial variants", () => {
  for (const mutate of [
    (task) => { task.publication.provenance.sourceIds = ["shkolkovo-public-reference"]; },
    (task) => { task.publication.releaseStatus = "draft"; },
    (task) => { task.prompt += " changed after review"; },
    (task) => { task.source.revision += 1; },
    (task) => { task.scoring.status = "project-config"; },
  ]) {
    const { options } = fixture(); const bank = structuredClone(options.bank); mutate(bank[0]);
    const result = buildFixedExamVariants({ ...options, bank });
    assert.equal(result.variants.length, 0); assert.ok(result.excluded.length); assert.ok(result.issues.includes("insufficient-reviewed-tasks:1"));
  }
  const { options } = fixture(); const reviews = structuredClone(options.reviews); delete reviews.at(-1).criteriaApplicability;
  assert.equal(buildFixedExamVariants({ ...options, reviews }).variants.length, 0);
});

test("persisted variants reject changed content, mixed exams, duplicate IDs, wrong order, scores and OGE common conditions", () => {
  const { options, manifest, bank, reviews } = fixture("ОГЭ", null);
  const variant = buildFixedExamVariants(options).variants[0];
  for (const mutate of [
    (v) => { v.taskIds[1] = v.taskIds[0]; },
    (v) => { [v.taskIds[0], v.taskIds[1]] = [v.taskIds[1], v.taskIds[0]]; },
    (v) => { v.maximumPrimaryScore += 1; },
    (v) => { v.examVersionId = "ege-math-base-2026"; },
    (v) => { v.taskIds[0] = bank.find((task) => task.examNumber === 1 && task.id !== v.taskIds[0]).id; },
  ]) {
    const changed = structuredClone(variant); mutate(changed);
    assert.ok(validateFixedExamVariant(changed, manifest, bank, reviews, undefined, date).length);
  }
  const changed = structuredClone(bank); changed.find((task) => task.id === variant.taskIds[0]).solution[0].text += " altered";
  assert.ok(validateFixedExamVariant(variant, manifest, changed, reviews, undefined, date).some((issue) => issue.startsWith("variant-content-changed")));
  assert.deepEqual(validateFixedExamVariant(null, manifest, bank, reviews), ["variant-not-object"]);
});

test("insufficient count or duplicate bank identities never generate partial/fake complete editions", () => {
  const { options } = fixture();
  assert.equal(buildFixedExamVariants({ ...options, count: 4 }).variants.length, 0);
  assert.equal(buildFixedExamVariants({ ...options, bank: [...options.bank, options.bank[0]] }).variants.length, 0);
  assert.throws(() => inspectExamReleases([]), /непустой/);
  assert.equal(inspectExamReleases([options.officialManifest]).fullMathematicsReleaseReady, false);
});
