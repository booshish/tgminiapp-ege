import type { ExamDefinition, ExamNumberDefinition } from "./exams";

const ogeTitles = ["Объём текста", "Декодирование", "Логические условия", "Информационные модели", "Исполнитель", "Исполнение программы", "Адресация в интернете", "Поисковые запросы", "Схемы и пути", "Системы счисления", "Поиск в файлах", "Отбор файлов", "Презентация или документ", "Электронная таблица", "Программа для исполнителя", "Программа на языке программирования"];
const egeTitles = ["Модели и графы", "Таблица истинности", "Базы данных", "Кодирование", "Преобразование чисел", "Исполнение алгоритма", "Объём изображения и звука", "Комбинаторика слов", "Электронные таблицы", "Маска подсети", "Информационный объём", "Команды исполнителя", "Анализ алгоритма", "Позиционные системы", "Математическая логика", "Рекурсия", "Числовые последовательности", "Табличная оптимизация", "Анализ игры", "Выигрышная стратегия", "Дерево игры", "Параллельные процессы", "Алгоритмы на графах", "Обработка строк", "Обработка целых чисел", "Сортировка данных", "Анализ данных"];
export const informaticsSources = {
  ОГЭ: "https://pro-schools.ru/fipi/oge/spec/2027/inf-9-oge-2027-spec.pdf",
  ЕГЭ: "https://pro-schools.ru/fipi/ege/spec/2027/inf-11-ege-2027-spec.pdf",
};
/** Only source-reviewed models are registered; unknown counts are never guessed. */
export const subjectExamDefinitions: ExamDefinition[] = (["ОГЭ", "ЕГЭ"] as const).map((exam) => ({
  id: `${exam === "ОГЭ" ? "oge" : "ege"}-informatics`, examType: exam, subjectId: "informatics", level: null,
  year: 2027, versionId: `${exam === "ОГЭ" ? "oge" : "ege"}-informatics-2027-draft`, available: true,
  title: `${exam} · Информатика`, verificationStatus: "draft-source-reviewed",
  verificationNote: "Проект ФИПИ 2027. Прочитана копия спецификации; идентичность каноническому архиву не проверена. Это авторские тренировочные задания. Неподготовленные номера обозначены отдельно.",
  sources: [{ title: "ФИПИ: проекты 2027", url: `https://fipi.ru/${exam === "ОГЭ" ? "oge" : "ege"}/demoversii-specifikacii-kodifikatory` }, { title: "Копия спецификации, обобщённый план", url: informaticsSources[exam] }],
  numbers: (exam === "ОГЭ" ? ogeTitles : egeTitles).map((title, i): ExamNumberDefinition => ({
    number: i + 1, title, part: exam === "ОГЭ" && i >= 12 ? 2 : 1,
    answerFormat: exam === "ОГЭ" && i >= 12 ? "extended" : "short",
    maxPrimaryScore: exam === "ЕГЭ" ? i < 25 ? 1 : 2 : i < 12 ? 1 : i === 13 ? 3 : 2,
    scoringStatus: "not-configured",
    sourceReference: { url: informaticsSources[exam], pdfPage: exam === "ОГЭ" ? 7 : i < 7 ? 7 : 8 },
    ...(exam === "ОГЭ" && i >= 12 ? { pendingReason: [
      "Нужны оригинальные материалы для документа/презентации и проверенные критерии.",
      "Нужны файл электронной таблицы и критерии проверки работы.",
      "Нужны оригинальное поле исполнителя, среда исполнения и критерии.",
      "Нужны набор тестов для программы и сверка критериев экспертной проверки.",
    ][i - 12] } : {}),
    ...(exam === "ЕГЭ" && [3, 9, 17, 18, 22, 24, 26, 27].includes(i + 1) ? { pendingReason: "Нужен оригинальный проверенный файл данных и сверка формата ответа по демоверсии." } : {}),
  })),
}));
