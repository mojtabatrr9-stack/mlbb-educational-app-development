import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.BASE_URL || 'http://localhost:3000';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1040 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const failedResponses = [];
page.on('response', (response) => {
  if (response.status() >= 400 && response.url().startsWith(base)) {
    failedResponses.push(`${response.status()} ${response.url()}`);
  }
});
async function step(name, fn) {
  await fn();
  console.log(`PASS ${name}`);
}
try {
  await step('Home renders, assets load, and layout fits', async () => {
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    assert.ok(page.url().endsWith('/en'), 'root redirects to /en');
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
    await page.getByRole('heading', { name: 'Your next win starts here.' }).waitFor();
    assert.equal(await page.locator('.hero-card').count(), 8);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    assert.equal(
      await page
        .locator('img')
        .evaluateAll((images) => images.filter((i) => i.complete && !i.naturalWidth).length),
      0,
      'broken images on home',
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.deepEqual(failedResponses, [], 'cold load must not produce 4xx/5xx responses');
    assert.equal(await page.evaluate(() => document.fonts.check('16px "Inter Variable"')), true);
    await page.screenshot({ path: 'artifacts/nexus-desktop.png', fullPage: true });
  });
  await step('Accessibility scan has no critical violations', async () => {
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
    for (const v of serious) console.log(`  axe ${v.impact}: ${v.id} (${v.nodes.length} nodes)`);
    assert.equal(results.violations.filter((v) => v.impact === 'critical').length, 0);
  });
  await step('Role and lane filtering works', async () => {
    await page.getByRole('button', { name: 'Mage', exact: true }).click();
    assert.equal(await page.locator('.hero-card').count(), 8);
    await page.getByRole('combobox', { name: 'Filter by lane' }).selectOption('Jungle');
    assert.equal(await page.locator('.hero-card').count(), 0);
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    assert.equal(await page.locator('.hero-card').count(), 8);
  });
  await step('Search, favorite, hero skills, and modal focus', async () => {
    await page.getByRole('textbox', { name: 'Search hero library' }).fill('Kagura');
    assert.equal(await page.locator('.hero-card').count(), 1);
    await page.getByRole('button', { name: 'Save Kagura', exact: true }).click();
    await page.getByRole('button', { name: 'View Kagura', exact: true }).click();
    await page.getByRole('dialog', { name: 'Kagura hero guide' }).waitFor();
    await page.getByRole('tab', { name: 'Skills', exact: true }).click();
    await page.getByText('Yin Yang Gathering', { exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Community', exact: true }).click();
    await page
      .getByPlaceholder('Share a tip, combo, or helpful matchup insight…')
      .pressSequentially('Remember to check the map before rotating.', { delay: 4 });
    assert.equal(
      await page.getByPlaceholder('Share a tip, combo, or helpful matchup insight…').inputValue(),
      'Remember to check the map before rotating.',
    );
    await page.getByRole('button', { name: 'Rate 4 out of 5', exact: true }).click();
    await page.getByText('Your vote has been saved.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Post comment', exact: true }).click();
    await page
      .getByText('Submitted for admin review. Thank you for contributing!', { exact: true })
      .waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: /Saved heroes/ }).click();
    assert.equal(await page.locator('.hero-card').count(), 1);
  });
  await step('Build calculator computes, compares, and saves', async () => {
    await page.getByRole('button', { name: 'Build calculator', exact: true }).click();
    await page.getByRole('button', { name: /Load recommended build/ }).click();
    await page.getByText('6 / 6 slots filled', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'Compare with recommended' }).check();
    assert.ok((await page.getByText('vs recommended', { exact: false }).count()) >= 7);
    await page.getByRole('button', { name: 'Save this build', exact: true }).click();
    await page.getByText('Build saved on this device.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Suggest to the community', exact: true }).click();
    await page.getByPlaceholder('e.g. The late-game carry').fill('Smoke test precision loadout');
    await page.getByRole('button', { name: 'Submit for review', exact: true }).click();
    await page
      .getByText('Submitted for admin review. Thank you for contributing!', { exact: true })
      .waitFor();
  });
  await step('Counter picker and guide article work', async () => {
    await page.getByRole('button', { name: /Counter picker/ }).click();
    assert.equal(await page.locator('.counter-result').count(), 3);
    await page.getByRole('button', { name: 'Guides & academy', exact: true }).click();
    await page.locator('.guide-card').first().click();
    await page.locator('.markdown-content h1').waitFor();
    assert.ok((await page.locator('.markdown-content').innerText()).length > 500);
    await page.keyboard.press('Escape');
  });
  await step('Timer runs and pauses', async () => {
    await page.getByRole('button', { name: 'Game tools', exact: true }).click();
    await page.getByRole('button', { name: 'Start timer', exact: true }).first().click();
    await page.waitForTimeout(1200);
    assert.notEqual(await page.locator('.timer-dial strong').first().textContent(), '02:00');
    await page.getByRole('button', { name: 'Pause', exact: true }).first().click();
    await page.getByRole('button', { name: 'Emblems', exact: true }).click();
    await page.getByRole('heading', { name: 'Emblem calculator' }).waitFor();
  });
  await step('Owner preview cannot publish and sign-in accepts typing', async () => {
    await page.goto(`${base}/en/admin`, { waitUntil: 'networkidle' });
    await page.getByText('Read-only workspace preview.').waitFor();
    await page.getByRole('button', { name: 'Heroes', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Ling', exact: true }).click();
    await page.getByRole('button', { name: 'Sign in to save', exact: true }).click();
    await page.getByRole('dialog', { name: 'Owner sign-in' }).waitFor();
    await page
      .getByRole('textbox', { name: 'Owner email', exact: true })
      .pressSequentially('test@example.com', { delay: 8 });
    assert.equal(
      await page.getByRole('textbox', { name: 'Owner email', exact: true }).inputValue(),
      'test@example.com',
    );
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog', { name: 'Owner sign-in' }).count(), 0);
    assert.equal(await page.getByRole('dialog', { name: 'Edit hero' }).count(), 1);
    await page.keyboard.press('Escape');
    await page.screenshot({ path: 'artifacts/nexus-admin.png', fullPage: true });
  });
  await step('Admin APIs reject unauthorized writes and private reads', async () => {
    const statuses = await page.evaluate(async () => {
      const session = await fetch('/api/session').then((r) => r.json());
      return [
        (await fetch('/api/admin/dashboard')).status,
        (
          await fetch('/api/admin/heroes', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrf },
            body: JSON.stringify({ hero_id: 'blocked' }),
          })
        ).status,
        (
          await fetch('/api/interactions', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ kind: 'rating', heroId: 'ling', rating: 5 }),
          })
        ).status,
      ];
    });
    assert.deepEqual(statuses, [401, 401, 400]);
  });
  await step('Mobile navigation, Persian direction, and layout', async () => {
    const mobile = await context.newPage();
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.goto(base, { waitUntil: 'networkidle' });
    assert.equal(
      await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await mobile.screenshot({ path: 'artifacts/nexus-mobile.png', fullPage: true });
    await mobile.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await mobile.getByRole('button', { name: /^Heroes/ }).click();
    await mobile.getByRole('heading', { name: 'Find your next main.', exact: true }).waitFor();
    await mobile.getByRole('button', { name: 'Switch language', exact: true }).click();
    await mobile.waitForURL(/\/fa/);
    assert.equal(await mobile.evaluate(() => document.documentElement.dir), 'rtl');
    assert.equal(await mobile.evaluate(() => document.documentElement.lang), 'fa');
    assert.equal(
      await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await mobile.close();
  });
  await step('Full roster is available and searchable in both scripts', async () => {
    await page.goto(`${base}/en#heroes`, { waitUntil: 'networkidle' });
    const count = await page.locator('.hero-card').count();
    assert.ok(count >= 100, `expected 100+ hero cards, got ${count}`);
    await page.getByRole('textbox', { name: 'Search hero library' }).fill('كاگورا');
    assert.equal(
      await page.locator('.hero-card').count(),
      1,
      'Arabic-kaf Persian search finds Kagura',
    );
    await page.getByRole('textbox', { name: 'Search hero library' }).fill('chip');
    await page.getByRole('button', { name: 'View Chip', exact: true }).click();
    await page.getByRole('tab', { name: 'Skills', exact: true }).click();
    assert.ok(
      (await page.locator('.skill-picker .skill-icon img').count()) >= 4,
      'imported skill icons render',
    );
    await page.keyboard.press('Escape');
  });
  await step(
    'Every section renders in Persian with RTL layout and no English UI strings',
    async () => {
      const persian = /[\u0600-\u06FF]/;
      for (const section of [
        '',
        '#heroes',
        '#builds',
        '#counters',
        '#tier',
        '#guides',
        '#tools',
        '#favorites',
      ]) {
        await page.goto(`${base}/fa${section}`, { waitUntil: 'networkidle' });
        assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl', section);
        const heading = await page.locator('.page-heading h1').innerText();
        assert.ok(persian.test(heading), `Persian heading for ${section}: ${heading}`);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
          `overflow in ${section}`,
        );
        const buttons = await page.locator('main button, main label, nav button').allInnerTexts();
        const english = buttons
          .map((b) => b.trim())
          .filter((b) => /^[A-Za-z][a-z]+( [a-z]+)+$/.test(b) && !/^(S\+?|A|B|C)$/.test(b));
        assert.deepEqual(english.slice(0, 5), [], `English UI strings in ${section}`);
      }
      await page.goto(`${base}/fa`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'مشاهدهٔ لینگ', exact: true }).click();
      const lore = await page.locator('.detail-intro p').first().innerText();
      assert.ok(persian.test(lore), 'curated hero lore is Persian');
      assert.ok(
        /[۰-۹]/.test(await page.locator('.base-stats strong').first().innerText()),
        'Persian digits in stats',
      );
      await page.screenshot({ path: 'artifacts/nexus-fa-hero.png' });
      await page.keyboard.press('Escape');
      await page.screenshot({ path: 'artifacts/nexus-fa-desktop.png', fullPage: true });
      await page.goto(`${base}/fa/admin`, { waitUntil: 'networkidle' });
      assert.ok(
        persian.test(await page.locator('.admin-header h1').innerText()),
        'admin is Persian',
      );
      await page.screenshot({ path: 'artifacts/nexus-fa-admin.png', fullPage: true });
    },
  );
  await step('Offline reload keeps the library usable', async () => {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForFunction(async () => {
      if (!('caches' in window)) return false;
      const keys = await caches.keys();
      const cache = await caches.open(
        keys.find((k) => k.startsWith('nexus-library-')) || 'missing',
      );
      return Boolean(await cache.match('/api/catalog'));
    });
    await page.waitForTimeout(1800);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.hero-card').first().waitFor();
    await page.locator('.hero-card-main').first().click();
    await page.getByRole('dialog').waitFor();
    await page.screenshot({ path: 'artifacts/nexus-offline.png' });
    await context.setOffline(false);
  });
  assert.deepEqual(errors, []);
  console.log('PASS No browser runtime errors');
  console.log('All browser smoke tests passed.');
} finally {
  await browser.close();
}
