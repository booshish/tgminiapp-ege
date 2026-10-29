import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { entries } from "./original-informatics-pilot.mjs";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";
import { importTasks, assertTaskExpansionAllowed } from "./import-tasks.mjs";

// Independent executable checks: enumerate logical domains and graph paths,
// interpret commands/loops, accumulate positional values rather than trust answer strings.
export function compute(check) {
  switch (check.kind) {
    case "bits": return check.symbols * check.bits / 8;
    case "symbols": return check.bytes * 8 / check.bits;
    case "min-logic": return Array.from({ length: 201 }, (_, i) => i - 100).find((x) => !(x < 23) && x <= 27);
    case "max-logic": return Math.max(...Array.from({ length: 201 }, (_, i) => i - 100).filter((x) => x <= 80 && x % 4 !== 0));
    case "executor": return [...check.program].reduce((x, op) => op === "1" ? x + check.add : x * check.multiply, check.initial);
    case "inverse-executor": return Array.from({ length: 100 }, (_, x) => x).find((x) => x * 2 + 5 + 5 === 54);
    case "sum-loop": { let s = 4; for (let i = 1; i <= 4; i++) s += 2 * i; return s; }
    case "while-loop": { let a = 50, k = 0; while (a > 10) { a -= 7; k++; } return k; }
    case "paths": {
      const visit = (node, seen) => node === "Ж" ? Number(!check.via || seen.includes(check.via)) : check.edges.filter(([a]) => a === node).reduce((n, [, b]) => n + visit(b, [...seen, b]), 0);
      return visit("А", ["А"]);
    }
    case "base": return [...check.digits].reduce((n, digit) => n * check.radix + Number(digit), 0);
    default: throw Error("Unknown independent check");
  }
}

export async function releasePilot(options = {}) {
  const load = createContentLoader(), { practiceBank } = load("src/lib/tasks.ts");
  const tasks = options.tasks ?? entries.map(([number, prompt, answer, explanation, check], i) => {
    assert.equal(String(compute(check)), answer);
    const model = practiceBank.find((t) => t.subjectId === "informatics" && t.examType[0] === "ОГЭ" && t.examNumber === number);
    assert.ok(model, `Reviewed model missing: ${number}`);
    const task = structuredClone(model);
    task.id = `oge-informatics-pilot-20261026-${String(i + 1).padStart(2, "0")}`;
    task.prompt = prompt; task.answerDisplay = answer; task.answerRule = { type: "number", value: answer };
    task.solution = [{ text: explanation }];
    task.provenance.creation_method = "original-individual-task";
    task.publication = {
      id: task.id, releaseStatus: "ready",
      provenance: { sourceIds: ["tochka-project-original"], authorship: "project-original", sourceFiles: ["scripts/original-informatics-pilot.mjs"], attribution: ["Авторский материал проекта «Точка»"], structuralReferenceIds: ["fipi-oge-structure"] },
      validation: { status: "automated-reviewed", checkedAt: "2026-10-26", evidence: ["scripts/release-task-pilot.mjs", "docs/pilot-task-review.json"] },
    };
    return task;
  });
  tasks.forEach(assertTaskExpansionAllowed); // Before reviews, input files or publication writes, including resume.
  const batchId = options.batchId ?? "original-informatics-20261026";
  if (!/^[a-z0-9-]+$/.test(batchId)) throw Error("Invalid batch ID");
  if (options.verify) tasks.forEach(options.verify);
  const reviews = tasks.map((t) => ({ id: t.id, sha256: contentFingerprint(t), method: options.reviewMethod ?? "independent-computation", evidence: options.evidence ?? ["scripts/release-task-pilot.mjs", "scripts/original-informatics-pilot.mjs"] }));
  const dir = resolve(projectRoot, ".content-staging/pilot-input"); mkdirSync(dir, { recursive: true });
  const input = resolve(dir, `${batchId}.jsonl`); writeFileSync(input, tasks.map((t) => JSON.stringify(t)).join("\n") + "\n");
  writeFileSync(resolve(projectRoot, options.reviewFile ?? "docs/pilot-task-review.json"), JSON.stringify({ date: options.reviewedAt ?? "2026-10-26", kind: "original-training-not-official-exam", reviews }, null, 2) + "\n");
  const result = await importTasks({ input, job: batchId, reviews, batchSize: options.batchSize ?? 200 });
  assert.equal(result.counts.staged + (options.allowDuplicates ? result.counts.duplicates : 0), tasks.length);
  assert.equal(result.counts.rejected, 0); assert.equal(result.counts.review, 0);
  if (!options.allowDuplicates) assert.equal(result.counts.duplicates, 0);
  const records = Array.from({ length: result.batches }, (_, n) => JSON.parse(readFileSync(`${result.directory}/batch-${n}.json`, "utf8"))).flat();
  const approved = records.filter((r) => r.status === "staged").map((r) => r.task);
  assert.equal(approved.length, result.counts.staged);
  const groups = Map.groupBy(approved, (t) => `${t.examVersionId}-n${t.examNumber}`);
  const shards = [...load("src/lib/task-package-index.ts").taskPackageIndex];
  const output = resolve(projectRoot, "public/task-packages"); mkdirSync(output, { recursive: true });
  for (const [number, items] of groups) {
    const body = JSON.stringify(items), sha256 = createHash("sha256").update(body).digest("hex");
    const prior = shards.find(s => s.tasks.some(t => items.some(i => i.id === t.id)));
    if (prior) {
      assert.equal(prior.sha256,sha256,"Published IDs are immutable; use a new batch/ID");
      continue;
    }
    const file = `${number}-${sha256.slice(0, 16)}.json`;
    if (existsSync(resolve(output, file))) assert.equal(readFileSync(resolve(output, file), "utf8"), body);
    else writeFileSync(resolve(output, file), body);
    shards.push({ file, sha256, tasks: items.map(({ id, subjectId, examType, level, examNumber, topicId, prototypeId, examVersionId, examYear }) => ({ id, subjectId, examType, level, examNumber, topicId, prototypeId, examVersionId, examYear })) });
  }
  writeFileSync(resolve(projectRoot, "src/lib/task-package-index.ts"), `// Generated by release-task-pilot.mjs; metadata only, no conditions or answers.\nimport type { Task } from "./tasks";\nexport const taskPackageIndex: {file: string; sha256: string; tasks: (Pick<Task, "id" | "subjectId" | "examType" | "level" | "examNumber" | "topicId" | "prototypeId"> & Partial<Pick<Task, "examYear" | "examVersionId">>)[]}[] = ${JSON.stringify(shards, null, 2)};\n`);
  console.log(JSON.stringify({ ...result.counts, publicTasks: approved.length, shards: shards.length }));
  return { ...result, approvedIds: approved.map(t => t.id) };
}
if (process.argv[1]?.endsWith("release-task-pilot.mjs")) await releasePilot();
