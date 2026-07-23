import assert from 'node:assert/strict';
import { appendFile, cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID,
  FORMAL_ASSET_BUDGET_POLICY_SCHEMA_VERSION,
  createArenaStage7FormalAssetBudgetV1Policy,
  createFormalAssetBudgetPolicy,
} from '../../../src/arena/presentation/assets/formal-asset-budget-policy.ts';
import {
  createFormalAssetBudgetReport,
} from '../../../src/arena/presentation/assets/formal-asset-budget-report.ts';
import {
  verifyArenaFormalAssetBudget,
} from '../../../scripts/lib/arena-formal-asset-budget-verifier.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('Stage 7 formal asset budget fixes complete runtime asset and complexity limits', async () => {
  const policy = createArenaStage7FormalAssetBudgetV1Policy();
  assert.equal(policy.schemaVersion, FORMAL_ASSET_BUDGET_POLICY_SCHEMA_VERSION);
  assert.equal(policy.id, ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID);
  assert.match(policy.getContentHash(), /^[0-9a-f]{8}$/);
  assert.equal(policy.artifacts.length, 10);
  assert.deepEqual(
    policy.artifacts.map(({ id }) => id),
    [...policy.artifacts.map(({ id }) => id)].sort(),
  );
  assert.equal(policy.requiredCharacterAnimationCount, 18);
  assert.equal(policy.maximumCharacterAnimationCount, 18);
  assert.equal(policy.maximumTotalDecodedTextureBytes, 16 * 1024 * 1024);
  assert.throws(() => {
    policy.artifacts.push({});
  }, /not extensible|read only|object is not extensible/i);

  const report = await verifyArenaFormalAssetBudget({ repositoryRoot: ROOT });
  assert.equal(report.status, 'passed');
  assert.equal(report.artifactCount, 10);
  assert.equal(report.totalEncodedBytes, 1_990_436);
  assert.equal(report.totalAudioBytes, 32_593);
  assert.equal(report.totalDecodedTextureBytes, 12 * 1024 * 1024);
  assert.deepEqual(report.failedGateIds, []);
  assert.equal(
    report.observations.filter(({ kind }) => kind === 'character-model')
      .every(({ animationCount, jointCount, embeddedImageCount }) => (
        animationCount === 18 && jointCount === 41 && embeddedImageCount === 0
      )),
    true,
  );
});

test('formal asset budget report fails closed on animation, per-file and coverage drift', async () => {
  const policy = createArenaStage7FormalAssetBudgetV1Policy();
  const current = await verifyArenaFormalAssetBudget({ repositoryRoot: ROOT });

  const missing = structuredClone(current.observations);
  missing.pop();
  assert.throws(
    () => createFormalAssetBudgetReport(policy, missing),
    /一一对应/,
  );

  const wrongPath = structuredClone(current.observations);
  wrongPath[0].path = 'public/assets/arena/foreign.glb';
  assert.throws(
    () => createFormalAssetBudgetReport(policy, wrongPath),
    /path\/kind 与 Policy 不一致/,
  );

  const drifted = structuredClone(current.observations);
  const character = drifted.find(({ kind }) => kind === 'character-model');
  character.animationCount = 17;
  const audio = drifted.find(({ kind }) => kind === 'audio');
  audio.encodedBytes = 16 * 1024 + 1;
  const report = createFormalAssetBudgetReport(policy, drifted);
  assert.equal(report.status, 'failed');
  assert.equal(report.failedGateIds.includes(`${character.id}:animations`), true);
  assert.equal(report.failedGateIds.includes(`${audio.id}:encoded-bytes`), true);

  const duplicatePolicy = structuredClone(policy.toJSON());
  duplicatePolicy.artifacts[1].path = duplicatePolicy.artifacts[0].path;
  assert.throws(() => createFormalAssetBudgetPolicy(duplicatePolicy), /重复.*path/);
});

test('formal asset budget verifier validates formats and reports oversized source assets', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'arena-formal-budget-'));
  try {
    await cp(path.join(ROOT, 'public'), path.join(temporaryRoot, 'public'), { recursive: true });
    const audioPath = path.join(
      temporaryRoot,
      'public/assets/arena/audio/kenney-impact-sounds/base-push.ogg',
    );
    await appendFile(audioPath, Buffer.alloc(16 * 1024));
    const oversized = await verifyArenaFormalAssetBudget({ repositoryRoot: temporaryRoot });
    assert.equal(oversized.status, 'failed');
    assert.equal(
      oversized.failedGateIds.includes('arena.audio.impact.base-push.v1:encoded-bytes'),
      true,
    );

    const texturePath = path.join(
      temporaryRoot,
      'public/assets/arena/characters/kaykit-adventurers/rogue_texture.png',
    );
    const texture = await readFile(texturePath);
    texture[0] = 0;
    await writeFile(texturePath, texture);
    await assert.rejects(
      () => verifyArenaFormalAssetBudget({ repositoryRoot: temporaryRoot }),
      /不是有效 PNG/,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
