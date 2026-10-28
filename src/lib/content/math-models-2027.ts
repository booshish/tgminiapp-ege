import type { ExamDefinition } from "../exams";

const titles={
  oge:"Практические задачи|Практические задачи|Практические задачи|Практические задачи|Чтение данных|Числа и вычисления|Числа и координаты|Преобразования выражений|Уравнения|Вероятность|Функции|Расчёты по формулам|Неравенства|Последовательности|Геометрические вычисления|Геометрические вычисления|Геометрические вычисления|Геометрические вычисления|Геометрические утверждения|Уравнения и неравенства|Текстовая задача|Графики функций|Геометрические вычисления|Доказательство|Геометрическое исследование",
  base:"Вычисления|Прикладные расчёты|Чтение данных|Формулы и расчёты|Вероятность|Табличные данные|Графики и производная|Логические рассуждения|Практическая геометрия|Планиметрия|Стереометрия|Планиметрия|Стереометрия|Числовые выражения|Проценты и числовые задачи|Преобразования|Уравнения|Неравенства|Числа и выбор метода|Текстовая задача|Числа и рассуждения",
  profile:"Планиметрия|Векторы|Стереометрия|Вероятность|Вероятностные модели|Случайные величины|Уравнения|Преобразования выражений|Математический анализ|Прикладные модели|Текстовые задачи|Функции|Финансовые расчёты с кратким ответом|Уравнения с развёрнутым решением|Стереометрия|Неравенства|Прикладное моделирование с обоснованием|Планиметрия|Параметры|Целые числа",
};
export const mathModels2027: ExamDefinition[] = (["oge","base","profile"] as const).map(kind=>{
  const oge=kind==="oge",base=kind==="base",id=oge?"oge-math":`ege-math-${kind}`,firstPart=oge?19:base?21:13;
  const local=base?"docs/fipi/МА-11 ЕГЭ 2027 СПЕЦ_базовый.pdf":"docs/fipi/МА-11 ЕГЭ 2027 СПЕЦ_профильный.pdf";
  const spec=oge?"https://examlab.ru/fipi/oge-2027-matematika-specifikaciya.pdf":`https://examlab.ru/fipi/ege-2027-matematika-${base?"baza":"profil"}-specifikaciya.pdf`;
  const scores=oge?[...Array(19).fill(1),...Array(6).fill(2)]:base?Array(21).fill(1):[...Array(13).fill(1),2,3,2,2,3,4,4];
  return {id,examType:oge?"ОГЭ":"ЕГЭ",subjectId:"math",level:oge?null:kind,year:2027,versionId:`${id}-2027-draft`,available:true,
    title:oge?"ОГЭ · Математика":`ЕГЭ · Математика (${base?"база":"профиль"})`,durationMinutes:base?180:235,maxPrimaryScore:oge?31:base?21:33,
    verificationStatus:"draft-source-reviewed",verificationNote:"Проект ФИПИ 2027, не окончательная утверждённая версия. Номера и максимумы сверены со спецификацией. Старые задания привязаны только по проверенной карте совместимости; неполный пробник недоступен. Критерии конкретных развёрнутых ответов проверяются отдельно.",
    sourceReview:{scope:"numbered-specification",canonicalArchiveVerified:false,criteriaComplete:base,reviewedAt:"2026-10-27",limitations:["Проект 2027, не утверждённая модель",...(!oge?[`Локальный источник: ${local}`]:[]),...(base?[]:["Не все поэлементные критерии развёрнутых задач проверены"])]},
    sources:[{title:"ФИПИ: проекты 2027",url:`https://fipi.ru/${oge?"oge":"ege"}/demoversii-specifikacii-kodifikatory`},{title:"Прочитанная PDF-копия, не канонический архив",url:spec}],
    numbers:titles[kind].split("|").map((title,i)=>({number:i+1,title,part:i<firstPart?1:2,answerFormat:i<firstPart?"short":"extended",responseKind:i<firstPart?"numeric":"written",maxPrimaryScore:scores[i],scoringStatus:"not-configured",
      ...(kind==="profile"?{practiceAnswerFormat:i<firstPart?"number" as const:"extended" as const,answerRuleTypes:i<firstPart?["number" as const]:["self" as const]}:{}),
      sourceReference:{url:spec,pdfPage:oge?i<19?9:10:base?i<9?5:6:i<3?7:i<6?8:i<13?9:i<16?10:i===16?11:i===17?12:i===18?13:14},
      evaluation:{mode:i<firstPart?"automatic":"expert",criteriaUrl:spec,note:i<firstPart?"Полный ключ в формате конкретного задания. Первичные баллы не являются XP.":"Требуется полное решение и поэлементная самопроверка/эксперт. Наличие старой авторской памятки не подтверждает критерии 2027."},
      ...(kind==="profile"&&i+1===17?{pendingReason:"Авторские тренировки с самопроверкой доступны. Полный пробник требует подтверждения критериев всех развёрнутых номеров проекта 2027."}:{}),
    })),
  };
});
