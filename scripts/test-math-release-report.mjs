import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader, loadContent } from "./content-source-loader.mjs";
import { buildMathReleaseReport, mathAuditBaselineRevision, mathCoverageMarkdown } from "./math-release-report.mjs";

const content = loadContent();
const baseline = loadContent({ revision: mathAuditBaselineRevision });
const load = createContentLoader();
const { examVerificationRecords, validateVerifiedExamManifest } = load("src/lib/exam-verification.ts");
const { sourceRegistry } = load("src/lib/source-registry.ts");
const { getPublicationDecision } = load("src/lib/content-publication.ts");
const make = (options = {}) => buildMathReleaseReport({ content, baseline, verificationRecords: examVerificationRecords,
  validateVerifiedExamManifest, registry: sourceRegistry, getPublicationDecision, ...options });

test("coverage enumerates all three project maps without inventing official numbers, skills, scores or timing", () => {
  const report = make();
  assert.equal(report.rows.length, 65);
  assert.equal(report.exams.length, 3);
  assert.equal(report.officialReleaseReady, false);
  for (const exam of report.exams) {
    assert.equal(exam.officialNumberCount, null);
    assert.equal(exam.officialDurationMinutes, null);
    assert.equal(exam.officialMaximumPrimaryScore, null);
    assert.equal(exam.officialSkills, null);
    assert.deepEqual(exam.officialDocuments, []);
    assert.equal(exam.status, "new-exam-release-blocked");
    assert.equal(exam.fullOfficialStructureVariants, 0);
  }
  assert(report.rows.every((row) => row.officialRequirements === null && row.officialDocuments.length === 0));
  assert(report.rows.every((row) => row.projectConfiguration.status !== "verified"));
});

test("archived base tasks and profile theory cannot inflate published base coverage", () => {
  const report = make();
  assert.deepEqual(report.exams.map((exam) => [exam.id, exam.before.publishedTasks, exam.before.archivedTasks]), [
    ["oge-math", 241, 0], ["ege-math-base", 0, 16], ["ege-math-profile", 191, 0],
  ]);
  const base = report.exams.find((exam) => exam.level === "base");
  assert.equal(base.after.publishedTheory, 0);
  assert.equal(base.after.numberedTheory, 0);
  assert.equal(base.after.sharedFoundationTheory, 8);
  assert(report.rows.filter((row) => row.level === "base").every((row) => row.publishedTaskCount === 0 && row.theory.length === 0));
  assert.equal(report.totals.publishedTasks, 432);
  assert.equal(report.totals.archivedTasks, 16);
  assert.equal(report.totals.uniqueTheoryArticles, 52);
  assert.deepEqual(report.integrityIssues, []);
});

test("twenty-per-number goals are explicitly provisional and exclude unnumbered foundations", () => {
  const report = make();
  assert.deepEqual(report.exams.map((exam) => exam.remainingProvisionalTaskTarget), [266, 420, 189]);
  assert.equal(report.exams.find((exam) => exam.id === "oge-math").after.foundationalPublishedTasks, 7);
  assert(report.rows.every((row) => row.provisionalTarget.officialCompleteness === null));
  const markdown = mathCoverageMarkdown(report);
  assert.match(markdown, /Полное официальное покрытие не достигнуто/);
  assert.match(markdown, /Архивные задачи базы не опубликованы/);
});

test("unmapped draft candidates are counted separately and cannot silently enter the public bank", () => {
  const draft = { id: "new-unmapped-example" };
  const report = make({ candidates: [draft] });
  assert.equal(report.drafts.count, 1);
  assert.equal(report.drafts.publishedCount, 0);
  assert.equal(report.drafts.examMapping, null);
  assert.equal(report.totals.newPublishedTasks, 0);
  const leaked = make({ candidates: [{ id: content.tasks[0].id }] });
  assert(leaked.integrityIssues.includes(`draft-in-public-bank:${content.tasks[0].id}`));
});

test("adding worked examples and control questions does not invent new articles or count shared theory twice", () => {
  const modified = { ...baseline, theoryTopics: baseline.theoryTopics.map((topic) => topic.id !== "fractions" ? topic : {
    ...topic, examples: [...topic.examples, { title: "Synthetic test example", steps: [{ text: "Test only" }], answer: "1" }],
    learningChecks: { checks: [{ id: "test-question", question: "Synthetic question", answer: "1" }] },
  }) };
  modified.getTheoryTopic = (id) => modified.theoryTopics.find((topic) => topic.id === id) ?? baseline.getTheoryTopic(id);
  const report = make({ content: modified });
  assert.equal(report.totals.newTheoryArticles, 0);
  assert.equal(report.totals.newWorkedExamples, 1);
  assert.equal(report.totals.newControlQuestions, 1);
  assert.equal(report.exams.find((exam) => exam.id === "oge-math").added.workedExamples, 1);
  assert.equal(report.exams.find((exam) => exam.id === "ege-math-profile").added.workedExamples, 1);
  assert.equal(report.exams.find((exam) => exam.id === "ege-math-base").added.workedExamples, 0);
});

test("a claimed official flag or a collection of task IDs cannot certify a fixed full variant", () => {
  const report = make({ fixedVariants: Array.from({ length: 5 }, (_, index) => ({ id: `claimed-${index}`, examVersionId: "oge-math-2026",
    releaseStatus: "published", officialManifestReviewed: true, taskIds: content.tasks.slice(0, 25).map((task) => task.id) })) });
  assert.equal(report.totals.fullOfficialStructureVariants, 0);
  assert(report.rows.every((row) => row.fixedVariantIds.length === 0));
});

test("rights audit does not infer publication permission from author labels and fails on mismatched publication IDs", () => {
  const old = make({ content: baseline });
  assert(old.rows.filter((row) => row.publishedTaskCount > 0).every((row) => row.rights.allowedCount === 0));
  const task = baseline.tasks.find((item) => item.examNumber === 15 && item.examType[0] === "ОГЭ");
  const changed = { ...baseline, theoryTopics: [], tasks: [{ ...task,
    publication: { id: "wrong-id", provenance: { sourceIds: ["tochka-project-original"] }, validation: { status: "automated-reviewed" }, releaseStatus: "published" } }] };
  const report = make({ content: changed, getPublicationDecision: () => ({ allowed: true, reasons: [] }) });
  const row = report.rows.find((item) => item.examId === "oge-math" && item.projectConfiguration.number === 15);
  assert.equal(row.rights.status, "release-blocked");
  assert.equal(row.rights.allowedCount, 0);
  assert(row.rights.reasons.includes("publication-identity-mismatch"));
});
