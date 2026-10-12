import { describe, expect, it } from 'vitest';
import { seedBuilds, seedHeroes, seedItems } from '../src/lib/seed';
import { validateRecord } from '../src/lib/validation';

describe('imported roster', () => {
  it('contains more than 100 heroes with unique IDs', () => {
    expect(seedHeroes.length).toBeGreaterThan(100);
    expect(new Set(seedHeroes.map((h) => h.hero_id)).size).toBe(seedHeroes.length);
  });
  it('validates every imported hero, item and build', () => {
    for (const h of seedHeroes) expect(() => validateRecord('heroes', h), h.hero_id).not.toThrow();
    for (const i of seedItems) expect(() => validateRecord('items', i), i.item_id).not.toThrow();
    for (const b of seedBuilds) expect(() => validateRecord('builds', b), b.build_id).not.toThrow();
  });
  it('gives every hero a Persian name and at least one skill', () => {
    for (const h of seedHeroes) {
      expect(h.name_fa, h.hero_id).toBeTruthy();
      expect(h.skills.length, h.hero_id).toBeGreaterThan(0);
    }
  });
  it('references only existing heroes and items', () => {
    const heroIds = new Set(seedHeroes.map((h) => h.hero_id));
    const itemIds = new Set(seedItems.map((i) => i.item_id));
    for (const h of seedHeroes)
      for (const c of h.counters) expect(heroIds.has(c), `${h.hero_id} -> ${c}`).toBe(true);
    for (const b of seedBuilds)
      for (const id of b.items) expect(itemIds.has(id), `${b.build_id} -> ${id}`).toBe(true);
  });
});
