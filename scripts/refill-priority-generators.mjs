// Original finite-domain models. The existing importer remains the publication gate.
import {createContentLoader} from './content-source-loader.mjs';
const l=createContentLoader(),{getExamDefinition}=l('src/lib/exams.ts'),{originalProvenance}=l('src/lib/content/provenance.ts');
const gcd=(a,b)=>b?gcd(b,a%b):a;
function decimal(n,d){const g=gcd(Math.abs(n),d);d/=g;n/=g;let q=d;while(q%2===0)q/=2;while(q%5===0)q/=5;return q===1?String(Number((n/d).toFixed(8))):null;}
export function refillRows(){
 const rows=[];
 function add(exam,subject,number,family,triple,prompt,answer,steps,proof){
  if(answer===null)return;
  const m=getExamDefinition({examType:exam,subjectId:subject,level:exam==='ЕГЭ'?'profile':null}),slot=m.numbers[number-1];
  const id=`refill-20261028-${m.id}-${number}-${family}-${rows.length+1}`;
  const task={id,examType:[exam],subjectId:subject,level:exam==='ЕГЭ'?'profile':null,examYear:2027,examVersionId:m.versionId,examNumber:number,part:slot.part,topicId:`${m.id}-n${number}`,prototypeId:`${m.id}-n${number}-original`,title:triple[2],prompt,answerDisplay:String(answer),answerRule:{type:'number',value:String(answer)},answerFormat:'number',difficulty:'standard',solution:steps.map(text=>({text})),source:{kind:'author',label:'Оригинальная тренировка «Точки» по проекту 2027 · не официальный КИМ',revision:1},provenance:originalProvenance('original-deterministic-family'),scoring:{status:'pending-official-verification',maxPrimaryScore:slot.maxPrimaryScore},requirementsReference:{...slot.sourceReference,year:2027,status:'draft-copy-reviewed'},publication:{id,releaseStatus:'ready',provenance:{sourceIds:['tochka-project-original'],authorship:'project-original',sourceFiles:['scripts/refill-priority-generators.mjs'],attribution:['Авторский материал проекта «Точка»']},validation:{status:'automated-reviewed',checkedAt:'2026-10-28',evidence:['scripts/verify-priority-refill.py','docs/priority-refill-verification.json']}}};
  rows.push({task,family,triple,proof:{kind:family,...proof}});
 }
 for(let i=0;i<220;i++){
  const a=1+i%17,b=1+(i*7)%23,c=1+(i*11)%19,d=1+(i*13)%29;
  const x=1+i%8,y=x+1+(i*3)% (10-x),u=1+(i*7)%8,v=u+1+(i*5)%(10-u),area=(y-x+1)*(v-u+1);
  add('ЕГЭ','math',4,'grid-rectangle',['Вероятность','Равновозможные исходы','Выбор точки в прямоугольной области'],`Наугад выбирают одну из 100 точек (x; y), где каждая координата — целое число от 1 до 10. Все точки равновероятны. Найдите вероятность того, что ${x} ≤ x ≤ ${y} и ${u} ≤ y ≤ ${v}.`,decimal(area,100),[`Допустимых первых координат ${y-x+1}, вторых ${v-u+1}.`,`По правилу произведения благоприятных точек ${area}; вероятность ${area}/100.`],{x,y,u,v});
  const L=a,R=L+b,M=L+c,N=M+d;
  const favourable=Math.max(R,N)-Math.min(L,M)+1-Math.max(0,M-R-1);
  add('ЕГЭ','math',4,'interval-union',['Вероятность','Сложение событий','Объединение пересекающихся диапазонов'],`На карточках написаны все целые числа от 1 до 100, каждое ровно один раз. Выбирают карточку равновероятно. Найдите вероятность, что её число принадлежит хотя бы одному из отрезков [${L}; ${R}] и [${M}; ${N}].`,decimal(favourable,100),[`В первом диапазоне ${R-L+1} чисел, во втором ${N-M+1}. Общих чисел ${Math.max(0,Math.min(R,N)-Math.max(L,M)+1)}.`,`В объединении ${favourable} чисел: складываем размеры и вычитаем пересечение. Делим на 100.`],{L,R,M,N});
  const red=1+a%8,blue=1+b%8,total=red+blue;
  const num=red*(red-1)+blue*(blue-1),den=total*(total-1);
  add('ЕГЭ','math',5,'without-replacement-same-colour',['Вероятность','Зависимые события','Два извлечения без возвращения'],`В мешке ${red} красных и ${blue} синих фишек. Дважды равновероятно выбирают по одной фишке без возвращения. Какова вероятность, что фишки одного цвета?`,decimal(num,den),[`Два красных: ${red}/${total} · ${red-1}/${total-1}; два синих: ${blue}/${total} · ${blue-1}/${total-1}.`,`Случаи несовместны. Их суммарная вероятность ${num}/${den}.`],{red,blue});
  const p=1+a%9,q=1+b%9,r=1+c%9;
  const z=p*(100-(10-q)*(10-r));
  add('ЕГЭ','math',5,'series-parallel-reliability',['Вероятность','Независимые события','Последовательное и параллельное соединение'],`Устройство работает, если работает элемент A и хотя бы один из элементов B, C. Отказы всех трёх элементов независимы. Вероятности работы A, B, C равны ${p/10}, ${q/10}, ${r/10}. Найдите вероятность работы устройства.`,decimal(z,1000),[`Вероятность отказа и B, и C равна ${10-q}/10 · ${10-r}/10.`,`Вероятность работы устройства равна ${p}/10 · (1 − ${10-q}/10 · ${10-r}/10) = ${z}/1000.`],{p,q,r});
  const mass1=10*a,mass2=10*b,k1=c,k2=d,mass=mass1+mass2,solute=mass1*k1+mass2*k2;
  add('ЕГЭ','math',11,'mixture-concentration',['Текстовые задачи','Смеси','Смешивание двух растворов'],`Смешали ${mass1} г раствора соли с массовой долей ${k1}% и ${mass2} г раствора той же соли с долей ${k2}%. Соли полностью растворены; потерь вещества, реакции и испарения нет. Найдите массовую долю соли в смеси в процентах.`,decimal(solute,mass),[`Масса соли в смеси (${mass1} · ${k1} + ${mass2} · ${k2})/100 = ${solute}/100 г.`,`Общая масса ${mass} г. Процентная концентрация ${solute}/${mass}.`],{mass1,mass2,k1,k2});
  const fast=a+10,slow=b+3,t=c,dist=(fast-slow)*t;
  if(dist>0)add('ЕГЭ','math',11,'catch-up-distance',['Текстовые задачи','Движение','Преследование с начальным отрывом'],`Два участника движутся по одной прямой в одном направлении с постоянными скоростями ${fast} км/ч и ${slow} км/ч. В начальный момент более медленный впереди на ${dist} км. Через сколько часов после этого момента быстрый впервые его догонит?`,t,[`Расстояние сокращается со скоростью ${fast} − ${slow} = ${fast-slow} км/ч.`,`Для ликвидации отрыва нужно ${dist}/${fast-slow} = ${t} ч. Относительная скорость положительна, встреча единственна.`],{fast,slow,dist});
  const S=a*10000,top=b*1000,withdraw=c*100,r1=1+d%17,r2=1+(a+b)%19;
  const final=(S*(100+r1)+100*(top-withdraw))*(100+r2);
  add('ЕГЭ','math',13,'deposit-with-cashflows',['Финансовые расчёты','Вклады','Капитализация с пополнением и снятием'],`На вклад внесли ${S} руб. В конце первого года начислили ${r1}%. Сразу затем вклад пополнили на ${top} руб. и сняли ${withdraw} руб. В конце второго года начислили ${r2}%. Других операций, налогов и комиссий нет; расчёт точный без промежуточного округления. Найдите итоговую сумму в рублях.`,decimal(final,10000),[`После первого начисления баланс ${S} · (1 + ${r1}/100).`,`После операций добавляем ${top} − ${withdraw}; затем умножаем весь остаток на 1 + ${r2}/100. Итог ${final}/10000 руб.`],{S,top,withdraw,r1,r2});
  const threshold=a*10000,gross=threshold+b*1000,rate1=c%19+1,rate2=d%19+20;
  const net=threshold*(100-rate1)+(gross-threshold)*(100-rate2);
  add('ЕГЭ','math',13,'progressive-charge',['Финансовые расчёты','Процентные расчёты','Расчёт по условной прогрессивной шкале'],`В учебной модели с дохода до ${threshold} руб. включительно удерживают ${rate1}%, а только с превышения — ${rate2}%. Это условная шкала, не описание действующих налогов. Доход составил ${gross} руб.; вычетов нет. Сколько рублей останется после удержания?`,decimal(net,100),[`До порога остаётся ${threshold} · (1 − ${rate1}/100) руб.`,`С превышения ${gross-threshold} остаётся ${gross-threshold} · (1 − ${rate2}/100) руб. Складываем: ${net}/100 руб.`],{threshold,gross,rate1,rate2});
  if(i<100){
   add('ОГЭ','math',6,'fraction-combination',['Числа и вычисления','Обыкновенные дроби','Действия с дробями'],`Вычислите (${a}/4 + ${b}/5) · ${c} − ${d}/2.`,decimal((5*a+4*b)*c-10*d,20),[`Приведём выражения в скобках к знаменателю 20: (${5*a}+${4*b})/20.`,`Умножим на ${c} и вычтем ${10*d}/20. Получаем ${((5*a+4*b)*c-10*d)}/20.`],{a,b,c,d});
   const start=a,addend=b,mult=2+c%7,answer=(start+addend)*mult+addend;
   add('ОГЭ','informatics',5,'executor-two-operations',['Алгоритмы','Исполнители','Прямое исполнение последовательности'],`Исполнитель начинает с числа ${start}. Команда 1 прибавляет ${addend}, команда 2 умножает на ${mult}. Выполните программу 121 слева направо. Какое число получится?`,answer,[`После команды 1: ${start+addend}. После команды 2: ${(start+addend)*mult}.`,`Последняя команда прибавляет ${addend}; результат ${answer}.`],{start,addend,mult});
   const m=10*a,w=c,water=10*b;
   add('ОГЭ','chemistry',18,'dilution-mass-fraction',['Растворы','Массовая доля растворённого вещества','Разбавление водой'],`К ${m} г водного раствора хлорида натрия с массовой долей ${w}% добавили ${water} г воды. При комнатной температуре весь хлорид натрия остаётся растворённым; испарения, реакции и потерь нет. Найдите массовую долю соли после разбавления в процентах.`,decimal(m*w,m+water),[`Масса соли сохраняется и равна ${m*w}/100 г.`,`Общая масса раствора ${m+water} г. Процентная массовая доля равна ${m*w}/${m+water}.`],{m,w,water});
  }
 }
 for(let i=0;i<220;i++){
  const p=2+i%97,q=2+(i*13)%83,r=2+(i*19)%89;
  const num=p*q*(100-r)+p*(100-q)*r+(100-p)*q*r;
  add('ЕГЭ','math',5,'three-trials-exactly-two',['Вероятность','Независимые события','Ровно два успеха с разными вероятностями'],`В трёх независимых испытаниях вероятности успеха равны ${p}%, ${q}% и ${r}%. Найдите вероятность ровно двух успехов.`,decimal(num,1000000),[`Ровно два успеха дают три несовместных исхода: успех-успех-неудача, успех-неудача-успех и неудача-успех-успех.`,`По независимости перемножаем вероятности внутри каждого исхода и складываем: (${p} · ${q} · ${100-r} + ${p} · ${100-q} · ${r} + ${100-p} · ${q} · ${r})/1000000 = ${num}/1000000.`],{p,q,r});
 }
 return rows;
}
