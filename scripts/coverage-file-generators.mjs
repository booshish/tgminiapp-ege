import assert from 'node:assert/strict';
// Own bounded data; results are recomputed from the actual files by Python.
const rng=seed=>()=>{seed=(seed*48271)%2147483647;return seed;};
export function coverageFileCases(){
 const rows=[];
 for(let variant=0;variant<2;variant++){
  const random=rng(871+variant*193),data=Array.from({length:2400},()=>random()%19999-9999),mean=data.reduce((a,b)=>a+b,0)/data.length;
  const accepted=data.slice(1).flatMap((b,i)=>{
   const a=data[i],sum=a+b,ok=variant===0?(a%11===0||b%11===0)&&sum>mean:((a%9===0)!==(b%9===0))&&sum<0;
   return ok?[sum]:[];
  });
  assert.ok(accepted.length>1);
  const count=accepted.length,best=variant===0?Math.max(...accepted):Math.min(...accepted),name=`sequence-${variant+1}.txt`;
  rows.push({subject:'informatics',exam:'ЕГЭ',number:17,slug:`adjacent-file-${variant+1}`,prompt:`В файле ${name} записаны 2400 целых чисел от −9999 до 9999, по одному в строке. Пара состоит из двух соседних элементов; соседние пары могут перекрываться. ${variant===0?'Найдите пары, в которых хотя бы один элемент кратен 11, а сумма элементов больше среднего арифметического ВСЕХ чисел файла. Укажите количество таких пар и наибольшую из их сумм.':'Найдите пары, в которых ровно один элемент кратен 9 и сумма отрицательна. Укажите количество таких пар и наименьшую из их сумм.'} Запишите два целых числа через один пробел: сначала количество, затем сумму.`,answer:`${count} ${best}`,rule:'text',resources:[{name,content:data.join('\n')+'\n'}],steps:[variant===0?'Первым проходом вычисляем среднее всего файла, затем перебираем соседей.':'Для каждой пары проверяем неравенство признаков делимости и отрицательность суммы.',`При проходе учитываем каждую подходящую пару один раз: получаем ${count} пар. ${variant===0?'Максимальная':'Минимальная'} сумма равна ${best}.`,variant===0?`Среднее равно ${data.reduce((a,b)=>a+b,0)}/2400; во избежание округления проверяем 2400·(a+b) > сумма всех элементов.`:'Для отрицательных чисел кратность также означает нулевой остаток; «ровно один» реализуется исключающим ИЛИ.'],triple:['Файловые алгоритмы','Соседние пары','Отбор пар числового файла'],proof:{kind:'adjacent-file',variant}});
 }
 for(let variant=0;variant<2;variant++){
  const random=rng(1807+variant*97),processes=[];
  for(let id=1;id<=30;id++){
   const duration=1+random()%8,deps=id<=5?[]:[1+random()%(id-1),1+random()%(id-1)].filter((v,i,a)=>a.indexOf(v)===i);
   const start=Math.max(0,...deps.map(dep=>processes[dep-1].end));
   processes.push({id,duration,deps,start,end:start+duration});
  }
  const ms=variant===0?7:13,answer=processes.filter(p=>p.start<ms&&p.end>=ms).length,name=`processes-${variant+1}.tsv`;
  assert.ok(answer>0);
  const content='ID\tduration_ms\tdependencies\n'+[...processes].reverse().map(p=>`${p.id}\t${p.duration}\t${p.deps.join(';')||0}`).join('\n')+'\n';
  rows.push({subject:'informatics',exam:'ЕГЭ',number:22,slug:`process-file-${variant+1}`,prompt:`Таблица ${name} содержит 30 процессов. Столбцы: ID; длительность в миллисекундах; ID всех обязательных предшественников через точку с запятой (0 — зависимостей нет). Порядок строк не является порядком запуска. Каждый процесс запускается сразу после завершения всех предшественников; число исполнителей не ограничено, приостановок нет. Первая миллисекунда работы системы имеет номер 1. Сколько процессов выполняется на ${ms}-й миллисекунде? Процесс длительностью 3 мс, начавшийся в момент 0, занимает миллисекунды 1, 2 и 3.`,answer:String(answer),rule:'number',resources:[{name,content}],steps:['Для независимого процесса время старта 0; для остальных — максимум времени завершения всех предшественников. К старту прибавляем длительность.',`Проверяем условие start < ${ms} ≤ end для каждого процесса. Подходящие ID: ${processes.filter(p=>p.start<ms&&p.end>=ms).map(p=>p.id).join(', ')}. Ответ ${answer}.`,'Обработка TSV по ID, а не по номеру строки, исключает ошибку из-за обратного порядка записей.'],triple:['Файловые алгоритмы','Параллельные процессы','Количество одновременно работающих процессов'],proof:{kind:'process-file',ms}});
 }
 for(let variant=0;variant<2;variant++){
  const random=rng(911+variant*277),alphabet=variant===0?'002468--**':'001357--**',content=Array.from({length:7000},()=>alphabet[random()%alphabet.length]).join(''),name=`expressions-${variant+1}.txt`;
  let best=0;
  const re=/(?=((?:[1-9][0-9]*|0)(?:[-*](?:[1-9][0-9]*|0))*))/g;
  for(const m of content.matchAll(re))best=Math.max(best,m[1].length);
  rows.push({subject:'informatics',exam:'ЕГЭ',number:24,slug:`expression-file-${variant+1}`,prompt:`Файл ${name} содержит одну строку из цифр ${variant===0?'0, 2, 4, 6, 8':'0, 1, 3, 5, 7'}, дефиса «-» и звёздочки «*». Найдите длину самого длинного непрерывного фрагмента, который можно прочитать как выражение вида «число, затем ноль или более пар операция–число». Операции — вычитание и умножение; числа — целые неотрицательные. Многозначное число не начинается с 0; одиночный 0 допустим. Фрагмент начинается и заканчивается цифрой, соседние операции запрещены, унарных знаков нет. Вычислять значение выражения не требуется.`,answer:String(best),rule:'number',resources:[{name,content:content+'\n'}],steps:['Допустимая запись числа — одиночный 0 или ненулевая цифра с последующими цифрами. После числа разрешена пара из операции и нового числа.',`Для каждого возможного начала находим самый длинный допустимый фрагмент по этой грамматике. Максимум длины равен ${best}.`,'Нельзя просто искать длиннейший блок без двух операций подряд: запись 024 недопустима как одно число из-за ведущего нуля.'],triple:['Файловые алгоритмы','Обработка строк','Распознавание арифметического выражения'],proof:{kind:'expression-file'}});
 }
 return rows;
}
