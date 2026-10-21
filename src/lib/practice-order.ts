/** A reproducible shuffle of unique IDs. Unseen variants precede previously opened ones. */
export function orderPracticeTasks(ids: readonly string[], seed: string, seenIds: readonly string[] = []): string[] {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  const result = [...new Set(ids)];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  const seen = new Set(seenIds);
  return [...result.filter((id) => !seen.has(id)), ...result.filter((id) => seen.has(id))];
}
