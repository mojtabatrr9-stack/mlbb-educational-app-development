import { describe, expect, it } from 'vitest';
import { totalStats } from '../src/lib/calculations';
import { seedHeroes, seedItems } from '../src/lib/seed';

describe('totalStats', () => {
  const hero = seedHeroes[0];
  it('returns base stats when no items are equipped', () => {
    expect(totalStats(hero, [], seedItems)).toEqual(hero.base_stats);
  });
  it('adds flat item stats and ignores unknown items', () => {
    const blade = seedItems.find((i) => i.item_id === 'blade-of-despair')!;
    const result = totalStats(hero, ['blade-of-despair', 'does-not-exist'], seedItems);
    expect(result.physical_attack).toBe(
      hero.base_stats.physical_attack + (blade.stats.physical_attack ?? 0),
    );
    expect(result.hp).toBe(hero.base_stats.hp);
  });
  it('does not mutate the hero', () => {
    const before = JSON.stringify(hero.base_stats);
    totalStats(hero, ['immortality'], seedItems);
    expect(JSON.stringify(hero.base_stats)).toBe(before);
  });
});
