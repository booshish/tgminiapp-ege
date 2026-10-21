import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createContentLoader, loadContent, projectRoot } from "./content-source-loader.mjs";

export const mathAuditBaselineRevision = "ca6389adcb94c126b356e6e15fdf24743af15a59";
const publication = (item) => item.publication ?? (item.provenance && item.validation
  ? { id: item.id, provenance: item.provenance, validation: item.validation, releaseStatus: item.releaseStatus } : null);
const unique = (values) => [...new Set(values)];
const sum = (items, fn) => items.reduce((total, item) => total + fn(item), 0);
const checksFor = (topic) => topic.learningChecks?.checks ?? topic.checks ?? topic.controlQuestions ?? [];
const titleFor = (content, id) => content.getTheoryTopic?.(id)?.title
  ?? content.theoryTopics.find((topic) => topic.id === id)?.title ?? content.taskTopicLabels?.[id] ?? id;
const getTopic = (content, id) => content.getTheoryTopic?.(id) ?? content.theoryTopics.find((topic) => topic.id === id);

function topicsForExam(content, exam) {
  const prefix = exam.examType === "ОГЭ" ? "oge-number-" : exam.level === "profile" ? "ege-profile-number-" : "ege-base-number-";
  return content.theoryTopics.filter((topic) => topic.subjectId === exam.subjectId && topic.examType.includes(exam.examType)
    && (topic.coverage === "foundation" || topic.id.startsWith(prefix)));
}
function rowTheory(content, exam, number, bank) {
  const linked = new Set(bank.map((task) => getTopic(content, task.topicId)?.id));
  return topicsForExam(content, exam).filter((topic) => topic.part === number.part
    && (topic.examNumbers?.includes(number.number) || linked.has(topic.id)));
}
function originStatus(items, decide, registry, checkedAt) {
  if (!items.length) return { status: "no-material", sourceIds: [], allowedCount: 0, blockedCount: 0, reasons: [] };
  const candidates = items.map(publication);
  if (!decide || candidates.some((candidate) => !candidate)) {
    return { status: "existing-author-declaration-without-release-evidence", sourceIds: unique(candidates.flatMap((candidate) => candidate?.provenance?.sourceIds ?? [])),
      allowedCount: 0, blockedCount: items.length, reasons: ["missing-publication-evidence"] };
  }
  const decisions = candidates.map((candidate, index) => candidate.id !== items[index].id
    ? { allowed: false, reasons: [{ code: "publication-identity-mismatch" }] }
    : decide(candidate, registry, checkedAt));
  return { status: decisions.every((item) => item.allowed) ? "recorded-project-origin-allowed" : "release-blocked",
    sourceIds: unique(candidates.flatMap((candidate) => candidate.provenance.sourceIds)),
    allowedCount: decisions.filter((item) => item.allowed).length, blockedCount: decisions.filter((item) => !item.allowed).length,
    reasons: unique(decisions.flatMap((item) => item.reasons.map((reason) => reason.code))) };
}
function examSummary(content, exam) {
  const bank = content.tasks.filter((task) => task.examVersionId === exam.versionId);
  const theory = topicsForExam(content, exam);
  return {
    publishedTasks: exam.available ? bank.length : 0,
    archivedTasks: exam.available ? 0 : bank.length,
    numberedPublishedTasks: exam.available ? bank.filter((task) => task.examNumber !== null).length : 0,
    foundationalPublishedTasks: exam.available ? bank.filter((task) => task.examNumber === null).length : 0,
    publishedTheory: exam.available ? theory.length : 0,
    numberedTheory: exam.available ? theory.filter((topic) => topic.coverage === "exam-topic").length : 0,
    sharedFoundationTheory: theory.filter((topic) => topic.coverage === "foundation").length,
    workedExamples: exam.available ? sum(theory, (topic) => topic.examples.length) : 0,
    controlQuestions: exam.available ? sum(theory, (topic) => checksFor(topic).length) : 0,
  };
}

/** Separate the current application's mapping from verified official requirements. */
export function buildMathReleaseReport({ content, baseline = content, verificationRecords = [], registry = [], getPublicationDecision,
  validateVerifiedExamManifest, validateFixedExamVariant, candidates = [], fixedVariants = [], fixedVariantReviews = [], checkedAt = "2026-10-21" }) {
  const exams = [];
  const rows = [];
  for (const exam of content.examDefinitions) {
    const record = verificationRecords.find((item) => item.examVersionId === exam.versionId);
    const verification = validateVerifiedExamManifest?.(record);
    const manifest = verification?.valid ? verification.manifest : null;
    const officialNumbers = manifest?.officialNumbers ?? null;
    const previousDefinition = baseline.examDefinitions.find((item) => item.versionId === exam.versionId);
    const before = previousDefinition ? examSummary(baseline, previousDefinition) : {
      publishedTasks: 0, archivedTasks: 0, numberedPublishedTasks: 0, foundationalPublishedTasks: 0,
      publishedTheory: 0, numberedTheory: 0, sharedFoundationTheory: 0, workedExamples: 0, controlQuestions: 0,
    };
    const after = examSummary(content, exam);
    const acceptedVariants = manifest && validateFixedExamVariant ? fixedVariants.filter((variant) => variant.examVersionId === exam.versionId
      && validateFixedExamVariant(variant, manifest, content.tasks, fixedVariantReviews, registry, checkedAt).length === 0) : [];
    const examRows = exam.numbers.map((number) => {
      const bank = content.tasks.filter((task) => task.examVersionId === exam.versionId && task.examNumber === number.number);
      const active = exam.available ? bank : [];
      const theory = rowTheory(content, exam, number, bank);
      const official = officialNumbers?.find((item) => item.number === number.number) ?? null;
      const prototypeIds = unique(bank.map((task) => task.prototypeId));
      const authorTopics = unique([...bank.map((task) => task.topicId), ...theory.map((topic) => topic.id)]).map((id) => ({
        id, title: titleFor(content, id), taskCount: active.filter((task) => task.topicId === id).length,
        archivedTaskCount: exam.available ? 0 : bank.filter((task) => task.topicId === id).length,
      }));
      const rights = originStatus([...active, ...(exam.available ? theory : [])], getPublicationDecision, registry, checkedAt);
      return {
        examVersionId: exam.versionId,
        examId: exam.id,
        exam: exam.examType,
        subjectId: exam.subjectId,
        level: exam.level,
        year: exam.year,
        projectConfiguration: { number: number.number, title: number.title, part: number.part,
          answerFormat: number.answerFormat, maxPrimaryScore: number.maxPrimaryScore, status: number.scoringStatus },
        officialRequirements: official ? { number: official.number, title: official.title, part: official.part,
          answerFormat: official.answerFormat, maxPrimaryScore: official.maxPrimaryScore,
          skills: official.skills, subtopics: official.subtopics, criterionDocumentId: official.criterionDocumentId } : null,
        officialDocuments: manifest?.documents ?? [],
        referenceUrls: record?.referenceUrls ?? exam.sources.map((source) => source.url),
        authorTopics,
        authorPrototypes: prototypeIds.map((id) => ({ id, title: content.prototypes.find((item) => item.id === id)?.title ?? id,
          publishedTaskCount: active.filter((task) => task.prototypeId === id).length })),
        publishedTaskCount: active.length,
        archivedTaskCount: exam.available ? 0 : bank.length,
        taskIds: active.map((task) => task.id),
        archivedTaskIds: exam.available ? [] : bank.map((task) => task.id),
        solutionCount: active.filter((task) => task.solution?.length > 0 && task.answerDisplay?.trim()).length,
        checkTypes: { automatic: active.filter((task) => task.answerRule.type !== "self").length,
          selfCheck: active.filter((task) => task.answerRule.type === "self").length },
        theory: exam.available ? theory.map((topic) => ({ id: topic.id, materialId: topic.materialId, title: topic.title,
          examples: topic.examples.length, commonMistakes: topic.difficulties,
          controlQuestions: checksFor(topic).map((check) => ({ id: check.id, question: check.question })) })) : [],
        fixedVariantIds: acceptedVariants.filter((variant) => variant.taskIds?.some((id) => active.some((task) => task.id === id))).map((variant) => variant.id),
        publicationStatus: exam.available ? "existing-preliminary-practice" : "unpublished-exam",
        validationStatus: { officialStructure: official ? "reviewed" : "blocked-missing-documents",
          mathematicalReview: unique(active.map((task) => publication(task)?.validation?.status ?? "existing-tests-not-individual-expert-review")),
          expertReview: "not-asserted-by-coverage-count" },
        rights,
        provisionalTarget: { tasksPerProjectNumber: 20, missing: Math.max(0, 20 - active.length), officialCompleteness: null },
        gaps: [
          ...(!official ? ["Официальные требования номера не сверены; новые экзаменационные материалы не выпускаются."] : []),
          ...(active.length < 20 ? [`До предварительного ориентира 20 авторских задач: ${20 - active.length}. Это не оценка полного охвата подтем.`] : []),
          ...(!exam.available ? ["Экзамен не опубликован; архивные записи не считаются доступным банком."] : []),
          ...(!theory.length || !exam.available ? ["Нет опубликованного материала, подтверждённо связанного с этим экзаменом и номером."] : []),
        ],
      };
    });
    rows.push(...examRows);
    exams.push({
      id: exam.id, versionId: exam.versionId, title: exam.title, subjectId: exam.subjectId, year: exam.year, level: exam.level,
      status: manifest ? "official-structure-reviewed" : "new-exam-release-blocked",
      existingPracticeAvailable: exam.available,
      officialNumberCount: officialNumbers?.length ?? null,
      officialDurationMinutes: manifest?.officialDurationMinutes ?? null,
      officialMaximumPrimaryScore: manifest?.totalMaxPrimaryScore ?? null,
      officialSkills: officialNumbers ? unique(officialNumbers.flatMap((number) => number.skills)) : null,
      officialDocuments: manifest?.documents ?? [],
      projectConfiguration: { numberCount: exam.numbers.length, maximumPrimaryScore: sum(exam.numbers, (number) => number.maxPrimaryScore ?? 0),
        status: "preliminary-not-official" },
      before, after,
      added: { publishedTasks: after.publishedTasks - before.publishedTasks, publishedTheory: after.publishedTheory - before.publishedTheory,
        workedExamples: after.workedExamples - before.workedExamples, controlQuestions: after.controlQuestions - before.controlQuestions,
        fullOfficialStructureVariants: acceptedVariants.length },
      fullOfficialStructureVariants: acceptedVariants.length,
      fullVariantTarget: 5,
      fixedVariantIds: acceptedVariants.map((variant) => variant.id),
      remainingProvisionalTaskTarget: sum(examRows, (row) => row.provisionalTarget.missing),
      targetBasis: "20-per-existing-project-number; not a verified official number count",
      missingDocuments: record?.missingDocuments ?? ["Спецификация, кодификатор и зафиксированная ручная сверка целевого года/уровня"],
      referenceUrls: record?.referenceUrls ?? exam.sources.map((source) => source.url),
      restriction: record?.reason ?? "Официальные требования не подтверждены; полноценный экзаменационный выпуск не заявляется.",
    });
  }
  const knownTaskIds = new Set(content.tasks.map((task) => task.id));
  const issues = [];
  for (const [kind, items] of [["task", content.tasks], ["theory", content.theoryTopics], ["prototype", content.prototypes]]) {
    const seen = new Set();
    for (const item of items) {
      if (seen.has(item.id)) issues.push(`duplicate-${kind}-id:${item.id}`);
      seen.add(item.id);
    }
  }
  for (const task of content.tasks) {
    if (!task.prompt?.trim() || !task.solution?.length || !task.answerDisplay?.trim()) issues.push(`incomplete-task:${task.id}`);
    if (!getTopic(content, task.topicId)) issues.push(`missing-task-theory:${task.id}:${task.topicId}`);
  }
  for (const topic of content.theoryTopics) for (const id of topic.prerequisites) {
    if (!getTopic(content, id)) issues.push(`missing-prerequisite:${topic.id}:${id}`);
  }
  for (const candidate of candidates) if (knownTaskIds.has(candidate.id)) issues.push(`draft-in-public-bank:${candidate.id}`);
  return {
    schemaVersion: 1, checkedAt, baselineRevision: mathAuditBaselineRevision,
    purpose: "Coverage audit and release blockers; project configuration is not official evidence.",
    officialReleaseReady: exams.every((exam) => exam.status === "official-structure-reviewed" && exam.fullOfficialStructureVariants >= 5),
    totals: { publishedTasks: sum(exams, (exam) => exam.after.publishedTasks), archivedTasks: sum(exams, (exam) => exam.after.archivedTasks),
      uniqueTheoryArticles: content.theoryTopics.length, newTheoryArticles: content.theoryTopics.length - baseline.theoryTopics.length,
      newPublishedTasks: sum(exams, (exam) => exam.added.publishedTasks),
      totalWorkedExamples: sum(content.theoryTopics, (topic) => topic.examples.length),
      newWorkedExamples: sum(content.theoryTopics, (topic) => topic.examples.length) - sum(baseline.theoryTopics, (topic) => topic.examples.length),
      totalControlQuestions: sum(content.theoryTopics, (topic) => checksFor(topic).length),
      newControlQuestions: sum(content.theoryTopics, (topic) => checksFor(topic).length) - sum(baseline.theoryTopics, (topic) => checksFor(topic).length),
      projectNumberRows: rows.length, fullOfficialStructureVariants: sum(exams, (exam) => exam.fullOfficialStructureVariants) },
    drafts: { count: candidates.length, publishedCount: 0, examMapping: null, ids: candidates.map((item) => item.id),
      note: "Самостоятельные фундаментальные упражнения без экзаменационного номера. Не прибавляются к опубликованному банку и не закрывают официальные пробелы." },
    sourceRegistry: registry,
    exams, rows, integrityIssues: unique(issues),
  };
}

export function mathCoverageMarkdown(report) {
  const lines = ["# Математика: фактическое покрытие и блокировки выпуска", "",
    `Дата: ${report.checkedAt}. Исходный срез: \`${report.baselineRevision}\`. Команда: \`node scripts/math-release-report.mjs\`.`, "",
    "**Полное официальное покрытие не достигнуто.** Официальные спецификации не получены. Существующая предварительная практика сохранена; неподтверждённые структуры, баллы и длительность не объявляются официальными. База, профиль и ОГЭ учитываются отдельно.", "",
    "## Итоги по направлениям", "", "| Направление | Опубликованные задачи до → после | Архив | Статьи до → после | Полные варианты по проверенной структуре | До 20 задач на каждый номер текущей предварительной карты |",
    "| --- | ---: | ---: | ---: | ---: | ---: |"];
  for (const exam of report.exams) lines.push(`| ${exam.title} | ${exam.before.publishedTasks} → ${exam.after.publishedTasks} | ${exam.after.archivedTasks} | ${exam.before.publishedTheory} → ${exam.after.publishedTheory} | ${exam.fullOfficialStructureVariants} / 5 | ${exam.remainingProvisionalTaskTarget} |`);
  lines.push("", "Общие фундаментальные статьи используются ОГЭ и профилем повторно. Суммировать их по двум строкам как уникальные статьи нельзя. Архивные задачи базы не опубликованы. Числа предварительной карты — не подтверждённое количество официальных заданий.", "",
    `Всего уникальных статей: **${report.totals.uniqueTheoryArticles}** (новых ${report.totals.newTheoryArticles}); разобранных примеров: **${report.totals.totalWorkedExamples}** (добавлено ${report.totals.newWorkedExamples}); контрольных вопросов: **${report.totals.totalControlQuestions}** (добавлено ${report.totals.newControlQuestions}).`,
    `Новых опубликованных задач: **${report.totals.newPublishedTasks}**. Отдельных неопубликованных фундаментальных кандидатов: **${report.drafts.count}**; у них нет экзаменационных номеров, баллов или заявленного соответствия ФИПИ.`, "",
    "Действующий «Учебный вариант» составляет полный по предварительной карте набор ОГЭ/профиля на лету. Это не пять фиксированных вариантов по подтверждённой официальной спецификации; в требуемые 15 вариантов они не засчитываются.", "", "## Матрица по номерам текущего проекта", "",
    "Официальные поля в JSON равны `null`, пока нет проверенных документов. Перечисленные ниже названия и номера взяты из существующей конфигурации приложения.", "",
    "| Направление | № проекта / часть | Название в проекте | Задач доступно / архив | Прототипов | Теория | Разборы | Проверка | До 20 |", "| --- | --- | --- | ---: | ---: | --- | ---: | --- | ---: |");
  for (const row of report.rows) {
    const label = row.exam === "ОГЭ" ? "ОГЭ" : row.level === "base" ? "ЕГЭ база" : "ЕГЭ профиль";
    lines.push(`| ${label} | ${row.projectConfiguration.number} / ${row.projectConfiguration.part} | ${row.projectConfiguration.title} | ${row.publishedTaskCount} / ${row.archivedTaskCount} | ${row.authorPrototypes.length} | ${row.theory.map((topic) => topic.id).join(", ") || "—"} | ${row.solutionCount} | ${row.checkTypes.automatic ? "Авто" : row.checkTypes.selfCheck ? "Самопроверка" : "—"} | ${row.provisionalTarget.missing} |`);
  }
  lines.push("", "## Что нужно для продолжения", "");
  for (const exam of report.exams) lines.push(`### ${exam.title} · ${exam.year}`, "", ...exam.missingDocuments.map((item) => `- ${item}`), ...exam.referenceUrls.map((url) => `- Официальный указатель: ${url}`), "");
  lines.push("Нужны отдельные документы для базы и профиля. Структура 2027 года не переносится из 2026 автоматически. Документы изучаются для сверки требований; доступность PDF не означает разрешение перепубликовать чужие задачи или рисунки.", "",
    "## Происхождение и проверка", "", "Машиночитаемый JSON содержит реестр источников, авторские темы/прототипы, тип проверки, решения, типичные ошибки, контрольные вопросы, источник требований и причины блокировки. Авторская маркировка не подменяет независимую экспертизу. Новые материалы с неизвестными правами, незавершённой проверкой или отсутствующей официальной привязкой не становятся экзаменационным релизом.", "",
    `Проблем целостности связей/ID/пустых материалов: **${report.integrityIssues.length}**.`, ...report.integrityIssues.map((issue) => `- ${issue}`), "");
  return lines.join("\n");
}

export function loadMathReleaseReport() {
  const load = createContentLoader();
  const optional = (file) => existsSync(resolve(projectRoot, file)) ? load(file) : {};
  const verification = optional("src/lib/exam-verification.ts");
  const publicationPolicy = optional("src/lib/content-publication.ts");
  return buildMathReleaseReport({
    content: loadContent(), baseline: loadContent({ revision: mathAuditBaselineRevision }),
    verificationRecords: verification.examVerificationRecords ?? [], validateVerifiedExamManifest: verification.validateVerifiedExamManifest,
    registry: optional("src/lib/source-registry.ts").sourceRegistry ?? [], getPublicationDecision: publicationPolicy.getPublicationDecision,
    candidates: optional("src/lib/content/foundation-candidates.ts").foundationCandidates ?? [],
    validateFixedExamVariant: optional("src/lib/exam-variant-manifest.ts").validateFixedExamVariant,
  });
}
function main() {
  const report = loadMathReleaseReport();
  if (report.integrityIssues.length) throw new Error(report.integrityIssues.join("\n"));
  if (!process.argv.includes("--check")) {
    const directory = resolve(projectRoot, "docs"); mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "math-coverage-matrix.json"), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(resolve(directory, "math-coverage-matrix.md"), mathCoverageMarkdown(report));
  }
  console.log(JSON.stringify({ officialReleaseReady: report.officialReleaseReady, ...report.totals, unpublishedCandidates: report.drafts.count,
    exams: report.exams.map((exam) => ({ id: exam.id, status: exam.status, before: exam.before, after: exam.after })) }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
