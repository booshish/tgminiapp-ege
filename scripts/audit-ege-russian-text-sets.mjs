import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createContentLoader } from "./content-source-loader.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";

// Editorial inventory only. Does not import, rewrite, disable or publish any task.
// No length threshold is treated as an official examination requirement.
const load = createContentLoader();
const { russianTasks } = load("src/lib/content/russian-bank.ts");
const { sourceRegistry } = load("src/lib/source-registry.ts");
const { getPublicationDecision } = load("src/lib/content-publication.ts");
const { russianModels } = load("src/lib/content/russian-model.ts");
const egeModel = russianModels.find(model => model.examType === "ЕГЭ");
const egeTasks = russianTasks.filter(task => task.examType.includes("ЕГЭ"));
const initial = load("src/lib/content/russian-ege.ts").egeRussianEntries;
const packages = [
  ["initial", "src/lib/content/russian-ege.ts", initial],
  ...[2, 3, 4].map(number => [
    `pack${number}`, `src/lib/content/russian-pack${number}-ege-texts.ts`,
    load(`src/lib/content/russian-pack${number}.ts`)[`russianPack${number}`]
      .filter(item => item.exam === "ЕГЭ").map(item => item.entry),
  ]),
];
const groups = new Map();
for (const [packageId, sourceFile, entries] of packages) {
  for (const entry of entries) {
    if (!entry.passage) continue;
    const { id, sentences } = entry.passage;
    if (!groups.has(id)) groups.set(id, { id, packageId, sourceFile, sentences, entries: [] });
    const group = groups.get(id);
    assert.deepEqual(group.sentences, sentences, `Different texts share passage ID ${id}`);
    assert.equal(group.sourceFile, sourceFile, `Passage split across packages: ${id}`);
    assert(entry.references?.length, `Missing sentence references: ${entry.slug}`);
    for (const index of entry.references) assert(index >= 1 && index <= sentences.length, entry.slug);
    group.entries.push(entry);
  }
}
const accountedTaskIds = new Set();
const sets = [...groups.values()].map(group => {
  const numbers = group.entries.map(entry => entry.number).sort((a, b) => a - b);
  const introductory = numbers.includes(1);
  assert.deepEqual(numbers, introductory ? [1, 2, 3] : [23, 24, 25, 26], group.id);
  const tasks = egeTasks.filter(task => task.sharedConditionId === group.id);
  assert.deepEqual(tasks.map(task => task.examNumber).sort((a, b) => a - b), numbers, group.id);
  for (const task of tasks) {
    assert(!accountedTaskIds.has(task.id), `Task assigned to multiple sets: ${task.id}`);
    accountedTaskIds.add(task.id);
    assert(task.answerDisplay && task.solution?.[0]?.text, `Incomplete existing practice: ${task.id}`);
    assert(getPublicationDecision(task.publication).allowed, `Existing rights record unavailable: ${task.id}`);
  }
  return {
    passageId: group.id,
    packageId: group.packageId,
    sourceFile: group.sourceFile,
    family: introductory ? "introductory-text-1-3" : "reading-analysis-23-26",
    examNumbers: numbers,
    sentenceCount: group.sentences.length,
    wordCount: group.sentences.join(" ").match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)?.length ?? 0,
    taskIds: tasks.map(task => task.id),
    contentSha256: createHash("sha256").update(JSON.stringify({
      passage: { id: group.id, sentences: group.sentences },
      taskFingerprints: tasks.map(task => ({ id: task.id, sha256: contentFingerprint(task) })),
    })).digest("hex"),
    provenanceSourceIds: [...new Set(tasks.flatMap(task => task.publication.provenance.sourceIds))],
    existingPracticePublicationAllowed: true,
    completeExamSetVerified: false,
    essay27Present: false,
    replacementStatus: "no-licensed-replacement-available-in-reviewed-materials",
  };
});
assert.equal(accountedTaskIds.size, egeTasks.filter(task => task.sharedConditionId).length);
const families = ["introductory-text-1-3", "reading-analysis-23-26"].map(family => {
  const items = sets.filter(set => set.family === family);
  return {
    family, setCount: items.length, taskCount: items.reduce((sum, set) => sum + set.taskIds.length, 0),
    wordCountRange: [Math.min(...items.map(set => set.wordCount)), Math.max(...items.map(set => set.wordCount))],
    sentenceCountRange: [Math.min(...items.map(set => set.sentenceCount)), Math.max(...items.map(set => set.sentenceCount))],
  };
});
const externalRegistrySources = sourceRegistry.filter(source => source.licenseType !== "project-original")
  .map(source => ({
    id: source.id, url: source.url, originalRightsReviewDate: source.checkedAt,
    licenseType: source.licenseType, reviewStatus: source.reviewStatus,
    permittedActions: [...source.permittedActions], evidence: source.evidence,
    commercialRepublicationConfirmed: false,
  }));
// An audit of the existing source registry, not a new determination about an unseen licence.
assert(!externalRegistrySources.some(source => source.licenseType === "explicit-license"
  && source.reviewStatus === "permission-confirmed"), "Newly approved source needs an editorial update to this inventory");
const audit = {
  schemaVersion: 1,
  recordedAt: "2026-10-23",
  scope: "ЕГЭ · русский язык · готовые комплекты с исходными текстами",
  status: "blocked-no-confirmed-external-commercial-reuse",
  reusedEvidenceFiles: ["docs/content-sources.md", "src/lib/source-registry.ts", "docs/russian-content-progress.md"],
  repeatedSourceWebsiteAudit: false,
  newSourceDiscovery: {
    attempted: true,
    queries: [
      'ЕГЭ русский язык задания текст ответы "CC BY"',
      'ЕГЭ русский язык готовые варианты "лицензия" "коммерческого"',
    ],
    result: "web-tool-error-no-results-returned",
    confirmedNewSources: [],
  },
  localMaterialsChecked: ["docs", "public", "/workspace/library-files", "/workspace/shared"],
  accessibleLicensedExternalSets: [],
  requirements: {
    versionId: egeModel.versionId, year: egeModel.year,
    verificationStatus: egeModel.verificationStatus,
    canonicalOfficialZipVerified: false,
    sources: egeModel.sources,
    note: "Previously reviewed draft-copy model; no new confirmation of final 2027 rules.",
  },
  summary: {
    existingEgeRussianTasks: egeTasks.length,
    existingPassageGroups: sets.length,
    existingTextLinkedTasks: accountedTaskIds.size,
    families,
    confirmedExternalCommercialSources: 0,
    licensedSetsAdded: 0,
    existingTasksUpdated: 0,
    originalTextsCreated: 0,
    originalQuestionsCreated: 0,
    runtimeFilesChanged: false,
  },
  externalRegistrySources,
  additionalPriorSourceFindings: [
    { url: "https://pro-schools.ru/", evidenceFile: "docs/content-sources.md", commercialRepublicationConfirmed: false },
    { url: "https://obrnadzor.gov.ru/", evidenceFile: "docs/content-sources.md", commercialRepublicationConfirmed: false },
    { url: "https://edu.gov.ru/terms_of_use/", evidenceFile: "docs/content-sources.md", commercialRepublicationConfirmed: false },
  ],
  limitations: [
    "Open access and a public-domain literary text alone do not grant reuse rights for its questions, solutions or accompanying edition.",
    "No official minimum passage length is inferred from the measured counts; numbers 1–3 and 23–26 are separate families.",
    "Existing project-original practice is permitted, but this task prohibits creating new original text/question sets.",
    "No approved replacement bundle or verified current essay rubric was available; no questions from different sources were combined.",
  ],
  sets,
};
if (process.argv.includes("--check")) {
  const saved = JSON.parse(readFileSync(new URL("../docs/ege-russian-text-sets-audit.json", import.meta.url), "utf8"));
  assert.deepEqual(saved, audit, "Text-set inventory is stale; review actual changes before replacing the snapshot");
  console.log(JSON.stringify({ status: audit.status, ...audit.summary }));
} else {
  console.log(JSON.stringify(audit, null, 2));
}
