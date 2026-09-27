// Generates a .webp next to each assets/guide/*.jpeg, directly in the
// source folder (not dist/) — Astro's dev server serves repo files
// straight off disk (there's no public/ dir here), so the .webp must
// exist there for `npm run dev` to show the optimized images too, not
// just the production build. Skipped when already up to date.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const guideDir = path.join(ROOT, 'assets', 'guide');

const jpegs = readdirSync(guideDir).filter((f) => f.endsWith('.jpeg'));
let generated = 0;
await Promise.all(
  jpegs.map(async (f) => {
    const src = path.join(guideDir, f);
    const dest = path.join(guideDir, f.replace(/\.jpeg$/, '.webp'));
    if (existsSync(dest) && statSync(dest).mtimeMs >= statSync(src).mtimeMs) return;
    await sharp(src).webp({ quality: 82 }).toFile(dest);
    generated++;
  })
);
console.log(`[optimize-images] ${generated} webp file(s) (re)generated, ${jpegs.length - generated} already up to date`);
