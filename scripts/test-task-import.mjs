import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";
import { importTasks, structuralIssues } from "./import-tasks.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";
const { practiceBank } = createContentLoader()("src/lib/tasks.ts");
const base = practiceBank.find((t) => t.answerRule.type === "number");
function fixture(i) {
  const t = structuredClone(base);
  t.id = `intake-test-${i}`; t.publication.id = t.id;
  // Artificial load fixtures only, never real educational items or public content.
  t.prompt = `IMPORT TEST ONLY ${createHash("sha256").update(String(i)).digest("hex")}`;
  delete t.conditionLatex; delete t.resources;
  t.publication.releaseStatus = "draft";
  return t;
}
test("intake rejects malformed structures, formulas, media and unsupported mappings", () => {
  assert.deepEqual(structuralIssues(fixture(1)), []);
  for (const patch of [{ examNumber: 999 }, { answerRule: { type: "number", value: "no" } }, { conditionLatex: "\\invalidcommand" }, { solution: {} }, { solution: [] }, { images: ["missing.png"] }, { diagram: { type: "right-triangle", adjacent: -1, opposite: 2 } }]) {
    assert.ok(structuralIssues({ ...fixture(1), ...patch }).length);
  }
});
test("1000-row streaming/resume, duplicates, quarantine, changed inputs and retry are safe", async () => {
  const temp = mkdtempSync(resolve(tmpdir(), "tochka-import-test-"));
  const input = resolve(temp, "input.jsonl");
  const job = `test-${randomUUID()}`;
  const directory = resolve(projectRoot, ".content-staging", `import-${job}`);
  try {
    const rows = Array.from({ length: 1000 }, (_, i) => fixture(i));
    writeFileSync(input, rows.map((t) => JSON.stringify(t)).join("\n") + "\n" + JSON.stringify(rows[0]) + "\n{broken\n");
    const first = await importTasks({ input, job, maxBatches: 1 });
    assert.equal(first.lines, 200);
    const end = await importTasks({ input, job });
    assert.equal(end.counts.found, 1002);
    assert.equal(end.counts.review, 1000);
    assert.equal(end.counts.staged, 0);
    assert.equal(end.counts.duplicates, 1);
    assert.equal(end.counts.rejected, 1);
    const snapshot = readFileSync(resolve(directory, "checkpoint.json"), "utf8");
    const repeated = await importTasks({ input, job });
    assert.deepEqual(repeated.counts, end.counts);
    assert.equal(readFileSync(resolve(directory, "checkpoint.json"), "utf8"), snapshot);
    writeFileSync(input, "{}\n");
    await assert.rejects(importTasks({ input, job }), /changed/);
    assert.equal(readFileSync(resolve(directory, "checkpoint.json"), "utf8"), snapshot);
  } finally { rmSync(temp, { recursive: true }); rmSync(directory, { recursive: true, force: true }); }
});
test("existing and near-identical statements are held as duplicates; unknown rights never stage", async () => {
  const temp = mkdtempSync(resolve(tmpdir(), "tochka-import-test-"));
  const input = resolve(temp, "input.jsonl"), job = `test-${randomUUID()}`;
  const t = fixture(5); t.publication.provenance.sourceIds = ["unapproved-source"];
  const near = fixture(6); near.prompt = base.prompt + " ."; near.conditionLatex = base.conditionLatex; near.resources = base.resources;
  try {
    writeFileSync(input, [base, near, t].map((x) => JSON.stringify(x)).join("\n"));
    const result = await importTasks({ input, job });
    assert.equal(result.counts.duplicates, 2);
    assert.equal(result.counts.review, 1);
    assert.equal(result.counts.rightsAllowed, 0);
  } finally { rmSync(temp, { recursive: true }); rmSync(resolve(projectRoot, ".content-staging", `import-${job}`), { recursive: true, force: true }); }
});
test("staging requires an exact reviewed fingerprint, not an incoming verified label", async () => {
  const temp = mkdtempSync(resolve(tmpdir(), "tochka-import-test-"));
  const input = resolve(temp, "input.jsonl"), job = `test-${randomUUID()}`;
  const t = fixture(7000); t.publication.releaseStatus = "ready";
  const review = { id: t.id, sha256: contentFingerprint(t), method: "independent-computation", evidence: ["scripts/test-task-import.mjs"] };
  try {
    writeFileSync(input, JSON.stringify(t));
    const result = await importTasks({ input, job, reviews: [review] });
    assert.equal(result.counts.staged, 1);
    assert.equal(result.publication, "editorial-only");
    assert.equal(result.counts.rightsAllowed, 1);
    await assert.rejects(importTasks({ input, job, reviews: [{ ...review, sha256: "changed" }] }), /changed/);
  } finally { rmSync(temp, { recursive: true }); rmSync(resolve(projectRoot, ".content-staging", `import-${job}`), { recursive: true, force: true }); }
});
