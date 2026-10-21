import { createHash } from "node:crypto";
import { existsSync, mkdirSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createContentLoader, projectRoot } from "./content-source-loader.mjs";

const load = createContentLoader();
const { foundationCandidates } = load("src/lib/content/foundation-candidates.ts");
const { sourceRegistry } = load("src/lib/source-registry.ts");
const { getPublicationDecision } = load("src/lib/content-publication.ts");
const encode = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

/** Editorial artifacts only. This never imports drafts into the public task bank. */
export function buildStagedFoundationBundle(candidates = foundationCandidates, registry = sourceRegistry) {
  const ids = new Set(), statements = new Set(), groups = new Map();
  for (const item of [...candidates].sort((a, b) => a.id.localeCompare(b.id, "en"))) {
    if (!/^[a-z0-9-]+$/.test(item.id) || !/^[a-z0-9-]+$/.test(item.topicId) || ids.has(item.id)) throw new Error("Invalid or duplicate draft ID/topic");
    ids.add(item.id);
    if (item.releaseStatus !== "draft" || item.mappingStatus !== "not-mapped" || item.publication?.id !== item.id || item.publication.releaseStatus !== "draft") throw new Error(`Not an unmapped draft: ${item.id}`);
    const decision = getPublicationDecision(item.publication, registry);
    if (decision.allowed || decision.reasons.some((reason) => reason.code !== "draft")) throw new Error(`Draft rights/review blocked: ${item.id}`);
    for (const field of ["examType", "examVersionId", "examNumber", "examYear", "part", "scoring", "maxPrimaryScore"]) {
      if (field in item) throw new Error(`Unreviewed exam mapping: ${item.id}`);
    }
    if (!item.prompt?.trim() || !item.answerDisplay?.trim() || !item.answerRule || !item.solution?.length || item.solution.some((step) => !step.text?.trim())) throw new Error(`Incomplete draft: ${item.id}`);
    const statement = `${item.prompt}\n${item.conditionLatex ?? ""}`.normalize("NFKC").replace(/\s+/g, " ").trim();
    if (statements.has(statement)) throw new Error(`Duplicate statement: ${item.id}`);
    statements.add(statement);
    const group = groups.get(item.topicId) ?? [];
    group.push(item); groups.set(item.topicId, group);
  }
  const files = new Map(), shards = [];
  for (const [topicId, items] of [...groups].sort(([a], [b]) => a.localeCompare(b, "en"))) {
    const file = `${topicId}.json`, json = encode({ schemaVersion: 1, publication: "draft-only", topicId, items });
    files.set(file, json);
    shards.push({ topicId, file, count: items.length, ids: items.map((item) => item.id), sha256: sha256(json) });
  }
  const usedSources = new Set(candidates.flatMap((item) => item.publication.provenance.sourceIds));
  const sources = encode(registry.filter((source) => usedSources.has(source.id)).sort((a, b) => a.id.localeCompare(b.id, "en")));
  files.set("source-registry.json", sources);
  files.set("index.json", encode({
    schemaVersion: 1, publication: "draft-only", total: candidates.length,
    warning: "Не экзаменационный банк. Номера, баллы и соответствие ФИПИ не назначены. Публикация заблокирована до редакционной сверки.",
    sourceRegistry: { file: "source-registry.json", sha256: sha256(sources) }, shards,
  }));
  return files;
}

export function writeStagedBundle(destination, files) {
  const target = resolve(destination);
  if (existsSync(target)) throw new Error("Staging destination already exists; choose a new directory. Existing data is never replaced.");
  mkdirSync(dirname(target), { recursive: true });
  const actualParent = realpathSync(dirname(target));
  const repoDistance = relative(projectRoot, actualParent);
  // A new directory directly inside the repository is allowed only as .content-staging.
  const actualTarget = resolve(actualParent, target.slice(dirname(target).length + 1));
  const inRepo = repoDistance === "" || (!repoDistance.startsWith("..") && !repoDistance.startsWith("/"));
  const targetRelative = relative(projectRoot, actualTarget);
  if (inRepo && targetRelative !== ".content-staging" && !targetRelative.startsWith(".content-staging/")) throw new Error("Draft export must stay outside the app, or in .content-staging.");
  const temporary = `${actualTarget}.writing-${process.pid}`;
  mkdirSync(temporary);
  try {
    for (const [file, content] of files) {
      if (!/^[a-z0-9-]+\.json$/.test(file)) throw new Error("Invalid shard path");
      writeFileSync(resolve(temporary, file), content, { flag: "wx" });
    }
    renameSync(temporary, actualTarget);
  } catch (error) { rmSync(temporary, { recursive: true, force: true }); throw error; }
}

function main() {
  // Do not substitute schema validation for the independent mathematical oracles.
  const checked = spawnSync(process.execPath, ["--test", "scripts/test-foundation-candidates.mjs"], { cwd: projectRoot, stdio: "inherit" });
  if (checked.status !== 0) throw new Error("Mathematical candidate checks failed; no export written.");
  const files = buildStagedFoundationBundle();
  const target = process.argv[2];
  if (target) writeStagedBundle(target, files);
  console.log(JSON.stringify({ checkedCandidates: foundationCandidates.length, topicShards: files.size - 2, published: 0, output: target ? resolve(target) : null }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
