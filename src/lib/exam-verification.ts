/** Editorial release metadata. Existing preliminary exercises do not become official by importing this file. */
export type ExamIdentity = {
  examVersionId: string;
  examType: "ОГЭ" | "ЕГЭ";
  subjectId: "math";
  level: "base" | "profile" | null;
  year: number;
};

export type OfficialDocumentReview = {
  id: string;
  kind: "specification" | "codifier" | "assessment-criteria";
  title: string;
  url: string;
  examVersionId: string;
  year: number;
  /** A local copy is evidence for a review, not permission to republish the PDF. */
  evidencePath: string;
  sha256: string;
  usage: "structure-reference-only";
};

export type VerifiedExamNumber = {
  number: number;
  title: string;
  part: 1 | 2;
  answerFormat: "short" | "extended";
  maxPrimaryScore: number;
  skills: string[];
  subtopics: string[];
  criterionDocumentId: string | null;
};

export type VerifiedExamManifest = ExamIdentity & {
  schemaVersion: 1;
  status: "verified";
  documents: OfficialDocumentReview[];
  officialNumbers: VerifiedExamNumber[];
  officialDurationMinutes: number;
  totalMaxPrimaryScore: number;
  instructions: string[];
  permittedTools: string[];
  toolsReviewed: true;
  sharedConditionGroups: number[][];
  manualReview: {
    reviewedBy: string;
    reviewedAt: string;
    evidencePath: string;
  };
};

export type BlockedExamVerification = ExamIdentity & {
  schemaVersion: 1;
  status: "blocked";
  checkedAt: string;
  referenceUrls: string[];
  documents: [];
  officialNumbers: null;
  officialDurationMinutes: null;
  totalMaxPrimaryScore: null;
  missingDocuments: string[];
  reason: string;
};

const ogeReference = "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory";
const egeReference = "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory";

/** No official counts, scores, dates or timing are inferred from the application's old project configuration. */
export const examVerificationRecords: readonly BlockedExamVerification[] = ([
  { examVersionId: "oge-math-2026", examType: "ОГЭ", level: null },
  { examVersionId: "ege-math-base-2026", examType: "ЕГЭ", level: "base" },
  { examVersionId: "ege-math-profile-2026", examType: "ЕГЭ", level: "profile" },
] as const).map((identity) => ({
  ...identity, subjectId: "math", year: 2026, schemaVersion: 1, status: "blocked",
  checkedAt: "2026-10-21",
  referenceUrls: [identity.examType === "ОГЭ" ? ogeReference : egeReference],
  documents: [], officialNumbers: null, officialDurationMinutes: null, totalMaxPrimaryScore: null,
  missingDocuments: [
    "Спецификация математики соответствующего экзамена и уровня за 2026 год",
    "Кодификатор математики соответствующего экзамена и уровня за 2026 год",
    ...(identity.level === "base" ? [] : ["Демоверсия с применимыми критериями развёрнутых решений за 2026 год — только для изучения требований"]),
    "Запись ручной сверки структуры, времени, разрешённых средств и баллов с точными страницами документов",
  ],
  reason: "Официальные документы не получены: доступ к ФИПИ из среды заблокирован (CONNECT HTTP 403). Новый полный экзаменационный выпуск остановлен; действующая предварительная практика не переименовывается в официальный курс. Структура 2027 года не проверена.",
}));

const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const positiveInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const texts = (value: unknown, allowEmpty = false): value is string[] => Array.isArray(value) && (allowEmpty || value.length > 0) && value.every(nonempty);
export function isOfficialEvidencePath(value: unknown): value is string {
  return typeof value === "string" && /^docs\/official\/[A-Za-z0-9_.\-/]+$/.test(value)
    && !value.split("/").some((part) => part === "." || part === ".." || part === "");
}
function fipiUrl(value: unknown) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && !url.username && !url.password
      && (url.hostname === "fipi.ru" || url.hostname.endsWith(".fipi.ru"));
  } catch { return false; }
}

/** Metadata checks do not read PDF semantics. The CLI additionally checks local bytes; an accountable manual review is mandatory. */
export function validateVerifiedExamManifest(input: unknown): { valid: boolean; issues: string[]; manifest: VerifiedExamManifest | null } {
  const issues: string[] = [];
  if (!object(input)) return { valid: false, issues: ["manifest-not-object"], manifest: null };
  if (input.schemaVersion !== 1) issues.push("unsupported-manifest-schema");
  if (input.status !== "verified") issues.push("official-documents-not-verified");
  if (!Number.isSafeInteger(input.year) || (input.year as number) < 2020 || (input.year as number) > 2100) issues.push("invalid-exam-year");
  const expectedId = input.examType === "ОГЭ" && input.level === null ? `oge-math-${input.year}`
    : input.examType === "ЕГЭ" && (input.level === "base" || input.level === "profile") ? `ege-math-${input.level}-${input.year}` : null;
  if (input.subjectId !== "math" || expectedId === null || input.examVersionId !== expectedId) issues.push("exam-identity-mismatch");
  if (!positiveInteger(input.officialDurationMinutes)) issues.push("official-duration-missing");
  if (!positiveInteger(input.totalMaxPrimaryScore)) issues.push("official-maximum-missing");
  if (!texts(input.instructions) || !texts(input.permittedTools, true) || input.toolsReviewed !== true) issues.push("instructions-or-tools-not-reviewed");
  const review = input.manualReview;
  if (!object(review) || !nonempty(review.reviewedBy) || !nonempty(review.reviewedAt)
    || !/^\d{4}-\d{2}-\d{2}T/.test(review.reviewedAt) || !Number.isFinite(Date.parse(review.reviewedAt))
    || !isOfficialEvidencePath(review.evidencePath)) issues.push("manual-document-review-required");

  const documents = Array.isArray(input.documents) ? input.documents : [];
  const documentIds = new Set<string>();
  const kinds = new Set<string>();
  for (const doc of documents) {
    if (!object(doc) || !nonempty(doc.id) || !nonempty(doc.title) || !fipiUrl(doc.url)
      || !["specification", "codifier", "assessment-criteria"].includes(String(doc.kind))
      || doc.examVersionId !== input.examVersionId || doc.year !== input.year
      || !isOfficialEvidencePath(doc.evidencePath) || !/^[a-f0-9]{64}$/.test(String(doc.sha256))
      || doc.usage !== "structure-reference-only") { issues.push("invalid-official-document-record"); continue; }
    if (documentIds.has(doc.id)) issues.push("duplicate-document-id");
    documentIds.add(doc.id); kinds.add(String(doc.kind));
  }
  if (!kinds.has("specification")) issues.push("specification-missing");
  if (!kinds.has("codifier")) issues.push("codifier-missing");

  const numbers = Array.isArray(input.officialNumbers) ? input.officialNumbers : [];
  if (!numbers.length) issues.push("official-number-table-missing");
  let score = 0, lastPart = 1;
  for (const [index, item] of numbers.entries()) {
    if (!object(item) || item.number !== index + 1 || !nonempty(item.title)
      || (item.part !== 1 && item.part !== 2) || !positiveInteger(item.maxPrimaryScore)
      || !texts(item.skills) || !texts(item.subtopics)
      || item.answerFormat !== (item.part === 1 ? "short" : "extended")
      || (input.level === "base" && item.part !== 1)) { issues.push(`invalid-official-number:${index + 1}`); continue; }
    if ((item.part as number) < lastPart) issues.push("exam-parts-out-of-order");
    lastPart = item.part as number;
    score += item.maxPrimaryScore;
    if (item.part === 2 && (!kinds.has("assessment-criteria") || !documents.some((doc) => object(doc)
      && doc.id === item.criterionDocumentId && doc.kind === "assessment-criteria" && documentIds.has(String(doc.id))))) issues.push(`criteria-missing:${item.number}`);
    if (item.part === 1 && item.criterionDocumentId !== null) issues.push(`short-answer-criteria-reference-unexpected:${item.number}`);
  }
  if (!Array.isArray(input.sharedConditionGroups)) issues.push("shared-condition-structure-not-reviewed");
  else {
    const grouped = new Set<number>();
    for (const group of input.sharedConditionGroups) {
      if (!Array.isArray(group) || group.length < 2 || group.some((number, index) => !Number.isSafeInteger(number)
        || number < 1 || number > numbers.length || (index > 0 && number <= group[index - 1]) || grouped.has(number))) {
        issues.push("invalid-shared-condition-group"); continue;
      }
      group.forEach((number) => grouped.add(number));
    }
  }
  if (score !== input.totalMaxPrimaryScore) issues.push("official-score-total-mismatch");
  return { valid: issues.length === 0, issues: [...new Set(issues)], manifest: issues.length ? null : input as unknown as VerifiedExamManifest };
}
