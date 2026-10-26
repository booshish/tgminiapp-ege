import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, rmdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import katex from "katex";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";
import { contentFingerprint } from "./content-review-evidence.mjs";

const load = createContentLoader();
const { practiceBank } = load("src/lib/tasks.ts");
const { getPublicationDecision } = load("src/lib/content-publication.ts");
const { sourceRegistry } = load("src/lib/source-registry.ts");
const { getExamDefinition } = load("src/lib/exams.ts");
const hash = (s) => createHash("sha256").update(s).digest("hex");
const text = (s) => typeof s === "string" && Boolean(s.trim());
const normalized = (t) => `${t.prompt ?? ""} ${t.conditionLatex ?? ""} ${JSON.stringify(t.resources ?? [])}`.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const tokens = (s) => new Set(s.split(" "));
const similar = (a, b) => {
  const x = tokens(a), y = tokens(b);
  const intersection = [...x].filter((v) => y.has(v)).length;
  return intersection / (x.size + y.size - intersection) >= .9;
};
const atomic = (path, value) => {
  writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2) + "\n");
  renameSync(`${path}.tmp`, path);
};

/** Uses known, already mapped task metadata; never guesses new exam numbers. */
export function structuralIssues(t, corpus = practiceBank) {
  if (!t || typeof t !== "object" || Array.isArray(t)) return ["not-object"];
  const errors = [];
  for (const key of ["id", "title", "prompt", "answerDisplay", "topicId", "prototypeId", "examVersionId"]) if (!text(t[key])) errors.push(`missing:${key}`);
  if (!/^[a-z0-9-]+$/.test(t.id ?? "")) errors.push("invalid-id");
  let model = corpus.find((m) => m.subjectId === t.subjectId && JSON.stringify(m.examType) === JSON.stringify(t.examType) &&
    m.level === t.level && m.examNumber === t.examNumber && m.examVersionId === t.examVersionId && m.examYear === t.examYear &&
    m.part === t.part && m.topicId === t.topicId && m.prototypeId === t.prototypeId);
  // A newly reviewed subject need not have a fake seed Task to bootstrap import.
  // Only an explicit trusted numbered contract in the exam registry may do so.
  const definition = getExamDefinition({examType:t.examType?.[0],subjectId:t.subjectId,level:t.level});
  const slot = definition?.numbers.find(n=>n.number===t.examNumber);
  if (!model && definition?.available && definition.verificationStatus==="draft-source-reviewed" && slot?.practiceAnswerFormat &&
      Array.isArray(t.examType) && t.examType.length===1 && t.examVersionId===definition.versionId && t.examYear===definition.year && t.part===slot.part &&
      t.topicId===`${definition.id}-n${slot.number}` && t.prototypeId===`${definition.id}-n${slot.number}-original` &&
      slot.answerRuleTypes?.includes(t.answerRule?.type)) {
    model={answerFormat:slot.practiceAnswerFormat,scoring:{status:"pending-official-verification",maxPrimaryScore:slot.maxPrimaryScore}};
  }
  if (!model) errors.push("unknown-exam-mapping");
  if (!Array.isArray(t.solution) || !t.solution.length || t.solution.some((s) => !text(s?.text))) errors.push("missing-solution");
  if (!t.source || !t.provenance || !t.publication || t.publication.id !== t.id || !t.publication.provenance) errors.push("missing-provenance");
  if (!model || JSON.stringify(t.scoring) !== JSON.stringify(model.scoring)) errors.push("unverified-scoring");
  const rule = t.answerRule;
  const valid = rule && ({
    number: () => t.answerFormat === "number" && (/^-?\d+(?:[.,]\d+)?$/.test(rule.value ?? "") || (/^-?\d+\/\d+$/.test(rule.value ?? "") && Number(rule.value.split("/")[1]) !== 0)),
    text: () => t.answerFormat === "text" && text(rule.value),
    set: () => t.answerFormat === "set" && Array.isArray(rule.values) && rule.values.length && rule.values.every(text),
    choices: () => t.answerFormat === "text" && /^\d+$/.test(rule.value ?? "") && typeof rule.ordered === "boolean",
    self: () => t.answerFormat === "extended" && Array.isArray(t.selfCheckNotes) && t.selfCheckNotes.length && t.selfCheckNotes.every(text),
  })[rule.type]?.();
  if (!valid) errors.push("invalid-answer-format");
  if (model && model.answerFormat !== t.answerFormat) errors.push("model-answer-format-mismatch");
  for (const formula of [t.conditionLatex, ...(Array.isArray(t.solution) ? t.solution : []).map((s) => s?.latex)].filter(Boolean)) {
    try { katex.renderToString(formula, { throwOnError: true, trust: false }); } catch { errors.push("invalid-latex"); }
  }
  if (t.resources !== undefined && (!Array.isArray(t.resources) || t.resources.some((r) => !text(r?.name) || !text(r?.content)))) errors.push("invalid-resource");
  // Current renderer supports textual resources and its own typed diagram only.
  if (t.images || t.audio || t.attachments || /<\/?[a-z]|!\[|https?:\/\/\S+\.(png|jpg|svg|mp3)/i.test(t.prompt ?? "")) errors.push("unsupported-media-needs-review");
  if (t.diagram && (t.diagram.type !== "right-triangle" || ![t.diagram.adjacent, t.diagram.opposite].every((v) => typeof v === "number" && v > 0 && Number.isFinite(v)))) errors.push("invalid-diagram");
  return errors;
}

/** Editorial JSONL intake only. No writes to src/public, no changes to learner data. */
export async function importTasks({ input, job, reviews = [], batchSize = 200, maxBatches = Infinity, corpus = practiceBank, registry = sourceRegistry }) {
  if (!/^[a-z0-9-]+$/.test(job) || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 300 || !Array.isArray(reviews)) throw Error("Invalid job/batch size/reviews");
  const directory = resolve(projectRoot, ".content-staging", `import-${job}`);
  mkdirSync(directory, { recursive: true });
  const lock = `${directory}/lock`;
  mkdirSync(lock); // Concurrent writers must not race; stale lock requires explicit operator recovery.
  try {
    const digest = createHash("sha256");
    for await (const chunk of createReadStream(input)) digest.update(chunk);
    const identity = hash(JSON.stringify({ input: digest.digest("hex"), reviews, registry, corpus: corpus.map(contentFingerprint), batchSize }));
    const checkpoint = `${directory}/checkpoint.json`;
    const state = existsSync(checkpoint) ? JSON.parse(readFileSync(checkpoint, "utf8")) : { schemaVersion: 1, identity, lines: 0, batches: 0, counts: { found: 0, rightsAllowed: 0, staged: 0, duplicates: 0, rejected: 0, review: 0 } };
    if (state.identity !== identity) throw Error("Input/review/registry/bank changed; use a new job ID");
    const seen = new Map(corpus.map((t) => [t.id, normalized(t)]));
    for (let i = 0; i < state.batches; i++) for (const r of JSON.parse(readFileSync(`${directory}/batch-${i}.json`, "utf8"))) if (["staged", "review"].includes(r.status)) seen.set(r.task.id, normalized(r.task));
    let line = 0, batches = 0, pending = [];
    const flush = () => {
      if (!pending.length) return;
      atomic(`${directory}/batch-${state.batches}.json`, pending);
      state.batches++; state.lines = line;
      atomic(checkpoint, state); // Orphan uncommitted batch is deterministically overwritten on resume.
      pending = []; batches++;
    };
    for await (const raw of createInterface({ input: createReadStream(input), crlfDelay: Infinity })) {
      line++;
      if (line <= state.lines) continue;
      state.counts.found++;
      let task, record;
      try { task = JSON.parse(raw); } catch { record = { line, status: "rejected", issues: ["invalid-json"] }; }
      if (!record) {
        const issues = structuralIssues(task, corpus);
        if (issues.length) record = { line, status: "rejected", issues, task };
        else {
          const statement = normalized(task);
          const duplicate = [...seen].find(([id, s]) => id === task.id || s === statement || similar(s, statement));
          if (duplicate) record = { line, status: "duplicates", duplicateOf: duplicate[0], task };
          else {
            const decision = getPublicationDecision(task.publication, registry);
            const rightsIssues = decision.reasons.filter((r) => !["draft", "math-review-pending", "expert-review-required", "missing-validation-evidence"].includes(r.code));
            if (!rightsIssues.length) state.counts.rightsAllowed++;
            const review = reviews.find((r) => r?.id === task.id && r.sha256 === contentFingerprint(task));
            const verified = review && ["source-answer-and-solution", "independent-computation"].includes(review.method) &&
              Array.isArray(review.evidence) && review.evidence.length && review.evidence.every((p) => text(p) && !p.includes("..") && !p.startsWith("/") && existsSync(resolve(projectRoot, p)));
            const status = decision.allowed && verified ? "staged" : "review";
            record = { line, status, issues: decision.reasons, task, contentSha256: contentFingerprint(task), substantiveReview: verified ? review : null };
            seen.set(task.id, statement);
          }
        }
      }
      state.counts[record.status]++;
      pending.push(record);
      if (pending.length >= batchSize) { flush(); if (batches >= maxBatches) break; }
    }
    flush();
    return { ...state, publication: "editorial-only", directory };
  } finally { rmdirSync(lock); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, job, reviewFile] = process.argv.slice(2);
  if (!input || !job) throw Error("Usage: node scripts/import-tasks.mjs input.jsonl job-id [local-reviews.json]");
  console.log(JSON.stringify(await importTasks({ input, job, reviews: reviewFile ? JSON.parse(readFileSync(reviewFile, "utf8")) : [] }), null, 2));
}
