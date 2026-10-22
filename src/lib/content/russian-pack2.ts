import { ogePack2TextEntries } from "./russian-pack2-oge-texts";
import { ogePack2RuleEntries } from "./russian-pack2-oge-rules";
import { egePack2TextEntries } from "./russian-pack2-ege-texts";
import { egePack2LanguageEntries } from "./russian-pack2-ege-language";
import { egePack2MatchingEntries } from "./russian-pack2-ege-matching";
import { egePack2SpellingEntries } from "./russian-pack2-ege-spelling";
import { egePack2PunctuationEntries } from "./russian-pack2-ege-punctuation";

export const russianPack2 = [
  ...[...ogePack2TextEntries, ...ogePack2RuleEntries].map(entry => ({ exam: "ОГЭ" as const, entry })),
  ...[...egePack2TextEntries, ...egePack2LanguageEntries, ...egePack2MatchingEntries,
    ...egePack2SpellingEntries, ...egePack2PunctuationEntries].map(entry => ({ exam: "ЕГЭ" as const, entry })),
];
