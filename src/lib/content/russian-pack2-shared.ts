import type { RussianEntry } from "./russian-bank";

/** Hand-authored rows; these helpers only format, never permute or multiply tasks. */
export type AuthoredRow = [slug: string, prompt: string, answer: string, explanation: string];
export function authored(number: number, rows: AuthoredRow[], mode?: RussianEntry["mode"]): RussianEntry[] {
  return rows.map(([slug, prompt, answer, explanation]) => ({ number, slug: `p2-${slug}`, prompt, answer, explanation, mode }));
}
export type Passage = { id: string; sentences: string[] };
export function textEntries(passage: Passage, rows: [number, string, string, string, number[], RussianEntry["mode"]?][]): RussianEntry[] {
  return rows.map(([number, prompt, answer, explanation, references, mode]) => ({
    number, slug: `p2-${passage.id}-${number}`, passage, prompt, answer, explanation, references, mode,
  }));
}

export type SpellingWord = [mask: string, correct: string];
export type SpellingExercise = { number: number; slug: string; rows: SpellingWord[][]; rule: string };
export function spellingEntry(exercise: SpellingExercise): RussianEntry {
  const keys: number[] = [];
  const details = exercise.rows.map((row, index) => {
    const letters = row.map(([mask, correct]) => {
      const [before, after, extra] = mask.split("_");
      if (extra !== undefined || after === undefined || !correct.startsWith(before) || !correct.endsWith(after)
        || correct.length !== before.length + after.length + 1) throw new Error(`Invalid authored spelling: ${mask} / ${correct}`);
      return correct[before.length];
    });
    if (new Set(letters).size === 1) keys.push(index + 1);
    return `${index + 1}) ${row.map(([,correct]) => correct).join(", ")}: ${letters.join(", ")}.`;
  });
  return {
    number: exercise.number, slug: `p2-${exercise.slug}`,
    prompt: "Укажите ряды, в которых во всех словах пропущена одна и та же буква. Две точки обозначают один буквенный пропуск.\n"
      + exercise.rows.map((row, index) => `${index + 1}) ${row.map(([mask]) => mask.replace("_", "..")).join(", ")}`).join("\n"),
    answer: keys.join(""), explanation: details.join(" ") + " " + exercise.rule,
  };
}
