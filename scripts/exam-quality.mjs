import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildCoverage, contentIntegrityIssues } from "./content-report.mjs";
import { createContentLoader, loadContent, projectRoot } from "./content-source-loader.mjs";

export function buildExamQuality(content = loadContent(), { regressionPassed = false } = {}) {
  const load = createContentLoader();
  const { getMockVariants } = load("src/lib/mock-exam.ts");
  const checks = [
    ["src/lib/content/oge-bank.ts", "ogeGeneratorCases", "ogeSupplementIds", "scripts/test-oge-bank.mjs"],
    ["src/lib/content/ege-bank.ts", "egeGeneratorCases", "egeSupplementIds", "scripts/test-ege-bank.mjs"],
    ["src/lib/content/base-bank.ts", "baseGeneratorCases", null, "scripts/test-base-bank.mjs"],
    ["src/lib/content/challenge-bank.ts", "challengeGeneratorCases", null, "scripts/test-challenge-bank.mjs"],
  ];
  const evidence = new Map();
  for (const [path, casesName, supplementsName, testFile] of checks) {
    const contentModule = load(path);
    for (const item of contentModule[casesName] ?? []) evidence.set(item.taskId, { testFile, method: "independent-family-calculation-or-consistency-check" });
    for (const id of contentModule[supplementsName] ?? []) evidence.set(id, { testFile, method: "individual-calculation-or-logic-consistency-check" });
  }
  const coverage = buildCoverage(content);
  const issues = contentIntegrityIssues(content, coverage);
  const exams = content.examDefinitions.map((definition) => {
    const bank = content.tasks.filter((task) => task.examVersionId === definition.versionId && task.availability !== "history-only");
    const rows = definition.numbers.map((number) => {
      const tasks = bank.filter((task) => task.examNumber === number.number);
      const row = coverage.rows.find((entry) => entry.examVersionId === definition.versionId && entry.number === number.number);
      const indexedChecks = tasks.filter((task) => evidence.has(task.id));
      return {
        number: number.number, part: number.part, maxPrimaryScore: number.maxPrimaryScore,
        taskCount: tasks.length, originalFamilies: new Set(tasks.map((task) => task.prototypeId)).size,
        automaticAnswerTasks: tasks.filter((task) => task.answerRule.type !== "self").length,
        selfAssessmentTasks: tasks.filter((task) => task.answerRule.type === "self").length,
        tasksWithIndexedAutomatedChecks: indexedChecks.length,
        tasksWithPassedAutomatedChecks: regressionPassed ? indexedChecks.length : null,
        expertReviewedTaskCount: 0,
        theoryIds: row?.theoryIds ?? [],
        minimum20Gap: Math.max(0, 20 - tasks.length),
      };
    });
    const variants = getMockVariants(definition, content.tasks);
    for (const variant of variants) {
      const tasks = variant.taskIds.map((id) => content.tasks.find((task) => task.id === id));
      if (tasks.length !== definition.numbers.length || new Set(variant.taskIds).size !== tasks.length || tasks.some((task) => !task)) issues.push(`incomplete variant:${variant.id}`);
      definition.numbers.forEach((number, index) => {
        const task = tasks[index];
        if (task?.examNumber !== number.number || task?.part !== number.part || task?.scoring.maxPrimaryScore !== number.maxPrimaryScore) issues.push(`variant slot mismatch:${variant.id}#${number.number}`);
      });
    }
    return { id: definition.id, versionId: definition.versionId, configuredYear: definition.year,
      target2027Verified: false, taskCount: bank.length, numbers: rows,
      theoryCoverageNumbers: rows.filter((row) => row.theoryIds.length).length,
      fullConfiguredVariants: variants, confirmed2027Variants: 0 };
  });
  for (const task of content.tasks) {
    if (!task.provenance?.creation_method || task.provenance.source_type !== "original") issues.push(`missing provenance:${task.id}`);
    if (task.availability === "history-only") continue;
    const definition = content.examDefinitions.find((entry) => entry.versionId === task.examVersionId);
    const number = definition?.numbers.find((entry) => entry.number === task.examNumber);
    if (!definition || task.subjectId !== definition.subjectId || task.level !== definition.level || task.examType[0] !== definition.examType || task.examYear !== definition.year) issues.push(`exam metadata:${task.id}`);
    if (task.examNumber !== null && (!number || number.part !== task.part || number.maxPrimaryScore !== task.scoring.maxPrimaryScore)) issues.push(`number metadata:${task.id}`);
    if (!["number", "set", "self"].includes(task.answerRule.type)) issues.push(`unsupported answer:${task.id}`);
    if (task.examEntryFormat === "digit-sequence" && (task.answerRule.type !== "number" || !/^\d+$/.test(task.answerRule.value))) issues.push(`digit sequence:${task.id}`);
    if (task.answerFormat !== (task.answerRule.type === "self" ? "extended" : task.answerRule.type)) issues.push(`answer format:${task.id}`);
    if (task.part === 2 && (task.answerRule.type !== "self" || !task.selfCheckNotes?.length)) issues.push(`self-check guidance:${task.id}`);
    if (task.examNumber !== null && (!Number.isInteger(task.scoring.maxPrimaryScore) || task.scoring.maxPrimaryScore < 1)) issues.push(`score range:${task.id}`);
  }
  const theory = content.theoryTopics.map((topic) => ({ id: topic.id, knowledgeChecks: topic.knowledgeChecks?.length ?? 0,
    examples: topic.examples.length, sections: topic.sections.length }));
  for (const topic of theory) if (!topic.knowledgeChecks || topic.examples < 2 || topic.sections < 2) issues.push(`theory completeness:${topic.id}`);
  return {
    schemaVersion: 1, targetYear: 2027, complete: false,
    verification: { regressionSuite: regressionPassed ? "passed" : "not-run-by-this-command", humanExpertReview: "not-performed",
      note: "Automated answer/consistency checks do not certify full mathematical proofs, official difficulty, exam equivalence or rights clearance." },
    totals: coverage.totals, exams, theory,
    issues,
    outstanding: ["six-uploaded-archives-missing", "24-uploaded-pdf-integrity-and-year-review-pending", "2025-2026-comparison-incomplete",
      "2027-profile-structure-not-implemented", "official-extended-answer-rubrics-not-fully-reviewed", "minimum20-and-subtype-diversity-gaps", "human-expert-review-pending"],
    evidence: Object.fromEntries([...evidence.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}

export function buildProvenanceRegistry(content = loadContent()) {
  const policies = [];
  const records = [...content.tasks.map((item) => ({ kind: "task", item })), ...content.theoryTopics.map((item) => ({ kind: "theory", item }))].map(({ kind, item }) => {
    const declaration = item.provenance;
    const json = JSON.stringify(declaration);
    let policy = policies.findIndex((entry) => JSON.stringify(entry) === json);
    if (policy < 0) { policies.push(declaration); policy = policies.length - 1; }
    return { id: item.id, kind, provenancePolicy: policy,
      sha256: createHash("sha256").update(JSON.stringify(item)).digest("hex") };
  });
  return { schemaVersion: 1,
    note: "Project authorship declarations; no third-party text or artwork was imported in this change. No external licence is invented or granted. Existing declarations were retained, not independently rights-audited. FIPI copies are analytical sources only, not bank content.",
    policies, records };
}

function main() {
  const verify = process.argv.includes("--verify");
  if (verify) {
    const result = spawnSync(process.execPath, ["--test", ...[
      "test-oge-bank.mjs", "test-ege-bank.mjs", "test-base-bank.mjs", "test-challenge-bank.mjs", "test-number-theory.mjs", "test-base-theory.mjs", "test-mock-exam.mjs",
    ].map((name) => resolve(projectRoot, "scripts", name))], { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
  const report = buildExamQuality(undefined, { regressionPassed: verify });
  const registry = buildProvenanceRegistry();
  mkdirSync(resolve(projectRoot, "docs"), { recursive: true });
  writeFileSync(resolve(projectRoot, "docs/exam-quality.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(resolve(projectRoot, "docs/content-provenance.json"), `${JSON.stringify(registry, null, 2)}\n`);
  console.log(JSON.stringify({ totalTasks: report.totals.allTasks, activeTasks: report.totals.activeTasks,
    configuredVariants: report.exams.map((exam) => ({ exam: exam.id, count: exam.fullConfiguredVariants.length })),
    issues: report.issues, complete2027: report.complete }, null, 2));
  if (report.issues.length || (process.argv.includes("--require-complete") && !report.complete)) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
