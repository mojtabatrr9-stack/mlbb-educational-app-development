import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const out = {};
for (const [w, h, path] of [
  [1440, 1000, '/'],
  [390, 844, '/'],
  [1440, 1000, '/admin'],
  [1440, 1000, '/#builds'],
  [1440, 1000, '/#tools'],
  [1440, 1000, '/#guides'],
  [1440, 1000, '/#tier'],
  [1440, 1000, '/#counters'],
]) {
  const c = await b.newContext({ viewport: { width: w, height: h } });
  const p = await c.newPage();
  await p.goto('http://localhost:3000' + path, { waitUntil: 'networkidle' });
  const r = await new AxeBuilder({ page: p }).analyze();
  for (const v of r.violations)
    for (const n of v.nodes) {
      const d = n.any[0]?.data || {};
      const key = `${v.id} | ${n.target.join(' ').slice(-60)} | ${d.fgColor || ''} on ${d.bgColor || ''} ${d.contrastRatio || ''} need ${d.expectedContrastRatio || ''}`;
      out[key] = (out[key] || 0) + 1;
    }
  await c.close();
}
for (const [k, v] of Object.entries(out).sort()) console.log(v, k);
await b.close();
