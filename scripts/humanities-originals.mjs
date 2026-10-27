import assert from "node:assert/strict";

/** Factual records, not copied narrative or third-party tasks. Sources read 2026-10-27. */
export const historicalFacts={
  neva:{name:"Невская битва",year:1240,person:"Александр Невский",url:"https://www.prlib.ru/node/619385"},
  ice:{name:"Ледовое побоище",year:1242,person:"Александр Невский",url:"https://www.prlib.ru/node/619144"},
  kulikovo:{name:"Куликовская битва",year:1380,person:"Дмитрий Донской",url:"https://www.prlib.ru/history/619523"},
  ugra:{name:"Стояние на Угре",year:1480,person:"Иван III",url:"https://www.prlib.ru/history/619708"},
  romanov:{name:"Избрание Михаила Романова царём",year:1613,person:"Михаил Романов",url:"https://www.prlib.ru/collection_romanovy"},
  city:{name:"Основание Санкт-Петербурга",year:1703,person:"Пётр I",url:"https://www.prlib.ru/history/619267"},
  empire:{name:"Принятие Петром I императорского титула",year:1721,person:"Пётр I",url:"https://www.prlib.ru/node/619684"},
  emancipation:{name:"Подписание Александром II Манифеста об отмене крепостного права",year:1861,person:"Александр II",url:"https://www.prlib.ru/history/619069"},
};
const letters="АБВГДЕ";
export function historicalMatching(exam,ids,years){
  assert.ok(["oge","ege"].includes(exam));assert.equal(ids.length,3);assert.equal(new Set(years).size,years.length);
  assert.ok(ids.every(id=>historicalFacts[id]&&years.includes(historicalFacts[id].year)));
  const answer=ids.map(id=>years.indexOf(historicalFacts[id].year)+1).join("");
  return {model:`${exam}-history`,number:1,subtype:"events-to-years",prompt:`Соотнесите исторические события и годы. Каждому событию соответствует один год; лишние годы не используются. Запишите цифры в порядке А, Б, В.\n${ids.map((id,i)=>`${letters[i]}) ${historicalFacts[id].name}`).join("\n")}\nГоды:\n${years.map((y,i)=>`${i+1}) ${y}`).join("\n")}`,answer,rule:"ordered",explanation:ids.map((id,i)=>`${letters[i]}: ${historicalFacts[id].name} — ${historicalFacts[id].year}, позиция ${years.indexOf(historicalFacts[id].year)+1}.`).join(" "),proof:{kind:"history-matching",ids,years}};
}
export function chronology(exam,ids){
  assert.ok(["oge","ege"].includes(exam));assert.ok(ids.length>=3&&ids.length<=4&&ids.every(id=>historicalFacts[id]));assert.equal(new Set(ids.map(id=>historicalFacts[id].year)).size,ids.length);
  const answer=ids.map((id,i)=>[historicalFacts[id].year,i+1]).sort((a,b)=>a[0]-b[0]).map(([,n])=>n).join("");
  return {model:`${exam}-history`,number:2,subtype:"chronology-russia",prompt:`Постройте хронологическую цепочку: расположите перечисленные события отечественной истории от раннего к позднему. Запишите номера без пробелов.\n${ids.map((id,i)=>`${i+1}) ${historicalFacts[id].name}`).join("\n")}`,answer,rule:"ordered",explanation:ids.map(id=>historicalFacts[id]).sort((a,b)=>a.year-b.year).map(f=>`${f.year} — ${f.name}`).join("; ")+".",proof:{kind:"history-order",ids}};
}
const budgetSource="https://openstax.org/books/principles-economics-3e/pages/2-1-how-individuals-make-choices-based-on-their-budget-constraint";
const costsSource="https://openstax.org/books/principles-economics-3e/pages/7-3-costs-in-the-short-run";
export function affordableBasket(budget,prices,baskets){
  assert.ok(Number.isInteger(budget)&&budget>0&&budget<=20000&&prices.length===2&&prices.every(p=>Number.isInteger(p)&&p>0));
  assert.equal(baskets.length,4);assert.ok(baskets.every(b=>b.length===2&&b.every(v=>Number.isInteger(v)&&v>=0)));
  const costs=baskets.map(b=>b[0]*prices[0]+b[1]*prices[1]);const affordable=costs.flatMap((cost,i)=>cost<=budget?[i+1]:[]);assert.equal(affordable.length,1);
  return {model:"oge-social-studies",number:9,subtype:"limited-budget-choice",prompt:`Для школьной мастерской выделено ${budget} рублей. Блок бумаги стоит ${prices[0]} руб., упаковка цветного картона — ${prices[1]} руб. Цены не зависят от количества, скидок нет. Какой единственный набор можно приобрести, не превышая бюджет?\n${baskets.map((b,i)=>`${i+1}) ${b[0]} блоков бумаги и ${b[1]} упаковок картона`).join("\n")}\nЗапишите номер варианта.`,answer:String(affordable[0]),rule:"ordered",explanation:`Стоимость вариантов по порядку: ${costs.join(", ")} руб. Только вариант ${affordable[0]} укладывается в ${budget} руб. Ограниченность бюджета требует выбора.`,proof:{kind:"budget",budget,prices,baskets,source:budgetSource}};
}
export function costMatching(exam,order){
  assert.ok(["oge","ege"].includes(exam));assert.deepEqual([...order].sort(),[0,1,2,3,4]);
  const items=exam==="ege"?[
    {text:"Месячная лицензия на программу по фиксированной ставке независимо от числа проектов",category:1},
    {text:"Покупка фотобумаги для печати каждого дополнительного заказа",category:2},
    {text:"Сдельный гонорар мастеру за каждую выполненную фоторамку",category:2},
    {text:"Фиксированная плата за размещение сайта студии в течение месяца",category:1},
    {text:"Материал для рам: на каждую рамку расходуется одинаковая длина покупного профиля",category:2},
  ]:[
    {text:"Фиксированная месячная аренда помещения по действующему договору",category:1},
    {text:"Расход на сырьё: установленная стоимость материала для каждой изготовленной единицы продукции",category:2},
    {text:"Страховой платёж за помещение за месяц, не зависящий от выпуска",category:1},
    {text:"Сдельная оплата за каждое изготовленное изделие",category:2},
    {text:"Оплата упаковки: одна покупная коробка на каждый готовый товар",category:2},
  ];
  return {model:`${exam}-social-studies`,number:exam==="oge"?14:6,subtype:"short-run-fixed-variable-costs",prompt:`Предприятие рассматривает только ближайший месяц, договоры и цены не меняются. Установите соответствие между примерами затрат и их видами: 1) постоянные — не зависят от текущего объёма выпуска; 2) переменные — меняются с ним. Запишите пять цифр по порядку букв.\n${order.map((j,i)=>`${letters[i]}) ${items[j].text}`).join("\n")}`,answer:order.map(j=>items[j].category).join(""),rule:"ordered",explanation:"Фиксированные месячные платежи не зависят от количества выполненной работы в указанном периоде. Материалы и сдельная оплата на каждое изделие или заказ меняются вместе с выпуском. Долгосрочное изменение договоров здесь не рассматривается.",proof:{kind:"cost-matching",order,categories:items.map(x=>x.category),source:costsSource}};
}
export function economicJudgments(budget,priceA,priceB){
  assert.ok([budget,priceA,priceB].every(v=>Number.isInteger(v)&&v>0));assert.equal(budget%priceA,0);assert.equal(budget%priceB,0);
  const maxA=budget/priceA,maxB=budget/priceB;
  return {model:"ege-social-studies",number:7,subtype:"budget-constraint-judgments",prompt:`Семья выделила на два вида досуга ${budget} руб.: один билет на экскурсию стоит ${priceA} руб., одно посещение мастерской — ${priceB} руб. Цены постоянны, кредит и другие расходы не рассматриваются. Выберите верные суждения. 1) Если купить только билеты на экскурсию, денег хватит на ${maxA} билетов. 2) Одновременно можно купить ${maxA} билетов и ${maxB} посещений мастерской. 3) Если тратить весь этот бюджет только на мастерскую, доступно ${maxB} посещений. 4) Ограниченный бюджет делает любой выбор бесплатным с точки зрения упущенных возможностей. 5) При неизменном бюджете увеличение расходов на экскурсии сокращает сумму, остающуюся на мастерскую. Запишите номера всех верных суждений.`,answer:"135",rule:"unordered",explanation:`Максимумы при расходовании только на один вид досуга: ${maxA} и ${maxB}, поэтому 1 и 3 верны. Вместе эти максимальные наборы стоят два бюджета, а не один. Выбор имеет альтернативную стоимость; из равенства расходов бюджету следует суждение 5.`,proof:{kind:"economic-judgments",budget,priceA,priceB,source:budgetSource}};
}
export const humanitiesPilot=[
  historicalMatching("oge",["ugra","city","ice"],[1380,1242,1703,1480,1613]),
  chronology("oge",["romanov","ice","emancipation","kulikovo"]),
  {model:"oge-history",number:3,subtype:"historical-term-definition",prompt:"Заполните пропуск одним историческим термином. Принудительные работы зависимого крестьянина в хозяйстве землевладельца, выполнявшиеся его трудом и с использованием его инвентаря, назывались ____. Ответ запишите в именительном падеже.",answer:"барщина",rule:"word",explanation:"Барщина — отработочная повинность в хозяйстве землевладельца. В отличие от неё оброк представляет передачу продуктов или денег, а не такой труд.",proof:{kind:"historical-term",key:"барщина",source:"https://bse.sci-lib.com/article099036.html"}},
  {model:"oge-history",number:5,subtype:"agrarian-terms-classification",prompt:"Какой из четырёх терминов обозначает собрание представителей сословий, а не форму крестьянской повинности или зависимости? Запишите только номер. 1) Барщина. 2) Оброк. 3) Временнообязанные крестьяне. 4) Земский собор.",answer:"4",rule:"ordered",explanation:"Земский собор — сословно-представительный орган. Остальные позиции относятся к повинностям либо положению зависимых и освобождённых от крепостной зависимости крестьян.",proof:{kind:"facts-selection",facts:[false,false,false,true],source:"https://www.prlib.ru/collection_romanovy"}},
  historicalMatching("oge",["emancipation","empire","neva"],[1721,1240,1861,1703,1480]),
  historicalMatching("ege",["romanov","kulikovo","empire"],[1703,1721,1380,1613,1242,1861]),
  chronology("ege",["city","ugra","neva"]),
  {model:"ege-history",number:3,subtype:"processes-to-events",prompt:"Соотнесите исторические процессы и события, относящиеся к ним. А) Завершение зависимости Руси от Орды в XV веке. Б) Утверждение новой царской династии после Смуты. В) Создание Петром I нового города у устья Невы. Г) Крестьянская реформа Александра II. События: 1) Ледовое побоище. 2) Стояние на Угре. 3) Избрание Михаила Романова. 4) Основание Санкт-Петербурга. 5) Подписание Манифеста 1861 года. 6) Куликовская битва. Запишите цифры в порядке А–Г.",answer:"2345",rule:"ordered",explanation:"А связано со стоянием на Угре 1480 г.; Б — с избранием Михаила Романова в 1613 г.; В — с основанием Санкт-Петербурга в 1703 г.; Г — с Манифестом об отмене крепостного права 1861 г. Остальные сражения относятся к другим контекстам.",proof:{kind:"history-processes",ids:["ugra","romanov","city","emancipation"],options:["ice","ugra","romanov","city","emancipation","kulikovo"]}},
  {model:"ege-history",number:5,subtype:"events-to-rulers",prompt:"Соотнесите события и исторических деятелей. А) Руководство русским войском в Ледовом побоище. Б) Руководство русскими войсками в Куликовской битве. В) Противостояние Ахмату во время стояния на Угре. Г) Подписание Манифеста об отмене крепостного права. Деятели: 1) Пётр I. 2) Александр II. 3) Иван III. 4) Дмитрий Донской. 5) Михаил Романов. 6) Александр Невский. Запишите цифры по порядку А–Г.",answer:"6432",rule:"ordered",explanation:"Ледовое побоище связано с Александром Невским, Куликовская битва — с Дмитрием Донским, стояние на Угре — с Иваном III, Манифест 1861 года — с Александром II. Получаем 6432.",proof:{kind:"history-rulers",ids:["ice","kulikovo","ugra","emancipation"],people:["Пётр I","Александр II","Иван III","Дмитрий Донской","Михаил Романов","Александр Невский"]}},
  historicalMatching("ege",["neva","emancipation","ugra"],[1613,1480,1240,1721,1380,1861]),
  affordableBasket(900,[170,140],[[5,2],[4,3],[2,3],[6,1]]),
  costMatching("oge",[3,0,4,2,1]),
  {model:"oge-social-studies",number:2,subtype:"economic-activity-generalization",prompt:"Найдите обобщающее понятие для ряда: изготовление школьной мебели, выпечка хлеба, сборка велосипедов. Выберите одно слово из списка «потребление, производство, обмен, распределение» и запишите его без кавычек.",answer:"производство",rule:"word",explanation:"Во всех примерах создаются новые экономические блага. Это производство, а не использование готовых благ, их обмен или распределение.",proof:{kind:"economic-term",key:"производство",source:"https://openstax.org/books/principles-economics-3e/pages/1-1-what-is-economics-and-why-is-it-important"}},
  {model:"oge-social-studies",number:9,subtype:"opportunity-cost",prompt:"В субботу у Нины есть свободные два часа. Она может либо посетить бесплатный мастер-класс, либо за это же время выполнить разовый оплачиваемый заказ за 700 рублей. Нина выбирает мастер-класс; других доступных вариантов нет. Что в данной модели составляет её альтернативную стоимость выбора? 1) Стоимость проезда всех участников. 2) Ноль, потому что мастер-класс бесплатный. 3) Упущенные 700 рублей заработка. 4) Все будущие доходы Нины. Запишите номер ответа.",answer:"3",rule:"ordered",explanation:"Альтернативная стоимость — ценность лучшего из отвергнутых доступных вариантов. Здесь единственная альтернатива — заказ с заработком 700 рублей. Бесплатный вход не устраняет упущенную возможность.",proof:{kind:"facts-selection",facts:[false,false,true,false],source:budgetSource}},
  {model:"oge-social-studies",number:9,subtype:"scarcity-choice",prompt:"Школьная библиотека может в этом месяце направить один и тот же кабинет либо на проведение книжного клуба, либо на временное хранение новых книг. Одновременно использовать помещение двумя способами невозможно. Какое экономическое явление иллюстрирует необходимость выбора? 1) Ограниченность ресурсов. 2) Неограниченный запас помещений. 3) Отсутствие альтернатив. 4) Неизбежная прибыль от любого решения. Запишите номер.",answer:"1",rule:"ordered",explanation:"Один кабинет — ограниченный ресурс с альтернативными способами использования. Из условия не следуют ни неограниченность, ни отсутствие выбора, ни гарантированная прибыль.",proof:{kind:"facts-selection",facts:[true,false,false,false],source:"https://openstax.org/books/principles-economics-3e/pages/1-1-what-is-economics-and-why-is-it-important"}},
  costMatching("ege",[1,4,2,0,3]),economicJudgments(1800,300,200),
  {model:"ege-social-studies",number:7,subtype:"firm-cost-judgments",prompt:"Мастерская арендует помещение за фиксированные 25000 рублей в месяц. На каждый изготовленный стеллаж требуется древесины на 1600 рублей, другой расход не рассматривается. В ближайшем месяце договор аренды неизменен. Выберите верные суждения. 1) При нулевом выпуске описанные постоянные издержки равны нулю. 2) Аренда относится к постоянным издержкам данного месяца. 3) Древесина относится к переменным издержкам. 4) Увеличение выпуска автоматически уменьшает общий расход древесины. 5) При выпуске 10 стеллажей описанные общие издержки составят 41000 рублей. Запишите номера всех верных суждений.",answer:"235",rule:"unordered",explanation:"Аренда сохраняется при любом выпуске в рамках месяца. Древесина расходуется на каждое изделие. При 10 стеллажах итог 25000+10·1600=41000 руб. Верны 2, 3, 5.",proof:{kind:"firm-costs",fixed:25000,variable:1600,quantity:10,claimedTotal:41000,source:costsSource}},
  {model:"ege-social-studies",number:7,subtype:"alternative-cost-judgments",prompt:"Илья располагает свободным вечером. Наиболее ценная для него из отвергнутых возможностей — репетиторское занятие, за которое он получил бы 900 рублей. Вместо него он идёт на бесплатную открытую лекцию. Выберите верные суждения. 1) Денежная плата за вход на лекцию равна нулю. 2) Альтернативная стоимость обязательно равна нулю при бесплатном входе. 3) В указанной модели упущенный заработок составляет 900 рублей. 4) Ограниченность времени делает одновременное осуществление несовместимых планов невозможным. 5) Альтернативная стоимость равна сумме доходов от всех когда-либо отвергнутых занятий. Запишите номера верных суждений.",answer:"134",rule:"unordered",explanation:"Вход бесплатный, но вечер занят и лучшее отвергнутое использование времени даёт 900 руб. Альтернативная стоимость не равна сумме всех мыслимых вариантов. Верны 1, 3, 4.",proof:{kind:"facts-selection",facts:[true,false,true,true,false],source:budgetSource}},
  {model:"ege-social-studies",number:6,subtype:"fixed-variable-costs-editorial",prompt:"Установите соответствие между расходами пекарни и видами издержек в течение месяца: 1) постоянные, 2) переменные. Все условия договоров неизменны. А) Покупка муки в количестве, прямо пропорциональном числу выпеченных изделий. Б) Ежемесячная аренда склада по фиксированной ставке. В) Упаковочные пакеты: один пакет на каждую проданную булку. Г) Фиксированная абонентская плата за связь без оплаты трафика. Д) Сдельная оплата упаковщика за каждую упакованную булку. Запишите пять цифр по порядку букв.",answer:"21212",rule:"ordered",explanation:"Мука, пакеты и сдельная упаковка зависят от количества изделий. Фиксированные аренда и абонентская плата не меняются вместе с текущим выпуском в оговорённом периоде.",proof:{kind:"fixed-cost-editorial",categories:[2,1,2,1,2],source:costsSource}},
];

/** Separate content verification: reference facts/units must precede release. */
export function verifyHumanities(entry){
  const p=entry.proof;
  switch(p.kind){
    case "history-matching":assert.equal(entry.answer,p.ids.map(id=>p.years.indexOf(historicalFacts[id].year)+1).join(""));break;
    case "history-order":{
      const years=[...entry.answer].map(d=>historicalFacts[p.ids[Number(d)-1]].year);assert.equal(new Set(years).size,p.ids.length);for(let i=1;i<years.length;i++)assert.ok(years[i-1]<years[i]);break;
    }
    case "history-processes":assert.equal(entry.answer,p.ids.map(id=>p.options.indexOf(id)+1).join(""));break;
    case "history-rulers":assert.equal(entry.answer,p.ids.map(id=>p.people.indexOf(historicalFacts[id].person)+1).join(""));break;
    case "historical-term":case "economic-term":assert.equal(entry.answer,p.key);assert.ok(p.source);break;
    case "facts-selection":assert.equal(entry.answer,p.facts.flatMap((b,i)=>b?[i+1]:[]).join(""));assert.ok(p.source);break;
    case "budget":{
      const answer=Number(entry.answer);let affordable=0;
      p.baskets.forEach((basket,i)=>{let remaining=p.budget;basket.forEach((count,j)=>{for(let k=0;k<count;k++)remaining-=p.prices[j];});if(remaining>=0){affordable++;assert.equal(i+1,answer);}});assert.equal(affordable,1);break;
    }
    case "cost-matching":assert.equal(entry.answer,p.order.map(i=>p.categories[i]).join(""));break;
    case "economic-judgments":assert.equal(p.budget/p.priceA*p.priceA+p.budget/p.priceB*p.priceB,2*p.budget);assert.equal(entry.answer,"135");break;
    case "firm-costs":assert.equal(p.fixed+p.variable*p.quantity,p.claimedTotal);assert.equal(entry.answer,"235");break;
    case "fixed-cost-editorial":assert.equal(entry.answer,p.categories.join(""));break;
    default:throw Error(`Unreviewed humanities subtype ${p.kind}`);
  }
  return true;
}
