import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
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
  await probe('source-commit-identity', (r) => { r.sourceCommit = '0'.repeat(40); });
  await probe('source-freeze-fingerprint', (r) => { r.sourceFreeze.cleanCheckFingerprint = '0'.repeat(64); });
  await probe('source-freeze-critical-artifact', (r) => { r.sourceFreeze.criticalArtifacts[0].sha256 = '0'.repeat(64); });
  await probe('runtime-toolchain', (r) => { r.sourceFreeze.runtimeToolchain.nodeVersion = 'v0.0.0'; });
  await probe('source-freeze-inheritance', (_r, b) => { b.sourceFreeze.cleanCheckFingerprint = '0'.repeat(64); });
  await probe('historical-v1-authority', (r) => { r.authorities[2].path = 'packages/arena-v1-presentation-content/src/arena-gameplay-v2-character-content.ts'; });
  await probe('catalog-content-hash', (r) => { r.formalCatalog.identity.catalogContentHash = '0'.repeat(8); });
  await probe('catalog-selected-asset', (r) => { r.formalCatalog.selectedAssets[0].assetId = 'arena.asset.character.unknown.v1'; });
  await probe('production-approval-forged', (r) => { r.formalCatalog.selectedAssets[0].productionApprovalStatus = 'approved'; });
  await probe('blind-generator-drift', (_r, b) => { b.generator.sha256 = '0'.repeat(64); });
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
  const renderHashBeforeStartProbes = hash(RENDER);
  const wrongTarget = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/art/render-arena-silhouettes.ts'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ARENA_A0_3_EXPECTED_SOURCE_COMMIT: '0'.repeat(40) } });
  if (wrongTarget.status === 0 || hash(RENDER) !== renderHashBeforeStartProbes) throw new Error('wrong target sourceCommit must fail before output');
  process.stdout.write('PASS wrong-target-source-commit-before-output\n');
  const currentHead = execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const dirtyRestart = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/art/render-arena-silhouettes.ts'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ARENA_A0_3_EXPECTED_SOURCE_COMMIT: currentHead } });
  if (dirtyRestart.status === 0 || hash(RENDER) !== renderHashBeforeStartProbes) throw new Error('dirty restart must fail before output');
  process.stdout.write('PASS dirty-restart-before-output\n25/25 manifest probes and 2 clean-start probes passed\n');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
