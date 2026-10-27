import assert from "node:assert/strict";

// Original parameterized training models. Verification lives in a separate module.
// A generator supports these subtypes only, not every possible task at a number.
const finite=(x,min,max)=>assert.ok(Number.isFinite(x)&&x>=min&&x<=max,"Parameter outside validated range");
const integer=(x,min,max)=>{finite(x,min,max);assert.ok(Number.isInteger(x));};
export function humidity(actual,saturated,temperature,station){
  finite(actual,0,30);finite(saturated,.1,40);assert.ok(actual<=saturated);finite(temperature,-30,40);assert.ok(station?.trim());
  const saturationEstimate=216.7*(6.112*Math.exp(17.62*temperature/(243.12+temperature)))/(273.15+temperature);
  assert.ok(Math.abs(saturated-saturationEstimate)/saturationEstimate<.03,"Saturation inconsistent with temperature");
  const answer=Math.round(actual/saturated*100);
  return {model:"oge-geography",number:13,subtype:"relative-humidity",prompt:`На учебной метеостанции «${station}» одновременно измерили температуру ${temperature} °C и содержание водяного пара ${actual} г/м³. В справочной строке для этой температуры указано насыщение ${saturated} г/м³. Вычислите относительную влажность в процентах и округлите до целого числа.`,answer:String(answer),explanation:`Относительная влажность — отношение фактического содержания пара к насыщению при той же температуре: ${actual}/${saturated}·100%. После округления получается ${answer}%.`,proof:{kind:"humidity",actual,saturated,temperature,answerUnit:"percent"}};
}
export function migration(exam,start,end,births,deaths,place){
  assert.ok(["oge","ege"].includes(exam));[start,end].forEach(x=>integer(x,1000,1e7));[births,deaths].forEach(x=>integer(x,0,1e6));assert.ok(place?.trim());
  assert.ok(Math.abs(end-start)<start/5&&births<start/5&&deaths<start/5);
  const answer=end-start-births+deaths;
  return {model:`${exam}-geography`,number:exam==="oge"?24:16,subtype:"population-balance",prompt:`Рассчитайте миграционный прирост по учебной демографической таблице для ${place}. Строка таблицы: население в начале года — ${start} человек; в конце — ${end}; родилось ${births}; умерло ${deaths}. Изменений границ и пересчёта населения не было. Ответ — целое число человек, со знаком минус при убыли.`,resources:[{name:"Демографическая таблица (авторские учебные данные, не статистика Росстата)",content:`Показатель | Человек\nНачало года | ${start}\nКонец года | ${end}\nРодившиеся | ${births}\nУмершие | ${deaths}`}],answer:String(answer),explanation:`Общий прирост ${end-start}, естественный прирост ${births-deaths}. Миграционный прирост равен их разности: ${answer} человек. Проверка баланса: начало + рождения − смерти + миграция = конец.`,proof:{kind:"population-balance",start,end,births,deaths,answerUnit:"persons"}};
}
export function resourceYears(reserves,production,mineral){
  finite(reserves,.1,1000);finite(production,.1,1000);assert.ok(mineral?.trim());
  const answer=reserves*1000/production;assert.ok(Number.isInteger(answer)&&answer<=10000);
  return {model:"ege-geography",number:15,subtype:"reserve-production-ratio",prompt:`В авторской учебной таблице для условной территории приведены запасы ${mineral}: ${reserves} млрд т; годовая добыча: ${production} млн т. Какова обеспеченность запасами в годах при неизменной добыче? Новые открытия и потери не учитывайте. Ответ запишите целым числом.`,resources:[{name:"Запасы и добыча (модельные данные)",content:`Ресурс | Запасы, млрд т | Добыча, млн т/год\n${mineral} | ${reserves} | ${production}`}],answer:String(answer),explanation:`Приводим запасы к миллионам тонн: ${reserves*1000}. Делим на ${production} млн т/год и получаем ${answer} лет. Проверка: годовая добыча, умноженная на срок, равна запасам.`,proof:{kind:"reserve-years",reserves,production,answerUnit:"years"}};
}
export function localTime(departure,duration,originOffset,destinationOffset){
  integer(departure,0,23);integer(duration,1,12);integer(originOffset,2,12);integer(destinationOffset,2,12);
  const answer=(departure+duration+destinationOffset-originOffset+24)%24;
  return {model:"ege-geography",number:14,subtype:"time-zone-conversion",prompt:`Учебный маршрут между двумя пунктами России задан полностью: в пункте А действует UTC+${originOffset}, в пункте Б — UTC+${destinationOffset}. Самолёт вылетает из А в ${departure}:00 местного времени и летит ${duration} ч. Какой час показывают часы в Б при посадке? Запишите только целое число от 0 до 23; переход через полночь учтите.`,resources:[{name:"Поясные данные маршрута",content:`Пункт А: UTC+${originOffset}; пункт Б: UTC+${destinationOffset}. Все часы условные; сезонного перевода нет.`}],answer:String(answer),explanation:`Переводим отправление к UTC, прибавляем длительность и смещение Б: ${departure}−${originOffset}+${duration}+${destinationOffset}. Приведение по модулю 24 даёт ${answer}:00.`,proof:{kind:"time-zones",departure,duration,originOffset,destinationOffset,answerUnit:"hour"}};
}
export function chromosomes(diploid,process){
  integer(diploid,4,80);assert.equal(diploid%2,0);assert.ok(["gamete","daughter-mitosis"].includes(process));
  const answer=process==="gamete"?diploid/2:diploid;
  const prompt=process==="gamete"?`У диплоидного вида исходная клетка перед мейозом содержит ${diploid} хромосом. Мейоз проходит нормально, без нерасхождения. Сколько хромосом будет в одной сформировавшейся гамете? Запишите число.`:`В соматической клетке диплоидного вида ${diploid} хромосом. Она завершила обычный митоз и цитокинез без мутаций. Сколько хромосом находится в ядре каждой дочерней клетки? Запишите число, а не число хроматид.`;
  return {model:"ege-biology",number:3,subtype:process,prompt,answer:String(answer),explanation:process==="gamete"?`Мейоз уменьшает число наборов с двух до одного. Гаплоидный набор равен ${diploid}/2=${answer}. Репликация ДНК перед делением не удваивает число хромосом.`:`Митоз сохраняет хромосомный набор. В каждой дочерней клетке остаётся ${answer} хромосом, как в исходной соматической клетке.`,proof:{kind:"chromosomes",diploid,process}};
}
export function cross(parentA,parentB,target){
  assert.ok(["AA","Aa","aa"].includes(parentA)&&["AA","Aa","aa"].includes(parentB));assert.ok(["recessive","heterozygote"].includes(target));
  // Closed form generation, gamete-product enumeration used independently in verification.
  const recessive=p=>p==="aa"?1:p==="Aa"?.5:0;
  const q=recessive(parentA),r=recessive(parentB);
  const answer=100*(target==="recessive"?q*r:q*(1-r)+(1-q)*r);
  return {model:"ege-biology",number:4,subtype:`monohybrid-${target}`,prompt:`В учебном скрещивании ${parentA} × ${parentB} рассматривается один аутосомный ген. Аллель A полностью доминирует над a; жизнеспособность всех генотипов одинакова, оплодотворение случайное. Какова вероятность ${target==="recessive"?"рецессивного фенотипа":"гетерозиготного генотипа"} у одного потомка в процентах?`,answer:String(answer),explanation:`Вычисляем вероятности передачи аллеля a каждым родителем и учитываем ${target==="recessive"?"сочетание aa":"сочетания Aa и aA"}. Получается ${answer}%. Это вероятность для одного потомка, не гарантия фактического распределения в малой семье.`,proof:{kind:"cross",parentA,parentB,target}};
}
export function taxonomy(exam,items){
  assert.ok(["oge","ege"].includes(exam));assert.ok(Array.isArray(items)&&items.length>=5&&items.length<=7);
  assert.equal(new Set(items.map(i=>i.rank)).size,items.length);assert.ok(items.every(i=>Number.isInteger(i.rank)&&i.rank>=0&&i.rank<=6&&i.label));
  const answer=items.map((_,i)=>i).sort((a,b)=>items[a].rank-items[b].rank).map(i=>i+1).join("");
  return {model:`${exam}-biology`,number:exam==="oge"?3:12,subtype:"taxonomic-rank-order",prompt:`Упорядочьте перечисленные систематические категории животных от самой крупной к самой мелкой. Запишите номера подряд.\n${items.map((x,i)=>`${i+1}) ${x.label}`).join("\n")}`,answer,rule:"ordered",explanation:`Иерархия для животных: царство → тип → класс → отряд → семейство → род → вид. Оставляем только данные категории и получаем ${answer}.`,proof:{kind:"taxonomy",items}};
}

export const numericPilot=[
  humidity(5.8,8.3,8,"Иней"),humidity(8.7,17.4,20,"Лесная"),
  migration("oge",82000,82310,1050,1190,"условного района Северный"),migration("oge",45000,44740,480,610,"условного района Озёрный"),
  {model:"oge-geography",number:16,subtype:"climate-table-inference",prompt:"Проанализируйте авторские учебные данные трёх станций, расположенных на одной широте, и выберите единственный вывод, который прямо подтверждается таблицей. 1) С востока на запад январь становится холоднее. 2) От А к В годовая амплитуда температуры растёт. 3) Июльская температура во всех пунктах одинакова. 4) Чем больше восточная долгота, тем выше январская температура. Запишите номер ответа.",resources:[{name:"Учебная таблица (не сведения о реальных городах)",content:"Станция | Широта | Долгота | Январь, °C | Июль, °C\nА | 55° с. ш. | 35° в. д. | −5 | 17\nБ | 55° с. ш. | 55° в. д. | −12 | 20\nВ | 55° с. ш. | 75° в. д. | −22 | 23"}],answer:"2",rule:"ordered",explanation:"Амплитуды равны 17−(−5)=22, 20−(−12)=32 и 23−(−22)=45 °C. Возрастание подтверждает вывод 2; остальные варианты противоречат соответствующим столбцам.",proof:{kind:"climate-table",january:[-5,-12,-22],july:[17,20,23],longitude:[35,55,75]}},
  resourceYears(3.6,45,"угля"),resourceYears(1.8,30,"железной руды"),
  migration("ege",126000,126890,1420,1650,"учебного городского округа"),migration("ege",287000,285400,2140,3280,"учебной области"),localTime(23,4,3,7),
  chromosomes(18,"gamete"),chromosomes(24,"daughter-mitosis"),cross("Aa","Aa","recessive"),cross("Aa","aa","heterozygote"),
  taxonomy("ege",[{label:"Семейство",rank:4},{label:"Царство",rank:0},{label:"Вид",rank:6},{label:"Класс",rank:2},{label:"Тип",rank:1},{label:"Род",rank:5}]),
  taxonomy("oge",[{label:"Тип",rank:1},{label:"Вид",rank:6},{label:"Отряд",rank:3},{label:"Царство",rank:0},{label:"Класс",rank:2}]),
  {model:"oge-biology",number:5,subtype:"germination-lab-sequence",prompt:"Составьте порядок действий в учебном опыте по влиянию воды на прорастание семян. Два набора одинаковых семян получают одинаковые свет, воздух и температуру; различается только увлажнение. 1) Сравнить доли проросших семян. 2) Поместить равное число семян на две одинаковые подложки. 3) Посчитать проросшие семена после одинакового срока наблюдения. 4) Одну подложку увлажнить, другую оставить сухой. 5) Подписать и подготовить две одинаковые ёмкости. 6) Выдержать обе ёмкости в одинаковых условиях установленное время. Запишите номера шагов подряд.",answer:"524631",rule:"ordered",explanation:"Сначала готовят и подписывают ёмкости (5), размещают семена (2), создают различие по воде (4), выдерживают нужное время (6), считают результаты (3), сравнивают доли (1). Равные условия позволяют исследовать именно влияние увлажнения.",proof:{kind:"protocol",edges:[[5,2],[2,4],[4,6],[6,3],[3,1]],size:6}},
  {model:"oge-biology",number:7,subtype:"organism-traits-from-description",prompt:"Описано взрослое животное: тело покрыто шерстью, детёныши получают молоко матери; позвоночник состоит из позвонков. Выберите три признака, прямо подтверждённых описанием. 1) Имеются молочные железы. 2) Относится к позвоночным. 3) Тело покрыто хитиновым панцирем. 4) Дышит жабрами. 5) Имеет волосяной покров. 6) Взрослая особь фотосинтезирует. Запишите номера выбранных признаков без пробелов.",answer:"125",rule:"unordered",explanation:"Молоко указывает на молочные железы (1), позвоночник — на позвоночных (2), шерсть — на волосяной покров (5). Остальные признаки не соответствуют описанному млекопитающему.",proof:{kind:"facts-selection",facts:[true,true,false,false,true,false],source:"https://openstax.org/books/biology-2e/pages/29-6-mammals"}},
  {model:"oge-biology",number:9,subtype:"plant-animal-cell-comparison",prompt:"Сравните типичную фотосинтезирующую клетку листа покрытосеменного растения с клеткой эпителия млекопитающего. Какие три структуры из списка характерны для первой и отсутствуют у второй? 1) Целлюлозная клеточная стенка. 2) Плазматическая мембрана. 3) Хлоропласты. 4) Ядро. 5) Крупная центральная вакуоль с клеточным соком. 6) Рибосомы. Запишите номера выбранных структур.",answer:"135",rule:"unordered",explanation:"Клеточная стенка (1), хлоропласты (3) и крупная центральная вакуоль (5) отличают указанную клетку листа от эпителиальной клетки животного. Мембрана, ядро и рибосомы есть у обеих клеток.",proof:{kind:"facts-selection",facts:[true,false,true,false,true,false],source:"https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells"}},
  taxonomy("oge",[{label:"Кошка домашняя",rank:6},{label:"Млекопитающие",rank:2},{label:"Хордовые",rank:1},{label:"Кошки (Felis)",rank:5},{label:"Хищные",rank:3},{label:"Животные",rank:0}]),
];

