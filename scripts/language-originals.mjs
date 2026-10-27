import assert from "node:assert/strict";

/** All contexts and questions below are newly written, not source exercises.
 * The external references verify inflection/classifier facts, not task wording.
 * Editorial finite seeds are not certified unrestricted language generators.
 */
export const languageReferences={
  english:"https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/irregular-verbs",
  german:"https://deutsch.lingolia.com/de/grammatik/verben/sein-haben",
  french:"https://francais.lingolia.com/fr/grammaire/les-temps/le-present",
  spanish:"https://espanol.lingolia.com/es/gramatica/tiempos/presente",
  chinese:"https://mandarincorner.org/measure-words/",
};
// Reference paradigms, separately checked against the linked grammar tables.
export const languageNorms={
  english:{"buy:past":"bought","write:past":"wrote","go:past":"went","make:past":"made","find:past":"found","take:past":"took","give:past":"gave","see:past":"saw","meet:past":"met","think:past":"thought"},
  german:{"sein:ich":"bin","sein:du":"bist","sein:er":"ist","sein:wir":"sind","sein:ihr":"seid","haben:er":"hat","haben:sie-pl":"haben","haben:ich":"habe","haben:du":"hast","haben:ihr":"habt"},
  french:{"être:ils":"sont","avoir:nous":"avons","aller:vous":"allez","faire:elles":"font","être:nous":"sommes","avoir:tu":"as","aller:ils":"vont","faire:je":"fais","être:vous":"êtes","avoir:elles":"ont"},
  spanish:{"ser:yo":"soy","estar:tú":"estás","ir:nosotros":"vamos","ser:ellos":"son","estar:yo":"estoy","ir:ella":"va","ser:vosotros":"sois","estar:ellos":"están","ir:tú":"vas","ser:nosotros":"somos"},
};
const contexts={
  english:[
    ["buy","bought","Last Saturday our school opened a small charity market. I ___ a handmade notebook there. Its cover showed the river near our town. I now use it to plan our science club meetings."],
    ["write","wrote","Our class prepared a guide to the school garden last month. Lena ___ the introduction on Tuesday. The other pupils added their photographs on Wednesday. We displayed the finished guide by the entrance."],
    ["go","went","The city museum invited our astronomy club to a special exhibition. We ___ there after lunch last Friday. A volunteer showed us an old telescope. Everyone returned to school before the evening bus arrived."],
    ["make","made","We needed a shelter for the weather instruments in our garden. Anton ___ a wooden box for them during the spring holiday. His sister painted it white. The instruments stayed dry during the next storm."],
    ["find","found","Our team was checking the footpath beside the lake yesterday. Dasha ___ an empty bird nest under an old tree. We photographed it without moving it. Later, our biology teacher helped us discuss how birds build shelters."],
    ["take","took","At the end of our town history project, we wanted a record of the old station. I ___ several photographs of the building last Sunday. The caretaker showed us the waiting room. We added the pictures to our digital exhibition."],
    ["give","gave","We finished repairing the village reading room in June. The librarian ___ each volunteer a thank-you card at the final meeting. Mine had a drawing of a book on it. I put it above my desk when I came home."],
    ["see","saw","Our walking group visited the wetland reserve yesterday morning. We ___ a heron near a shallow pool. It remained perfectly still for several minutes. Our guide asked everyone to watch quietly from the path."],
    ["meet","met","A young engineer came to talk about accessible transport at our school. I ___ her in the workshop after the lecture yesterday. We discussed a model ramp built by our team. Her practical advice helped us improve the design."],
    ["think","thought","Our first idea for the exhibition was a set of large posters. Yesterday I ___ about a smaller display that visitors could carry. I drew the plan in my notebook. Today our team is comparing the two designs."],
  ],
  german:[
    ["sein","bin","ich","Ich arbeite jeden Mittwoch in unserer Schulbibliothek. Dort ___ ich für die neuen Bücher verantwortlich. Zuerst sortiere ich sie nach Themen. Danach stelle ich eine kleine Empfehlungsliste für meine Klasse zusammen."],
    ["sein","bist","du","In unserem Theaterprojekt spielt jeder eine andere Rolle. Heute ___ du für die Beleuchtung zuständig. Wir proben zuerst die letzte Szene. Danach besprechen wir gemeinsam, ob die Bühne hell genug ist."],
    ["sein","ist","er","Unser Nachbar repariert alte Fahrräder in seiner Werkstatt. Am Samstag ___ er meistens schon um acht Uhr dort. Jugendliche aus dem Viertel helfen ihm. Gemeinsam machen sie kaputte Räder wieder sicher."],
    ["sein","sind","wir","Wir untersuchen die Geräusche in unserer Stadt. Heute ___ wir im Park unterwegs. Eine Gruppe zählt die vorbeifahrenden Fahrräder. Eine andere notiert, wann die Vögel besonders laut singen."],
    ["sein","seid","ihr","Unsere Klasse plant ein Fest für neue Schülerinnen und Schüler. Für die Musik ___ ihr verantwortlich. Die andere Gruppe bereitet die Spiele vor. Am Ende vergleichen wir unsere Pläne und verteilen die Aufgaben."],
    ["haben","hat","er","Paul sammelt Geschichten über das alte Bahnhofsgebäude. Heute ___ er einen Termin mit einer ehemaligen Mitarbeiterin. Er bereitet seine Fragen sorgfältig vor. Später möchte er daraus einen kurzen Bericht für die Schulzeitung schreiben."],
    ["haben","haben","sie-pl","Die Kinder betreuen einen kleinen Schulgarten. Für jede Pflanze ___ sie ein eigenes Schild. Auf den Schildern stehen der Name und das Pflanzdatum. So können auch Besucher die verschiedenen Beete verstehen."],
    ["haben","habe","ich","Ich dokumentiere die Renovierung unseres Jugendzentrums. Für die Fotos ___ ich eine kleine Kamera. Jeden Abend wähle ich drei Bilder aus. Dazu schreibe ich kurze Erklärungen für Menschen, die nicht dabei sein können."],
    ["haben","hast","du","Wir entwerfen einen neuen Plan für den Schulhof. Welche Ideen ___ du für eine ruhige Leseecke? Die Sportgruppe plant bereits einen Platz für Ballspiele. Morgen stellen wir alle Vorschläge in der Klasse vor."],
    ["haben","habt","ihr","Ihr baut ein Modell für die Ausstellung über erneuerbare Energie. Dafür ___ ihr einen Motor und mehrere Kabel. Die Werkstatt bleibt bis fünf Uhr geöffnet. Danach räumen alle Gruppen gemeinsam die Tische auf."],
  ],
  french:[
    ["être","sont","ils","Les élèves préparent une exposition sur leur quartier. Aujourd’hui, ils ___ dans la salle de dessin. Chacun choisit un bâtiment à présenter. Ensuite, le groupe prépare les légendes pour les visiteurs."],
    ["avoir","avons","nous","Notre classe organise une collecte de livres pour un centre de loisirs. Nous ___ déjà plusieurs cartons à trier. Les livres pour enfants occupent la première table. Demain, nous préparerons une affiche pour expliquer notre projet."],
    ["aller","allez","vous","Vous participez au club de sciences du collège. Chaque jeudi, vous ___ dans le jardin pour relever la température. Une élève note les résultats. Le groupe compare ensuite les observations de toute la semaine."],
    ["faire","font","elles","Deux amies préparent le journal de leur école. Chaque mois, elles ___ une enquête auprès des élèves. Cette fois, le sujet est la cour de récréation. Elles présentent ensuite les réponses pendant une réunion."],
    ["être","sommes","nous","Nous aidons à préparer une visite du vieux moulin. Ce matin, nous ___ devant la porte pour accueillir les premières familles. Le guide distribue un petit plan. Puis la visite commence dans la cour."],
    ["avoir","as","tu","Tu prépares un reportage sur le marché du quartier. Pour interroger les commerçants, tu ___ une liste de questions très précise. Ton amie prend les photographies. Vous choisirez ensemble les images pour le journal."],
    ["aller","vont","ils","Les membres du club de lecture aiment rencontrer de nouveaux auteurs. Une fois par mois, ils ___ à la bibliothèque municipale. Ils écoutent une présentation puis posent leurs questions. Un petit compte rendu paraît ensuite sur le site du collège."],
    ["faire","fais","je","Je participe à un atelier de réparation de vélos. Chaque samedi, je ___ les vérifications les plus simples avec un adulte. Nous contrôlons les freins avant de toucher aux roues. La sécurité reste notre priorité."],
    ["être","êtes","vous","Vous préparez le spectacle de fin d’année avec les plus jeunes élèves. Aujourd’hui, vous ___ responsables de leur accueil. Les costumes attendent dans une autre salle. La répétition commencera après la pause."],
    ["avoir","ont","elles","Les deux équipes travaillent sur des maquettes de ponts. Pour l’instant, elles ___ le même matériel sur leurs tables. Les formes choisies sont pourtant très différentes. Les essais permettront de comparer la solidité des constructions."],
  ],
  spanish:[
    ["ser","soy","yo","Cada viernes ayudo en la biblioteca de mi barrio. Allí yo ___ responsable del rincón de revistas. Primero ordeno los números nuevos. Después preparo una lista de recomendaciones para los visitantes más jóvenes."],
    ["estar","estás","tú","El grupo prepara una exposición sobre el río. Hoy tú ___ en la sala de informática para organizar las fotografías. Otro compañero revisa los textos. Al final de la tarde vamos a comparar las dos partes del trabajo."],
    ["ir","vamos","nosotros","Nuestro club observa las aves del parque. Todos los domingos nosotros ___ al estanque con un profesor. Cada participante lleva un cuaderno. Después compartimos las observaciones sin molestar a los animales."],
    ["ser","son","ellos","Dos alumnos coordinan el periódico del instituto. Ellos ___ los responsables de elegir los temas. Esta semana quieren hablar de los espacios de lectura. Antes de escribir, escuchan las ideas de otras clases."],
    ["estar","estoy","yo","Hoy preparo una visita para los nuevos socios del club. Ahora yo ___ junto a la entrada para recibirlos. Mi compañera explica las actividades en el patio. Cuando llegue todo el mundo, empezaremos el recorrido."],
    ["ir","va","ella","Clara investiga la historia de las tiendas de su calle. Cada martes ella ___ al archivo municipal para consultar documentos. Un empleado le explica cómo buscar. Después, Clara escribe un resumen para su clase."],
    ["ser","sois","vosotros","Vosotros participáis en la organización de la feria de ciencias. Este año vosotros ___ los encargados de presentar las maquetas. Otro equipo prepara los experimentos. Todos ensayamos la presentación antes de abrir las puertas."],
    ["estar","están","ellos","Los voluntarios limpian y ordenan el pequeño teatro del barrio. En este momento ellos ___ detrás del escenario. Allí revisan las cajas de decorados. Más tarde comprobarán las luces con una persona adulta."],
    ["ir","vas","tú","Estamos preparando una guía de rutas para bicicletas. Cada miércoles tú ___ al centro juvenil para dibujar los mapas. Tu amiga comprueba las distancias. Luego publicamos una versión que los vecinos pueden comentar."],
    ["ser","somos","nosotros","Nuestro instituto colabora con un huerto comunitario. Nosotros ___ el equipo que prepara los carteles de las plantas. Queremos que cualquier visitante entienda la información. Por eso revisamos juntos cada descripción antes de colocarla."],
  ],
};
export function buildLanguagePilot(){
  const tasks=[];
  for(const [subject,rows] of Object.entries(contexts))rows.forEach((row,i)=>{
    const [lemma,answer,personOrText,maybeText]=row,context=maybeText??personOrText;
    const normKey=`${lemma}:${subject==="english"?"past":personOrText}`;
    const exam=i<5?"oge":"ege",number=(exam==="oge"?20:19)+i%5;
    const tense=subject==="english"?"Past Simple":subject==="german"?"Präsens":subject==="french"?"présent de l’indicatif":"presente de indicativo";
    tasks.push({model:`${exam}-${subject}`,number,subtype:`grammar-${normKey}`,prompt:`Прочитайте авторский связный текст. Преобразуйте ${lemma.toLocaleUpperCase()} в форму ${tense}, подходящую по лицу и числу к подлежащему, и заполните единственный пропуск. В ответе запишите только полученную форму без подлежащего.\n\n${context}`,answer,rule:"word",explanation:`Здесь требуется ${tense}, ${subject==="english"?"неправильная форма прошедшего времени":`форма для ${personOrText}`}: ${lemma} → ${answer}. Вписывается только глагольная форма, не всё предложение.`,proof:{kind:"language-inflection",subject,normKey,source:languageReferences[subject],context,lemma}});
  });
  tasks.push(
    {model:"ege-chinese",number:16,subtype:"classifier-bound-volume",prompt:"Прочитайте авторский контекст и выберите счётное слово для пропуска. 王丽准备去图书馆还书。她把三___小说放进书包，又检查了借书卡。今天下午她想和朋友一起讨论这些故事。 1) 张 2) 本 3) 条 4) 只. Запишите номер ответа.",answer:"2",rule:"ordered",explanation:"Для счёта книг и переплетённых томов употребляется 本: 三本小说. 张 обычно считают плоские предметы, 条 — длинные, а 只 — в частности, животных. В данном наборе только 本 подходит к 小说.",proof:{kind:"classifier",noun:"小说",options:["张","本","条","只"],source:languageReferences.chinese}},
    {model:"ege-chinese",number:16,subtype:"classifier-sheet",prompt:"Выберите подходящее счётное слово. 美术课开始了，李老师请大家画一棵树。小林从盒子里拿出两___白纸，把其中一张给了同桌。两个人都准备好了铅笔。 1) 本 2) 只 3) 张 4) 条. Ответ — номер выбранного варианта.",answer:"3",rule:"ordered",explanation:"Белая бумага считается листами: 两张白纸. Среди данных вариантов 张 — нормативное счётное слово для целых листов бумаги.",proof:{kind:"classifier",noun:"白纸",options:["本","只","张","条"],source:languageReferences.chinese}},
    {model:"ege-chinese",number:19,subtype:"chinese-integer-tens",prompt:"В учебном объявлении число участников нужно записать иероглифами. 活动开始前，老师数了人数：第一组有二十人，第二组有十五人，两组一共有___人。两组没有重复参加的人。Выберите запись общего количества. 1) 五十三 2) 三十 3) 三十五 4) 三百五十. Запишите номер ответа.",answer:"3",rule:"ordered",explanation:"20+15=35. Число 35 записывается 三十五: три десятка и пять единиц. 五十三 — 53, 三十 — 30, 三百五十 — 350.",proof:{kind:"chinese-integer",addends:[20,15],options:["五十三","三十","三十五","三百五十"]}},
    {model:"ege-chinese",number:19,subtype:"chinese-integer-hundreds",prompt:"Школьный клуб подводит итог сбора книг. 图书角原来有八十本书，今天同学们又带来了二十四本。老师在记录表上写：现在一共有___本书。这期间没有借出或丢失的书。Выберите правильную запись итогового числа. 1) 一百四十 2) 一百零四 3) 一百四十四 4) 十四. В ответе укажите номер.",answer:"2",rule:"ordered",explanation:"80+24=104. Между сотней и единицами нет десятков, поэтому в обычной записи ставится 零: 一百零四. Другие варианты обозначают 140, 144 и 14.",proof:{kind:"chinese-integer",addends:[80,24],options:["一百四十","一百零四","一百四十四","十四"]}},
    {model:"ege-chinese",number:17,subtype:"lexical-compatibility-read",prompt:"Подберите слово по смыслу авторского текста. 王明在图书馆找到一本没有插图的小说。他打开书，用眼睛一行一行地___书上的文字，把喜欢的句子记在本子上。周围很安静。 1) 喝 2) 看 3) 穿 4) 吃. Запишите номер подходящего глагола.",answer:"2",rule:"ordered",explanation:"Глазами читают, то есть 看文字. 喝 — пить, 穿 — надевать/носить одежду, 吃 — есть: эти значения не подходят к чтению строк глазами.",proof:{kind:"chinese-lexeme",options:["喝","看","穿","吃"],source:"https://en.wiktionary.org/wiki/看"}},
  );return tasks;
}
const cnDigits={零:0,一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
function parseChineseInteger(text){
  let total=0,digit=0;
  for(const c of text){if(c in cnDigits)digit=cnDigits[c];else if(c==="十"||c==="百"){total+=(digit||1)*(c==="十"?10:100);digit=0;}else throw Error("Unsupported numeral");}return total+digit;
}
export function verifyLanguage(entry){
  const p=entry.proof;
  switch(p.kind){
    case "language-inflection":
      assert.equal(entry.answer,languageNorms[p.subject][p.normKey]);assert.equal((p.context.match(/___/g)??[]).length,1);
      assert.ok(p.context.split(/[.!?]/u).filter(s=>s.trim()).length>=3);assert.ok(entry.prompt.includes(p.context)&&entry.prompt.includes(p.lemma.toLocaleUpperCase()));break;
    case "classifier":{
      const normative=p.noun==="小说"?"本":p.noun==="白纸"?"张":null;assert.ok(normative);
      assert.equal(p.options.filter(x=>x===normative).length,1);assert.equal(p.options[Number(entry.answer)-1],normative);break;
    }
    case "chinese-integer":{
      const target=p.addends.reduce((a,b)=>a+b,0),matches=p.options.flatMap((s,i)=>parseChineseInteger(s)===target?[i+1]:[]);
      assert.equal(matches.length,1);assert.equal(entry.answer,String(matches[0]));break;
    }
    case "chinese-lexeme":assert.equal(p.options[Number(entry.answer)-1],"看");assert.ok(entry.prompt.includes("用眼睛"));break;
    default:throw Error("Unreviewed language exercise");
  }
  return true;
}
