import type { Hero, Item, Stats } from './types';

/** Sums a hero's base stats with the flat stats of the given item IDs. Unknown IDs are ignored. */
export const totalStats = (hero: Hero, ids: string[], items: Item[]): Stats => {
  const result = { ...hero.base_stats };
  ids.forEach((id) => {
    const item = items.find((i) => i.item_id === id);
    if (item)
      Object.entries(item.stats).forEach(([key, value]) => {
        result[key as keyof Stats] += value || 0;
      });
  });
  return result;
};
