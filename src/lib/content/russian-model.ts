import type { ExamDefinition } from "../exams";
export const russianSources = {
  ОГЭ: "https://pro-schools.ru/fipi/oge/spec/2027/ru-9-oge-2027-spec.pdf",
  ЕГЭ: "https://pro-schools.ru/fipi/ege/spec/2027/ru-11-ege-2027-spec.pdf",
};
export const russianTitles = {
  ОГЭ: ["Сжатое изложение", "Грамматическая основа", "Синтаксический анализ", "Соответствие пунктуационных правил", "Пунктуация в предложении", "Объяснение написания", "Пропущенные буквы", "Грамматические нормы", "Синонимия словосочетаний", "Содержание текста", "Средства выразительности", "Лексический анализ", "Сочинение по тексту"],
  ЕГЭ: ["Связь предложений", "Значение слова в контексте", "Стилистика текста", "Ударение", "Паронимы", "Лексические нормы", "Грамматические нормы", "Синтаксические нормы", "Орфография корня", "Приставки и разделительные знаки", "Суффиксы", "Окончания и причастия", "НЕ и НИ", "Слитно, раздельно, через дефис", "Н и НН", "Однородные члены и сложные предложения", "Обособление", "Вводные слова и обращения", "Сложноподчинённое предложение", "Разные виды связи", "Пунктуационный анализ", "Средства выразительности: соответствие", "Содержание текста", "Типы речи и информация", "Лексика текста", "Связь предложений текста", "Сочинение"],
};
/** Only facts of the read draft; not an endorsement or an official full variant. */
export const russianModels: ExamDefinition[] = (["ОГЭ", "ЕГЭ"] as const).map(exam => ({
  id: `${exam === "ОГЭ" ? "oge" : "ege"}-russian`, subjectId: "russian", examType: exam, level: null,
  year: 2027, versionId: `${exam === "ОГЭ" ? "oge" : "ege"}-russian-2027-draft`, available: true,
  title: `${exam} · Русский язык`, verificationStatus: "draft-source-reviewed",
  maxPrimaryScore: exam === "ОГЭ" ? 38 : 50,
  durationMinutes:exam === "ОГЭ" ? 235 : 210,
  ...(exam === "ОГЭ" ? { sharedScoringPools: [{ id: "literacy-and-factual-accuracy", maximum: 13, appliesTo: [1, 13], criteriaStatus: "pending-task-specific-review" as const }] } : {}),
  verificationNote: `Прочитана PDF-копия проекта 2027, не канонический ZIP. Это оригинальная практика, не полный вариант. ${exam === "ОГЭ" ? "Три части: №1, №2–12, №13. Максимум 38 включает 13 баллов общей грамотности изложения и сочинения, не распределённых между номерами." : "№1–26 — краткие ответы, №27 — сочинение; максимум 50."} Практика проверяет полный ответ, без экзаменационных частичных баллов и XP. Изложение и сочинения не подготовлены.`,
  sources: [{ title: "ФИПИ: индекс проектов", url: `https://fipi.ru/${exam === "ОГЭ" ? "oge" : "ege"}/demoversii-specifikacii-kodifikatory` }, { title: "Прочитанная PDF-копия", url: russianSources[exam] }],
  numbers: russianTitles[exam].map((title, index) => {
    const number = index + 1;
    const extended = exam === "ОГЭ" ? number === 1 || number === 13 : number === 27;
    return {
      number, title, part: exam === "ОГЭ" ? number === 1 ? 1 : number === 13 ? 3 : 2 : number === 27 ? 2 : 1,
      answerFormat: extended ? "extended" : "short",
      maxPrimaryScore: exam === "ОГЭ" ? number === 1 ? 6 : number === 13 ? 8 : 1 : number === 27 ? 22 : [8,22].includes(number) ? 2 : 1,
      scoringStatus: "not-configured",
      sourceReference: { url: russianSources[exam], pdfPage: exam === "ОГЭ" ? 7 : number === 27 ? 10 : 9 },
      ...(extended ? { pendingReason: exam === "ОГЭ" && number === 1 ? "Нужны оригинальное аудио и проверенные критерии изложения." : "Нужны полноценный текст и сверенные критерии самопроверки сочинения." } : {}),
    };
  }),
}));
