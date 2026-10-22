import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { inspectMaterials, classifyPdfPages } from "./exam-materials.mjs";
import { reviewedDraftRequirements } from "./exam-source-review.mjs";

function directory() { return mkdtempSync(join(tmpdir(), "tochka-materials-test-")); }
function archiveFixture(path, members, corrupt = false) {
  const result = spawnSync("python3", ["-c", String.raw`
import json, sys, zipfile
r = json.load(sys.stdin)
with zipfile.ZipFile(r['path'], 'w', compression=zipfile.ZIP_STORED) as z:
    for member in r['members']: z.writestr(member['name'], member['text'])
if r['corrupt']:
    with open(r['path'], 'r+b') as f:
        data = f.read()
        at = data.index(b'unique fixture content')
        f.seek(at)
        f.write(b'BROKEN fixture content')
`], { input: JSON.stringify({ path, members, corrupt }), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

function originalPdf() {
  const lines = ["Original local mathematics sample for 2027. First page.", "Original second page for page-boundary verification."];
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [4 0 R 6 0 R] /Count 2 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (const [index, line] of lines.entries()) {
    const content = `BT /F1 12 Tf 50 750 Td (${line}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  let source = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(source.length);
    source += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const start = source.length;
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  source += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  return `${source}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
}

test("missing supplied archives stay distinct from separately reviewed web copies", () => {
  const result = inspectMaterials({ inputDirectories: [directory()] });
  assert.equal(result.actual_archive_count, 0);
  assert.equal(result.actual_pdf_count, 0);
  assert.equal(result.reviewed_pdf_count, 0);
  assert.equal(result.missing_archive_names.length, 6);
  assert.equal(result.complete, false);
  assert.ok(result.archives.every((archive) => archive.status === "missing"));
  assert.equal(result.supplemental_web_pdf_review_count, 4);
});

test("PDF title evidence detects Cyrillic draft, exam, page and conflicting year honestly", () => {
  const pages = ["ПРОЕКТ\nЕдиный государственный экзамен\nСпецификация\n2027 год\nпо МАТЕМАТИКЕ\nБазовый уровень", "Условия"];
  const result = classifyPdfPages(pages, { year: 2027, exam: "ЕГЭ" });
  assert.equal(result.document_status, "draft_detected");
  assert.equal(result.role_detected_from_title, "specification");
  assert.equal(result.exam_status, "expected_exam_detected");
  assert.equal(result.year_status, "expected_year_detected");
  assert.ok(result.evidence.every((entry) => entry.page === 1));
  const conflict = classifyPdfPages([pages[0].replace("2027", "2026")], { year: 2027, exam: "ЕГЭ" });
  assert.equal(conflict.year_status, "year_conflict_or_unconfirmed");
  const misleadingReference = classifyPdfPages([
    pages[0].replace("2027", "2026") + "\nИзменения по сравнению с 2027 годом.",
  ], { year: 2027, exam: "ЕГЭ" });
  assert.equal(misleadingReference.title_year, 2026);
  assert.equal(misleadingReference.year_status, "year_conflict_or_unconfirmed");
  const laterPage = classifyPdfPages([pages[0].replace("2027", "2026"), "Сравнение с 2027 годом"], { year: 2027, exam: "ЕГЭ" });
  assert.equal(laterPage.year_status, "year_conflict_or_unconfirmed");
});

test("archive inspection counts every PDF and refuses to mark invalid bytes readable", () => {
  const folder = directory();
  const path = join(folder, "ma_9_2025.zip");
  archiveFixture(path, [{ name: "folder/demo.PDF", text: "not a PDF" }, { name: "spec.pdf", text: "another invalid PDF" }, { name: "notice.txt", text: "not published" }]);
  const result = inspectMaterials({ archives: [path], scratchDirectory: join(folder, "scratch") });
  const archive = result.archives.find((entry) => entry.name === "ma_9_2025.zip");
  assert.equal(archive.crc_status, "passed");
  assert.equal(archive.actual_pdf_count, 2);
  assert.equal(archive.members.length, 3);
  assert.equal(archive.pdf_count_matches, false);
  assert.ok(archive.pdfs.every((pdf) => pdf.status === "invalid_pdf_header" && existsSync(pdf.local_path)));
  assert.equal(archive.sha256.length, 64);
  assert.equal(result.readable_pdf_count, 0);
  assert.equal(result.complete, false);
});

test("unsafe member paths are rejected before extraction", () => {
  const folder = directory();
  const path = join(folder, "ma_9_2027.zip");
  archiveFixture(path, [{ name: "../escaped.pdf", text: "not a PDF" }]);
  const result = inspectMaterials({ archives: [path], scratchDirectory: join(folder, "scratch") });
  const archive = result.archives.find((entry) => entry.name === "ma_9_2027.zip");
  assert.equal(archive.status, "invalid_or_unsafe");
  assert.match(archive.error, /Unsafe archive member/);
  assert.equal(archive.pdfs.length, 0);
  assert.equal(existsSync(join(folder, "scratch", "escaped.pdf")), false);
});

test("readable PDF extraction retains actual page count, complete text and duplicate hashes", () => {
  const folder = directory();
  const path = join(folder, "ma_9_2025.zip");
  archiveFixture(path, [{ name: "first.pdf", text: originalPdf() }, { name: "same-copy.pdf", text: originalPdf() }]);
  const result = inspectMaterials({ archives: [path], scratchDirectory: join(folder, "scratch") });
  const archive = result.archives.find((entry) => entry.name === "ma_9_2025.zip");
  assert.equal(archive.crc_status, "passed");
  assert.equal(archive.duplicate_pdf_hashes.length, 1);
  const pdf = archive.pdfs[0];
  assert.equal(pdf.status, "readable_needs_source_review");
  assert.equal(pdf.page_count, 2);
  const text = readFileSync(pdf.extracted_text_path, "utf8");
  assert.match(text, /First page/);
  assert.match(text, /second page/);
  assert.match(text, /\f/);
  assert.equal(pdf.source_reviewed, false);
  assert.equal(pdf.classification.exam_status, "exam_unconfirmed");
  assert.equal(pdf.classification.year_status, "year_conflict_or_unconfirmed");
  assert.equal(result.complete, false);
});

test("CRC mismatch prevents publication or counting the entry as an extracted PDF", () => {
  const folder = directory();
  const path = join(folder, "ma_11_2026.zip");
  archiveFixture(path, [{ name: "demo.pdf", text: "unique fixture content" }], true);
  const result = inspectMaterials({ archives: [path], scratchDirectory: join(folder, "scratch") });
  const archive = result.archives.find((entry) => entry.name === "ma_11_2026.zip");
  assert.equal(archive.status, "invalid_or_unsafe");
  assert.match(archive.error, /CRC/);
  assert.equal(archive.pdfs.length, 0);
  assert.equal(result.complete, false);
});

test("user-named duplicate is not counted as a seventh archive", () => {
  const folder = directory();
  for (const name of ["ma_9_2027.zip", "ma_9_2027(1).zip"]) archiveFixture(join(folder, name), []);
  const result = inspectMaterials({ inputDirectories: [folder], scratchDirectory: join(folder, "scratch") });
  assert.equal(result.actual_archive_count, 1);
  assert.equal(result.duplicate_archives.length, 1);
  assert.equal(result.archives.find((entry) => entry.name === "ma_9_2027.zip").alternate_duplicate_used, false);
});

test("draft matrix source rows cover every position with page references and correct totals", () => {
  for (const [id, count, primary, minutes] of [["oge-math", 25, 31, 235], ["ege-math-base", 21, 21, 180], ["ege-math-profile", 20, 33, 235]]) {
    const draft = reviewedDraftRequirements[id];
    assert.deepEqual(draft.numbers.map((entry) => entry.number), Array.from({ length: count }, (_, index) => index + 1));
    assert.equal(draft.numbers.reduce((sum, entry) => sum + entry.max_primary_score, 0), primary);
    assert.equal(draft.maximum_primary_score, primary);
    assert.equal(draft.duration_minutes, minutes);
    assert.ok(draft.numbers.every((entry) => entry.source_references.every((reference) => reference.physical_page > 0 && reference.printed_page > 0 && reference.source_url.endsWith(".pdf"))));
    assert.ok(draft.numbers.every((entry) => entry.scoring_criteria === null));
    assert.equal(draft.task_specific_demo_criteria_reviewed, false);
    assert.equal(draft.document_status, "draft_not_final_approved");
  }
  const profile = reviewedDraftRequirements["ege-math-profile"];
  assert.equal(profile.numbers.filter((entry) => entry.part === 1).length, 13);
  assert.equal(profile.source_conflicts[0].status, "unresolved_internal_inconsistency_in_independent_copy");
  const input = JSON.parse(readFileSync(new URL("../docs/materials-inventory.json", import.meta.url), "utf8"));
  assert.equal(input.target_year, 2027);
});
