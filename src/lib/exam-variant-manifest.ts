/** Build/editorial tooling only: do not import this module into the browser bundle. */
import { createHash } from "node:crypto";
import type { Task } from "./tasks";
import { getPublicationDecision, type PublicationCandidate } from "./content-publication";
import { sourceRegistry, type SourceRecord } from "./source-registry";
import { validateVerifiedExamManifest, type VerifiedExamManifest } from "./exam-verification";

export type TaskReleaseReview = {
  taskId: string;
  taskRevision: number;
  /** Binds the review to exact task content, not just a reusable ID. */
  contentSha256: string;
  /** Required for extended answers: why these criteria apply to this original prototype. */
  criteriaApplicability?: { documentId: string; explanation: string };
};
export type FixedExamVariant = {
  schemaVersion: 1;
  id: string;
  revision: 1;
  createdAt: string;
  examVersionId: string;
  examYear: number;
  title: string;
  officialManifestSha256: string;
  durationMinutes: number;
  maximumPrimaryScore: number;
  taskIds: string[];
  taskContentSha256: Record<string, string>;
};

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().filter((key) => (value as Record<string, unknown>)[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
}
export function contentSha256(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
function taskIssues(task: Task, manifest: VerifiedExamManifest, reviews: readonly TaskReleaseReview[], registry: readonly SourceRecord[], asOf: string) {
  const issues: string[] = [];
  const number = manifest.officialNumbers.find((entry) => entry.number === task.examNumber);
  if (!number || task.examVersionId !== manifest.examVersionId || task.examYear !== manifest.year
    || task.examType.length !== 1 || task.examType[0] !== manifest.examType || task.subjectId !== manifest.subjectId
    || task.level !== manifest.level || task.part !== number.part || task.scoring.maxPrimaryScore !== number.maxPrimaryScore || task.scoring.status !== "verified"
    || task.answerFormat !== (number.answerFormat === "extended" ? "extended" : task.answerRule.type)
    || (number.answerFormat === "extended") !== (task.answerRule.type === "self")) issues.push("task-structure-mismatch");
  if (!task.prompt.trim() || !task.answerDisplay.trim() || !task.solution.length || task.solution.some((step) => !step.text.trim())) issues.push("incomplete-task-content");
  const publication = (task as Task & { publication?: PublicationCandidate }).publication;
  if (!publication || publication.id !== task.id) issues.push("publication-record-missing");
  else issues.push(...getPublicationDecision(publication, registry, asOf).reasons.map((reason) => `publication:${reason.code}`));
  const review = reviews.filter((entry) => entry.taskId === task.id);
  if (review.length !== 1 || review[0].taskRevision !== task.source.revision
    || review[0].contentSha256 !== contentSha256(task)) issues.push("task-review-stale-or-missing");
  if (number?.part === 2 && (publication?.validation.status !== "expert-reviewed"
    || !review[0]?.criteriaApplicability?.explanation.trim()
    || review[0]?.criteriaApplicability?.documentId !== number.criterionDocumentId)) issues.push("extended-criteria-review-required");
  return issues;
}

export function validateFixedExamVariant(
  variant: FixedExamVariant,
  officialManifest: unknown,
  bank: readonly Task[],
  reviews: readonly TaskReleaseReview[],
  registry: readonly SourceRecord[] = sourceRegistry,
  asOf = new Date().toISOString().slice(0, 10),
): string[] {
  const verified = validateVerifiedExamManifest(officialManifest);
  if (!verified.manifest) return verified.issues;
  const manifest = verified.manifest;
  const issues: string[] = [];
  if (!variant || typeof variant !== "object") return ["variant-not-object"];
  if (!variant || variant.schemaVersion !== 1 || variant.revision !== 1 || !/^[a-zA-Z0-9-]+$/.test(variant.id)
    || !Number.isFinite(Date.parse(variant.createdAt)) || variant.examVersionId !== manifest.examVersionId
    || variant.examYear !== manifest.year || variant.durationMinutes !== manifest.officialDurationMinutes
    || variant.maximumPrimaryScore !== manifest.totalMaxPrimaryScore
    || variant.officialManifestSha256 !== contentSha256(manifest)) issues.push("variant-metadata-mismatch");
  if (!Array.isArray(variant.taskIds) || variant.taskIds.length !== manifest.officialNumbers.length
    || new Set(variant.taskIds).size !== variant.taskIds.length) return [...issues, "variant-incomplete-or-duplicate"];
  for (const [index, taskId] of variant.taskIds.entries()) {
    const candidates = bank.filter((task) => task.id === taskId);
    if (candidates.length !== 1) { issues.push(`task-unavailable-or-ambiguous:${taskId}`); continue; }
    const task = candidates[0];
    if (task.examNumber !== manifest.officialNumbers[index].number) issues.push(`number-order-mismatch:${taskId}`);
    issues.push(...taskIssues(task, manifest, reviews, registry, asOf).map((issue) => `${issue}:${taskId}`));
    if (variant.taskContentSha256?.[taskId] !== contentSha256(task)) issues.push(`variant-content-changed:${taskId}`);
  }
  for (const group of manifest.sharedConditionGroups) {
    const tasks = group.map((number) => bank.find((task) => task.id === variant.taskIds[number - 1]));
    if (tasks.some((task) => !task?.sharedConditionId) || new Set(tasks.map((task) => task?.sharedConditionId)).size !== 1) issues.push(`shared-condition-mismatch:${group.join(",")}`);
  }
  return issues;
}

/** All-or-nothing deterministic edition; five or more variants, no invented official defaults. */
export function buildFixedExamVariants({
  officialManifest, bank, reviews, releaseId, createdAt, count = 5, registry = sourceRegistry,
  asOf = new Date().toISOString().slice(0, 10),
}: {
  officialManifest: unknown;
  bank: readonly Task[];
  reviews: readonly TaskReleaseReview[];
  releaseId: string;
  createdAt: string;
  count?: number;
  registry?: readonly SourceRecord[];
  asOf?: string;
}): { variants: FixedExamVariant[]; issues: string[]; excluded: { taskId: string; issues: string[] }[] } {
  const verified = validateVerifiedExamManifest(officialManifest);
  const issues = [...verified.issues];
  const excluded: { taskId: string; issues: string[] }[] = [];
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(releaseId) || !Number.isFinite(Date.parse(createdAt))) issues.push("invalid-release-identity");
  if (!Number.isSafeInteger(count) || count < 5 || count > 100) issues.push("variant-count-must-be-between-five-and-one-hundred");
  if (new Set(bank.map((task) => task.id)).size !== bank.length) issues.push("duplicate-bank-task-id");
  if (issues.length || !verified.manifest) return { variants: [], issues, excluded };
  const manifest = verified.manifest;
  const eligible = bank.filter((task) => task.examVersionId === manifest.examVersionId).filter((task) => {
    const reasons = taskIssues(task, manifest, reviews, registry, asOf);
    if (reasons.length) excluded.push({ taskId: task.id, issues: reasons });
    return !reasons.length;
  });
  const order = <T,>(items: readonly T[], key: (item: T) => string) => [...items].sort((a, b) => {
    const left = contentSha256(`${releaseId}:${key(a)}`), right = contentSha256(`${releaseId}:${key(b)}`);
    return left < right ? -1 : left > right ? 1 : key(a).localeCompare(key(b), "en");
  });
  const groupsByNumber = new Map<number, string[]>();
  for (const group of manifest.sharedConditionGroups) {
    const groups = order([...new Set(eligible.filter((task) => task.examNumber === group[0] && task.sharedConditionId).map((task) => task.sharedConditionId!))]
      .filter((id) => group.every((number) => eligible.some((task) => task.examNumber === number && task.sharedConditionId === id))), (id) => id);
    if (groups.length < count) issues.push(`insufficient-complete-shared-groups:${group.join(",")}`);
    group.forEach((number) => groupsByNumber.set(number, groups));
  }
  for (const number of manifest.officialNumbers) {
    if (eligible.filter((task) => task.examNumber === number.number).length < count) issues.push(`insufficient-reviewed-tasks:${number.number}`);
  }
  if (issues.length) return { variants: [], issues, excluded };
  const variants = Array.from({ length: count }, (_, index): FixedExamVariant => {
    const taskIds = manifest.officialNumbers.map((number) => {
      const group = groupsByNumber.get(number.number)?.[index];
      const pool = order(eligible.filter((task) => task.examNumber === number.number && (!group || task.sharedConditionId === group)), (task) => task.id);
      return pool[group ? 0 : index].id;
    });
    return {
      schemaVersion: 1, id: `${releaseId}-v${index + 1}`, revision: 1, createdAt,
      examVersionId: manifest.examVersionId, examYear: manifest.year,
      title: `Авторский тренировочный вариант по структуре ФИПИ ${manifest.year} · ${index + 1}`,
      officialManifestSha256: contentSha256(manifest), durationMinutes: manifest.officialDurationMinutes,
      maximumPrimaryScore: manifest.totalMaxPrimaryScore, taskIds,
      taskContentSha256: Object.fromEntries(taskIds.map((id) => [id, contentSha256(eligible.find((task) => task.id === id)!)])),
    };
  });
  for (const variant of variants) issues.push(...validateFixedExamVariant(variant, manifest, bank, reviews, registry, asOf));
  if (new Set(variants.map((variant) => variant.taskIds.join("|"))).size !== count) issues.push("duplicate-complete-variants");
  return { variants: issues.length ? [] : variants, issues, excluded };
}
