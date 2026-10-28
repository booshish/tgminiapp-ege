import type { ExamDefinition, ExamNumberDefinition } from "./exams";
import { russianModels } from "./content/russian-model";
import { scienceModels } from "./content/science-models";
import { remainingModels } from "./content/remaining-models";

// Keep existing subject order; their content factories rely on their own entries.

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
  ...(exam === "ЕГЭ" ? { maxPrimaryScore: 29, durationMinutes: 235 } : {maxPrimaryScore:21,durationMinutes:150}),
  verificationNote: "Проект ФИПИ 2027. Прочитана копия спецификации; идентичность каноническому архиву не проверена. Это авторские тренировочные задания. Неподготовленные номера обозначены отдельно.",
  sources: [{ title: "ФИПИ: проекты 2027", url: `https://fipi.ru/${exam === "ОГЭ" ? "oge" : "ege"}/demoversii-specifikacii-kodifikatory` }, { title: "Копия спецификации, обобщённый план", url: informaticsSources[exam] }],
  numbers: (exam === "ОГЭ" ? ogeTitles : egeTitles).map((title, i): ExamNumberDefinition => ({
    number: i + 1, title, part: exam === "ОГЭ" && i >= 12 ? 2 : 1,
    answerFormat: exam === "ОГЭ" && i >= 12 ? "extended" : "short",
    maxPrimaryScore: exam === "ЕГЭ" ? i < 25 ? 1 : 2 : i < 12 ? 1 : i === 13 ? 3 : 2,
    scoringStatus: "not-configured",
    sourceReference: { url: informaticsSources[exam], pdfPage: exam === "ОГЭ" ? 7 : i < 7 ? 7 : 8 },
    ...(exam === "ЕГЭ" && i + 1 === 9 ? {practiceAnswerFormat:"number" as const,answerRuleTypes:["number" as const],requiredResources:["Оригинальная таблица данных TSV"]} : {}),
    ...(exam === "ОГЭ" && i >= 12 ? { pendingReason: [
      "Нужны оригинальные материалы для документа/презентации и проверенные критерии.",
      "Нужны файл электронной таблицы и критерии проверки работы.",
      "Нужны оригинальное поле исполнителя, среда исполнения и критерии.",
      "Нужны набор тестов для программы и сверка критериев экспертной проверки.",
    ][i - 12] } : {}),
    ...(exam === "ЕГЭ" && [3, 9, 17, 18, 22, 24, 26, 27].includes(i + 1) ? { pendingReason: i+1===9 ? "Доступен авторский подтип с TSV-таблицей; остальные форматы номера требуют отдельной проверки." : "Нужен оригинальный проверенный файл данных и сверка формата ответа по демоверсии." } : {}),
  })),
}));

export const physicsSource = "https://pro-schools.ru/fipi/ege/spec/2027/fi-11-ege-2027-spec.pdf";
subjectExamDefinitions.push(...russianModels);
const physicsTitles = ["Движение по прямой", "Силы и ускорение", "Импульс и энергия", "Равновесие, колебания и волны", "Анализ механических процессов", "Соответствия в механике", "Частицы и температура", "Теплота и работа газа", "Анализ тепловых процессов", "Соответствия в тепловых процессах", "Заряды и постоянный ток", "Магнитное поле и индукция", "Контур и геометрическая оптика", "Анализ электромагнитных процессов", "Соответствия в электродинамике", "Атом и ядро", "Анализ квантовых явлений", "Физический смысл величин", "Показания приборов", "Планирование опыта", "Качественная задача: электродинамика", "Расчётная задача: механика", "Расчётная задача: тепловые явления", "Составная задача: термодинамика", "Составная задача: электродинамика", "Механика с обоснованием модели"];
subjectExamDefinitions.push({
  id: "ege-physics", examType: "ЕГЭ", subjectId: "physics", level: null,
  durationMinutes:235, maxPrimaryScore:45,
  year: 2027, versionId: "ege-physics-2027-draft", available: true,
  title: "ЕГЭ · Физика", verificationStatus: "draft-source-reviewed",
  verificationNote: "Проект 2027: сверены таблица содержания и план по PDF-копии спецификации, не каноническому архиву. Готовы тренировочные номера 1–4; остальные требуют отдельных заданий и проверки формата/критериев. Полных вариантов нет.",
  sources: [{ title: "ФИПИ: проекты ЕГЭ 2027", url: "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory" }, { title: "Копия спецификации: PDF с. 2–3, 6–8", url: physicsSource }],
  numbers: physicsTitles.map((title, i) => ({
    number: i + 1, title, part: i < 20 ? 1 : 2,
    answerFormat: i < 20 ? "short" : "extended",
    maxPrimaryScore: i < 20 ? [5,6,9,10,14,15,17,18].includes(i+1) ? 2 : 1 : [3,2,2,3,3,4][i-20],
    scoringStatus: "not-configured",
    sourceReference: { url: physicsSource, pdfPage: i < 10 ? 7 : 8 },
    ...(i >= 4 ? { pendingReason: i < 20 ? "Ещё нет оригинального задания с проверенным форматом ответа и необходимыми ресурсами." : "Нужны оригинальное развёрнутое задание, решение и сверенные критерии самопроверки." } : {}),
  })),
});
// Append new models after every existing entry: preserve historical first-match/order consumers.
subjectExamDefinitions.push(...scienceModels);
subjectExamDefinitions.push(...remainingModels);
