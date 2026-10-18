import { describe, expect, it } from 'vitest';
import { addComparisonTake, removeComparisonTake, selectComparisonTake } from './compareSelection';

describe('distinct creator Take comparison slots', () => {
  const empty = { a: null, b: null };

  it('first new Take selects A but not B', () => {
    expect(addComparisonTake(empty, 'take1')).toEqual({ a: 'take1', b: null });
  });

  it('a single Take moves from A to B instead of highlighting both', () => {
    const a = addComparisonTake(empty, 'take1');
    const b = selectComparisonTake(a, 'b', 'take1');
    expect(b).toEqual({ a: null, b: 'take1' });
    expect(selectComparisonTake(b, 'a', 'take1')).toEqual(a);
  });

  it('clicking a selected slot again clears it', () => {
    const a = addComparisonTake(empty, 'take1');
    expect(selectComparisonTake(a, 'a', 'take1')).toEqual(empty);
    expect(selectComparisonTake({ a: null, b: 'take1' }, 'b', 'take1')).toEqual(empty);
  });

  it('two different Takes compare side by side and never duplicate an ID', () => {
    const a = addComparisonTake(empty, 'take1');
    const both = addComparisonTake(a, 'take2');
    expect(both).toEqual({ a: 'take1', b: 'take2' });
    expect(addComparisonTake(both, 'take1')).toEqual(both);
    expect(selectComparisonTake(both, 'b', 'take1')).toEqual({ a: null, b: 'take1' });
    expect(selectComparisonTake(both, 'a', 'take2')).toEqual({ a: 'take2', b: null });
  });

  it('deleting an assigned Take clears only its slot, leaving the other intact', () => {
    const both = { a: 'take1', b: 'take2' };
    expect(removeComparisonTake(both, 'take1')).toEqual({ a: null, b: 'take2' });
    expect(removeComparisonTake(both, 'take2')).toEqual({ a: 'take1', b: null });
    expect(addComparisonTake({ a: null, b: 'take2' }, 'take3')).toEqual({ a: 'take3', b: 'take2' });
    expect(removeComparisonTake(both, 'unknown')).toEqual(both);
  });
});
