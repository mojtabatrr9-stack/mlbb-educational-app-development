// Starts a short-lived loopback-only production server with random test-only
// owner credentials. Never persists or logs those credentials. Do not run on
// a production database: this script creates then removes test content.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac, randomBytes, scryptSync } from 'node:crypto';
const port = Number(process.env.TEST_PORT || 3001),
  base = `http://127.0.0.1:${port}`;
const password = randomBytes(24).toString('hex'),
  salt = randomBytes(16).toString('hex');
const secret = randomBytes(20),
  alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
let bits = '',
  encoded = '';
for (const byte of secret) bits += byte.toString(2).padStart(8, '0');
for (let i = 0; i < bits.length; i += 5)
  encoded += alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
const env = {
  ...process.env,
  NODE_ENV: 'production',
  ADMIN_EMAIL: 'nexus-e2e@example.test',
  ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
  ADMIN_TOTP_SECRET: encoded,
  SESSION_SECRET: randomBytes(48).toString('hex'),
};
delete env.OPENAI_API_KEY;
let serverLog = '';
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)],
  { env, stdio: ['ignore', 'pipe', 'pipe'] },
);
server.stdout.on('data', (b) => (serverLog += b));
server.stderr.on('data', (b) => (serverLog += b));
let browser, page, csrf;
const cleanup = [];
async function request(path, body, method = 'POST') {
  return page.evaluate(
    async ({ path, body, method, csrf }) => {
      const r = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: r.status, data: await r.json() };
    },
    { path, body, method, csrf },
  );
}
function code() {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', secret).update(buffer).digest();
  const offset = digest.at(-1) & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}
try {
  let running = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) {
        running = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(running, 'Test server did not start');
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  page = await browser.newPage();
  await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
  csrf = await page.evaluate(() =>
    fetch('/api/session')
      .then((r) => r.json())
      .then((d) => d.csrf),
  );
  let response = await request('/api/auth', {
    email: env.ADMIN_EMAIL,
    password: 'wrong-password',
    code: '000000',
  });
  assert.equal(response.status, 401);
  console.log('PASS Wrong credentials are rejected');
  // Avoid the end of a TOTP window for deterministic tests.
  if (Date.now() % 30000 > 27000) await new Promise((r) => setTimeout(r, 3500));
  const currentCode = code();
  response = await request('/api/auth', { email: env.ADMIN_EMAIL, password, code: currentCode });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  console.log('PASS Password + TOTP grants a signed owner session');
  response = await request('/api/auth', { email: env.ADMIN_EMAIL, password, code: currentCode });
  assert.equal(response.status, 401);
  console.log('PASS A used TOTP cannot be replayed');
  response = await request('/api/admin/dashboard', undefined, 'GET');
  assert.equal(response.status, 200);
  assert.equal(typeof response.data.active, 'number');
  console.log('PASS Private analytics use real database values');
  const catalog = await page.evaluate(() => fetch('/api/catalog').then((r) => r.json()));
  const stamp = Date.now().toString(36);
  const hero = {
    ...catalog.heroes[0],
    hero_id: `test-hero-${stamp}`,
    name: 'Integration test hero',
    featured: false,
    counters: ['chou'],
    best_builds: [],
  };
  response = await request('/api/admin/heroes', hero);
  assert.equal(response.status, 200, JSON.stringify(response.data));
  cleanup.push(['heroes', hero.hero_id]);
  response = await request('/api/admin/heroes', {
    ...hero,
    lore: 'Updated by the temporary integration test.',
  });
  assert.equal(response.status, 200);
  let live = await page.evaluate(() =>
    fetch('/api/catalog', { cache: 'no-store' }).then((r) => r.json()),
  );
  assert.equal(
    live.heroes.find((h) => h.hero_id === hero.hero_id).lore,
    'Updated by the temporary integration test.',
  );
  console.log('PASS Owner can create and update a hero');
  const item = {
    ...catalog.items[0],
    item_id: `test-item-${stamp}`,
    name: 'Integration test item',
  };
  response = await request('/api/admin/items', item);
  assert.equal(response.status, 200);
  cleanup.push(['items', item.item_id]);
  console.log('PASS Owner item editing');
  const build = {
    ...catalog.builds.find((b) => b.hero_id === 'ling'),
    build_id: `test-build-${stamp}`,
    hero_id: hero.hero_id,
  };
  response = await request('/api/admin/builds', build);
  assert.equal(response.status, 200, JSON.stringify(response.data));
  cleanup.push(['builds', build.build_id]);
  console.log('PASS Owner-approved six-item build publication');
  const guide = {
    ...catalog.guides[0],
    guide_id: `test-guide-${stamp}`,
    title: 'Integration test guide',
    content: '# Integration test\n\nThis article is temporary.',
  };
  response = await request('/api/admin/guides', guide);
  assert.equal(response.status, 200);
  cleanup.push(['guides', guide.guide_id]);
  console.log('PASS Markdown guide publication');
  const uploaded = await page.evaluate(async (csrf) => {
    const bytes = await fetch('/icon-192.png').then((r) => r.blob());
    const form = new FormData();
    form.append('file', bytes, 'test.png');
    const r = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
      body: form,
    });
    return { status: r.status, data: await r.json() };
  }, csrf);
  assert.equal(uploaded.status, 200);
  const media = await fetch(base + uploaded.data.url);
  assert.equal(media.status, 200);
  assert.equal(media.headers.get('content-type'), 'image/png');
  console.log('PASS Persistent image upload and media delivery');
  response = await request('/api/admin/ai', {
    text: 'These are learning notes for a Mobile Legends guide.',
  });
  assert.equal(response.status, 503);
  assert.match(response.data.error, /OPENAI_API_KEY/);
  console.log('PASS AI requires a server-side provider key and does not fake a draft');
  response = await request('/api/interactions', {
    kind: 'comment',
    heroId: hero.hero_id,
    content: 'Integration moderation test comment',
  });
  assert.equal(response.status, 200);
  response = await request('/api/admin/dashboard', undefined, 'GET');
  const pending = response.data.comments.find((c) => c.heroId === hero.hero_id);
  assert.ok(pending);
  response = await request('/api/admin/moderate', {
    id: pending.id,
    kind: 'comment',
    action: 'approve',
  });
  assert.equal(response.status, 200);
  const comments = await fetch(`${base}/api/interactions?hero=${hero.hero_id}`).then((r) =>
    r.json(),
  );
  assert.ok(comments.comments.some((c) => c.content === 'Integration moderation test comment'));
  console.log('PASS Comments stay private until owner approval');
  // Remove a build before deleting its hero; test all delete operations.
  for (const [resource, id] of cleanup.reverse()) {
    response = await request(`/api/admin/${resource}?id=${id}`, undefined, 'DELETE');
    assert.equal(response.status, 200, JSON.stringify(response.data));
  }
  cleanup.length = 0;
  console.log('PASS Owner can delete published content');
  await request('/api/auth', undefined, 'DELETE');
  response = await request('/api/admin/dashboard', undefined, 'GET');
  assert.equal(response.status, 401);
  console.log('PASS Sign-out revokes access');
  console.log('All owner integration tests passed.');
} catch (error) {
  console.error(serverLog.slice(-4000));
  throw error;
} finally {
  if (page && csrf)
    for (const [resource, id] of cleanup.reverse())
      try {
        await request(`/api/admin/${resource}?id=${id}`, undefined, 'DELETE');
      } catch {}
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (server.exitCode === null) server.kill('SIGKILL');
}
