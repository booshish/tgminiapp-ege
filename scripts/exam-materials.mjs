#!/usr/bin/env node
/** Inspect supplied source documents locally. Never copies them to a public directory. */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reviewedChanges, reviewedDraftRequirements, supplementalSourceReviews } from "./exam-source-review.mjs";

export const expectedArchives = [2025, 2026, 2027].flatMap((year) => [
  { name: `ma_9_${year}.zip`, exam: "ОГЭ", year, expected_pdf_count: 3 },
  { name: `ma_11_${year}.zip`, exam: "ЕГЭ", year, expected_pdf_count: 5 },
]);
const root = fileURLToPath(new URL("../", import.meta.url));
const maxArchiveBytes = 128 * 1024 * 1024;
const skipDirectories = new Set([".git", ".next", "node_modules", "out", "dist"]);

function scan(directory, output = [], depth = 0) {
  if (depth > 8 || !existsSync(directory)) return output;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (output.length > 10000) throw new Error("Archive discovery exceeded 10,000 files");
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !skipDirectories.has(entry.name)) scan(path, output, depth + 1);
    else if (entry.isFile() && /\.zip$/i.test(entry.name)) output.push(resolve(path));
  }
  return output;
}

/** Results are title evidence, never proof of authenticity or a final approved standard. */
export function classifyPdfPages(pages, expected) {
  const evidence = [];
  const titlePages = pages.slice(0, 3);
  const detect = (field, expression) => {
    for (let index = 0; index < titlePages.length; index += 1) {
      const normalized = titlePages[index].replace(/\s+/g, " ");
      const match = expression.exec(normalized);
      if (match) {
        evidence.push({ field, page: index + 1, excerpt: normalized.slice(Math.max(0, match.index - 65), match.index + match[0].length + 100).trim() });
        return true;
      }
    }
    return false;
  };
  const yearPresent = detect("year", new RegExp(`\\b${expected.year}\\b`));
  const oge = detect("exam_oge", /основно[йг].{0,35}государственн.{0,25}экзамен|ОГЭ/iu);
  const ege = detect("exam_ege", /един.{0,20}государственн.{0,25}экзамен|ЕГЭ/iu);
  const mathematics = detect("subject_math", /математик/iu);
  const demo = detect("role_demo", /демонстрационн.{0,25}вариант|демоверси/iu);
  const specification = detect("role_specification", /спецификаци/iu);
  const codifier = detect("role_codifier", /кодификатор/iu);
  const base = detect("level_base", /базов.{0,20}уров/iu);
  const profile = detect("level_profile", /профильн.{0,20}уров/iu);
  const draft = detect("draft", /(?:^|\s)проект(?:\s|$)/iu);
  const firstPage = (pages[0] ?? "").replace(/\s+/g, " ");
  const primaryRoles = [["demo", /демонстрационн.{0,25}вариант|демоверси/iu], ["specification", /спецификаци/iu], ["codifier", /кодификатор/iu]]
    .map(([role, expression]) => ({ role, index: firstPage.search(expression) })).filter((entry) => entry.index >= 0)
    .sort((left, right) => left.index - right.index);
  const firstPageYears = [...new Set((titlePages[0] ?? "").match(/\b20(?:2[0-9]|3[0-9])\b/g) ?? [])].map(Number);
  // A reference to last year's exam or a legal date cannot override the title year.
  const declaredYear = Number(firstPage.match(/(?:проведения\s+в\s+|КИМ\s+(?:ЕГЭ|ОГЭ)\s+)(20[23]\d)/iu)?.[1]) || firstPageYears[0] || null;
  const roles = [demo && "demo", specification && "specification", codifier && "codifier"].filter(Boolean);
  const exam = oge && !ege ? "ОГЭ" : ege && !oge ? "ЕГЭ" : null;
  return {
    year_status: yearPresent && declaredYear === expected.year ? "expected_year_detected" : declaredYear !== null ? "year_conflict_or_unconfirmed" : "year_not_detected",
    title_year: declaredYear,
    first_page_years: firstPageYears,
    exam_detected: exam,
    exam_status: exam === expected.exam ? "expected_exam_detected" : exam ? "exam_conflict" : "exam_unconfirmed",
    subject_math_detected: mathematics,
    role_candidates: roles,
    role_detected_from_title: primaryRoles[0]?.role ?? null,
    level_candidates: [base && "base", profile && "profile"].filter(Boolean),
    document_status: draft ? "draft_detected" : "approval_not_established",
    needs_human_review: true,
    evidence,
  };
}

const zipInspector = String.raw`
import hashlib, json, os, pathlib, stat, sys, zipfile
request = json.load(sys.stdin)
result = {'members': [], 'pdfs': [], 'crc_status': 'not_checked'}
try:
    with zipfile.ZipFile(request['archive']) as archive:
        members = archive.infolist()
        if len(members) > 1000: raise ValueError('Archive has more than 1000 members')
        total = 0
        names = set()
        for member in members:
            raw = member.filename.replace(chr(92), '/')
            path = pathlib.PurePosixPath(raw)
            if path.is_absolute() or '..' in path.parts or ':' in raw or chr(0) in raw:
                raise ValueError('Unsafe archive member path: ' + member.filename)
            if raw.casefold() in names: raise ValueError('Duplicate archive member name: ' + member.filename)
            names.add(raw.casefold())
            if stat.S_ISLNK(member.external_attr >> 16): raise ValueError('Symbolic links are not allowed')
            if member.flag_bits & 1: raise ValueError('Encrypted archive members cannot be inspected')
            if member.file_size > 32 * 1024 * 1024: raise ValueError('Member exceeds 32 MiB extraction cap')
            total += member.file_size
            if total > 128 * 1024 * 1024: raise ValueError('Archive exceeds 128 MiB extraction cap')
            result['members'].append({'name': member.filename, 'size_bytes': member.file_size,
                'compressed_bytes': member.compress_size, 'crc32': '%08x' % member.CRC,
                'is_directory': member.is_dir(), 'is_pdf': not member.is_dir() and raw.lower().endswith('.pdf')})
        broken = archive.testzip()
        if broken is not None: raise ValueError('CRC mismatch: ' + broken)
        result['crc_status'] = 'passed'
        for index, member in enumerate(members):
            if member.is_dir() or not member.filename.lower().endswith('.pdf'): continue
            content = archive.read(member)
            digest = hashlib.sha256(content).hexdigest()
            filename = '%03d-%s.pdf' % (index + 1, digest[:16])
            destination = os.path.join(request['output_directory'], filename)
            with open(destination, 'xb') as output: output.write(content)
            result['pdfs'].append({'member_name': member.filename, 'local_path': destination,
                'sha256': digest, 'size_bytes': len(content), 'pdf_header_valid': content.startswith(b'%PDF-')})
        result['status'] = 'inspected'
except Exception as error:
    result['status'] = 'invalid_or_unsafe'
    result['error'] = str(error)
print(json.dumps(result, ensure_ascii=False))
`;

function inspectPdf(pdf, expected) {
  if (!pdf.pdf_header_valid) return { ...pdf, status: "invalid_pdf_header", page_count: null, source_reviewed: false };
  const info = spawnSync("pdfinfo", [pdf.local_path], { encoding: "utf8", timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  const text = spawnSync("pdftotext", ["-layout", "-enc", "UTF-8", pdf.local_path, "-"], { encoding: "utf8", timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  const pageCount = Number(info.stdout?.match(/^Pages:\s*(\d+)/m)?.[1]) || null;
  const failures = [];
  if (info.error || info.status !== 0) failures.push({ tool: "pdfinfo", error: info.error?.message ?? info.stderr?.slice(0, 1000) ?? `exit ${info.status}` });
  if (text.error || text.status !== 0) failures.push({ tool: "pdftotext", error: text.error?.message ?? text.stderr?.slice(0, 1000) ?? `exit ${text.status}` });
  const plain = text.status === 0 ? text.stdout : "";
  const pages = plain.split("\f");
  if (pages.at(-1)?.trim() === "") pages.pop();
  const readable = failures.length === 0 && plain.trim().length > 30 && pageCount !== null;
  let textPath = null;
  if (readable) {
    textPath = pdf.local_path.replace(/\.pdf$/i, ".txt");
    writeFileSync(textPath, plain, { flag: "wx", mode: 0o600 });
  }
  return {
    ...pdf,
    status: readable ? "readable_needs_source_review" : failures.length ? "unreadable" : "text_missing_ocr_required",
    page_count: pageCount,
    extracted_text_path: textPath,
    source_reviewed: false,
    failures,
    classification: readable ? classifyPdfPages(pages, expected) : null,
  };
}

export function inspectMaterials({ inputDirectories = [], archives = [], scratchDirectory = "/workspace/scratch/exam-materials" } = {}) {
  const discovered = [...new Set([...archives.map((path) => resolve(path)), ...inputDirectories.flatMap((directory) => scan(resolve(directory)))])];
  const expectedNames = new Set(expectedArchives.map((entry) => entry.name));
  const duplicates = discovered.filter((path) => /^ma_9_2027\(1\)\.zip$/i.test(basename(path)));
  const extra = discovered.filter((path) => !expectedNames.has(basename(path)) && !duplicates.includes(path));
  const reports = expectedArchives.map((expected) => {
    const matches = discovered.filter((path) => basename(path) === expected.name && existsSync(path));
    // A duplicate is acceptable only when canonical ma_9_2027.zip is absent; flag that substitution explicitly.
    const alternate = expected.name === "ma_9_2027.zip" && matches.length === 0 ? duplicates[0] : undefined;
    const archivePath = matches[0] ?? alternate;
    if (!archivePath) return { ...expected, status: "missing", crc_status: "not_checked", pdfs: [], source_reviewed: false };
    const basic = { ...expected, local_path: archivePath, alternate_duplicate_used: Boolean(alternate), additional_matching_paths: matches.slice(1), source_reviewed: false };
    const size = statSync(archivePath).size;
    if (size > maxArchiveBytes) return { ...basic, status: "invalid_or_unsafe", error: "Archive exceeds 128 MiB input cap", crc_status: "not_checked", pdfs: [] };
    const absoluteScratch = resolve(scratchDirectory);
    if (/(?:^|\/)(?:public|dist|out)(?:\/|$)/.test(absoluteScratch)) throw new Error("Source PDFs must not be extracted into public/dist/out directories");
    mkdirSync(absoluteScratch, { recursive: true, mode: 0o700 });
    const extractionDirectory = mkdtempSync(join(absoluteScratch, `${expected.name.replace(/\.zip$/, "")}-`));
    const inspect = spawnSync("python3", ["-c", zipInspector], {
      input: JSON.stringify({ archive: archivePath, output_directory: extractionDirectory }),
      encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024,
    });
    const hash = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
    if (inspect.error || inspect.status !== 0) return { ...basic, status: "inspection_failed", sha256: hash, crc_status: "not_checked", pdfs: [], error: inspect.error?.message ?? inspect.stderr?.slice(0, 2000) ?? `exit ${inspect.status}` };
    let result;
    try { result = JSON.parse(inspect.stdout); }
    catch { return { ...basic, status: "inspection_failed", sha256: hash, crc_status: "not_checked", pdfs: [], error: "Archive inspector did not return JSON" }; }
    const pdfs = (result.pdfs ?? []).map((pdf) => inspectPdf(pdf, expected));
    const expectedSlots = expected.exam === "ОГЭ" ? ["demo", "specification", "codifier"] : ["demo-base", "demo-profile", "specification-base", "specification-profile", "codifier"];
    const documentSlots = pdfs.map((pdf) => {
      const role = pdf.classification?.role_detected_from_title;
      const levels = pdf.classification?.level_candidates ?? [];
      const slot = !role ? null : expected.exam === "ОГЭ" || role === "codifier" ? role : levels.length === 1 ? `${role}-${levels[0]}` : null;
      return { member_name: pdf.member_name, slot, status: slot ? "title_evidence_only" : "manual_classification_required" };
    });
    const duplicatePdfHashes = [...new Set(pdfs.map((pdf) => pdf.sha256))].filter((hash) => pdfs.filter((pdf) => pdf.sha256 === hash).length > 1);
    return { ...basic, ...result, pdfs, sha256: hash, size_bytes: size, actual_pdf_count: pdfs.length,
      pdf_count_matches: pdfs.length === expected.expected_pdf_count,
      expected_document_slots: expectedSlots, detected_document_slots: documentSlots,
      document_set_complete: expectedSlots.every((slot) => documentSlots.filter((document) => document.slot === slot).length === 1),
      duplicate_pdf_hashes: duplicatePdfHashes,
      extraction_directory: extractionDirectory,
      requirement_review_status: "not_reviewed",
    };
  });
  const found = reports.filter((archive) => archive.status !== "missing");
  const pdfs = reports.flatMap((archive) => archive.pdfs);
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    target_year: 2027,
    expected_archive_count: 6,
    expected_pdf_count: 24,
    actual_archive_count: found.length,
    actual_pdf_count: pdfs.length,
    readable_pdf_count: pdfs.filter((pdf) => pdf.status === "readable_needs_source_review").length,
    reviewed_pdf_count: 0,
    supplemental_web_pdf_reviews: supplementalSourceReviews,
    supplemental_web_pdf_review_count: supplementalSourceReviews.length,
    input_directories: inputDirectories.map((directory) => resolve(directory)),
    archives: reports,
    duplicate_archives: duplicates.map((path) => ({ local_path: path, canonical_name: "ma_9_2027.zip", status: "duplicate_named_by_user_not_counted_separately" })),
    unrecognized_archives: extra,
    missing_archive_names: reports.filter((archive) => archive.status === "missing").map((archive) => archive.name),
    complete: reports.every((archive) => archive.status === "inspected" && archive.pdf_count_matches && archive.document_set_complete && archive.duplicate_pdf_hashes.length === 0 && archive.pdfs.every((pdf) => pdf.status === "readable_needs_source_review" && pdf.classification?.year_status === "expected_year_detected" && pdf.classification?.exam_status === "expected_exam_detected")),
    limitations: [
      "No document is treated as read or approved merely because its archive name mentions an exam and year.",
      "PDF extraction and title classification do not establish authenticity, final approval, publication rights, or a completed specification review.",
      "Source PDFs and extracted complete text remain local scratch artifacts; they are not app content or deployment assets.",
    ],
  };
}

async function buildRequirements(inventory) {
  const { createContentLoader } = await import("./content-source-loader.mjs");
  const load = createContentLoader();
  const { examDefinitions } = load("src/lib/exams.ts");
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    target_year: 2027,
    status: "partial_draft_spec_review_complete_archive_and_codifier_review_blocked",
    source_inventory: "docs/materials-inventory.json",
    reviewed_pdf_count: inventory.reviewed_pdf_count,
    supplemental_source_reviews: supplementalSourceReviews,
    official_change_comparison_2025_2026_2027: { status: "partial_independent_copies_only", full_archive_comparison_complete: false },
    exams: examDefinitions.map((definition) => ({
      id: definition.id,
      exam: definition.examType,
      subject: definition.subjectId,
      level: definition.level,
      target_year: 2027,
      official_target_requirements: reviewedDraftRequirements[definition.id] ?? {
        verification_status: "not_verified",
        document_status: "unknown_not_read",
        number_count: null,
        parts: null,
        duration_minutes: null,
        maximum_primary_score: null,
        permitted_materials: null,
        scoring_criteria: null,
        rules: null,
        source_references: [],
      },
      current_project_configuration: {
        year: definition.year,
        version_id: definition.versionId,
        available: definition.available,
        title: definition.title,
        number_count: definition.numbers.length,
        maximum_primary_score: definition.numbers.every((number) => number.maxPrimaryScore !== null)
          ? definition.numbers.reduce((sum, number) => sum + number.maxPrimaryScore, 0) : null,
        verification_status: "project_configuration_not_source_verified",
        source_file: "src/lib/exams.ts",
        scoring_source_file: "src/lib/exam-scores.ts",
        numbers: definition.numbers.map((number) => ({
          number: number.number, part: number.part, title: number.title,
          answer_format: number.answerFormat, max_primary_score: number.maxPrimaryScore,
          scoring_status: number.scoringStatus,
        })),
      },
      number_mapping_review: definition.numbers.map((number) => ({
        current_project_number: number.number,
        official_target_number: null,
        official_target_part: null,
        official_target_content: null,
        official_target_topics: null,
        official_target_answer_type: null,
        official_target_max_primary_score: null,
        official_target_scoring_criteria: null,
        source_pdf: null,
        source_page: null,
        status: "task_level_migration_not_reviewed_see_separate_draft_target_numbers",
      })),
      reviewed_changes: reviewedChanges[definition.id] ?? [],
      historical_comparison: [2025, 2026].map((year) => ({ year, status: "source_missing_not_reviewed", differences: null, source_references: [] })),
    })),
    next_step: "Provide the six named ZIP files, verify canonical PDF identity, review all demo-specific criteria and complete codifiers, resolve the profile draft difficulty conflict, compare 2025–2026 documents and plan versioned content migration. The independently read 2027 draft copies are not final approved standards.",
  };
}

function saveJson(path, value) {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  const inputDirectories = [];
  const archives = [];
  let output = resolve(root, "docs/materials-inventory.json");
  let matrix;
  let check = false;
  let scratchDirectory;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (["--input-dir", "--output", "--matrix", "--scratch"].includes(arg)) {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      if (arg === "--input-dir") inputDirectories.push(value);
      else if (arg === "--output") output = value;
      else if (arg === "--matrix") matrix = value;
      else scratchDirectory = value;
    } else if (arg === "--check") check = true;
    else if (arg === "--help") {
      console.log("node scripts/exam-materials.mjs [--input-dir DIR] [archive.zip ...] [--output JSON] [--matrix JSON] [--scratch DIR] [--check]\n--check exits 1 if any archive/PDF is missing, damaged or not classified. --matrix snapshots current project config separately from unresolved 2027 requirements. Source artifacts stay local.");
      return;
    } else if (arg.startsWith("--")) throw new Error(`Unknown argument: ${arg}`);
    else archives.push(arg);
  }
  if (inputDirectories.length === 0 && archives.length === 0) inputDirectories.push("/workspace/library-files", "/workspace/shared/downloads", root);
  for (const path of archives) if (!existsSync(path)) throw new Error(`Archive not found: ${path}`);
  const inventory = inspectMaterials({ inputDirectories, archives, scratchDirectory });
  saveJson(output, inventory);
  if (matrix) saveJson(matrix, await buildRequirements(inventory));
  console.log(`Archives ${inventory.actual_archive_count}/6; attached PDFs ${inventory.actual_pdf_count}/24; readable ${inventory.readable_pdf_count}; reviewed attached PDFs ${inventory.reviewed_pdf_count}; separately reviewed web PDF copies ${inventory.supplemental_web_pdf_review_count}. Report: ${resolve(output)}`);
  if (inventory.missing_archive_names.length) console.log(`Missing: ${inventory.missing_archive_names.join(", ")}`);
  if (check && !inventory.complete) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
