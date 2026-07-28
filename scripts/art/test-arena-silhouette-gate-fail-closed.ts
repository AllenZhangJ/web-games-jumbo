import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '../..');
const RENDER = 'docs/quality/art/silhouette/arena-a0.3-silhouette-render-manifest-v1.json';
const BLIND = 'docs/quality/art/silhouette/blind-test/arena-a0.3-blind-test-package-v1.json';
const GATE = 'docs/quality/art/silhouette/arena-a0.3-gate-v1.json';
type Json = ReturnType<typeof JSON.parse>;
const read = (path: string): Json => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as Json;
const hash = (path: string): string => createHash('sha256').update(readFileSync(resolve(ROOT, path))).digest('hex');
const tempRoot = mkdtempSync(resolve(ROOT, 'docs/quality/art/silhouette/.fail-closed-'));
const rel = (name: string): string => `docs/quality/art/silhouette/${tempRoot.split('/').at(-1)}/${name}`;
const write = (path: string, value: Json): void => writeFileSync(resolve(ROOT, path), `${JSON.stringify(value, null, 2)}\n`);
const baseRender = read(RENDER); const baseBlind = read(BLIND); const baseGate = read(GATE);

async function probe(name: string, mutate: (render: Json, blind: Json, gate: Json) => Promise<void> | void): Promise<void> {
  const render = structuredClone(baseRender); const blind = structuredClone(baseBlind); const gate = structuredClone(baseGate);
  await mutate(render, blind, gate);
  const renderPath = rel(`${name}-render.json`); const blindPath = rel(`${name}-blind.json`); const gatePath = rel(`${name}-gate.json`);
  write(renderPath, render); write(blindPath, blind); write(gatePath, gate);
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/art/check-arena-silhouette-gate.ts'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ARENA_SILHOUETTE_RENDER: renderPath, ARENA_SILHOUETTE_BLIND: blindPath, ARENA_SILHOUETTE_GATE: gatePath } });
  if (result.status === 0) throw new Error(`fail-closed probe unexpectedly passed: ${name}`);
  process.stdout.write(`PASS ${name}\n`);
}

try {
  await probe('missing-asset', (r) => { r.inputs[0].glb.path = 'public/assets/arena/characters/missing.glb'; });
  await probe('asset-hash', (r) => { r.inputs[0].glb.sha256 = '0'.repeat(64); });
  await probe('fallback-path', (r) => { r.fallbackUsedPath = 'programmatic-fallback'; });
  await probe('clip-identity', (r) => { r.inputs[0].clips[0].clipName = 'Walking_A'; });
  await probe('skeleton-identity', (r) => { r.inputs[1].skeletonHash = '0'.repeat(64); });
  await probe('direction-coverage', (r) => { r.outputs[0].direction = 'left'; });
  await probe('distance-coverage', (r) => { r.outputs[0].distanceMeters = 9; });
  await probe('background', (r) => { r.camera.background = '#FFFFFF'; });
  await probe('declared-dimensions', (r) => { r.outputs[0].artifact.width += 1; });
  await probe('alpha-image', async (r) => {
    const original = resolve(ROOT, r.outputs[0].artifact.path); const path = rel('alpha.png');
    await sharp(original).ensureAlpha().png().toFile(resolve(ROOT, path));
    r.outputs[0].artifact = { ...r.outputs[0].artifact, path, sha256: hash(path), byteLength: statSync(resolve(ROOT, path)).size, transparent: true };
  });
  await probe('answer-leak', (_r, b) => {
    const questions = read(b.questions.path); questions.correctAnswer = 'C01'; const path = rel('leaked-questions.json'); write(path, questions);
    b.questions = { path, sha256: hash(path), byteLength: statSync(resolve(ROOT, path)).size };
  });
  await probe('human-sample-short', (_r, b) => { b.humanEvidence.participantCount = 9; b.humanEvidence.status = 'passed'; });
  await probe('threshold-below-90', (_r, b) => { b.thresholds.equipment = 0.89; });
  await probe('proxy-below-90', (_r, b) => {
    const proxy = read(b.proxyBaseline.path); proxy.aggregate.equipmentAccuracy = 0.89; const path = rel('low-proxy.json'); write(path, proxy);
    b.proxyBaseline = { path, sha256: hash(path), byteLength: statSync(resolve(ROOT, path)).size };
  });
  await probe('downstream-leak', (_r, _b, g) => { g.boundaries.blockout = 'ready'; });
  process.stdout.write('15/15 fail-closed probes passed\n');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
