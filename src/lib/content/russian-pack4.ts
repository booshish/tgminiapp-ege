import { ogePack4TextEntries } from "./russian-pack4-oge-texts";
import { ogePack4PunctuationEntries } from "./russian-pack4-oge-punctuation";
import { ogePack4SpellingEntries } from "./russian-pack4-oge-spelling";
import { ogePack4NormEntries } from "./russian-pack4-oge-norms";
import { egePack4TextEntries } from "./russian-pack4-ege-texts";
import { egePack4LanguageEntries } from "./russian-pack4-ege-language";
import { egePack4SpellingEntries } from "./russian-pack4-ege-spelling";
import { egePack4PunctuationEntries } from "./russian-pack4-ege-punctuation";

export const russianPack4=[
 ...[...ogePack4TextEntries,...ogePack4PunctuationEntries,...ogePack4SpellingEntries,...ogePack4NormEntries]
  .map(entry=>({exam:"ОГЭ" as const,entry:{...entry,slug:entry.slug.replace(/^p2-/,"p4-")}})),
 ...[...egePack4TextEntries,...egePack4LanguageEntries,...egePack4SpellingEntries,...egePack4PunctuationEntries]
  .map(entry=>({exam:"ЕГЭ" as const,entry:{...entry,slug:entry.slug.replace(/^p2-/,"p4-")}})),
];
