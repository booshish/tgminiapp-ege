import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { createContentLoader, loadContent, projectRoot } from "./content-source-loader.mjs";
import { contentReviewIssues, readContentReviewManifest } from "./content-review-evidence.mjs";

const baselinePath = resolve(projectRoot, "docs/content-baseline.json");
export const officialSourceReview = {
  attemptedAt: "2026-10-21",
  status: "blocked-not-verified",
  year: 2026,
  outcome: "Both official index pages returned CONNECT HTTP 403 from the environment. No bypass was attempted; documents were not read.",
  urls: [
    "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory",
    "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory",
  ],
};

export function buildCoverage(content) {
  const { tasks, prototypes, theoryTopics, examDefinitions } = content;
  const topicFor = (id) => content.getTheoryTopic?.(id) ?? theoryTopics.find((topic) => topic.id === id);
  const available = examDefinitions.filter((exam) => exam.available);
  const active = tasks.filter((task) => task.availability !== "history-only" && available.some((exam) => exam.versionId === task.examVersionId));
  const rows = available.flatMap((exam) => exam.numbers.map((number) => {
    const bank = active.filter((task) => task.examVersionId === exam.versionId && task.examNumber === number.number);
    const topicIds = [...new Set(bank.map((task) => task.topicId))];
    const theory = theoryTopics.filter((topic) => topic.subjectId === exam.subjectId
      && topic.examType.includes(exam.examType)
      && (topic.coverage === "foundation" || exam.examType !== "ЕГЭ" || (topic.level ?? "profile") === exam.level)
      && topic.part === number.part
      && (topic.examNumbers?.includes(number.number) || topicIds.some((id) => topicFor(id)?.id === topic.id)));
    const linkedTopicIds = [...new Set([...topicIds, ...theory.map((topic) => topic.id)])];
    return {
      examId: exam.id, examVersionId: exam.versionId, exam: exam.examType,
      subject: exam.subjectId, subjectTitle: "Математика", level: exam.level,
      year: exam.year, number: number.number, part: number.part, title: number.title,
      topicIds: linkedTopicIds,
      topics: [...new Set(linkedTopicIds.map((id) => topicFor(id)?.title ?? content.taskTopicLabels[id] ?? id))],
      prototypes: [...new Set(bank.map((task) => task.prototypeId))],
      topicCoverage: linkedTopicIds.map((id) => ({
        topicId: id,
        title: topicFor(id)?.title ?? content.taskTopicLabels[id] ?? id,
        taskCount: bank.filter((task) => task.topicId === id).length,
        theoryCount: theory.filter((topic) => topic.id === topicFor(id)?.id).length,
        prototypes: [...new Set(bank.filter((task) => task.topicId === id).map((task) => task.prototypeId))]
          .map((prototypeId) => ({ id: prototypeId, title: prototypes.find((prototype) => prototype.id === prototypeId)?.title ?? prototypeId, taskCount: bank.filter((task) => task.prototypeId === prototypeId).length })),
      })),
      taskCount: bank.length, theoryCount: theory.length, theoryIds: theory.map((topic) => topic.id),
      solutionCount: bank.filter((task) => task.solution.length > 0).length,
      automaticCount: bank.filter((task) => task.answerRule.type !== "self").length,
      selfAssessmentCount: bank.filter((task) => task.answerRule.type === "self").length,
      maxPrimaryScore: number.maxPrimaryScore,
      verificationStatus: exam.verificationStatus,
    };
  }));
  const missingLinks = [];
  for (const task of active) {
    if (!topicFor(task.topicId)) missingLinks.push(`task:${task.id} → topic:${task.topicId}`);
    if (!prototypes.some((prototype) => prototype.id === task.prototypeId && prototype.topicId === task.topicId)) missingLinks.push(`task:${task.id} → prototype:${task.prototypeId}`);
  }
  for (const topic of theoryTopics) for (const dependency of topic.prerequisites) {
    if (!topicFor(dependency)) missingLinks.push(`topic:${topic.id} → prerequisite:${dependency}`);
  }
  return {
    schemaVersion: 1,
    taskOrder: tasks.map((task) => task.id),
    totals: { allTasks: tasks.length, activeTasks: active.length, inactiveTasks: tasks.length - active.length, unnumberedActiveTasks: active.filter((task) => task.examNumber === null).length, uniqueTheory: theoryTopics.length, numbers: rows.length, numbersWithTasks: rows.filter((row) => row.taskCount).length, numbersWithTheory: rows.filter((row) => row.theoryCount).length },
    exams: available.map((exam) => ({
      id: exam.id, title: exam.title, year: exam.year,
      taskCount: active.filter((task) => task.examVersionId === exam.versionId).length,
      unnumberedTaskCount: active.filter((task) => task.examVersionId === exam.versionId && task.examNumber === null).length,
      theoryCount: theoryTopics.filter((topic) => topic.examType.includes(exam.examType)
        && (topic.coverage === "foundation" || exam.examType !== "ЕГЭ" || (topic.level ?? "profile") === exam.level)).length,
      numberCount: exam.numbers.length,
      numbersWithTasks: rows.filter((row) => row.examId === exam.id && row.taskCount).length,
      numbersWithTheory: rows.filter((row) => row.examId === exam.id && row.theoryCount).length,
    })),
    inactiveExams: examDefinitions.filter((exam) => !exam.available).map((exam) => ({ id: exam.id, title: exam.title, preservedTaskCount: tasks.filter((task) => task.examVersionId === exam.versionId).length, reason: exam.availabilityNote })),
    rows, missingLinks,
  };
}

export function contentIntegrityIssues(content, coverage = buildCoverage(content)) {
  const issues = [...coverage.missingLinks, ...contentReviewIssues(content)];
  const { getPublicationDecision } = createContentLoader()("src/lib/content-publication.ts");
  for (const material of [...content.tasks, ...content.theoryTopics]) {
    const decision = getPublicationDecision(material.publication);
    if (material.publication?.id !== material.id) issues.push(`publication identity mismatch: ${material.id}`);
    for (const reason of decision.reasons) issues.push(`publication blocked: ${material.id}: ${reason.code}`);
    if (decision.allowed) {
      for (const file of [...material.publication.provenance.sourceFiles, ...material.publication.validation.evidence]) {
        if (!/^(src|scripts|docs)\//.test(file) || file.includes("\\") || file.split("/").includes("..")) {
          issues.push(`invalid repository evidence: ${material.id}: ${file}`);
        } else if (!existsSync(resolve(projectRoot, file))) {
          issues.push(`missing repository evidence: ${material.id}: ${file}`);
        } else {
          const path = realpathSync(resolve(projectRoot, file));
          if (relative(projectRoot, path).startsWith("..") || !statSync(path).isFile()) issues.push(`invalid repository evidence: ${material.id}: ${file}`);
        }
      }
    }
  }
  for (const [label, values] of [
    ["task", content.tasks.map((task) => task.id)],
    ["prototype", content.prototypes.map((prototype) => prototype.id)],
    ["topic", content.theoryTopics.map((topic) => topic.id)],
    ["material", content.theoryTopics.map((topic) => topic.materialId)],
  ]) {
    const seen = new Set();
    for (const value of values) {
      if (seen.has(value)) issues.push(`duplicate ${label}: ${value}`);
      seen.add(value);
    }
  }
  for (const row of coverage.rows) {
    if (!row.taskCount) issues.push(`${row.examId} #${row.number}: no tasks`);
    if (!row.theoryCount) issues.push(`${row.examId} #${row.number}: no theory`);
    if (row.solutionCount !== row.taskCount) issues.push(`${row.examId} #${row.number}: missing solution`);
  }
  for (const task of content.tasks) {
    if (!task.prompt.trim() || !task.answerDisplay.trim() || !task.solution.length) issues.push(`incomplete task: ${task.id}`);
  }
  return issues;
}

function markdown(baseline, current) {
  const lines = [
    "# Покрытие авторского банка: до и после",
    "",
    `Исходный срез: коммит \`${baseline.revision}\`. Текущий срез воспроизводится командой \`node scripts/content-report.mjs\`.`,
    "",
    "Доступны ОГЭ, базовый и профильный ЕГЭ по математике по конфигурациям 2026 года. Покрытие номера означает наличие авторских тренировочных задач и материала; оно не доказывает полный охват официальных подтипов или соответствие проектам 2027 года.",
    "",
    "## Официальная сверка",
    "",
    "Прежняя попытка сетевой сверки 21 октября была заблокирована. В этом этапе страницы ФИПИ и отдельные копии спецификаций прочитаны через поиск; материалы 2027 обозначены проектами. Шесть заявленных вложенных ZIP не доступны. Полный реестр источников, страниц и расхождений — в exam-requirements.json и materials-inventory.json; соответствие действующего банка 2027 году не заявляется.",
    "",
    ...officialSourceReview.urls.map((url) => `- ${url}`),
    "",
    "## Итоги",
    "",
    "| Экзамен / предмет | Задачи до → после | Материалы до → после | Номера с задачами до → после | Номера с теорией до → после |",
    "| --- | ---: | ---: | ---: | ---: |",
  ];
  for (const exam of current.exams) {
    const before = baseline.exams.find((item) => item.id === exam.id);
    lines.push(`| ${exam.title} | ${before?.taskCount ?? 0} → ${exam.taskCount} | ${before?.theoryCount ?? 0} → ${exam.theoryCount} | ${before?.numbersWithTasks ?? 0} → ${exam.numbersWithTasks} / ${exam.numberCount} | ${before?.numbersWithTheory ?? 0} → ${exam.numbersWithTheory} / ${exam.numberCount} |`);
  }
  lines.push("", `Уникальных опубликованных материалов: **${baseline.totals.uniqueTheory} → ${current.totals.uniqueTheory}**. Общие фундаментальные материалы учитываются в обоих экзаменах, поэтому суммы по экзаменам не равны числу уникальных статей. Активных задач: **${baseline.totals.activeTasks} → ${current.totals.activeTasks}**, включая ${current.totals.unnumberedActiveTasks} фундаментальных упражнений без экзаменационного номера. В данных также сохранены ${current.totals.inactiveTasks} недоступных старых задач базы для совместимости истории.`, "", "## По каждому номеру", "", "Теория до учитывает доступный материал той же части, связанный через тему задачи; после дополнительно учитываются явные связи `examNumbers`. Столбец «решения» относится к текущему банку.", "", "| Экзамен / предмет | № / часть | Раздел; связанные темы | Задачи до → после | Теория до → после | Решения | Проверка |", "| --- | --- | --- | ---: | ---: | ---: | --- |");
  for (const row of current.rows) {
    const before = baseline.rows.find((item) => item.examId === row.examId && item.number === row.number);
    const mode = row.automaticCount && row.selfAssessmentCount ? `авто ${row.automaticCount}; самооценка ${row.selfAssessmentCount}` : row.automaticCount ? "автоматическая" : row.selfAssessmentCount ? "самооценка; авторские ориентиры" : "нет задач";
    lines.push(`| ${row.exam}${row.level ? row.level === "base" ? " база" : " профиль" : ""} / математика | ${row.number} / ${row.part} | ${row.title}; ${row.topics.join(", ") || "—"} | ${before?.taskCount ?? 0} → ${row.taskCount} | ${before?.theoryCount ?? 0} → ${row.theoryCount} | ${row.solutionCount}/${row.taskCount} | ${mode} |`);
  }
  lines.push("", "## Темы и доступные прототипы внутри номеров", "", "Количество ниже относится к конкретной теме и прототипу; одинаковые числовые варианты не считаются новыми прототипами.", "", "| Экзамен / предмет | № | Тема | Задачи | Материалы | Прототипы (задач) |", "| --- | ---: | --- | ---: | ---: | --- |");
  for (const row of current.rows) for (const topic of row.topicCoverage) {
    lines.push(`| ${row.exam}${row.level ? row.level === "base" ? " база" : " профиль" : ""} / математика | ${row.number} | ${topic.title} | ${topic.taskCount} | ${topic.theoryCount} | ${topic.prototypes.map((prototype) => `${prototype.title} (${prototype.taskCount})`).join("; ") || "—"} |`);
  }
  const emptyTasks = current.rows.filter((row) => !row.taskCount);
  const emptyTheory = current.rows.filter((row) => !row.theoryCount);
  lines.push("", "## Оставшиеся пробелы и ограничения", "",
    `- Номера без задач: ${emptyTasks.map((row) => `${row.exam} №${row.number}`).join(", ") || "нет среди двух поддерживаемых конфигураций"}.`,
    `- Номера без связанной теории: ${emptyTheory.map((row) => `${row.exam} №${row.number}`).join(", ") || "нет среди двух поддерживаемых конфигураций"}.`,
    `- Неразрешённые связи: ${current.missingLinks.length ? current.missingLinks.join("; ") : "не обнаружены"}.`,
    "- Точное соответствие структуре, сложности, времени и критериям ФИПИ за нужный год не подтверждено из-за недоступных источников.",
    "- Параметрические варианты одного прототипа не заменяют разнообразие всех подтипов. Требуются дальнейшая методическая рецензия и задачи с иными условиями/чертежами, особенно для №1–5 ОГЭ и развёрнутой части.",
    "- Конкретные ограничения банка: ОГЭ №1–5 — один тип общего условия (участок), без шин/квартир/тарифов; новые отдельные задачи расширили подтипы второй части, но не закрыли все темы. В базе по четыре авторских семейства на номер, каждое с пятью наборами параметров. Минимум 20 задач на номер ОГЭ/профиля и разнообразие всех подтем пока не достигнуты. Координатные и вычислительные проверки не заменяют рецензию доказательств.",
    "- Официально согласованных критериев развёрнутых ответов нет. Доступны авторский образец и явно обозначенная самооценка; это не объективная оценка экзаменатора.",
    "- Базовый ЕГЭ доступен по прочитанной спецификации 2026 (копия PDF); старые неверно привязанные примеры базы сохранены только ради совместимости. Другие предметы недоступны.",
    "- Сервер, БД и аккаунты отсутствуют; закладки, попытки и результаты остаются в браузере. Перенос между устройствами не обещается.",
    "",
    "## Воспроизводимое наполнение и экспорт",
    "",
    "Банк собирается из авторских TypeScript-данных и детерминированных генераторов при сборке. Новые задачи добавляются после прежнего массива: исходные ID и индексы не меняются, пользовательские журналы не очищаются. Это seed статического каталога, не миграция несуществующей серверной БД.",
    "",
    "```sh", "node scripts/content-report.mjs", "node scripts/content-report.mjs --check", "node scripts/content-report.mjs --seed /tmp/tochka-content-seed.json", "```", "",
    "Последняя команда экспортирует версионированный JSON каталога (экзамены, задачи и теория) и SHA-256 для будущего серверного импорта. Она не читает и не изменяет localStorage пользователя. Повторный запуск на неизменном коде даёт тот же JSON и хеш. Будущий импорт должен выполнять upsert по стабильному task.id/materialId, проверять ссылки и сохранять старые записи, на которые ссылаются попытки. Удаление пользовательских событий не допускается.", "",
  );
  return lines.join("\n");
}

export function exportSeed(content) {
  const issues = contentIntegrityIssues(content);
  if (issues.length) throw new Error(`Seed blocked: ${issues.join("; ")}`);
  const data = {
    schemaVersion: 2, contentVersion: "2026-10-author-bank-reviewed-v2",
    officialSourceReview,
    sourceRegistry: createContentLoader()("src/lib/source-registry.ts").sourceRegistry,
    contentReview: readContentReviewManifest(),
    exams: content.examDefinitions, prototypes: content.prototypes,
    tasks: content.tasks, theory: content.theoryTopics, theoryTopicAliases: content.theoryTopicAliases ?? {},
  };
  const json = `${JSON.stringify(data, null, 2)}\n`;
  return { json, sha256: createHash("sha256").update(json).digest("hex") };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--capture-baseline")) {
    if (existsSync(baselinePath)) throw new Error("Baseline already exists; it must not be overwritten by current data");
    const revision = "1c8d914";
    const baseline = { revision, ...buildCoverage(loadContent({ revision })) };
    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(JSON.stringify(baseline.totals));
    return;
  }
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const content = loadContent();
  const current = buildCoverage(content);
  const issues = contentIntegrityIssues(content, current);
  if (issues.length) throw new Error(`Content issues: ${issues.join("; ")}`);
  if (!args.includes("--check")) {
    writeFileSync(resolve(projectRoot, "docs/content-coverage.md"), markdown(baseline, current));
    writeFileSync(resolve(projectRoot, "docs/content-coverage.json"), `${JSON.stringify({ officialSourceReview, before: baseline, after: current }, null, 2)}\n`);
  }
  if (args.includes("--seed")) {
    const target = args[args.indexOf("--seed") + 1];
    if (!target || target.startsWith("--")) throw new Error("Provide an output filename after --seed");
    const destination = resolve(target);
    const seed = exportSeed(content);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, seed.json);
    writeFileSync(`${destination}.sha256`, `${seed.sha256}\n`);
    console.log(`Seed: ${destination}; SHA-256 ${seed.sha256}`);
  }
  console.log(JSON.stringify(current.totals));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
