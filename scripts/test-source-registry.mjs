import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader } from "./content-source-loader.mjs";

const load = createContentLoader();
const { sourceRegistry, getContentSource } = load("src/lib/source-registry.ts");
const { getPublicationDecision } = load("src/lib/content-publication.ts");
const day = "2026-10-21";
const author = getContentSource("tochka-project-original");
const candidate = () => ({
  id: "independent-fraction-example-r1",
  provenance: {
    sourceIds: [author.id], authorship: "project-original",
    sourceFiles: ["src/lib/content/oge-bank.ts"], attribution: [author.attribution],
    structuralReferenceIds: ["fipi-oge-structure"],
  },
  validation: { status: "automated-reviewed", checkedAt: day, evidence: ["scripts/test-oge-bank.mjs"] },
  releaseStatus: "ready",
});
const decide = (value, registry = sourceRegistry, now = day) => getPublicationDecision(value, registry, now);
const codes = (result) => result.reasons.map((reason) => reason.code);
const registryWith = (patch) => sourceRegistry.map((source) => source.id === author.id ? { ...source, ...patch } : source);
const licensed = {
  ...author, id: "explicit-permission", url: "https://example.org/author-permission",
  licenseType: "explicit-license", reviewStatus: "permission-confirmed", attribution: "Автор примера",
  permittedActions: ["publish", "modify"],
  evidence: [{ kind: "permission", url: "https://example.org/permission", description: "Test fixture: explicit permission for this project, not an imported source." }],
};

test("source registry has stable unique identities and does not license competitor or FIPI material", () => {
  assert.equal(new Set(sourceRegistry.map((source) => source.id)).size, sourceRegistry.length);
  for (const id of ["fipi-oge-structure", "fipi-ege-structure", "shkolkovo-public-reference"]) {
    const source = getContentSource(id);
    assert.equal(source.licenseType, "unknown");
    assert.equal(source.permittedActions.includes("publish"), false);
  }
  assert.equal(getContentSource("missing"), undefined);
  assert.equal(author.licenseType, "project-original");
  assert.equal(author.reviewStatus, "project-declaration");
});

test("an explicit project-original source plus recorded mathematical checks permits ready author content", () => {
  assert.deepEqual(decide(candidate()), { allowed: true, reasons: [] });
  const draft = candidate(); draft.releaseStatus = "draft";
  assert.equal(decide(draft).allowed, false);
  assert(codes(decide(draft)).includes("draft"));
  const kindOnly = { id: "fake-author", source: { kind: "author" } };
  assert.equal(decide(kindOnly).allowed, false);
});

test("unknown, empty, duplicate and ambiguous sources fail closed", () => {
  const value = candidate();
  value.provenance.sourceIds = ["unknown"];
  assert(codes(decide(value)).includes("unknown-source"));
  value.provenance.sourceIds = [];
  assert(codes(decide(value)).includes("missing-source"));
  value.provenance.sourceIds = [author.id, author.id];
  assert(codes(decide(value)).includes("duplicate-source"));
  assert(codes(decide(candidate(), [...sourceRegistry, author])).includes("ambiguous-registry"));
});

test("a reference link never grants copying rights, including mixed-source content", () => {
  for (const id of ["fipi-oge-structure", "fipi-ege-structure", "shkolkovo-public-reference"]) {
    const value = candidate();
    value.provenance.sourceIds.push(id);
    value.provenance.attribution.push(getContentSource(id).attribution);
    const result = decide(value);
    assert.equal(result.allowed, false);
    assert(result.reasons.some((reason) => reason.sourceId === id && reason.code === "missing-publish-permission"));
    assert(result.reasons.some((reason) => reason.sourceId === id && reason.code === "unknown-rights"));
  }
  assert.equal(decide(candidate()).allowed, true, "FIPI factual reference metadata alone is not reproduced material");
});

test("declaring public access or publish permission without evidence cannot authorize publication", () => {
  for (const patch of [
    { licenseType: "unknown" },
    { reviewStatus: "unreviewed" },
    { permittedActions: ["private-review", "structural-reference"] },
    { evidence: [] },
    { evidence: [{ kind: "author-declaration", url: "https://", description: "Invalid link" }] },
    { evidence: [{ kind: "review-log", url: "https://example.org/public-page", description: "Page is public" }] },
  ]) assert.equal(decide(candidate(), registryWith(patch)).allowed, false);
});

test("revoked and expired permissions are rejected; the recorded final day remains inclusive", () => {
  assert(codes(decide(candidate(), registryWith({ reviewStatus: "revoked" }))).includes("revoked-rights"));
  assert(codes(decide(candidate(), registryWith({ rightsValidThrough: "2026-10-20" }))).includes("expired-rights"));
  assert.equal(decide(candidate(), registryWith({ rightsValidThrough: day })).allowed, true);
  assert(codes(decide(candidate(), registryWith({ rightsValidThrough: "2026-02-30" }))).includes("expired-rights"));
});

test("permission must include adaptation rights and the exact required attribution", () => {
  const value = candidate();
  value.provenance = { sourceIds: [licensed.id], authorship: "adapted", sourceFiles: ["src/lib/content/licensed-fixture.ts"], attribution: [licensed.attribution] };
  assert.equal(decide(value, [licensed]).allowed, true);
  assert(codes(decide(value, [{ ...licensed, permittedActions: ["publish"] }])).includes("missing-modify-permission"));
  value.provenance.attribution = [];
  assert(codes(decide(value, [licensed])).includes("missing-attribution"));
  value.provenance.attribution = [licensed.attribution];
  value.provenance.authorship = "project-original";
  assert(codes(decide(value, [licensed])).includes("authorship-conflict"));
});

test("pending mathematical review, expert review requirements and missing evidence block a release", () => {
  for (const status of ["pending", "requires-expert-review", "unknown"]) {
    const value = candidate(); value.validation.status = status;
    assert.equal(decide(value).allowed, false);
  }
  const value = candidate(); value.validation.evidence = [];
  assert(codes(decide(value)).includes("missing-validation-evidence"));
  value.validation = { status: "expert-reviewed", checkedAt: day, evidence: ["docs/actual-review-fixture.md"] };
  assert.equal(decide(value).allowed, true);
});

test("missing, invalid and future review dates cannot silently pass", () => {
  for (const checkedAt of [undefined, "", "2026-02-30", "2027-01-01"]) {
    const value = candidate(); value.validation.checkedAt = checkedAt;
    assert(codes(decide(value)).includes("invalid-review-date"));
    assert(codes(decide(candidate(), registryWith({ checkedAt }))).includes("invalid-review-date"));
  }
  assert.equal(decide(candidate(), sourceRegistry, "2026-02-30").allowed, false);
});

test("malformed import metadata and unsafe source paths are rejected without throwing", () => {
  for (const value of [null, [], {}, { id: "x", provenance: null, validation: {} }, { ...candidate(), provenance: { sourceIds: 12 } }]) {
    assert.doesNotThrow(() => decide(value));
    assert.equal(decide(value).allowed, false);
  }
  for (const sourceFiles of [[], ["../secrets"], ["/tmp/external"], ["C:\\outside"], ["https://example.org/source"], [""]]) {
    const value = candidate(); value.provenance.sourceFiles = sourceFiles;
    assert(codes(decide(value)).includes("missing-source-files"));
  }
  const value = candidate(); value.provenance.structuralReferenceIds = ["missing"];
  assert(codes(decide(value)).includes("unknown-reference"));
});
