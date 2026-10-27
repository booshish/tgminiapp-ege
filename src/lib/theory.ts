import { originalPublication } from "./content/original-publication";
import { getPublicationDecision } from "./content-publication";
import type { PublicationCandidate } from "./content-publication";
import { foundationLearningChecks } from "./content/foundation-learning-checks";
import type { Exam } from "@/lib/navigation";
import type { SubjectId } from "./subjects";
import { subjectTheoryTopics } from "./content/subject-theory";
import { numberTheoryTopics } from "./content/number-theory";
import { baseTheoryTopics } from "./content/base-theory";
import { knowledgeChecks, type KnowledgeCheck } from "./content/knowledge-checks";
import { originalProvenance, type ContentProvenance } from "./content/provenance";

export type TheoryTopic = {
  id: string;
  publication: PublicationCandidate;
  learningChecks?: (typeof foundationLearningChecks)[keyof typeof foundationLearningChecks];
  level?: "base" | "profile" | null;
  knowledgeChecks?: KnowledgeCheck[];
  provenance?: ContentProvenance;
  subjectId: SubjectId;
  requirementsReference?: { url: string; pdfPage: number; year: number; status: "draft-copy-reviewed" };
  part: 1 | 2;
  coverage: "foundation" | "exam-topic";
  /** Author-defined links to the project exam structure, not official endorsement. */
  examNumbers?: number[];
  source: { kind: "author"; label: string };
  readMinutes: number;
  examType: Exam[];
  title: string;
  description: string;
  prerequisites: string[];
  sections: { title: string; body: string[]; formulas?: string[] }[];
  examples: {
    title: string;
    steps: { text: string; latex?: string }[];
    answer: string;
  }[];
  difficulties: string[];
  materialId: string;
};

/** Общая математическая база для обоих экзаменов, не полный курс ОГЭ или ЕГЭ. */
const originalTheoryTopics: Omit<TheoryTopic, "publication" | "learningChecks">[] = [
  {
    id: "fractions",
    subjectId: "math",
    part: 1,
    coverage: "foundation",
    source: { kind: "author", label: "Авторский демонстрационный конспект" },
    readMinutes: 5,
    examType: ["ОГЭ", "ЕГЭ"],
    title: "Обыкновенные дроби",
    description:
      "Сокращаем, приводим к общему знаменателю и выполняем действия.",
    prerequisites: [],
    materialId: "fractions-basics",
    sections: [
      {
        title: "Числитель и знаменатель",
        body: [
          "Знаменатель показывает, на сколько равных частей разделили целое, а числитель — сколько таких частей взяли. Знаменатель не может быть равен нулю.",
          "Умножение или деление числителя и знаменателя на одно и то же ненулевое число не меняет дробь. Сократить дробь — значит разделить их на общий делитель.",
        ],
        formulas: [
          String.raw`\frac{a}{b}=\frac{a\cdot k}{b\cdot k},\quad b\ne0,\ k\ne0`,
        ],
      },
      {
        title: "Сложение и вычитание",
        body: [
          "Сначала найдите общий знаменатель. Удобно выбирать наименьшее общее кратное знаменателей. Домножайте и числитель, и знаменатель каждой дроби.",
          "Когда знаменатели одинаковые, сложите или вычтите числители, а знаменатель сохраните. В конце сократите ответ, если возможно.",
        ],
        formulas: [
          String.raw`\frac{a}{c}\pm\frac{b}{c}=\frac{a\pm b}{c},\quad c\ne0`,
        ],
      },
      {
        title: "Умножение и деление",
        body: [
          "При умножении дробей перемножайте числители и знаменатели. Общие множители можно сократить до умножения.",
          "Чтобы разделить на дробь, умножьте на обратную ей. Делитель должен быть ненулевым. В формулах ниже знаменатели b и d также ненулевые.",
        ],
        formulas: [
          String.raw`\frac{a}{b}\cdot\frac{c}{d}=\frac{ac}{bd}`,
          String.raw`\frac{a}{b}:\frac{c}{d}=\frac{a}{b}\cdot\frac{d}{c},\quad c\ne0`,
        ],
      },
    ],
    examples: [
      {
        title: "Сложить 2/3 и 1/4",
        steps: [
          {
            text: "Общий знаменатель для 3 и 4 — 12. Первую дробь домножим на 4, вторую — на 3.",
            latex: String.raw`\frac{2}{3}+\frac{1}{4}=\frac{8}{12}+\frac{3}{12}`,
          },
          {
            text: "Сложим числители. Полученная дробь уже несократима.",
            latex: String.raw`\frac{8+3}{12}=\frac{11}{12}`,
          },
        ],
        answer: "11/12",
      },
      {
        title: "Разделить 3/5 на 9/10",
        steps: [
          {
            text: "Заменим деление умножением на обратную дробь.",
            latex: String.raw`\frac{3}{5}:\frac{9}{10}=\frac{3}{5}\cdot\frac{10}{9}`,
          },
          {
            text: "Сократим 10 и 5 на 5, затем 3 и 9 на 3.",
            latex: String.raw`\frac{3\cdot10}{5\cdot9}=\frac{2}{3}`,
          },
        ],
        answer: "2/3",
      },
    ],
    difficulties: [
      "При сложении знаменатели не складываются: сначала нужен общий знаменатель.",
      "Сокращать можно общие множители числителя и знаменателя, а не отдельные слагаемые суммы.",
      "При делении переворачивают только вторую дробь — делитель.",
    ],
  },
  {
    id: "decimals",
    subjectId: "math",
    part: 1,
    coverage: "foundation",
    source: { kind: "author", label: "Авторский демонстрационный конспект" },
    readMinutes: 5,
    examType: ["ОГЭ", "ЕГЭ"],
    title: "Десятичные дроби",
    description: "Работаем с запятой, разрядами и переводом дробей.",
    prerequisites: ["fractions"],
    materialId: "decimals-basics",
    sections: [
      {
        title: "Что стоит после запятой",
        body: [
          "Первая цифра после запятой обозначает десятые, вторая — сотые, третья — тысячные. Нули справа в конце десятичной дроби не меняют её значение: 0,5 = 0,50.",
          "Чтобы записать конечную десятичную дробь обыкновенной, уберите запятую, а в знаменателе поставьте 10, 100, 1000 и так далее — по числу знаков после запятой. Затем сократите дробь.",
        ],
        formulas: [String.raw`0{,}375=\frac{375}{1000}=\frac{3}{8}`],
      },
      {
        title: "Сложение, вычитание и умножение",
        body: [
          "При сложении и вычитании запишите числа так, чтобы запятые стояли друг под другом. Недостающие десятичные разряды можно дополнить нулями.",
          "При умножении сначала перемножьте числа без запятых. В результате отделите справа столько цифр, сколько всего знаков после запятой было в обоих множителях.",
        ],
        formulas: [String.raw`1{,}2\cdot0{,}35=0{,}42`],
      },
      {
        title: "Деление и перевод в десятичную запись",
        body: [
          "При делении на десятичную дробь перенесите запятую вправо в обоих числах на одинаковое число разрядов, чтобы делитель стал целым. Значение частного не изменится.",
          "Для перевода обыкновенной дроби в десятичную разделите числитель на знаменатель. Не каждая дробь даёт конечную запись: например, 1/3 = 0,(3). Скобки обозначают бесконечное повторение цифры.",
        ],
        formulas: [String.raw`4{,}8:0{,}6=48:6`],
      },
    ],
    examples: [
      {
        title: "Вычислить 3,7 + 0,85",
        steps: [
          {
            text: "Дополним первое число нулём: так оба числа будут записаны до сотых.",
            latex: String.raw`3{,}7+0{,}85=3{,}70+0{,}85`,
          },
          {
            text: "Сложим сотые с сотыми и сохраним разряды.",
            latex: String.raw`3{,}70+0{,}85=4{,}55`,
          },
        ],
        answer: "4,55",
      },
      {
        title: "Разделить 6,24 на 0,3",
        steps: [
          {
            text: "Умножим делимое и делитель на 10, то есть сдвинем обе запятые на один знак вправо.",
            latex: String.raw`6{,}24:0{,}3=62{,}4:3`,
          },
          {
            text: "Теперь делим на целое число. Проверим результат умножением.",
            latex: String.raw`62{,}4:3=20{,}8,\qquad20{,}8\cdot0{,}3=6{,}24`,
          },
        ],
        answer: "20,8",
      },
    ],
    difficulties: [
      "В сумме и разности выравнивайте запятые, а не последние цифры.",
      "При делении переносите запятую одинаково и в делимом, и в делителе.",
      "В произведении учтите знаки после запятой обоих множителей.",
    ],
  },
  {
    id: "percentages",
    subjectId: "math",
    part: 1,
    coverage: "foundation",
    source: { kind: "author", label: "Авторский демонстрационный конспект" },
    readMinutes: 5,
    examType: ["ОГЭ", "ЕГЭ"],
    title: "Проценты",
    description: "Находим часть и целое, считаем скидки и изменения цены.",
    prerequisites: ["fractions", "decimals"],
    materialId: "percentages-basics",
    sections: [
      {
        title: "Процент — одна сотая",
        body: [
          "Один процент равен одной сотой целого. Например, 25% = 25/100 = 0,25. Чтобы найти p процентов от числа N, умножьте N на p/100.",
          "Всегда определяйте, какое число принято за 100%. Без этого легко взять процент от неверной величины.",
        ],
        formulas: [String.raw`A=N\cdot\frac{p}{100}`],
      },
      {
        title: "Как найти исходное число",
        body: [
          "Если известно, что величина A составляет p процентов от целого N, разделите A на p/100. Для этой формулы p не должен быть равен нулю.",
          "Чтобы узнать, сколько процентов часть A составляет от ненулевого целого N, разделите часть на целое и умножьте на 100.",
        ],
        formulas: [
          String.raw`N=\frac{A}{p/100},\quad p\ne0`,
          String.raw`p=\frac{A}{N}\cdot100,\quad N\ne0`,
        ],
      },
      {
        title: "Увеличение и уменьшение",
        body: [
          "При увеличении на p процентов умножьте исходное значение на 1 + p/100. При уменьшении — на 1 − p/100.",
          "Последовательные изменения считают от текущего значения. Рост на 10%, а затем снижение на 10% дают 99% исходного числа, потому что 1,1 · 0,9 = 0,99.",
        ],
        formulas: [String.raw`N_{\text{new}}=N\left(1\pm\frac{p}{100}\right)`],
      },
    ],
    examples: [
      {
        title: "Цена 1500 ₽ снизилась на 20%",
        steps: [
          {
            text: "После скидки осталось 100% − 20% = 80% исходной цены.",
            latex: String.raw`100\%-20\%=80\%=0{,}8`,
          },
          {
            text: "Умножим цену на оставшуюся долю.",
            latex: String.raw`1500\cdot0{,}8=1200`,
          },
        ],
        answer: "1200 ₽",
      },
      {
        title: "180 страниц — это 30% книги. Сколько страниц в книге?",
        steps: [
          {
            text: "Ищем целое, а не процент от 180. Запишем 30% как 0,3.",
            latex: String.raw`0{,}3\cdot N=180`,
          },
          {
            text: "Разделим известную часть на долю.",
            latex: String.raw`N=\frac{180}{0{,}3}=600`,
          },
        ],
        answer: "600 страниц",
      },
    ],
    difficulties: [
      "20% — это 0,2, а не 20: перед вычислением разделите процент на 100.",
      "Не путайте найти часть по целому и найти целое по известной части.",
      "Скидки подряд нельзя просто складывать: база второго изменения уже другая.",
    ],
  },
  {
    id: "linear-equations",
    subjectId: "math",
    part: 1,
    coverage: "foundation",
    source: { kind: "author", label: "Авторский демонстрационный конспект" },
    readMinutes: 5,
    examType: ["ОГЭ", "ЕГЭ"],
    title: "Линейные уравнения",
    description: "Раскрываем скобки, собираем слагаемые и находим неизвестное.",
    prerequisites: ["fractions", "decimals"],
    materialId: "linear-equations-basics",
    sections: [
      {
        title: "Сохраняйте равенство",
        body: [
          "Корень уравнения — значение неизвестного, при котором получается верное равенство. К обеим частям можно прибавить или из обеих частей вычесть одно и то же число.",
          "Обе части также можно умножать или делить на одно и то же ненулевое число. Правило смены знака при переносе слагаемого — короткая запись одинакового действия с обеими частями.",
        ],
        formulas: [
          String.raw`ax+b=c\quad\Longrightarrow\quad x=\frac{c-b}{a},\quad a\ne0`,
        ],
      },
      {
        title: "Скобки и подобные слагаемые",
        body: [
          "Сначала раскройте скобки: множитель перед скобками умножается на каждое слагаемое внутри. Минус перед скобками меняет знаки всех слагаемых в скобках.",
          "Соберите слагаемые с неизвестным в одной части, числа — в другой. Приведите подобные слагаемые и разделите на коэффициент при неизвестном, если он ненулевой.",
        ],
        formulas: [String.raw`a(b+c)=ab+ac`, String.raw`-(x-4)=-x+4`],
      },
      {
        title: "Проверка и особые случаи",
        body: [
          "Подставьте найденное число в исходное уравнение. Левая и правая части должны совпасть.",
          "Если после упрощения получилось 0 · x = ненулевое число, решений нет. Если получилось 0 · x = 0 и других ограничений нет, подходит любое действительное число. Делить на ноль в этих случаях нельзя.",
        ],
      },
    ],
    examples: [
      {
        title: "Решить 3x + 7 = 22",
        steps: [
          { text: "Вычтем 7 из обеих частей.", latex: String.raw`3x=22-7=15` },
          {
            text: "Разделим на 3 и проверим.",
            latex: String.raw`x=5,\qquad3\cdot5+7=22`,
          },
        ],
        answer: "x = 5",
      },
      {
        title: "Решить 2(x − 3) = x + 4",
        steps: [
          {
            text: "Раскроем скобки: 2 умножается и на x, и на −3.",
            latex: String.raw`2x-6=x+4`,
          },
          {
            text: "Вычтем x из обеих частей, затем прибавим 6.",
            latex: String.raw`x=10`,
          },
          {
            text: "Проверим исходное уравнение.",
            latex: String.raw`2(10-3)=14,\qquad10+4=14`,
          },
        ],
        answer: "x = 10",
      },
    ],
    difficulties: [
      "Минус перед скобками меняет знак каждого слагаемого внутри.",
      "На коэффициент нужно разделить всю правую часть, а не одно слагаемое.",
      "Проверяйте ответ в исходном уравнении, до всех преобразований.",
    ],
  },
  {
    id: "quadratic-equations",
    subjectId: "math",
    part: 1,
    coverage: "foundation",
    source: { kind: "author", label: "Авторский демонстрационный конспект" },
    readMinutes: 5,
    examType: ["ОГЭ", "ЕГЭ"],
    title: "Квадратные уравнения",
    description:
      "Определяем число корней и решаем уравнения через дискриминант.",
    prerequisites: ["linear-equations", "powers-roots"],
    materialId: "quadratic-equations-basics",
    sections: [
      {
        title: "Приведите к стандартному виду",
        body: [
          "Квадратное уравнение имеет вид ax² + bx + c = 0, где a не равно нулю. Сначала перенесите всё в одну часть и приведите подобные слагаемые.",
          "Выпишите коэффициенты вместе со знаками. Например, для x² − 5x + 6 = 0 получаем a = 1, b = −5, c = 6.",
        ],
        formulas: [String.raw`ax^2+bx+c=0,\quad a\ne0`],
      },
      {
        title: "Дискриминант и действительные корни",
        body: [
          "Вычислите дискриминант D. Если D > 0, у уравнения два различных действительных корня. Если D = 0, один действительный корень. Если D < 0, действительных корней нет.",
          "При неотрицательном дискриминанте используйте формулу корней. Знаменатель равен 2a целиком: на него делится весь числитель.",
        ],
        formulas: [
          String.raw`D=b^2-4ac`,
          String.raw`x_{1,2}=\frac{-b\pm\sqrt{D}}{2a}\quad(D\ge0)`,
        ],
      },
      {
        title: "Когда можно проще",
        body: [
          "Если свободный член равен нулю, вынесите x за скобки и приравняйте каждый множитель к нулю. Деление на x может потерять корень x = 0.",
          "Уравнение x² = k при k > 0 имеет два корня: √k и −√k. При k = 0 корень один, а при k < 0 действительных корней нет.",
        ],
        formulas: [
          String.raw`ax^2+bx=x(ax+b)=0`,
          String.raw`x^2=25\quad\Longrightarrow\quad x=\pm5`,
        ],
      },
    ],
    examples: [
      {
        title: "Решить x² − 5x + 6 = 0",
        steps: [
          {
            text: "Выпишем коэффициенты и найдём дискриминант.",
            latex: String.raw`a=1,\ b=-5,\ c=6;\qquad D=(-5)^2-4\cdot1\cdot6=1`,
          },
          {
            text: "Дискриминант положительный, поэтому найдём два корня.",
            latex: String.raw`x_1=\frac{5-1}{2}=2,\qquad x_2=\frac{5+1}{2}=3`,
          },
          {
            text: "Проверка: при подстановке каждого корня левая часть равна нулю.",
            latex: String.raw`2^2-5\cdot2+6=0,\qquad3^2-5\cdot3+6=0`,
          },
        ],
        answer: "x = 2 или x = 3",
      },
      {
        title: "Решить 2x² + 4x + 2 = 0",
        steps: [
          {
            text: "Найдём дискриминант. Не забудем коэффициент a = 2.",
            latex: String.raw`D=4^2-4\cdot2\cdot2=0`,
          },
          {
            text: "При нулевом дискриминанте корень один.",
            latex: String.raw`x=-\frac{b}{2a}=-\frac{4}{4}=-1`,
          },
          {
            text: "Проверим подстановкой.",
            latex: String.raw`2\cdot(-1)^2+4\cdot(-1)+2=0`,
          },
        ],
        answer: "x = −1",
      },
    ],
    difficulties: [
      "Коэффициент b берите со знаком. Квадрат отрицательного числа записывайте со скобками.",
      "В формуле корней делите весь числитель на 2a.",
      "Уравнение x² = 25 имеет два корня: 5 и −5. А арифметический корень √25 равен только 5.",
    ],
  },
  {
    id: "powers-roots",
    subjectId: "math",
    part: 1,
    coverage: "foundation",
    source: { kind: "author", label: "Авторский демонстрационный конспект" },
    readMinutes: 5,
    examType: ["ОГЭ", "ЕГЭ"],
    title: "Степени и корни",
    description:
      "Упрощаем степени и понимаем, почему корень не бывает отрицательным.",
    prerequisites: ["fractions"],
    materialId: "powers-roots-basics",
    sections: [
      {
        title: "Правила для степеней",
        body: [
          "Натуральная степень показывает, сколько одинаковых множителей перемножают. Для одинакового основания при умножении показатели складываются, при делении — вычитаются.",
          "При возведении степени в степень показатели перемножаются. Формулы ниже верны для целых показателей при ненулевом основании a; это условие позволяет в том числе использовать отрицательные показатели.",
        ],
        formulas: [
          String.raw`a^m\cdot a^n=a^{m+n},\qquad\frac{a^m}{a^n}=a^{m-n}`,
          String.raw`(a^m)^n=a^{mn},\qquad a^0=1,\qquad a^{-n}=\frac{1}{a^n}`,
        ],
      },
      {
        title: "Арифметический квадратный корень",
        body: [
          "Арифметический квадратный корень из неотрицательного числа — неотрицательное число, квадрат которого равен подкоренному выражению. В действительных числах корень из отрицательного числа не определён.",
          "Корень из квадрата числа равен его модулю. Поэтому √((-6)²) = 6, а не −6.",
        ],
        formulas: [
          String.raw`\sqrt{a}\ge0\quad(a\ge0),\qquad(\sqrt{a})^2=a`,
          String.raw`\sqrt{a^2}=|a|`,
        ],
      },
      {
        title: "Действия с корнями",
        body: [
          "Корень из произведения неотрицательных чисел можно разделить на произведение корней. Для частного знаменатель под корнем должен быть положительным.",
          "К сумме это правило не относится: √(9 + 16) = 5, но √9 + √16 = 7.",
        ],
        formulas: [
          String.raw`\sqrt{ab}=\sqrt{a}\sqrt{b}\quad(a,b\ge0)`,
          String.raw`\sqrt{\frac{a}{b}}=\frac{\sqrt{a}}{\sqrt{b}}\quad(a\ge0,\ b>0)`,
        ],
      },
    ],
    examples: [
      {
        title: "Вычислить (2³ · 2⁴) / 2⁵",
        steps: [
          {
            text: "При умножении складываем показатели, при делении вычитаем.",
            latex: String.raw`\frac{2^3\cdot2^4}{2^5}=2^{3+4-5}`,
          },
          {
            text: "Посчитаем показатель, а затем значение степени.",
            latex: String.raw`2^{3+4-5}=2^2=4`,
          },
        ],
        answer: "4",
      },
      {
        title: "Вычислить √((-6)²) + √49",
        steps: [
          {
            text: "Корень из квадрата равен модулю, а не самому числу со знаком.",
            latex: String.raw`\sqrt{(-6)^2}=|-6|=6`,
          },
          {
            text: "Арифметический корень из 49 равен 7. Складываем.",
            latex: String.raw`6+\sqrt{49}=6+7=13`,
          },
        ],
        answer: "13",
      },
    ],
    difficulties: [
      "Складывать показатели при умножении можно только у степеней с одинаковым основанием.",
      "√(a + b) в общем случае не равно √a + √b.",
      "Различайте −3² = −9 и (−3)² = 9: скобки меняют порядок действий.",
    ],
  },
  {
    id: "geometry",
    subjectId: "math",
    part: 1,
    coverage: "foundation",
    source: { kind: "author", label: "Авторский демонстрационный конспект" },
    readMinutes: 5,
    examType: ["ОГЭ", "ЕГЭ"],
    title: "Базовая геометрия",
    description:
      "Разбираемся с прямоугольным треугольником, синусом и площадью.",
    prerequisites: ["fractions", "powers-roots"],
    materialId: "geometry-basics",
    sections: [
      {
        title: "Теорема Пифагора",
        body: [
          "В прямоугольном треугольнике катеты образуют прямой угол. Гипотенуза лежит напротив прямого угла и является самой длинной стороной.",
          "Квадрат гипотенузы равен сумме квадратов катетов. Формула применима только к прямоугольному треугольнику. Длину стороны после извлечения корня берём положительной.",
        ],
        formulas: [String.raw`c^2=a^2+b^2,\qquad c=\sqrt{a^2+b^2}`],
      },
      {
        title: "Синус, косинус и тангенс",
        body: [
          "Для острого угла A в прямоугольном треугольнике назовём a противолежащий катет, b — прилежащий катет, c — гипотенузу. Катеты «меняются ролями», когда выбирают другой острый угол.",
          "Синус — отношение противолежащего катета к гипотенузе. Косинус — прилежащего катета к гипотенузе. Тангенс — противолежащего катета к прилежащему.",
        ],
        formulas: [
          String.raw`\sin A=\frac{a}{c},\qquad\cos A=\frac{b}{c},\qquad\tan A=\frac{a}{b}`,
        ],
      },
      {
        title: "Площадь треугольника",
        body: [
          "Площадь треугольника равна половине произведения основания на высоту, проведённую именно к этому основанию. Высота перпендикулярна основанию или его продолжению.",
          "В прямоугольном треугольнике один катет можно считать основанием, а другой — высотой. Длины перед вычислением должны быть в одинаковых единицах; площадь измеряют в квадратных единицах.",
        ],
        formulas: [
          String.raw`S=\frac{1}{2}ah,\qquad S_{\text{right}}=\frac{1}{2}ab`,
        ],
      },
    ],
    examples: [
      {
        title: "Катеты 5 и 12. Найти синус угла напротив катета 12",
        steps: [
          {
            text: "Сначала найдём гипотенузу по теореме Пифагора.",
            latex: String.raw`c=\sqrt{5^2+12^2}=\sqrt{169}=13`,
          },
          {
            text: "Противолежащий выбранному углу катет равен 12. Делим его на гипотенузу.",
            latex: String.raw`\sin A=\frac{12}{13}`,
          },
        ],
        answer: "12/13",
      },
      {
        title: "Основание треугольника 12 см, высота к нему 7 см",
        steps: [
          {
            text: "Подставим основание и соответствующую высоту в формулу площади.",
            latex: String.raw`S=\frac{1}{2}\cdot12\cdot7`,
          },
          {
            text: "Вычислим. Обе длины в сантиметрах, поэтому ответ будет в квадратных сантиметрах.",
            latex: String.raw`S=42`,
          },
        ],
        answer: "42 см²",
      },
    ],
    difficulties: [
      "Гипотенуза определяется прямым углом, а не расположением стороны на рисунке.",
      "Перед вычислением синуса отметьте нужный угол и катет напротив него.",
      "Для площади нельзя брать произвольную сторону и произвольную высоту: они должны соответствовать друг другу.",
    ],
  },
  {
    id: "probability",
    subjectId: "math",
    part: 1,
    coverage: "foundation",
    source: { kind: "author", label: "Авторский демонстрационный конспект" },
    readMinutes: 5,
    examType: ["ОГЭ", "ЕГЭ"],
    title: "Вероятность",
    description: "Считаем равновозможные исходы и проверяем разумность ответа.",
    prerequisites: ["fractions", "decimals"],
    materialId: "probability-basics",
    sections: [
      {
        title: "Благоприятные и все возможные исходы",
        body: [
          "Если все элементарные исходы равновозможны, вероятность события равна числу благоприятных исходов, делённому на общее число исходов. Обозначим эти количества m и n, где n > 0.",
          "Благоприятными называют исходы, при которых нужное событие произошло. Например, при броске обычного правильного кубика выпадению чётного числа соответствуют исходы 2, 4 и 6.",
        ],
        formulas: [String.raw`P(A)=\frac{m}{n},\qquad0\le m\le n`],
      },
      {
        title: "Границы и противоположное событие",
        body: [
          "Вероятность всегда от 0 до 1 включительно. Невозможное событие имеет вероятность 0, достоверное — 1.",
          "События «A произошло» и «A не произошло» противоположны. Их вероятности в сумме дают 1. Иногда удобнее сначала посчитать вероятность противоположного события.",
        ],
        formulas: [String.raw`0\le P(A)\le1,\qquad P(\overline{A})=1-P(A)`],
      },
      {
        title: "Выбирайте одинаково вероятные объекты",
        body: [
          "При случайном выборе одного шара из мешка исходами могут быть отдельные шары, если каждый из них одинаково вероятно вынуть. Цвета при этом не обязаны быть равновероятными: шаров каждого цвета может быть разное количество.",
          "Сначала выпишите все подходящие исходы или посчитайте их. Затем проверьте, что ни один исход не пропущен и не посчитан дважды.",
        ],
      },
    ],
    examples: [
      {
        title: "В мешке 3 синих и 5 белых шаров. Какова вероятность синего?",
        steps: [
          {
            text: "Считаем, что все шары одинаковы на ощупь и каждый может быть выбран с равной вероятностью. Всего шаров восемь.",
            latex: String.raw`n=3+5=8,\qquad m=3`,
          },
          {
            text: "Делим число синих шаров на общее количество.",
            latex: String.raw`P=\frac{3}{8}=0{,}375`,
          },
        ],
        answer: "0,375",
      },
      {
        title: "На правильном кубике выпало число больше 4",
        steps: [
          {
            text: "Все шесть граней равновозможны. Больше 4 только два значения: 5 и 6.",
            latex: String.raw`n=6,\qquad m=2`,
          },
          {
            text: "Найдём вероятность и сократим дробь.",
            latex: String.raw`P=\frac{2}{6}=\frac{1}{3}`,
          },
        ],
        answer: "1/3",
      },
    ],
    difficulties: [
      "Формула m/n требует равновозможности элементарных исходов.",
      "В знаменателе должны быть все исходы, включая благоприятные.",
      "Ответ больше 1 или меньше 0 означает ошибку в подсчёте или вычислениях.",
    ],
  },
  ...numberTheoryTopics,
  ...baseTheoryTopics,
];

export const theoryTopics: TheoryTopic[] = originalTheoryTopics.map((topic) => ({
  ...topic,
  examples: foundationLearningChecks[topic.id as keyof typeof foundationLearningChecks] ? [...topic.examples, ...foundationLearningChecks[topic.id as keyof typeof foundationLearningChecks].examples] : topic.examples,
  learningChecks: foundationLearningChecks[topic.id as keyof typeof foundationLearningChecks],
  publication: originalPublication(topic.id, topic.level === "base" ? "base-theory" : topic.coverage === "foundation" ? "foundation-theory" : "number-theory"),
  provenance: originalProvenance("original-explanation"),
  knowledgeChecks: topic.knowledgeChecks ?? knowledgeChecks[topic.id] ?? [],
}));

/** Legacy task/event topic identifiers resolve without rewriting stored history. */
export const allTheoryTopics: TheoryTopic[] = [...theoryTopics, ...subjectTheoryTopics];

export const theoryTopicAliases: Readonly<Record<string, string>> = {
  "trigonometric-equations": "ege-profile-number-13",
  "number-theory": "ege-profile-number-19",
};

export function getTheoryTopic(id: string): TheoryTopic | undefined {
  const resolved = theoryTopicAliases[id] ?? id;
  return getPublishedTheoryTopics().find((topic) => topic.id === resolved);
}

export function getPublishedTheoryTopics(): TheoryTopic[] {
  return allTheoryTopics.filter((topic) => topic.publication.id === topic.id && getPublicationDecision(topic.publication).allowed).map(currentTheoryView);
}

const theoryViewCache = new WeakMap<TheoryTopic, TheoryTopic>();
/** Presentation metadata only: source bodies, publication fingerprints and bookmark IDs remain immutable. */
function currentTheoryView(topic: TheoryTopic): TheoryTopic {
  if (topic.subjectId !== "math" || topic.coverage !== "exam-topic" || !topic.examNumbers || !topic.examType.includes("ЕГЭ")) return topic;
  const cached = theoryViewCache.get(topic);
  if (cached) return cached;
  const profile: Record<number, number> = { 1:1,2:2,3:3,4:4,5:5,6:7,7:8,8:9,9:10,10:11,11:12,12:9,13:14,14:15,15:16,16:17,17:18,18:19,19:20 };
  const base: Record<number, number[]> = { 1:[2],2:[4],4:[2],14:[1,14] };
  const numbers = [...new Set(topic.examNumbers.flatMap(n => topic.level === "base" ? base[n] ?? [n] : [profile[n] ?? n]))];
  const view: TheoryTopic = { ...topic, examNumbers:numbers, part:topic.level === "base" || numbers[0] <= 13 ? 1 : 2,
    title:topic.title.replace(/№\s*\d+/, `№${numbers.join(", ")}`) };
  theoryViewCache.set(topic, view);
  return view;
}
