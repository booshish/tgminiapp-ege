import type { ExamDefinition, ExamNumberDefinition } from "../exams";

/** Structural facts of PDF copies only. No demo statements/solutions are published. */
export const scienceSources = {
  "oge-physics": { spec: "https://examlab.ru/fipi/oge-2027-fizika-specifikaciya.pdf", demo: "https://examlab.ru/fipi/oge-2027-fizika-demo.pdf", codifier: "https://examlab.ru/fipi/oge-2027-fizika-kodifikator.pdf", archive: "https://doc.fipi.ru/oge/demoversii-specifikacii-kodifikatory/2027/fi_9_2027.zip" },
  "oge-chemistry": { spec: "https://pro-schools.ru/fipi/oge/spec/2027/hi-9-oge-2027-spec.pdf", demo: "https://pro-schools.ru/fipi/oge/demo/2027/hi-9-oge-2027-demo.pdf", codifier: "https://pro-schools.ru/fipi/oge/codif/2027/hi-9-oge-2027-kodif.pdf", archive: "https://doc.fipi.ru/oge/demoversii-specifikacii-kodifikatory/2027/hi_9_2027.zip" },
  "ege-chemistry": { spec: "https://pro-schools.ru/fipi/ege/spec/2027/hi-11-ege-2027-spec.pdf", demo: "https://pro-schools.ru/fipi/ege/demo/2027/hi-11-ege-2027-demo.pdf", codifier: "https://pro-schools.ru/fipi/ege/codif/2027/hi-11-ege-2027-kodif.pdf", archive: "https://doc.fipi.ru/ege/demoversii-specifikacii-kodifikatory/2027/hi_11_2027.zip" },
};
const physicsTitles = ["Понятия и единицы", "Приборы и явления", "Распознавание явлений", "Свойства явлений", "Объяснение явлений", "Расчёт: механика", "Расчёт: механика", "Расчёт: теплота", "Расчёт: электричество", "Расчёт: электричество", "Расчёт: атом и ядро", "Изменения: механика и теплота", "Изменения: электромагнетизм и атом", "Графики и таблицы", "Измерения", "Анализ исследования", "Лабораторный эксперимент", "Физический текст", "Качественная задача", "Расчётная задача", "Составная задача", "Составная задача"];
const ogeChemistryTitles = ["Вещества и химические понятия", "Строение атома", "Периодические свойства", "Окисление и валентность", "Связь и кристаллы", "Свойства элементов", "Классификация веществ", "Химические свойства", "Реакции веществ", "Реакционная способность", "Классификация реакций", "Наблюдения эксперимента", "Диссоциация", "Ионные уравнения", "Окислитель и восстановитель", "Безопасность и смеси", "Качественные реакции", "Молярная масса и состав", "Химическая информация", "Электронный баланс", "Цепочки превращений", "Расчёты реакций и растворов", "Химический эксперимент"];
const egeChemistryTitles = ["Электроны и атом", "Периодический закон", "Электроотрицательность и окисление", "Связь и решётки", "Номенклатура неорганики", "Неорганические реакции", "Свойства неорганики", "Превращения неорганики", "Цепочки неорганики", "Классы органики", "Изомерия и строение", "Углеводороды и производные", "Биологически значимые вещества", "Реакции органики", "Кислородсодержащая органика", "Цепочки органики", "Классификация реакций", "Скорость реакции", "Окисление и восстановление", "Электролиз", "Гидролиз и pH", "Смещение равновесия", "Равновесие и расчёты", "Распознавание веществ", "Применение химии", "Растворы и концентрация", "Термохимия", "Выход продукта и примеси", "Электронный баланс", "Ионные реакции", "Неорганические цепочки", "Органические цепочки", "Формула органического вещества", "Сложные расчёты"];

export const scienceModels: ExamDefinition[] = (["oge-physics", "oge-chemistry", "ege-chemistry"] as const).map(id => {
  const physics = id === "oge-physics", ege = id === "ege-chemistry";
  const sources = scienceSources[id];
  const titles = physics ? physicsTitles : ege ? egeChemistryTitles : ogeChemistryTitles;
  const shortEnd = physics ? 16 : ege ? 28 : 19;
  const twoPoint = physics ? [1,2,4,12,13,14,16] : ege ? [6,7,8,14,15,22,23,24] : [4,9,10,12,17];
  const extendedScores: Record<number,number> = physics ? {17:3,18:2,19:2,20:3,21:3,22:3} : ege ? {29:2,30:2,31:4,32:5,33:3,34:4} : {20:3,21:3,22:3,23:5};
  const numeric = physics ? [6,7,8,9,10,11] : ege ? [26,27,28] : [18,19];
  const unordered = physics ? [14,16] : ege ? [1,3,4,11,12,13,18] : [1,5,6,8,11,13,14,16];
  return {
    id, examType: ege ? "ЕГЭ" : "ОГЭ", subjectId: physics ? "physics" : "chemistry", level: null,
    year: 2027, versionId: `${id}-2027-draft`, available: true,
    title: `${ege ? "ЕГЭ" : "ОГЭ"} · ${physics ? "Физика" : "Химия"}`,
    durationMinutes: ege ? 210 : 180, maxPrimaryScore: physics ? 39 : ege ? 56 : 38,
    verificationStatus: "draft-source-reviewed",
    verificationNote: "Проект ФИПИ 2027, не утверждённая версия. Прочитаны PDF-копии демоверсии, спецификации и кодификатора. Официальный ZIP недоступен веб-инструменту; побайтовая идентичность копий не проверена. Только авторская практика: краткие ответы проверяются целиком, без частичных экзаменационных баллов и нового XP; развёрнутые ответы и реальный эксперимент требуют эксперта/оборудования и пока не опубликованы.",
    sources: [{title:"Официальный архив проекта (ZIP)",url:sources.archive},{title:"Спецификация, PDF-копия",url:sources.spec},{title:"Демоверсия и критерии, PDF-копия",url:sources.demo},{title:"Кодификатор, PDF-копия",url:sources.codifier}],
    numbers: titles.map((title,index): ExamNumberDefinition => {
      const number=index+1, extended=number>shortEnd, experiment=physics ? number===17 : !ege && number===23;
      const isNumeric=numeric.includes(number), order=unordered.includes(number)?"unordered":"ordered";
      const max=extended?extendedScores[number]:twoPoint.includes(number)?2:1;
      const pdfPage=physics ? number<=5?7:number<=11?8:number<=19?9:10 : ege ? number<=6?7:number<=14?8:number<=31?9:10 : number<=8?6:number<=17?7:8;
      return {number,title,part:extended?2:1,answerFormat:extended?"extended":"short",maxPrimaryScore:max,scoringStatus:"not-configured",
        practiceAnswerFormat:extended?"extended":isNumeric?"number":"text",answerRuleTypes:extended?["self"]:isNumeric?["number"]:!physics&&!ege&&number===2?["text"]:["choices"],
        sourceReference:{url:sources.spec,pdfPage},
        evaluation:{mode:experiment?"experiment":extended?"expert":"automatic",...(!isNumeric&&!extended?{ordering:order as "ordered"|"unordered"}:{}),criteriaUrl:sources.demo,criteriaPdfPage:physics?10:ege?13:8,note:extended?"Ссылка на раздел оценивания демоверсии. Для конкретного авторского задания ещё нужны сверенные поэлементные критерии; автоматическая оценка запрещена.":max===2?"Официально возможен 1 балл за частично верный ответ по правилам спецификации. Тренажёр проверяет только полный ключ, баллы экзамена не назначает.":"Полное совпадение ответа; точность и единицы задаются условием."},
        requiredResources:experiment?["Реальное лабораторное оборудование и наблюдение специалиста"]:physics&&number===18?["Полноценный исходный физический текст"]:!physics&&!ege&&number===2?["Схема атома или полное распределение электронов в условии"]:[],
        ...(extended?{pendingReason:experiment?"Реальное экспериментальное задание: нужны оборудование и проверка специалистом.":"Нужны оригинальное развёрнутое задание, его ресурсы и сверенные поэлементные критерии; автоматическая оценка не выполняется."}:{}),
      };
    }),
  };
});
