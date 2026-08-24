import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

interface VfxTextureRecipe {
  readonly cueId:
    | 'impact-confirm'
    | 'impact-surface-transfer'
    | 'ring-out'
    | 'evaded-warning'
    | 'movement-fall-warning';
  readonly designIntent: string;
  readonly svg: string;
}

const svg = (body: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="core"><stop offset="0" stop-color="#fff9d6"/><stop offset="0.42" stop-color="#ffe775"/><stop offset="1" stop-color="#e85d4a" stop-opacity="0"/></radialGradient>
    <linearGradient id="cyan"><stop stop-color="#f6fbff"/><stop offset="0.48" stop-color="#65d2cc"/><stop offset="1" stop-color="#168b90" stop-opacity="0"/></linearGradient>
  </defs>
  ${body}
</svg>`;

const RECIPES = Object.freeze([
  Object.freeze({
    cueId: 'impact-confirm',
    designIntent: 'compact-readable-hit-star',
    svg: svg(`
      <circle cx="64" cy="64" r="45" fill="url(#core)" opacity=".72"/>
      <path d="M64 8 72 47 104 25 81 56 120 64 81 72 104 103 72 81 64 120 56 81 24 103 47 72 8 64 47 56 24 25 56 47Z" fill="#fff9d6" opacity=".92"/>
      <circle cx="64" cy="64" r="14" fill="#fff" opacity=".96"/>
    `),
  }),
  Object.freeze({
    cueId: 'impact-surface-transfer',
    designIntent: 'directional-ground-sweep',
    svg: svg(`
      <path d="M8 82C35 48 75 37 121 47" fill="none" stroke="url(#cyan)" stroke-width="15" stroke-linecap="round"/>
      <path d="M21 96C48 69 82 62 113 67" fill="none" stroke="#fff9d6" stroke-width="6" stroke-linecap="round" opacity=".86"/>
      <path d="m93 31 29 16-31 10 9-12Z" fill="#65d2cc" opacity=".92"/>
    `),
  }),
  Object.freeze({
    cueId: 'ring-out',
    designIntent: 'outward-broken-ring',
    svg: svg(`
      <circle cx="64" cy="64" r="30" fill="none" stroke="#fff9d6" stroke-width="8" opacity=".96"/>
      <path d="M64 4v27M64 97v27M4 64h27M97 64h27M22 22l19 19M87 87l19 19M106 22 87 41M41 87l-19 19" stroke="#e85d4a" stroke-width="8" stroke-linecap="round"/>
      <circle cx="64" cy="64" r="52" fill="none" stroke="#ffe775" stroke-width="4" stroke-dasharray="13 10" opacity=".8"/>
    `),
  }),
  Object.freeze({
    cueId: 'evaded-warning',
    designIntent: 'open-crescent-near-miss',
    svg: svg(`
      <path d="M102 26A50 50 0 1 0 111 91" fill="none" stroke="url(#cyan)" stroke-width="13" stroke-linecap="round"/>
      <path d="m96 13 19 12-20 11" fill="none" stroke="#fff9d6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M43 64h42" stroke="#f6fbff" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 10" opacity=".82"/>
    `),
  }),
  Object.freeze({
    cueId: 'movement-fall-warning',
    designIntent: 'downward-route-loss',
    svg: svg(`
      <path d="M64 9v72" stroke="#fff9d6" stroke-width="9" stroke-linecap="round" opacity=".9"/>
      <path d="m32 56 32 35 32-35" fill="none" stroke="#e85d4a" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m43 87 21 26 21-26" fill="none" stroke="#ffe775" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".88"/>
    `),
  }),
] satisfies readonly VfxTextureRecipe[]);

const root = process.cwd();
const outputDirectory = path.join(root, 'public/assets/arena/vfx/authored-candidates');
mkdirSync(outputDirectory, { recursive: true });

const manifest = await Promise.all(RECIPES.map(async (recipe) => {
  const output = path.join(outputDirectory, `${recipe.cueId}.png`);
  await sharp(Buffer.from(recipe.svg))
    .resize(128, 128, { fit: 'fill' })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toFile(output);
  const bytes = readFileSync(output);
  return Object.freeze({
    cueId: recipe.cueId,
    designIntent: recipe.designIntent,
    width: 128,
    height: 128,
    byteLength: statSync(output).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}));

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  builderRevision: 'arena-v2-authored-vfx-texture-builder.candidate.v1',
  candidateCount: manifest.length,
  candidates: manifest,
}, null, 2)}\n`);
