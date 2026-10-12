#!/usr/bin/env node
/**
 * Regenerates every static asset the app needs, so a fresh clone (or a zip export that
 * dropped binary files) builds and renders correctly.
 *
 *  - PWA / favicon / Apple touch / maskable icons  -> generated from public/icon.svg
 *  - Open Graph image (1200x630)                   -> generated from the banner or a gradient
 *  - Banner fallback                               -> generated gradient if the art is missing
 *  - Hero portraits                                -> re-downloaded (best effort, with timeout)
 *
 * Never fails the build: missing network or sharp only produces warnings. The UI renders
 * a generated fallback for any image that is still missing.
 * Usage: node scripts/ensure-assets.mjs [--force]
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pub = (...p) => path.join(root, 'public', ...p);
const force = process.argv.includes('--force');
const log = (msg) => console.log(`[assets] ${msg}`);

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  log('sharp is unavailable; skipping image generation (UI fallbacks will be used).');
  process.exit(0);
}

const iconSvg = readFileSync(pub('icon.svg'));
// Maskable icons need the artwork inside the central 80% "safe zone".
const maskableSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#17151f"/><g transform="translate(96 96) scale(1.6667)"><g fill="#ab87fa"><path d="M46 40l41 19v52l59 41-42-16V88L46 40z"/><path d="M49 78v59l34 16v-44L49 78zm62-39 35 19v63l-35-31V39z" opacity=".75"/></g></g></svg>`,
);

async function write(file, make) {
  if (!force && existsSync(file)) return;
  mkdirSync(path.dirname(file), { recursive: true });
  try {
    await make(file);
    log(`generated ${path.relative(root, file)}`);
  } catch (error) {
    log(`could not generate ${path.relative(root, file)}: ${error.message}`);
  }
}

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
  ['favicon-16.png', 16],
]) {
  await write(pub(name), (f) =>
    sharp(iconSvg, { density: 384 }).resize(size, size).png().toFile(f),
  );
}
await write(pub('icon-maskable-512.png'), (f) =>
  sharp(maskableSvg).resize(512, 512).png().toFile(f),
);

const banner = pub('images', 'nexus-hero.webp');
await write(banner, (f) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="730"><defs><radialGradient id="g" cx="76%" cy="45%" r="60%"><stop offset="0" stop-color="#6b4a96"/><stop offset=".55" stop-color="#2a1d3a"/><stop offset="1" stop-color="#141019"/></radialGradient></defs><rect width="1700" height="730" fill="url(#g)"/></svg>`,
    ),
  )
    .webp({ quality: 80 })
    .toFile(f),
);

await write(pub('og-image.png'), async (f) => {
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="s" x1="0" x2="1"><stop offset="0" stop-color="#17101e" stop-opacity=".96"/><stop offset=".55" stop-color="#17101e" stop-opacity=".55"/><stop offset="1" stop-color="#17101e" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="630" fill="url(#s)"/><g transform="translate(72 70) scale(.42)" fill="#ab87fa"><path d="M46 40l41 19v52l59 41-42-16V88L46 40z"/><path d="M49 78v59l34 16v-44L49 78zm62-39 35 19v63l-35-31V39z" opacity=".75"/></g><text x="150" y="128" font-family="sans-serif" font-size="44" font-weight="700" letter-spacing="8" fill="#f3f1f7">NEXUS</text><text x="72" y="300" font-family="sans-serif" font-size="66" font-weight="700" fill="#f3f1f7">Know your hero.</text><text x="72" y="382" font-family="sans-serif" font-size="66" font-weight="700" fill="#c7a2f8">Own the battlefield.</text><text x="72" y="462" font-family="sans-serif" font-size="28" fill="#bbb1c7">Independent MLBB learning companion · EN / FA</text></svg>`,
  );
  const base = existsSync(banner)
    ? sharp(banner).resize(1200, 630, { fit: 'cover', position: 'right' })
    : sharp({ create: { width: 1200, height: 630, channels: 3, background: '#1b1424' } });
  await base
    .composite([{ input: overlay }])
    .png()
    .toFile(f);
});

// Hero portraits: re-download any that are missing (best effort).
const seed = readFileSync(path.join(root, 'src', 'lib', 'seed.ts'), 'utf8');
const heroes = [...seed.matchAll(/^\s*\[\s*'([a-z0-9-]+)',\s*'([^']+)'/gm)].map((m) => ({
  id: m[1],
  name: m[2],
}));
const missing = heroes.filter((h) => force || !existsSync(pub('images', 'heroes', `${h.id}.webp`)));
if (missing.length) {
  const fetchJson = async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };
  let list = [];
  try {
    list = (await fetchJson('https://mapi.mobilelegends.com/hero/list')).data || [];
  } catch (error) {
    log(
      `hero list unavailable (${error.message}); ${missing.length} portraits will use generated fallbacks.`,
    );
  }
  for (const hero of list.length ? missing : []) {
    try {
      const entry = list.find((h) => h.name.toLowerCase() === hero.name.toLowerCase());
      if (!entry) throw new Error('not in source list');
      const detail = await fetchJson(
        `https://mapi.mobilelegends.com/hero/detail?id=${entry.heroid}`,
      );
      const image = await fetch(detail.data.cover_picture, { signal: AbortSignal.timeout(15000) });
      if (!image.ok) throw new Error(`HTTP ${image.status}`);
      const target = pub('images', 'heroes', `${hero.id}.webp`);
      mkdirSync(path.dirname(target), { recursive: true });
      await sharp(Buffer.from(await image.arrayBuffer()))
        .resize({ width: 640, withoutEnlargement: true })
        .webp({ quality: 86 })
        .toFile(target);
      log(`downloaded portrait for ${hero.name}`);
    } catch (error) {
      log(`portrait for ${hero.name} unavailable (${error.message}); fallback will render.`);
    }
  }
}
log('done');
