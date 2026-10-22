/** Facts transcribed from the cited specification copies, not published task text. */
const egeIndex = "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory";
const ogeIndex = "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory";
const base = "ege-2027-matematika-baza-specifikaciya.pdf";
const profile = "ege-2027-matematika-profil-specifikaciya.pdf";
const oge = "oge-2027-matematika-specifikaciya.pdf";
const pdf = (name, physical, printed, section) => ({
  source_pdf: name,
  source_url: `https://examlab.ru/fipi/${name}`,
  physical_page: physical,
  printed_page: printed,
  section,
  document_status: "draft",
  access_method: "web_pdf_text",
  attached_archive_integrity: "not_available_not_compared",
});

export const supplementalSourceReviews = [
  ...[[oge, 11, ogeIndex], [base, 6, egeIndex], [profile, 14, egeIndex]].map(([name, pages, index]) => ({
    name, year: 2027, role: "specification", physical_page_count: pages,
    url: `https://examlab.ru/fipi/${name}`, official_index_url: index,
    document_status: "draft", review_status: "structure_scoring_and_general_plan_read_from_independent_copy",
    sha256: null, byte_identity_with_fipi_archive: "not_verified",
    source_references: [pdf(name, 1, 1, "title")],
    scope_exclusions: ["complete_codifier_subtopics", "task_specific_demo_scoring_criteria", "archive_integrity"],
    publication_use: "requirements_facts_only_no_task_text_copied",
    license_or_permission_for_republishing_full_document: "not_established_document_not_republished",
  })),
  {
    name: "ma-11-ege-2026-spec-bazovyy.pdf", year: 2026, role: "specification", physical_page_count: 6,
    url: "https://pro-schools.ru/fipi/ege/spec/2026/ma-11-ege-2026-spec-bazovyy.pdf",
    official_index_url: egeIndex, document_status: "no_draft_mark_detected_final_status_not_independently_authenticated",
    review_status: "structure_scoring_and_general_plan_read_from_independent_copy", sha256: null,
    byte_identity_with_fipi_archive: "not_verified",
    publication_use: "requirements_facts_only_no_task_text_copied",
    license_or_permission_for_republishing_full_document: "not_established_document_not_republished",
  },
];

function row(source, number, label, contentCodes, requirementCodes, physical, printed, firstPartEnd, difficulty, maximum, minutes = null) {
  return {
    number,
    part: number <= firstPartEnd ? 1 : 2,
    content_summary: label,
    content_summary_status: "brief_editorial_label_not_exhaustive_codifier_mapping",
    content_codes: contentCodes,
    requirement_codes: requirementCodes,
    difficulty,
    answer_format: number <= firstPartEnd ? "short" : "extended",
    exact_short_answer_type: null,
    max_primary_score: maximum,
    approximate_task_minutes: minutes,
    scoring_criteria: null,
    scoring_criteria_status: number <= firstPartEnd ? "exact_answer_required" : "task_specific_demo_criteria_not_reviewed",
    source_references: [pdf(source, physical, printed, "general_plan")],
  };
}

const baseRows = [
  ["Вычисления", [1], [2], 7],
  ["Прикладные расчёты", [1], [6, 9], 5],
  ["Чтение данных", [1, 3, 6], [7], 5],
  ["Формулы и расчёты", [1, 2], [2, 6], 4],
  ["Вероятность", [6], [8], 10],
  ["Табличные данные", [1], [2, 7], 11],
  ["Графики и производная", [3, 4], [4, 5], 7],
  ["Логические рассуждения", [5], [1], 8],
  ["Практическая геометрия", [7], [9], 6],
  ["Планиметрия", [7], [9], 10],
  ["Стереометрия", [7], [10, 11], 11],
  ["Планиметрия", [7], [9], 8],
  ["Стереометрия", [7], [10, 11], 8],
  ["Числовые выражения", [1], [2], 5],
  ["Числовые задачи", [1], [2, 6], 8],
  ["Преобразования", [1], [2], 7],
  ["Уравнения", [2], [3], 7],
  ["Неравенства", [1, 2], [2, 3], 8],
  ["Числа и выбор метода", [1, 2], [2, 6, 13], 15],
  ["Текстовая задача", [2], [3, 6], 15],
  ["Числа и рассуждения", [1, 2], [2, 6, 13], 15],
].map(([label, content, requirements, minutes], index) => row(base, index + 1, label, content, requirements,
  index < 9 ? 5 : 6, index < 9 ? 10 : index < 19 ? 11 : 12, 21, "Б", 1, minutes));

const profileRows = [
  ["Планиметрия", [7], [9, 10, 11], "Б", 1, 3],
  ["Векторы", [7], [12], "Б", 1, 3],
  ["Стереометрия", [7], [9, 10, 11], "Б", 1, 3],
  ["Вероятность", [6], [8], "Б", 1, 2],
  ["Вероятностные модели", [6], [8], "П", 1, 7],
  ["Случайные величины", [6], [8], "П", 1, 8],
  ["Уравнения", [2], [3], "Б", 1, 2],
  ["Преобразования", [1], [2], "Б", 1, 3],
  ["Математический анализ", [3, 4], [4], "Б", 1, 5],
  ["Прикладные модели", [2], [6], "П", 1, 5],
  ["Текстовые задачи", [2], [6], "П", 1, 6],
  ["Функции", [3], [5], "П", 1, 8],
  ["Финансовые расчёты", ["1–3"], [6], "П", 1, 10],
  ["Уравнения", [2], [3], "П", 2, 10],
  ["Стереометрия", [7], [9, 10, 11], "П", 3, 20],
  ["Неравенства", [2], [3], "П", 2, 10],
  ["Прикладное моделирование", ["1–4"], [4, 6], "П", 2, 20],
  ["Планиметрия", [7], [9, 11], "П", 3, 35],
  ["Параметры", ["2–4"], [3, 5], "В", 4, 35],
  ["Целые числа", [1, 2, 5], [1, 2, 13], "В", 4, 40],
].map(([label, content, requirements, difficulty, maximum, minutes], index) => {
  const number = index + 1;
  const physical = number <= 3 ? 7 : number <= 6 ? 8 : number <= 9 ? 9 : number <= 13 ? 10 : number <= 15 ? 11 : number <= 18 ? 12 : 13;
  return row(profile, number, label, content, requirements, physical, physical + 5, 13, difficulty, maximum, minutes);
});

const ogeRows = [
  ...Array.from({ length: 4 }, () => ["Практические задачи", ["1–8"], ["8–10"]]),
  ["Чтение данных", [8], [14]],
  ["Вычисления", [1], [3]],
  ["Числа и координаты", [1, 6], [3]],
  ["Преобразования", [1, 2], [4]],
  ["Уравнения", [3], [5]],
  ["Вероятность", [8], [15]],
  ["Функции", [5], [6]],
  ["Формулы", [2], [4]],
  ["Неравенства", [3, 6], [5]],
  ["Последовательности", [4], [7]],
  ...Array.from({ length: 4 }, () => ["Геометрические вычисления", [7], [11]]),
  ["Утверждения", [7], [2]],
  ["Уравнения и неравенства", [2, 3], [5]],
  ["Текстовая задача", [3], [8]],
  ["Графики", [5], [6]],
  ["Геометрические вычисления", [7], [11]],
  ["Доказательство", [7], [2, 11]],
  ["Геометрическое исследование", [7], [11]],
].map(([label, content, requirements], index) => {
  const number = index + 1;
  const physical = number <= 3 ? 7 : number <= 10 ? 8 : number <= 16 ? 9 : number <= 22 ? 10 : 11;
  return row(oge, number, label, content, requirements, physical, physical + 6, 19,
    number <= 19 ? "Б" : number === 22 || number === 25 ? "В" : "П", number <= 19 ? 1 : 2);
});

function target(source, rows, duration, maximum, firstPartEnd, index, config) {
  const struct = pdf(source, config.structure[0], config.structure[1], "structure");
  const score = pdf(source, config.scoring[0], config.scoring[1], "scoring");
  const time = pdf(source, config.duration[0], config.duration[1], "duration");
  const equipment = pdf(source, config.equipment[0], config.equipment[1], "equipment");
  return {
    verification_status: "draft_specification_read_from_independent_copy",
    document_status: "draft_not_final_approved",
    official_index_url: index,
    number_count: rows.length,
    parts: [{ part: 1, numbers: rows.slice(0, firstPartEnd).map((entry) => entry.number), answer_format: "short" },
      ...(firstPartEnd < rows.length ? [{ part: 2, numbers: rows.slice(firstPartEnd).map((entry) => entry.number), answer_format: "extended" }] : [])],
    duration_minutes: duration,
    maximum_primary_score: maximum,
    permitted_materials: ["ruler", "reference_materials_provided_with_exam"],
    scoring_criteria: { short: "exact_answer_in_prescribed_format", extended: firstPartEnd === rows.length ? "not_applicable" : "expert_assessed_task_specific_criteria_pending_demo_review" },
    rules: { automatic_extended_answer_grading: false, official_test_score_conversion: null, exact_exam_date: null },
    numbers: rows,
    parameter_sources: { number_count: [struct], parts: [struct], duration_minutes: [time], maximum_primary_score: [score], permitted_materials: [equipment], scoring_criteria: [score] },
    source_references: [pdf(source, 1, 1, "draft_title"), struct, score, time, equipment],
    codifier_subtopic_coverage: "not_reviewed",
    task_specific_demo_criteria_reviewed: false,
  };
}

export const reviewedDraftRequirements = {
  "oge-math": target(oge, ogeRows, 235, 31, 19, ogeIndex, { structure: [3, 6], scoring: [6, 11], duration: [5, 10], equipment: [6, 11] }),
  "ege-math-base": target(base, baseRows, 180, 21, 21, egeIndex, { structure: [3, 6], scoring: [5, 9], duration: [4, 8], equipment: [4, 8] }),
  "ege-math-profile": {
    ...target(profile, profileRows, 235, 33, 13, egeIndex, { structure: [4, 7], scoring: [5, 10], duration: [5, 9], equipment: [5, 9] }),
    source_conflicts: [{
      field: "aggregate_difficulty_distribution",
      status: "unresolved_internal_inconsistency_in_independent_copy",
      observations: [
        { value: { basic: 7, advanced: 11, high: 2 }, source_reference: pdf(profile, 5, 9, "section_7") },
        { value: { basic: 6, advanced: 12, high: 2 }, source_reference: pdf(profile, 14, 19, "general_plan_total") },
      ],
      action: "Do not choose silently; compare with canonical attached PDF/FIPI archive and the final approved revision.",
    }],
  },
};

export const reviewedChanges = {
  "oge-math": [{ from_year: 2026, to_year: 2027, status: "no_structure_content_changes_reported_by_2027_draft", independently_compared_previous_document: false, sources: [pdf(oge, 6, 12, "changes")] }],
  "ege-math-base": [
    { from_year: 2026, to_year: 2027, status: "no_structure_content_changes_reported_by_2027_draft", independently_compared_previous_document: true, sources: [pdf(base, 5, 9, "changes"), { source_pdf: "ma-11-ege-2026-spec-bazovyy.pdf", source_url: supplementalSourceReviews[3].url, physical_page: 6, printed_page: 12, section: "general_plan_total" }] },
    { from_year: 2025, to_year: 2026, status: "no_structure_content_changes_reported_by_2026_spec_copy", independently_compared_previous_document: false, sources: [{ source_pdf: "ma-11-ege-2026-spec-bazovyy.pdf", source_url: supplementalSourceReviews[3].url, physical_page: 5, printed_page: 9, section: "changes" }] },
  ],
  "ege-math-profile": [{
    from_year: 2026, to_year: 2027, status: "draft_changes_detected",
    independently_compared_previous_document: false,
    number_count: { previous: 19, draft: 20 }, maximum_primary_score: { previous: 32, draft: 33 },
    content_changes: ["new_short_random_variable_item_6", "short_finance_item_13", "extended_modelling_item_17", "renumbering_requires_versioned_task_mapping"],
    sources: [pdf(profile, 6, 11, "changes")],
  }],
};
