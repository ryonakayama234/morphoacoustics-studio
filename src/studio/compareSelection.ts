/** A and B are different Take comparison slots, not audio playback toggles. */
export type ComparisonSelection = { a: string | null; b: string | null };
export type ComparisonSlot = 'a' | 'b';

export function selectComparisonTake(
  current: ComparisonSelection,
  slot: ComparisonSlot,
  takeId: string,
): ComparisonSelection {
  const other = slot === 'a' ? 'b' : 'a';
  const selected = current[slot] === takeId ? null : takeId;
  return {
    ...current,
    [slot]: selected,
    [other]: selected !== null && current[other] === selected ? null : current[other],
  };
}

export function addComparisonTake(current: ComparisonSelection, takeId: string): ComparisonSelection {
  if (!current.a && current.b !== takeId) return { ...current, a: takeId };
  if (!current.b && current.a !== takeId) return { ...current, b: takeId };
  return current;
}

export function removeComparisonTake(current: ComparisonSelection, takeId: string): ComparisonSelection {
  return {
    a: current.a === takeId ? null : current.a,
    b: current.b === takeId ? null : current.b,
  };
}
