import assert from "node:assert/strict";
import test from "node:test";
import { createContentLoader } from "./content-source-loader.mjs";

const load = createContentLoader();
const taxonomy = load("src/lib/task-taxonomy.ts");
const tasks = load("src/lib/tasks.ts");
const selected = { examType: "ЕГЭ", subjectId: "math", level: "profile", examNumber: 9 };

test("theme options expose only populated reviewed classifications, with exact metadata counts", () => {
  const options = taxonomy.getNumberTaxonomyOptions(selected);
  assert.ok(options.topics.length && options.subtopics.length && options.subtypes.length);
  assert.equal(options.total, tasks.getPracticeTaskCount(selected));
  for (const [kind, field] of [["topics", "taxonomyTopicId"], ["subtopics", "subtopicId"], ["subtypes", "subtypeId"]]) {
    for (const option of options[kind]) {
      assert.ok(option.count > 0);
      assert.equal(option.count, tasks.getPracticeTaskCount({ ...selected, [field]: option.id }));
    }
  }
});

test("topic/subtopic/source facets compose and All themes preserves only provenance", () => {
  const all = taxonomy.getNumberTaxonomyOptions(selected);
  for (const topic of all.topics) {
    const filter = { ...selected, taxonomyTopicId: topic.id, sourceCategoryId: "tochka-original" };
    const scoped = taxonomy.getNumberTaxonomyOptions(filter);
    assert.equal(scoped.matching, tasks.getPracticeTaskCount(filter));
    for (const source of scoped.sources) assert.equal(source.count, tasks.getPracticeTaskCount({ ...filter, sourceCategoryId: source.id }));
    for (const subtopic of scoped.subtopics) {
      assert.equal(subtopic.parentId, topic.id);
      assert.equal(subtopic.count, tasks.getPracticeTaskCount({ ...filter, subtopicId: subtopic.id }));
    }
  }
  const cleared = taxonomy.clearNumberThemes({ taxonomyTopicId: "a", subtopicId: "b", subtypeId: "c", sourceCategoryId: "egkr" });
  assert.equal(cleared.sourceCategoryId, "egkr");
  assert.ok(!cleared.taxonomyTopicId && !cleared.subtopicId && !cleared.subtypeId);
  assert.equal(taxonomy.getNumberTaxonomyOptions({ ...selected, ...cleared }).matching, 0);
  assert.equal(taxonomy.getNumberTaxonomyOptions({ ...selected, ...cleared }).topics.length, 0);
});

test("unreviewed and empty positions keep the general bank without invented detailed categories", () => {
  const russian = { examType: "ЕГЭ", subjectId: "russian", examNumber: 4 };
  const unreviewed = taxonomy.getNumberTaxonomyOptions(russian);
  assert.ok(unreviewed.total > 0);
  assert.equal(unreviewed.matching, tasks.getPracticeTaskCount(russian));
  assert.equal(unreviewed.needsReview, unreviewed.total);
  assert.deepEqual([unreviewed.topics, unreviewed.subtopics, unreviewed.subtypes], [[], [], []]);
  const empty = taxonomy.getNumberTaxonomyOptions({ examType: "ОГЭ", subjectId: "russian", examNumber: 1 });
  assert.equal(empty.total, 0);
  assert.deepEqual([empty.topics, empty.subtopics, empty.subtypes], [[], [], []]);
});

test("unknown thematic combinations return zero; all themes restores exactly the original number", () => {
  const filter = { ...selected, taxonomyTopicId: "unavailable-topic", subtopicId: "unavailable-subtopic" };
  assert.equal(taxonomy.getNumberTaxonomyOptions(filter).matching, 0);
  assert.deepEqual(tasks.getPracticeTasks(filter), []);
  const restored = { ...filter, ...taxonomy.clearNumberThemes(filter) };
  assert.equal(tasks.getPracticeTaskCount(restored), tasks.getPracticeTaskCount(selected));
});
