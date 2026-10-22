import { ogePack3TextEntries } from "./russian-pack3-oge-texts";
import { ogePack3PunctuationEntries } from "./russian-pack3-oge-punctuation";
import { ogePack3SpellingEntries } from "./russian-pack3-oge-spelling";
import { ogePack3NormEntries } from "./russian-pack3-oge-norms";
import { egePack3TextEntries } from "./russian-pack3-ege-texts";
import { egePack3LanguageEntries } from "./russian-pack3-ege-language";
import { egePack3SpellingEntries } from "./russian-pack3-ege-spelling";
import { egePack3PunctuationEntries } from "./russian-pack3-ege-punctuation";

// Reuse the existing formatting helpers; only the package prefix differs.
// Every entry below is an explicitly authored item, not a generated permutation.
export const russianPack3=[
  ...[...ogePack3TextEntries,...ogePack3PunctuationEntries,...ogePack3SpellingEntries,...ogePack3NormEntries]
    .map(entry=>({exam:"ОГЭ" as const,entry:{...entry,slug:entry.slug.replace(/^p2-/,"p3-")}})),
  ...[...egePack3TextEntries,...egePack3LanguageEntries,...egePack3SpellingEntries,...egePack3PunctuationEntries]
    .map(entry=>({exam:"ЕГЭ" as const,entry:{...entry,slug:entry.slug.replace(/^p2-/,"p3-")}})),
];
