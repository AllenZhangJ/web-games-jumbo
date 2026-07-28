import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '../..');
const PACK_PATH = resolve(ROOT, 'docs/quality/art/reference-sources/arena-a0.2.1-source-pack-v1.json');
const OUTPUT_DIR = resolve(ROOT, 'docs/quality/art/reference-source-inspection');
const WIDTH = 1600;
const HEIGHT = 930;
const THUMB_WIDTH = 480;
const THUMB_HEIGHT = 320;
const CATEGORIES = ['mood', 'color', 'composition', 'character', 'environment', 'ui'] as const;

type Artifact = Readonly<{ path: string; byteLength: number; sha256: string; width: number; height: number }>;
type Entry = Readonly<{ entryId: string; title: string; weightClass: string; embeddingMode: string; artifact: Artifact | null }>;
type Pack = Readonly<{ id: string; boards: ReadonlyArray<Readonly<{ category: string; entries: readonly Entry[] }>> }>;

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function labelSvg(entry: Entry): Buffer {
  const title = entry.title.length > 46 ? `${entry.title.slice(0, 43)}…` : entry.title;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="62"><rect width="480" height="62" fill="#172033"/><rect width="7" height="62" fill="${entry.weightClass === 'baseline' ? '#35B8FF' : entry.weightClass === 'aspiration' ? '#8B6DFF' : '#FFB020'}"/><text x="19" y="24" fill="#F4EBDD" font-family="Arial,sans-serif" font-size="17" font-weight="800">${escapeXml(entry.entryId.toUpperCase())}</text><text x="19" y="47" fill="#CFC6B3" font-family="Arial,sans-serif" font-size="13">${escapeXml(title)}</text><text x="462" y="24" text-anchor="end" fill="#CFC6B3" font-family="Arial,sans-serif" font-size="12">${escapeXml(entry.weightClass)}</text></svg>`);
}

function headerSvg(category: string): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="930"><rect width="1600" height="930" fill="#F4EBDD"/><rect width="1600" height="12" fill="#35B8FF"/><text x="40" y="58" fill="#172033" font-family="Arial,sans-serif" font-size="30" font-weight="900">A0.2.1 ${escapeXml(category.toUpperCase())} · EMBEDDED SOURCE INSPECTION</text><text x="1560" y="55" text-anchor="end" fill="#FF5C5C" font-family="Arial,sans-serif" font-size="15" font-weight="800">6 × 480×320 · NOT A0.2.2 BOARD</text><text x="40" y="86" fill="#273451" font-family="Arial,sans-serif" font-size="14">Only source-quality thumbnails and entry IDs; no 70/20/10 board annotations, crop approval, art-direction sign-off, device or Final claim.</text></svg>`);
}

const pack = JSON.parse(readFileSync(PACK_PATH, 'utf8')) as Pack;
mkdirSync(OUTPUT_DIR, { recursive: true });
const sheetRecords: Array<Record<string, unknown>> = [];

for (const category of CATEGORIES) {
  const board = pack.boards.find((candidate) => candidate.category === category);
  if (!board) throw new Error(`missing board ${category}`);
  const entries = board.entries.filter((entry) => entry.embeddingMode === 'embedded');
  if (entries.length !== 6) throw new Error(`${category} must expose exactly six embedded entries for the source inspection sheet`);
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  const entryRecords: Array<Record<string, unknown>> = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (!entry.artifact) throw new Error(`${entry.entryId} lacks artifact`);
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 40 + column * 520;
    const y = 112 + row * 398;
    const input = await sharp(resolve(ROOT, entry.artifact.path))
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'contain', background: '#273451' })
      .png()
      .toBuffer();
    composites.push({ input, left: x, top: y });
    composites.push({ input: labelSvg(entry), left: x, top: y + THUMB_HEIGHT });
    entryRecords.push({ entryId: entry.entryId, sourceArtifactSha256: entry.artifact.sha256, thumbnailSha256: sha256(input) });
  }
  const path = resolve(OUTPUT_DIR, `a0.2.1-${category}-embedded-source-inspection.png`);
  await sharp(headerSvg(category)).composite(composites).png({ compressionLevel: 9, palette: true }).toFile(path);
  const bytes = readFileSync(path);
  sheetRecords.push({
    category,
    status: 'source-quality-inspection-only',
    entryCount: entries.length,
    thumbnailFrame: { width: THUMB_WIDTH, height: THUMB_HEIGHT, fit: 'contain' },
    entries: entryRecords,
    artifact: {
      path: `docs/quality/art/reference-source-inspection/a0.2.1-${category}-embedded-source-inspection.png`,
      byteLength: statSync(path).size,
      sha256: sha256(bytes),
      width: WIDTH,
      height: HEIGHT,
    },
  });
}

const manifestPath = resolve(OUTPUT_DIR, 'a0.2.1-contact-sheet-manifest-v1.json');
const manifest = {
  schemaVersion: 1,
  id: 'arena.art.reference-source-inspection.a0.2.1.v1',
  status: 'source-quality-inspection-only',
  generatedAt: '2026-07-28',
  sourcePack: { path: 'docs/quality/art/reference-sources/arena-a0.2.1-source-pack-v1.json', id: pack.id },
  generator: {
    path: 'scripts/art/generate-arena-reference-contact-sheets.ts',
    sha256: sha256(readFileSync(resolve(ROOT, 'scripts/art/generate-arena-reference-contact-sheets.ts'))),
  },
  embeddedEntryCount: 36,
  a0_2_2BoardPass: false,
  limitation: 'These six sheets only expose embedded-source quality at a fixed thumbnail frame. They omit full board annotations and signatures and cannot pass A0.2.2, Reference Board, Blockout or Final.',
  sheets: sheetRecords,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ status: 'generated', manifest: 'docs/quality/art/reference-source-inspection/a0.2.1-contact-sheet-manifest-v1.json', sheets: sheetRecords.map((record) => record.artifact) })}\n`);
