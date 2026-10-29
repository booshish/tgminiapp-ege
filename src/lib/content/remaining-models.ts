import type { ExamDefinition, ExamNumberDefinition } from "../exams";
import type { SubjectId } from "../subjects";
import { subjectTitle } from "../subjects";

/** Facts only from 2027 draft specification copies. Not official task content.
 * Full codifier expansion and task-specific rubrics remain explicit release gates.
 * Do not infer import contracts from the existence of a numbered slot.
 */
const pdf = (exam: "oge" | "ege", code: string, role: "spec" | "demo" | "codif") =>
  `https://pro-schools.ru/fipi/${exam}/${role}/2027/${code}-${exam === "oge" ? 9 : 11}-${exam}-2027-${role === "codif" ? "kodif" : role}.pdf`;
type Plan = {
  exam: "oge" | "ege"; subject: SubjectId; code: string; minutes: number; max: number;
  titles: string[]; scores: number[]; extended: number[]; numeric?: number[]; words?: number[];
  matching?: number[]; sequence?: number[]; unordered?: number[]; partEnd?: number;
  pages: number[]; resources?: Record<number, string[]>;
};
const split = (s: string) => s.split("|");
const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
const bioOge = split("Биология и методы|Многообразие организмов|Систематика: последовательность|Графические данные исследования|Алгоритм опыта и последовательность процессов|Приборы и инструменты|Описание организма|Клеточные структуры и процессы|Сравнение растений и животных|Термины в тексте|Сопоставление организмов|Достоверность биологической информации|Морфологические модели животных|Органы человека на рисунке|Жизнедеятельность человека|Строение и поведение человека на рисунке|Признаки организма человека|Системы органов человека|Экосистема: множественный выбор|Пищевая цепь: последовательность|Сопоставление объектов экосистемы|Объяснение строения объекта|Объяснение эксперимента|Анализ биологического текста|Статистика и схемы|Питание и биологические расчёты");
const bioEge = split("Науки о живом: таблица|Методы биологии: выбор|Цитология и трофические расчёты|Генетическое скрещивание|Клетка и организм: рисунок|Клетка и организм: соответствие|Клетка и организм: выбор|Клетка и организм: последовательность|Многообразие организмов: рисунок|Многообразие организмов: соответствие|Многообразие организмов: выбор|Систематика: последовательность|Человек: рисунок|Человек: соответствие|Человек: выбор|Человек: последовательность|Эволюция: текст|Экосистемы и биосфера: выбор|Эволюция и экология: соответствие|Общая биология: таблица|Экспериментальные данные|Методология эксперимента|Выводы и прогнозы эксперимента|Биологический объект: изображение|Человек и многообразие организмов|Общая биология в новой ситуации|Цитологическая задача|Генетическая задача");
const geoOge = split("Географические объекты|Географическое положение России|Земля и природные закономерности|Природа и население России|Атмосфера: погода|Климат России|Координаты на карте|Геохронология|Расстояния на плане|Направления на плане|Профиль рельефа|Обоснование выбора участка|Статистические расчёты|Природопользование|Экологическая безопасность|Земля и климатические связи|Земля и Солнце|Климатограмма|Статистика населения России|Материки и регионы|Определение территории|Географические процессы и понятия|Население и хозяйство: таблица|Демографические расчёты|Население России: сравнение|Географическое пространство России|Хозяйство и регионы России|Географический текст: территория|Географический текст: понятие|Географический текст: объяснение");
const geoEge = split("Координаты и карта|Атмосфера и климат|Агроклиматические ресурсы|Гидросфера и рельеф|Природа регионов: соответствие|Размещение населения России|Структура хозяйства|Демографические показатели|География промышленности|Хозяйство России|Атмосфера и карта|Население и мировое хозяйство|Геологическая хронология|Время на территории России|Ресурсообеспеченность|Миграционный прирост|Страна по описанию|Регион России по описанию|Городское и сельское расселение|Расселение и статистика|Географический анализ текста|Термин в географическом тексте|Текст: объяснение|Географическое обоснование|Географическое обоснование|Расчёт с обоснованием|Расчёт с обоснованием|Прогноз и оценка|Географическая задача с аргументацией");
geoEge[23]="Качество жизни населения: объяснение";
geoEge[24]="Сельское хозяйство мира: объяснение";
geoEge[27]="Географическая карта: обоснование";
const historyOge = split("Даты и события|Хронология|Термин по определению|Исторические факты: выбор|Термин по критерию|Тезисы и факты|Статистическая таблица|Историческая карта|Историческая карта|Карта и текст|Изображение|Логическая схема|Памятники культуры|Памятники культуры|Деятели всеобщей истории|Факты всеобщей истории|Источник всеобщей истории|Атрибуция источника|Информация в источнике|Контекст источника|Исправление ошибок в тексте|Сравнение событий|Анализ исторической ситуации");
const historyEge = split("Даты: соответствие|Хронология|Факты: соответствие|Историческая таблица|Деятели: соответствие|Письменный источник|История культуры|Великая Отечественная война: изображение|Историческая карта|Историческая карта|Карта и текст|Карта: множественный выбор|Атрибуция источника|Поиск в источнике|Контекст источника всеобщей истории|Изображения|Изображения|Источники о Великой Отечественной войне|Причины и следствия|Историческое понятие|Сравнение событий|Историческая аргументация");
const socialOge = split("Понятия и ценности: объяснение|Обобщающее понятие|Сравнение социальных объектов|Человек и общество|Социальная ситуация|Общество и культура|Анализ фотографии|Финансовая грамотность|Экономика|Взаимосвязи в экономике|Государство и право|Анализ социальной статистики|Правовой статус гражданина|Классификация: соответствие|Правовые ситуации|Гражданин и государство|Обоснование суждения|План текста|Поиск информации в тексте|Примеры по тексту");
const socialEge = split("Обобщение понятий|Человек и культура: выбор|Понятия человека и культуры|Общество и культура: анализ|Экономика: выбор|Экономика: соответствие|Экономическая ситуация|Социальные отношения|Диаграмма|Политика: выбор|Политическая ситуация|Конституционные ценности|Политика: соответствие|Право: выбор|Право: соответствие|Правовая ситуация|Извлечение информации из текста|Понятие и его признаки|Примеры по тексту|Аргументация по тексту|Спрос и предложение: график|Практическая ситуация|Конституция: объяснение|Сложный план|Обоснование и примеры");
const plans: Plan[] = [
  { exam:"oge",subject:"biology",code:"bi",minutes:150,max:47,titles:bioOge,scores:[1,1,1,2,2,1,2,1,2,2,2,1,3,1,1,2,2,2,2,1,2,2,2,3,3,3],extended:range(22,26),words:[1,20],matching:[2,8,11,18,21],sequence:[3,5,20],unordered:[4,7,9,16,17,19],partEnd:21,pages:bioOge.map((_,i)=>i<7?8:9),resources:{4:["Оригинальный график исследования"],6:["Изображение прибора"],13:["Изображения и алгоритм морфологического описания"],14:["Анатомический рисунок"],16:["Биологическое изображение"],19:["Схема экосистемы"],20:["Схема экосистемы"],21:["Схема экосистемы"],22:["Изображение объекта"],24:["Полноценный биологический текст"],25:["Таблица или схема"],26:["Таблицы пищевого состава и затрат энергии"]}},
  { exam:"ege",subject:"biology",code:"bi",minutes:235,max:57,titles:bioEge,scores:[1,2,1,1,1,2,2,2,1,2,2,2,1,2,2,2,2,2,2,2,1,3,3,3,3,4,3,3],extended:range(22,28),numeric:[3,4],words:[1],matching:[6,10,14,19,20],sequence:[8,12,16],partEnd:21,pages:bioEge.map((_,i)=>i<18?9:10),resources:{1:["Таблица"],5:["Биологический рисунок"],6:["Биологический рисунок"],9:["Изображение организма"],13:["Анатомический рисунок"],17:["Текст с нумерованными утверждениями"],20:["Таблица"],21:["Таблица или график опыта"],22:["Описание эксперимента"],23:["Результаты того же эксперимента"],24:["Биологическое изображение"]}},
  { exam:"oge",subject:"geography",code:"gg",minutes:150,max:31,titles:geoOge,scores:geoOge.map((_,i)=>i===11?2:1),extended:[12,29,30],numeric:[9,13,24],words:[2,7,10,21,28],sequence:[3,8,19,26],unordered:[14,15,22,25,27],pages:geoOge.map((_,i)=>i<3?7:i<9?8:i<14?9:i<20?10:i<26?11:12),resources:{3:["Карта или данные сравнения"],4:["Карта"],5:["Синоптическая карта"],6:["Климатическая карта"],7:["Карта с градусной сеткой"],9:["Масштабный топографический план"],10:["Топографический план"],11:["План и варианты профиля"],12:["Топографический план"],13:["Статистическая таблица"],18:["Климатограмма"],19:["Статистическая таблица"],23:["Таблица"],24:["Таблица"],28:["Исходный текст"],29:["Тот же исходный текст"],30:["Тот же исходный текст"]}},
  { exam:"ege",subject:"geography",code:"gg",minutes:180,max:38,titles:geoEge,scores:geoEge.map((_,i)=>i===4||i===11?2:i<23?1:i<28?2:3),extended:range(22,29),numeric:[14,15,16],words:[1,17,18,21],matching:[5],sequence:[2,3,4,7,8,11,13,19,20],unordered:[6,9,10,12],partEnd:21,pages:geoEge.map((_,i)=>i<8?8:9),resources:{1:["Карта с координатами"],2:["Карта или климатические данные"],11:["Карта"],14:["Карта часовых зон или полный перечень зон в условии"],15:["Таблица запасов и добычи"],16:["Демографическая таблица"],19:["Статистические данные"],20:["Статистические данные"],21:["Полноценный исходный текст"],22:["Тот же исходный текст"],23:["Тот же исходный текст"],24:["Данные и ресурсы по условию"],25:["Данные и ресурсы по условию"],26:["Географические данные для расчёта"],27:["Географические данные для расчёта"],28:["Карта"],29:["Данные для аргументации"]}},
  { exam:"oge",subject:"history",code:"is",minutes:180,max:35,titles:historyOge,scores:[2,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,2,2,3,2,3],extended:range(18,23),words:[3,8,9,12],matching:[1,6,7],sequence:[2],unordered:[4,13],partEnd:17,pages:historyOge.map((_,i)=>i<4?6:i<10?7:i<16?8:i<22?9:10),resources:{7:["Статистическая таблица"],8:["Историческая карта"],9:["Та же историческая карта"],10:["Та же карта и текст"],11:["Историческое изображение"],12:["Логическая схема"],13:["Изображения памятников"],14:["Те же изображения"],17:["Исторический источник"],18:["Проверенный исторический источник"],19:["Тот же источник"],20:["Тот же источник"],21:["Текст с контролируемыми ошибками"]}},
  { exam:"ege",subject:"history",code:"is",minutes:210,max:43,titles:historyEge,scores:[2,1,2,3,2,2,2,1,1,1,1,2,2,2,2,2,2,3,3,2,3,2],extended:range(13,22),words:[9,10,11],matching:[1,3,4,5,7],sequence:[2],unordered:[6,12],partEnd:12,pages:historyEge.map((_,i)=>i<5?7:i<12?8:i<19?9:10),resources:{4:["Историческая таблица"],6:["Проверенный источник"],8:["Изображение о Великой Отечественной войне"],9:["Историческая карта"],10:["Та же карта"],11:["Та же карта и текст"],12:["Та же карта"],13:["Проверенный исторический источник"],14:["Тот же источник"],15:["Источник всеобщей истории"],16:["Изображение"],17:["То же изображение"],18:["Источники о Великой Отечественной войне"]}},
  { exam:"oge",subject:"social-studies",code:"ob",minutes:180,max:32,titles:socialOge,scores:[2,1,1,1,1,1,2,2,1,1,1,4,1,2,1,1,2,2,2,3],extended:[1,7,8,12,17,18,19,20],words:[2],matching:[14],sequence:[3],pages:socialOge.map((_,i)=>i<3?10:i<7?11:i<9?12:i<11?13:i<15?14:i<18?15:16),resources:{7:["Оригинальная фотография с подтверждёнными правами"],12:["Диаграмма социальной статистики"],18:["Полноценный обществоведческий текст"],19:["Тот же текст"],20:["Тот же текст"]}},
  { exam:"ege",subject:"social-studies",code:"ob",minutes:210,max:58,titles:socialEge,scores:[1,2,1,2,2,2,2,2,1,2,2,1,2,2,2,2,2,2,3,3,3,4,3,4,6],extended:range(17,25),matching:[6,13,15],unordered:[1,2,4,5,7,8,9,10,11,12,14,16],partEnd:16,pages:socialEge.map((_,i)=>i<8?9:i<17?10:i<20?11:i<23?12:13),resources:{9:["Оригинальная диаграмма"],17:["Полноценный обществоведческий текст"],18:["Тот же текст"],19:["Тот же текст"],20:["Тот же текст"],21:["График спроса и предложения"]}},
  { exam:"oge",subject:"literature",code:"li",minutes:235,max:40,titles:split("1.1 / 1.2 · Анализ эпического фрагмента|2.1 / 2.2 · Другой фрагмент произведения|3.1 / 3.2 · Анализ лирики|4 · Сопоставление лирических текстов|5.1–5.5 · Сочинение по выбранной теме"),scores:[5,5,5,8,17],extended:[1,2,3,4,5],partEnd:4,pages:[9,9,9,9,9],resources:{1:["Легальный полный литературный фрагмент"],2:["Полное произведение для самостоятельного выбора фрагмента"],3:["Легальный полный поэтический текст"],4:["Два полных поэтических текста"],5:["Полные произведения и пять тем на выбор"]}},
  { exam:"ege",subject:"literature",code:"li",minutes:235,max:48,titles:split("Эпос и драма: термин|Эпос и драма: термин|Эпос и драма: соответствие|4.1 / 4.2 · Анализ фрагмента|Сопоставление произведений|Лирика: термин|Лирика: термин|Лирика: выбор|9.1 / 9.2 · Анализ стихотворения|Сопоставление лирики|11.1–11.5 · Сочинение"),scores:[1,1,1,4,7,1,1,1,4,7,20],extended:[4,5,9,10,11],words:[1,2,6,7],matching:[3],unordered:[8],partEnd:10,pages:Array(11).fill(9),resources:Object.fromEntries(range(1,11).map(n=>[n,[n<=5?"Легальный литературный фрагмент":n<=10?"Легальный полный поэтический текст":"Полные произведения и пять тем на выбор"]]))},
];

const sourceNote = "Проект 2027, не утверждённая модель. Сверена номерная спецификация по PDF-копии / её извлечению. Идентичность официальному ZIP не подтверждена. Полный кодификатор и поэлементные критерии каждого авторского подтипа требуют дальнейшей проверки; нет автоматической экспертной оценки и начисления экзаменационных баллов.";
export const remainingModels: ExamDefinition[] = plans.map(p => {
  const id = `${p.exam}-${p.subject}`, spec = pdf(p.exam,p.code,"spec"), demo = pdf(p.exam,p.code,"demo");
  return {id,examType:p.exam==="oge"?"ОГЭ":"ЕГЭ",subjectId:p.subject,level:null,year:2027,versionId:`${id}-2027-draft`,available:true,title:`${p.exam==="oge"?"ОГЭ":"ЕГЭ"} · ${subjectTitle(p.subject)}`,durationMinutes:p.minutes,maxPrimaryScore:p.max,
    verificationStatus:"draft-source-reviewed",verificationNote:sourceNote,
    sourceReview:{scope:"numbered-specification",canonicalArchiveVerified:false,criteriaComplete:false,reviewedAt:"2026-10-27",limitations:["Не полная проверка всех подтипов кодификатора", "Нет сверенной полной системы критериев авторских заданий", "Копии не сверены побайтово с официальным архивом"]},
    sources:[{title:"ФИПИ: проекты 2027",url:`https://fipi.ru/${p.exam}/demoversii-specifikacii-kodifikatory`},{title:"Спецификация: PDF-копия",url:spec},{title:"Демоверсия и критерии: PDF-копия",url:demo},{title:"Кодификатор: PDF-копия, не полный разбор",url:pdf(p.exam,p.code,"codif")}],
    ...(p.subject==="literature"?{offeredTaskCount:p.exam==="oge"?12:17}:{}),
    numbers:p.titles.map((title,i):ExamNumberDefinition=>{
      const number=i+1,extended=p.extended.includes(number),resources=p.resources?.[number]??[];
      const responseKind=extended?(p.subject==="literature"&&(number===5||number===11)?"essay":"written"):p.numeric?.includes(number)?"numeric":p.words?.includes(number)?"word":p.matching?.includes(number)?"matching":p.sequence?.includes(number)?"sequence":"selection";
      return {number,title,part:p.partEnd&&number>p.partEnd?2:1,answerFormat:extended?"extended":"short",responseKind,maxPrimaryScore:p.scores[i],scoringStatus:"not-configured",
        ...(p.pages[i]>0?{sourceReference:{url:spec,pdfPage:p.pages[i]}}:{}),
        evaluation:{mode:extended?"expert":"automatic",...(!extended&&!p.words?.includes(number)&&!p.numeric?.includes(number)?{ordering:p.unordered?.includes(number)?"unordered" as const:"ordered" as const}:{}),criteriaUrl:demo,criteriaSection:"Система оценивания и критерии развёрнутых ответов; конкретный подтип ещё требует сверки",note:extended?"Нужны поэлементные критерии конкретного авторского задания и содержательная проверка; автоматическое оценивание запрещено.":"Тренажёр проверяет целый ключ. Частичные первичные баллы не назначаются; точный формат и допустимые ответы требуют проверки конкретного задания."},
        requiredResources:resources,generation:{status:resources.length?"resource-required":"editorial-review-required",subtypes:[title],blockers:["Нужны оригинальный материал и отдельная содержательная проверка",...(extended?["Нужны поэлементные критерии самопроверки"]:[])]},
        pendingReason:extended?"Нужны оригинальное задание, ресурсы и проверенные критерии самопроверки.":"Номерная модель зарегистрирована; проверенных оригинальных заданий пока нет.",
        ...(p.subject==="literature"?{officialLabels:p.exam==="oge"?number<=3?[`${number}.1`,`${number}.2`]:number===4?["4"]:range(1,5).map(n=>`5.${n}`):number===4||number===9?[`${number}.1`,`${number}.2`]:number===11?range(1,5).map(n=>`11.${n}`):[String(number)]}:{}),
      };
    }),
  };
});

const european:SubjectId[]=["english","german","french","spanish"];
for (const exam of ["oge","ege"] as const) for (const subject of [...european,...(exam==="ege"?["chinese" as const]:[])]) {
  const oge=exam==="oge",chinese=subject==="chinese",id=`${exam}-${subject}`,writtenEnd=oge?35:chinese?29:38,count=oge?38:chinese?32:42;
  const spec=pdf(exam,chinese?"kya":"inyaz","spec"),readingEnd=oge?19:chinese?14:18,listeningEnd=oge?11:9,grammarEnd=oge?34:chinese?27:36;
  const titles=range(1,count).map(n=>n>writtenEnd?["Чтение вслух","Диалог-расспрос","Диалог-интервью","Монолог по фотографиям"][chinese?n-writtenEnd:n-writtenEnd-1]??"Монолог":n>grammarEnd? n===grammarEnd+1?"Электронное письмо":"Письменное рассуждение":n>readingEnd?chinese?split("Пиньинь|Счётные слова|Лексика|Предлоги и сравнение|Числительные|Видовременные частицы|Частицы 的 / 得 / 地|Наречия|Результативные морфемы|Возможность действия|Направление действия|Структура предложения|Грамматические конструкции")[n-15]:n<=(oge?28:24)?"Грамматика в связном тексте":n<=(oge?34:29)?"Словообразование в связном тексте":"Лексика в связном тексте":n>listeningEnd?"Чтение: понимание текста":"Аудирование");
  if(oge) titles.splice(35,3,"Чтение вслух","Диалог-расспрос","Тематический монолог");
  if(chinese) titles.splice(29,3,"Диалог-расспрос","Описание фотографии","Монолог по иллюстрациям");
  const scores=range(1,count).map(n=>oge?n===5?5:n===12?6:n===35?10:n===36?2:n===37?6:n===38?7:1:chinese?n===1||n===10?6:n===11?4:n===28?8:n===29?12:n===30?5:n===31?7:n===32?8:1:n===1||n===11?2:n===2||n===10?3:n===37?6:n===38?14:n===39?1:n===40?4:n===41?5:n===42?10:1);
  remainingModels.push({id,examType:oge?"ОГЭ":"ЕГЭ",subjectId:subject,level:null,year:2027,versionId:`${id}-2027-draft`,available:true,title:`${oge?"ОГЭ":"ЕГЭ"} · ${subjectTitle(subject)}`,maxPrimaryScore:oge?68:chinese?80:82,
    sessions:[{name:"Письменная часть",minutes:oge?120:chinese?180:190},{name:"Устная часть",minutes:oge?15:chinese?14:17}],
    verificationStatus:"draft-source-reviewed",verificationNote:sourceNote+" Устная часть имеет собственную нумерацию; внутренние номера последних слотов — технические, не номера письменной части.",
    sourceReview:{scope:"numbered-specification",canonicalArchiveVerified:false,criteriaComplete:false,reviewedAt:"2026-10-27",limitations:["Общий план не заменяет языковой кодификатор и демоверсию", "Нет собственных аудиозаписей и проверки устной речи", "Нет полной языковой экспертной проверки"]},
    sources:[{title:"ФИПИ: проекты 2027",url:`https://fipi.ru/${exam}/demoversii-specifikacii-kodifikatory`},{title:"Общая спецификация: PDF-копия",url:spec}],
    numbers:range(1,count).map((number):ExamNumberDefinition=>{
      const oral=number>writtenEnd,extended=oral||number>grammarEnd,audio=number<=listeningEnd;
      const section=oral?"Устная часть":audio?"Аудирование":number<=readingEnd?"Чтение":number<=grammarEnd?"Грамматика и лексика":"Письменная речь";
      const title=oral?`Устная часть ${number-writtenEnd} · ${titles[number-1]}`:titles[number-1];
      const resources=oral?["Микрофон и сохранение записи ответа","Материалы устного задания","Подготовленный эксперт"]:audio?["Оригинальная аудиозапись, права, транскрипт и проверенные ключи"]:number<=grammarEnd?["Полноценный оригинальный связный текст"]:["Письмо-стимул или таблица/диаграмма по формату задания"];
      return {number,title,officialLabels:[String(oral?number-writtenEnd:number)],section,part:oral?2:1,answerFormat:extended?"extended":"short",maxPrimaryScore:scores[number-1],scoringStatus:"not-configured",responseKind:oral?"oral":extended?"written":number>readingEnd&&!chinese?"word":"selection",
        requiredResources:resources,generation:{status:"resource-required",subtypes:[title],blockers:["Нужны оригинальный материал, языковая проверка и проверенные ключи",...(extended?["Нужны критерии, без автоматической экспертной оценки"]:[])]},
        pendingReason:oral?"Нужны ресурсы устной части, запись и экспертная проверка; текстовая имитация не публикуется.":audio?"Нужна настоящая оригинальная аудиозапись; транскрипт не заменяет аудирование.":"Модель зарегистрирована; нужны собственный текст и проверка языкового материала.",
        sourceReference:{url:spec,pdfPage:oge?number<20?11:12:chinese?number<25?10:11:number<39?15:16},
        evaluation:{mode:extended?"expert":"automatic",criteriaUrl:spec,criteriaPdfPage:oge?9:chinese?8:13,note:extended?"Оценка подготовленным экспертом по критериям. Самопроверка не равна экспертизе. Баллы и серия правильных ответов автоматически не назначаются.":"Ключ проверяется по формату конкретного задания; в языковых пропусках важна орфография. Для многопозиционных ответов официальны отдельные правила частичных баллов."},
      };
    }),
  });
}

/** Audited practice contracts; not permission to publish arbitrary generated text.
 * See scripts/remaining-generators.mjs and the release review for content evidence.
 * Everything outside this list stays closed to bootstrap imports.
 */
function practice(id:string,number:number,format:"number"|"text",rule:"number"|"choices"|"text",subtypes:string[],algorithm:boolean|string[]=false){
  const slot=remainingModels.find(m=>m.id===id)?.numbers.find(n=>n.number===number);
  if(!slot||slot.answerFormat!=="short")throw new Error(`Invalid reviewed contract ${id}/${number}`);
  slot.practiceAnswerFormat=format;slot.answerRuleTypes=[rule];
  const ready=new Set(algorithm===true?subtypes:Array.isArray(algorithm)?algorithm:[]);
  const algorithmLimits=["Только валидированные параметры и проверенный справочник; новые факты требуют редакционной проверки"];
  const editorialLimits=["Готовы только проверенные редакционные семена; новый контекст требует содержательной/языковой проверки"];
  slot.generation={status:ready.size?"algorithm-ready":"editorial-review-required",subtypes,
    subtypeReadiness:subtypes.map(subtype=>({subtype,status:ready.has(subtype)?"algorithm-ready":"editorial-review-required",limitations:ready.has(subtype)?algorithmLimits:editorialLimits})),
    blockers:ready.size?algorithmLimits:editorialLimits};
}
practice("oge-biology",3,"text","choices",["taxonomic-rank-order"],true);
practice("oge-biology",5,"text","choices",["germination-lab-sequence"]);
practice("oge-biology",7,"text","choices",["organism-traits-from-description"]);
practice("oge-biology",9,"text","choices",["plant-animal-cell-comparison"]);
// Bounded editorial packet: draft demo printed pp.5,9–11,15–16.
for(const [number,subtype] of [[2,"organism-kingdom-matching"],[8,"biological-table-gap"],[10,"biological-text-gaps"],[11,"organism-group-matching"],[12,"biological-judgments"],[15,"physiological-explanation-choice"],[17,"human-traits-selection"],[18,"human-systems-matching"]] as const){
  practice("oge-biology",number,"text","choices",[subtype]);
}
remainingModels.find(m=>m.id==="oge-biology")!.numbers[7].responseKind="selection";
practice("ege-biology",3,"number","number",["gamete","daughter-mitosis"],true);
practice("ege-biology",4,"number","number",["monohybrid-recessive","monohybrid-heterozygote"],true);
practice("ege-biology",12,"text","choices",["taxonomic-rank-order"],true);
practice("oge-geography",13,"number","number",["relative-humidity"],true);
practice("oge-geography",16,"text","choices",["climate-table-inference"]);
practice("oge-geography",24,"number","number",["population-balance"],true);
for(const [n,subtype] of [[15,"reserve-production-ratio"],[16,"population-balance"]] as const)practice("ege-geography",n,"number","number",[subtype],true);
const mapSlot=remainingModels.find(m=>m.id==="ege-geography")!.numbers[13];
mapSlot.requiredResources=["Оригинальная карта часовых зон с проверенными правами и обозначениями"];
mapSlot.pendingReason="Расчёт часов проверен, но он не заменяет чтение обязательной карты. Номер не публикуется до готовности настоящего ресурса.";
for(const exam of ["oge","ege"]){
  practice(`${exam}-history`,1,"text","choices",["events-to-years"],true);
  practice(`${exam}-history`,2,"text","choices",["chronology-russia"],true);
}
practice("oge-history",3,"text","text",["historical-term-definition"]);
practice("oge-history",5,"text","choices",["agrarian-terms-classification"]);
practice("ege-history",3,"text","choices",["processes-to-events"]);
practice("ege-history",5,"text","choices",["events-to-rulers"]);
practice("oge-social-studies",2,"text","text",["economic-activity-generalization"]);
practice("oge-social-studies",9,"text","choices",["limited-budget-choice","opportunity-cost","scarcity-choice"],["limited-budget-choice"]);
practice("oge-social-studies",14,"text","choices",["short-run-fixed-variable-costs"],true);
// Draft demo printed pp.5,7,11: single choice/A-B judgments, not essays.
for(const [number,subtype] of [[4,"culture-identification"],[5,"socialization-situation"],[6,"social-judgments"],[10,"economic-judgments"],[11,"state-characteristics"],[13,"rights-classification"],[15,"legal-branch-situation"],[16,"constitutional-basics"]] as const){
  practice("oge-social-studies",number,"text","choices",[subtype]);
}
practice("ege-social-studies",6,"text","choices",["short-run-fixed-variable-costs","fixed-variable-costs-editorial"],["short-run-fixed-variable-costs"]);
practice("ege-social-studies",7,"text","choices",["budget-constraint-judgments","firm-cost-judgments","alternative-cost-judgments"],["budget-constraint-judgments"]);
for(const subject of european)for(const exam of ["oge","ege"])for(let i=0;i<5;i++)practice(`${exam}-${subject}`,(exam==="oge"?20:19)+i,"text","text",["source-checked-inflection-in-original-context"]);
practice("ege-chinese",16,"text","choices",["classifier-bound-volume","classifier-sheet"]);
practice("ege-chinese",17,"text","choices",["lexical-compatibility-read"]);
practice("ege-chinese",19,"text","choices",["chinese-integer-tens","chinese-integer-hundreds"]);

// Even pending numbers expose per-subtype gates. The initial list is deliberately
// non-exhaustive until the full codifier has been reviewed, never inferred ready.
for(const model of remainingModels)for(const slot of model.numbers){
  const generation=slot.generation;
  if(generation&&!generation.subtypeReadiness)generation.subtypeReadiness=generation.subtypes.map(subtype=>({subtype,status:generation.status,limitations:[...generation.blockers]}));
}
