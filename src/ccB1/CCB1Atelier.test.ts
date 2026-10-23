import { describe, expect, it } from 'vitest';
import { restAreaLabel, type BodyPair } from './CCB1Atelier';

describe('CC-B1 body rest-area UI displays exact Core SI edit without creating a fake body',()=>{
  it('reports the edited index 8 as the ninth tract segment with SI-to-cm² conversion',()=>{
    const item = { body_revision: {
      edit: { section_index:8, previous_area_m2:0.0003,
        new_area_m2:0.00027 },
    }} as BodyPair;
    expect(restAreaLabel(item)).toBe('第9区間: 3.0000 → 2.7000 cm²');
  });
});
