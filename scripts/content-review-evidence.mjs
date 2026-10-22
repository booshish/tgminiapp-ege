import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Editorial/build-only evidence. Never import this module or its manifest in React.
export const contentReviewManifestURL = new URL("../docs/content-review-manifest.json", import.meta.url);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  if (value === undefined || typeof value === "function" || typeof value === "symbol"
      || typeof value === "bigint" || (typeof value === "number" && !Number.isFinite(value))) {
    throw new TypeError("Review fingerprints require finite JSON content");
  }
  return JSON.stringify(value);
}

/** Includes prompts, answers, steps, diagrams, source revision and enriched theory.
 * Only the top-level publication record is omitted: it is checked by the rights gate.
 */
export function contentFingerprint(material) {
  if (!material || typeof material !== "object" || Array.isArray(material)) {
    throw new TypeError("Expected a task or theory article");
  }
  const substantive = Object.fromEntries(Object.entries(material).filter(([key]) => key !== "publication"));
  return createHash("sha256").update(canonical(substantive)).digest("hex");
}

export function readContentReviewManifest(url = contentReviewManifestURL) {
  return JSON.parse(readFileSync(url, "utf8"));
}

/** Fail closed without refreshing the review. Changes require a deliberate editorial update.
 * This records performed collection checks, not an expert/FIPI or independent legal approval.
 */
export function contentReviewIssues(content, manifest) {
  if (manifest === undefined) {
    try { manifest = readContentReviewManifest(); }
    catch { return ["content review manifest: missing or invalid JSON"]; }
  }
  if (!manifest || manifest.schemaVersion !== 1 || manifest.algorithm !== "sha256-canonical-content-v1"
      || !Array.isArray(manifest.records)) return ["content review manifest: invalid schema"];
  const issues = [];
  const records = new Map();
  for (const record of manifest.records) {
    if (!record || !["task", "theory"].includes(record.kind) || typeof record.id !== "string"
        || !record.id.trim() || !/^[a-f0-9]{64}$/.test(record.contentSha256 ?? "")
        || !["legacy-collection-automated-checks", "foundation-automated-checks-and-independent-answer-review", "expansion-automated-checks"].includes(record.reviewScope)
        || !Array.isArray(record.evidence) || !record.evidence.length
        || !record.evidence.every((path) => typeof path === "string" && path.trim())) {
      issues.push("content review manifest: invalid record");
      continue;
    }
    const key = `${record.kind}:${record.id}`;
    if (records.has(key)) issues.push(`duplicate content review: ${key}`);
    records.set(key, record);
  }
  for (const [kind, materials] of [["task", content.tasks], ["theory", content.theoryTopics]]) {
    if (!Array.isArray(materials)) {
      issues.push(`content review: missing ${kind} collection`);
      continue;
    }
    for (const material of materials) {
      const key = `${kind}:${material?.id}`;
      const reviewed = records.get(key);
      if (!reviewed) {
        issues.push(`unreviewed content: ${key}`);
        continue;
      }
      try {
        if (contentFingerprint(material) !== reviewed.contentSha256) issues.push(`stale content review: ${key}`);
      } catch {
        issues.push(`invalid content for review: ${key}`);
      }
      const evidence = material.publication?.validation?.evidence;
      if (!Array.isArray(evidence) || canonical(evidence) !== canonical(reviewed.evidence)) {
        issues.push(`content review evidence mismatch: ${key}`);
      }
    }
  }
  return issues;
}
