import { sourceRegistry, type SourceRecord } from "./source-registry";

export type ContentProvenance = {
  /** Every source whose material is present, including adaptations and drawings. */
  sourceIds: readonly string[];
  authorship: "project-original" | "adapted" | "reproduced";
  sourceFiles: readonly string[];
  attribution: readonly string[];
  /** Sources used for factual requirements only; never copying permission. */
  structuralReferenceIds?: readonly string[];
};
export type ContentValidation = {
  status: "pending" | "automated-reviewed" | "expert-reviewed" | "requires-expert-review";
  checkedAt?: string;
  /** Repository test/report paths, or links to an actual review. */
  evidence: readonly string[];
};
export type PublicationCandidate = {
  id: string;
  provenance: ContentProvenance;
  validation: ContentValidation;
  releaseStatus: "draft" | "ready" | "published";
};
export type PublicationReasonCode =
  | "invalid-metadata" | "draft" | "missing-source" | "duplicate-source"
  | "unknown-source" | "ambiguous-registry" | "unknown-rights" | "revoked-rights"
  | "missing-publish-permission" | "missing-modify-permission" | "missing-rights-evidence"
  | "expired-rights" | "invalid-review-date" | "missing-attribution"
  | "authorship-conflict" | "missing-source-files" | "unknown-reference"
  | "math-review-pending" | "expert-review-required" | "missing-validation-evidence";
export type PublicationDecision = {
  allowed: boolean;
  reasons: { code: PublicationReasonCode; sourceId?: string; detail: string }[];
};

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const stringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
function day(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}
function evidenceUrl(value: unknown): boolean {
  if (typeof value !== "string" || value.trim() !== value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}
function sourceEvidenceValid(source: SourceRecord): boolean {
  const kinds = source.licenseType === "project-original"
    ? ["author-declaration"] : ["licence", "permission"];
  return Array.isArray(source.evidence) && source.evidence.some((entry) =>
    object(entry) && typeof entry.kind === "string" && kinds.includes(entry.kind) && evidenceUrl(entry.url) &&
    typeof entry.description === "string" && entry.description.trim().length > 0);
}
function safeSourcePath(path: string): boolean {
  return !path.startsWith("/") && !path.includes("\\") && !/^[a-z][a-z0-9+.-]*:/i.test(path) &&
    !path.split("/").includes("..");
}

/**
 * One fail-closed release check for imports and new author batches.
 * A positive result checks the recorded evidence, not its legal authenticity or
 * mathematical truth; actual review/tests must produce the supplied evidence.
 */
export function getPublicationDecision(
  candidate: PublicationCandidate,
  registry: readonly SourceRecord[] = sourceRegistry,
  asOf = new Date().toISOString().slice(0, 10),
): PublicationDecision {
  const reasons: PublicationDecision["reasons"] = [];
  const add = (code: PublicationReasonCode, detail: string, sourceId?: string) =>
    reasons.push({ code, detail, ...(sourceId ? { sourceId } : {}) });
  const today = day(asOf);
  if (!today || !object(candidate) || typeof candidate.id !== "string" || !candidate.id.trim() ||
      !object(candidate.provenance) || !object(candidate.validation) || !Array.isArray(registry)) {
    return { allowed: false, reasons: [{ code: "invalid-metadata", detail: "Неполные метаданные материала или дата проверки." }] };
  }
  const { provenance, validation } = candidate;
  if (!["ready", "published", "draft"].includes(candidate.releaseStatus)) add("invalid-metadata", "Неизвестный статус публикации.");
  if (candidate.releaseStatus === "draft") add("draft", "Черновик не публикуется.");
  if (!["project-original", "adapted", "reproduced"].includes(provenance.authorship)) add("invalid-metadata", "Не указан способ создания материала.");
  if (!stringList(provenance.sourceIds) || !provenance.sourceIds.length) add("missing-source", "Нужен явный источник происхождения.");
  if (!stringList(provenance.sourceFiles) || !provenance.sourceFiles.length || provenance.sourceFiles.some((path) =>
    !safeSourcePath(path))) add("missing-source-files", "Нужны относительные пути исходников материала в проекте.");
  if (!stringList(provenance.attribution)) add("missing-attribution", "Атрибуция должна быть явным списком.");

  const ids = stringList(provenance.sourceIds) ? provenance.sourceIds : [];
  if (new Set(ids).size !== ids.length) add("duplicate-source", "Источник указан более одного раза.");
  for (const id of new Set(ids)) {
    const records = registry.filter((source) => object(source) && source.id === id);
    if (!records.length) { add("unknown-source", "Источник отсутствует в реестре.", id); continue; }
    if (records.length !== 1) { add("ambiguous-registry", "ID источника не уникален в реестре.", id); continue; }
    const source = records[0];
    if (source.reviewStatus === "revoked") add("revoked-rights", "Разрешение отозвано.", id);
    if (!((source.licenseType === "project-original" && source.reviewStatus === "project-declaration") ||
      (source.licenseType === "explicit-license" && source.reviewStatus === "permission-confirmed")))
      add("unknown-rights", "Право публикации материала не подтверждено записью реестра.", id);
    if (!Array.isArray(source.permittedActions) || !source.permittedActions.includes("publish"))
      add("missing-publish-permission", "Нет разрешения на публикацию в проекте.", id);
    if (provenance.authorship === "adapted" && (!Array.isArray(source.permittedActions) || !source.permittedActions.includes("modify")))
      add("missing-modify-permission", "Нет разрешения на переработку.", id);
    if (!sourceEvidenceValid(source)) add("missing-rights-evidence", "Нет зафиксированной декларации оригинального происхождения или подтверждения разрешения.", id);
    const reviewed = day(source.checkedAt);
    if (!reviewed || reviewed > today) add("invalid-review-date", "Дата проверки источника отсутствует, неверна или находится в будущем.", id);
    if (source.rightsValidThrough !== null) {
      const expires = day(source.rightsValidThrough);
      if (!expires || expires < today) add("expired-rights", "Разрешение истекло или срок не определён корректно.", id);
    }
    if (typeof source.attribution !== "string" || !source.attribution.trim() ||
        !Array.isArray(provenance.attribution) || !provenance.attribution.includes(source.attribution))
      add("missing-attribution", "Не сохранена обязательная атрибуция источника.", id);
    if (provenance.authorship === "project-original" && source.licenseType !== "project-original")
      add("authorship-conflict", "Чужой материал нельзя объявлять оригинальным материалом проекта.", id);
  }
  if (provenance.structuralReferenceIds !== undefined) {
    if (!stringList(provenance.structuralReferenceIds)) add("invalid-metadata", "Неверный список справочных источников.");
    else for (const id of provenance.structuralReferenceIds) {
      const matches = registry.filter((source) => object(source) && source.id === id);
      if (matches.length !== 1 || !Array.isArray(matches[0].permittedActions) || !matches[0].permittedActions.includes("structural-reference"))
        add("unknown-reference", "Справочный источник не зарегистрирован для проверки структуры.", id);
    }
  }
  if (validation.status === "requires-expert-review") add("expert-review-required", "Материал ожидает экспертной проверки и не должен попадать в релиз.");
  else if (!["automated-reviewed", "expert-reviewed"].includes(validation.status))
    add("math-review-pending", "Математическая проверка материала не завершена.");
  if (!stringList(validation.evidence) || !validation.evidence.length)
    add("missing-validation-evidence", "Нет свидетельства выполненных тестов или проверки.");
  const checked = day(validation.checkedAt);
  if (!checked || checked > today) add("invalid-review-date", "Нужна корректная дата выполненной проверки материала.");
  return { allowed: reasons.length === 0, reasons };
}
