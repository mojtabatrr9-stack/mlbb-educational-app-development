import { describe, expect, it } from 'vitest';
import { seedBuilds, seedGuides, seedHeroes, seedItems } from '../src/lib/seed';
import { validateRecord } from '../src/lib/validation';

describe('validateRecord', () => {
  it('accepts every seed record', () => {
    for (const h of seedHeroes) expect(() => validateRecord('heroes', h)).not.toThrow();
    for (const i of seedItems) expect(() => validateRecord('items', i)).not.toThrow();
    for (const b of seedBuilds) expect(() => validateRecord('builds', b)).not.toThrow();
    for (const g of seedGuides) expect(() => validateRecord('guides', g)).not.toThrow();
  });
  it('rejects unsafe IDs and image URLs', () => {
    expect(() => validateRecord('heroes', { ...seedHeroes[0], hero_id: '../etc' })).toThrow();
    expect(() =>
      validateRecord('heroes', { ...seedHeroes[0], image_url: 'javascript:alert(1)' }),
    ).toThrow();
  });
  it('requires six distinct build items', () => {
    const build = seedBuilds[0];
    expect(() => validateRecord('builds', { ...build, items: build.items.slice(0, 5) })).toThrow();
    expect(() =>
      validateRecord('builds', { ...build, items: [...build.items.slice(0, 5), build.items[0]] }),
    ).toThrow();
  });
});

describe('seed data integrity', () => {
  it('has no build with more than one pair of boots', () => {
    for (const b of seedBuilds) {
      const boots = b.items.filter(
        (id) => seedItems.find((i) => i.item_id === id)?.type === 'Boots',
      );
      expect(boots.length, b.build_id).toBeLessThanOrEqual(1);
    }
  });
  it('only references existing heroes as counters', () => {
    const ids = new Set(seedHeroes.map((h) => h.hero_id));
    for (const h of seedHeroes)
      for (const c of h.counters) expect(ids.has(c), `${h.hero_id}->${c}`).toBe(true);
  });
});
