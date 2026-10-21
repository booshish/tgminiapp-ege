import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";

const load = createContentLoader();
const { examVerificationRecords, validateVerifiedExamManifest, isOfficialEvidencePath } = load("src/lib/exam-verification.ts");

/** Checks bytes and recorded review evidence only; it cannot certify what a PDF says. */
export function inspectLocalOfficialEvidence(manifest, root = projectRoot) {
  const issues = [];
  const allowedRoot = resolve(root, "docs/official");
  function localEvidence(path) {
    if (!isOfficialEvidencePath(path)) { issues.push("invalid-local-evidence-path"); return null; }
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) { issues.push(`local-evidence-missing:${path}`); return null; }
    const actual = realpathSync(absolute);
    const distance = relative(allowedRoot, actual);
    if (distance.startsWith("..") || distance.startsWith("/") || !statSync(actual).isFile()) { issues.push(`evidence-outside-review-directory:${path}`); return null; }
    const size = statSync(actual).size;
    if (size === 0 || size > 50 * 1024 * 1024) { issues.push(`invalid-evidence-size:${path}`); return null; }
    return readFileSync(actual);
  }
  for (const document of manifest.documents) {
    const bytes = localEvidence(document.evidencePath);
    if (bytes && createHash("sha256").update(bytes).digest("hex") !== document.sha256) issues.push(`document-sha256-mismatch:${document.id}`);
  }
  const review = localEvidence(manifest.manualReview.evidencePath);
  if (review && review.toString("utf8").trim().length < 40) issues.push("manual-review-evidence-too-short");
  return issues;
}

export function inspectExamReleases(records = examVerificationRecords, root = projectRoot) {
  if (!Array.isArray(records) || !records.length) throw new Error("Нужен непустой список экзаменационных манифестов.");
  const ids = new Set();
  const exams = records.map((record) => {
    const result = validateVerifiedExamManifest(record);
    const issues = [...result.issues];
    const id = record && typeof record === "object" ? record.examVersionId : null;
    if (ids.has(id)) issues.push("duplicate-exam-version");
    ids.add(id);
    if (result.manifest) issues.push(...inspectLocalOfficialEvidence(result.manifest, root));
    return {
      examVersionId: id,
      status: issues.length ? "blocked" : "editorial-evidence-complete",
      issues,
      officialNumberCount: result.manifest && !issues.length ? result.manifest.officialNumbers.length : null,
      officialDurationMinutes: result.manifest && !issues.length ? result.manifest.officialDurationMinutes : null,
      officialMaximum: result.manifest && !issues.length ? result.manifest.totalMaxPrimaryScore : null,
      missingDocuments: record?.missingDocuments ?? [],
    };
  });
  const expected = examVerificationRecords.map((record) => record.examVersionId);
  const missingExams = expected.filter((id) => !exams.some((exam) => exam.examVersionId === id));
  return {
    schemaVersion: 1,
    meaning: "Проверка записанной редакционной сверки и контрольных сумм. Не автоматическое подтверждение содержания PDF и не разрешение перепубликовать чужие материалы.",
    fullMathematicsReleaseReady: missingExams.length === 0 && exams.length === expected.length && exams.every((exam) => exam.status === "editorial-evidence-complete"),
    missingExams,
    exams,
  };
}

function main() {
  const args = process.argv.slice(2);
  const value = (flag) => {
    const index = args.indexOf(flag);
    if (index < 0) return undefined;
    if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`После ${flag} нужен путь файла.`);
    return args[index + 1];
  };
  const manifestPath = value("--manifest");
  let records;
  if (manifestPath) {
    const file = resolve(projectRoot, manifestPath);
    if (relative(projectRoot, file).startsWith("..") || statSync(file).size > 1024 * 1024) throw new Error("Манифест должен быть JSON-файлом проекта размером до 1 МБ.");
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    records = Array.isArray(parsed) ? parsed : [parsed];
  }
  const report = inspectExamReleases(records);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const reportPath = value("--report");
  if (reportPath) {
    const destination = resolve(projectRoot, reportPath);
    if (relative(projectRoot, destination).startsWith("..")) throw new Error("Отчёт должен оставаться внутри проекта.");
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, json);
  }
  process.stdout.write(json);
  // A blocked release is expected until the actual documents are supplied; ordinary demo builds do not invoke this gate.
  if (!report.fullMathematicsReleaseReady) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
