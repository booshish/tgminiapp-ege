/** Rights and origin records, not a claim that public access grants a licence. */
export type SourceAction = "structural-reference" | "private-review" | "publish" | "modify";
export type SourceEvidence = {
  kind: "author-declaration" | "licence" | "permission" | "terms" | "review-log";
  url: string;
  description: string;
};
export type SourceRecord = {
  id: string;
  title: string;
  url: string | null;
  /** Date of the recorded rights check/attempt; reviewStatus says its outcome. */
  checkedAt: string;
  licenseType: "project-original" | "explicit-license" | "unknown";
  reviewStatus: "project-declaration" | "permission-confirmed" | "reference-only" | "unreviewed" | "revoked";
  permittedActions: readonly SourceAction[];
  attribution: string;
  evidence: readonly SourceEvidence[];
  /** Inclusive calendar date (UTC). null means no expiration was recorded. */
  rightsValidThrough: string | null;
  notes: string;
};

const repository = "https://github.com/booshish/tgminiapp-ege";

/** No competitor task, article, drawing or solution is approved for import here. */
export const sourceRegistry: readonly SourceRecord[] = [
  {
    id: "tochka-project-original",
    title: "Оригинальные учебные материалы проекта «Точка»",
    url: null,
    checkedAt: "2026-10-21",
    licenseType: "project-original",
    reviewStatus: "project-declaration",
    permittedActions: ["private-review", "publish", "modify"],
    attribution: "Авторский материал проекта «Точка»",
    evidence: [
      {
        kind: "author-declaration",
        url: `${repository}/blob/ca6389adcb94c126b356e6e15fdf24743af15a59/README.md`,
        description: "В проекте материалы обозначены авторскими; владелец поручил создание и публикацию самостоятельного контента. Это декларация происхождения, не независимая правовая экспертиза.",
      },
      {
        kind: "review-log",
        url: `${repository}/tree/ca6389adcb94c126b356e6e15fdf24743af15a59/src/lib/content`,
        description: "История исходных авторских генераторов и объяснений. Для конкретного материала дополнительно обязательны пути исходников и свидетельство проверки.",
      },
    ],
    rightsValidThrough: null,
    notes: "Разрешение в рамках существующего проекта не объявляется лицензией CC или разрешением на перепубликацию третьими лицами. Простого поля source.kind=author недостаточно для допуска нового материала.",
  },
  {
    id: "fipi-oge-structure",
    title: "ФИПИ: спецификации и кодификаторы ОГЭ",
    url: "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory",
    checkedAt: "2026-10-21",
    licenseType: "unknown",
    reviewStatus: "reference-only",
    permittedActions: ["structural-reference"],
    attribution: "ФИПИ — источник для последующей проверки официальных требований",
    evidence: [],
    rightsValidThrough: null,
    notes: "Ссылка на официальный указатель не подтверждает прочтение конкретного PDF, структуру целевого года или право перепубликовать задания. Чужой контент не импортируется.",
  },
  {
    id: "fipi-ege-structure",
    title: "ФИПИ: спецификации и кодификаторы ЕГЭ",
    url: "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory",
    checkedAt: "2026-10-21",
    licenseType: "unknown",
    reviewStatus: "reference-only",
    permittedActions: ["structural-reference"],
    attribution: "ФИПИ — источник для последующей проверки официальных требований",
    evidence: [],
    rightsValidThrough: null,
    notes: "База и профиль требуют отдельных проверенных документов. Открытый доступ к демоверсии не является разрешением на копирование её текста или рисунков.",
  },
  {
    id: "shkolkovo-public-reference",
    title: "Школково — возможный ориентир структуры и UX",
    url: "https://shkolkovoonline.ru/",
    checkedAt: "2026-10-21",
    licenseType: "unknown",
    reviewStatus: "unreviewed",
    permittedActions: [],
    attribution: "Школково",
    evidence: [],
    rightsValidThrough: null,
    notes: "Право копирования материалов не установлено. Никакие задания, тексты, решения, логотипы или иллюстрации этого источника не допущены к импорту. Сетевая проверка и ограничения фиксируются отдельно в отчёте источников.",
  },
];

export function getContentSource(id: string): SourceRecord | undefined {
  return sourceRegistry.find((source) => source.id === id);
}
