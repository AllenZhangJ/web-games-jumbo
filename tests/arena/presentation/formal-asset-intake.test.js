import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  FORMAL_ASSET_INTAKE_BUNDLE_SCHEMA_VERSION,
  createFormalAssetIntakeBundle,
} from '../../../src/arena/presentation/assets/formal-asset-intake-bundle.ts';
import {
  FORMAL_ASSET_INTAKE_POLICY_SCHEMA_VERSION,
  FORMAL_ASSET_SOURCE_KIND,
  createArenaFormalAssetIntakeV1Policy,
  createFormalAssetIntakePolicy,
} from '../../../src/arena/presentation/assets/formal-asset-intake-policy.ts';
import {
  FORMAL_ASSET_PROVENANCE_RECORD_SCHEMA_VERSION,
} from '../../../src/arena/presentation/assets/formal-asset-provenance-record.ts';
import {
  PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
  PRESENTATION_ASSET_KIND,
  PresentationAssetRegistry,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_PRESENTATION_ASSET_PROVIDER_ID,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  verifyArenaFormalAssetIntake,
} from '../../../scripts/lib/arena-formal-asset-intake-verifier.mjs';

const CREATED_AT = '2026-07-18T03:00:00.000Z';
const ACQUIRED_AT = '2026-07-18T01:00:00.000Z';
const APPROVED_AT = '2026-07-18T02:00:00.000Z';

function artifact(relativePath, bytes) {
  return {
    path: relativePath,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    byteLength: bytes.byteLength,
  };
}

function asset(id, kind, sourceKey) {
  return {
    schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
    id,
    kind,
    providerId: 'arena.gltf.v1',
    sourceKey,
    contentVersion: 1,
    tags: ['formal', kind],
  };
}

function record({
  definition,
  recordId,
  sourceKind,
  contentArtifact,
  dependencyArtifacts = [],
  licenseArtifact,
  proofArtifact,
}) {
  const attributionRequired = sourceKind === FORMAL_ASSET_SOURCE_KIND.OPEN_SOURCE;
  return {
    schemaVersion: FORMAL_ASSET_PROVENANCE_RECORD_SCHEMA_VERSION,
    recordId,
    assetId: definition.id,
    assetDefinitionHash: definition.getContentHash(),
    sourceKind,
    sourceLocator: `source-registry:${definition.id}`,
    sourceRevision: 'vendor-revision-1',
    contentArtifact,
    dependencyArtifacts,
    license: {
      id: attributionRequired ? 'MIT' : 'arena-commercial-grant-v1',
      name: attributionRequired ? 'MIT License' : 'Arena commercial asset grant',
      rightsHolder: 'Fixture Rights Holder',
      textArtifact: licenseArtifact,
      commercialUseAllowed: true,
      modificationAllowed: true,
      redistributionInBuildAllowed: true,
      attributionRequired,
      attributionText: attributionRequired ? 'Fixture Author — MIT' : null,
    },
    proofArtifact,
    acquiredAt: ACQUIRED_AT,
    approvedAt: APPROVED_AT,
    approvedBy: 'asset-owner-fixture',
  };
}

function fixture() {
  const policy = createArenaFormalAssetIntakeV1Policy();
  const bytes = {
    model: Buffer.from('formal-character-model'),
    texture: Buffer.from('formal-character-texture'),
    wing: Buffer.from('formal-wing-attachment'),
    license: Buffer.from('fixture license text'),
    proof: Buffer.from('fixture rights proof'),
  };
  const modelValue = asset(
    'arena.asset.character.fixture.formal.v1',
    PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
    'characters/fixture.glb',
  );
  const wingValue = asset(
    'arena.asset.attachment.fixture-wing.formal.v1',
    PRESENTATION_ASSET_KIND.ATTACHMENT,
    'attachments/fixture-wing.glb',
  );
  const registry = new PresentationAssetRegistry([wingValue, modelValue]);
  const model = registry.require(modelValue.id);
  const wing = registry.require(wingValue.id);
  const sharedLicense = artifact('licenses/license.txt', bytes.license);
  const sharedProof = artifact('proof/rights.pdf', bytes.proof);
  const value = {
    schemaVersion: FORMAL_ASSET_INTAKE_BUNDLE_SCHEMA_VERSION,
    id: 'arena.stage7.formal-assets.fixture.v1',
    contentVersion: 1,
    policyId: policy.id,
    policyHash: policy.getContentHash(),
    createdAt: CREATED_AT,
    assets: [wingValue, modelValue],
    records: [
      record({
        definition: wing,
        recordId: 'fixture-wing-provenance',
        sourceKind: FORMAL_ASSET_SOURCE_KIND.OPEN_SOURCE,
        contentArtifact: artifact('content/wing.glb', bytes.wing),
        licenseArtifact: sharedLicense,
        proofArtifact: sharedProof,
      }),
      record({
        definition: model,
        recordId: 'fixture-model-provenance',
        sourceKind: FORMAL_ASSET_SOURCE_KIND.PURCHASED,
        contentArtifact: artifact('content/character.glb', bytes.model),
        dependencyArtifacts: [artifact('content/character.png', bytes.texture)],
        licenseArtifact: sharedLicense,
        proofArtifact: sharedProof,
      }),
    ],
  };
  return { policy, value, bytes };
}

async function writeFixtureFiles(root, bytes) {
  for (const directory of ['content', 'licenses', 'proof']) {
    await mkdir(path.join(root, directory), { recursive: true });
  }
  await Promise.all([
    writeFile(path.join(root, 'content/character.glb'), bytes.model),
    writeFile(path.join(root, 'content/character.png'), bytes.texture),
    writeFile(path.join(root, 'content/wing.glb'), bytes.wing),
    writeFile(path.join(root, 'licenses/license.txt'), bytes.license),
    writeFile(path.join(root, 'proof/rights.pdf'), bytes.proof),
  ]);
}

test('Formal Asset Intake policy and bundle are immutable, sorted and exact-coverage', () => {
  const { policy, value } = fixture();
  const bundle = createFormalAssetIntakeBundle(policy, value);
  assert.equal(policy.schemaVersion, FORMAL_ASSET_INTAKE_POLICY_SCHEMA_VERSION);
  assert.match(policy.getContentHash(), /^[0-9a-f]{8}$/);
  assert.match(bundle.getContentHash(), /^[0-9a-f]{8}$/);
  assert.equal(bundle.assets.length, 2);
  assert.equal(bundle.records.length, 2);
  assert.deepEqual(
    bundle.assets.map(({ id }) => id),
    [...bundle.assets.map(({ id }) => id)].sort(),
  );
  assert.deepEqual(
    bundle.records.map(({ assetId }) => assetId),
    [...bundle.records.map(({ assetId }) => assetId)].sort(),
  );
  assert.equal(bundle.getAssetRegistry().require(bundle.assets[0].id), bundle.assets[0]);
  assert.throws(() => {
    bundle.records[0].approvedBy = 'tampered';
  }, /read only|Cannot assign/i);
  assert.equal(
    createFormalAssetIntakeBundle(policy, structuredClone(bundle.toJSON())).getContentHash(),
    bundle.getContentHash(),
  );
});

test('Formal Asset Intake rejects greybox providers, incomplete rights and ambiguous evidence', () => {
  const { policy, value } = fixture();

  const greybox = structuredClone(value);
  greybox.assets[0].tags.push('greybox');
  assert.throws(() => createFormalAssetIntakeBundle(policy, greybox), /禁止的 tag greybox/);

  const programmatic = structuredClone(value);
  programmatic.assets[0].providerId = (
    ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1
  );
  assert.throws(() => createFormalAssetIntakeBundle(policy, programmatic), /禁止的 Provider/);

  const missingRecord = structuredClone(value);
  missingRecord.records.pop();
  assert.throws(() => createFormalAssetIntakeBundle(policy, missingRecord), /一一对应/);

  const deniedCommercialUse = structuredClone(value);
  deniedCommercialUse.records[0].license.commercialUseAllowed = false;
  assert.throws(
    () => createFormalAssetIntakeBundle(policy, deniedCommercialUse),
    /commercialUseAllowed 不满足 Policy/,
  );

  const missingAttribution = structuredClone(value);
  missingAttribution.records[0].license.attributionText = null;
  assert.throws(
    () => createFormalAssetIntakeBundle(policy, missingAttribution),
    /需要署名时不能为空/,
  );

  const duplicateContent = structuredClone(value);
  duplicateContent.records[1].contentArtifact = duplicateContent.records[0].contentArtifact;
  assert.throws(
    () => createFormalAssetIntakeBundle(policy, duplicateContent),
    /不能共享内容路径/,
  );

  const mixedArtifactRole = structuredClone(value);
  mixedArtifactRole.records[1].license.textArtifact = mixedArtifactRole.records[0].contentArtifact;
  assert.throws(
    () => createFormalAssetIntakeBundle(policy, mixedArtifactRole),
    /不能同时作为内容和授权文档/,
  );

  const tamperedDefinition = structuredClone(value);
  tamperedDefinition.records[0].assetDefinitionHash = '00000000';
  assert.throws(
    () => createFormalAssetIntakeBundle(policy, tamperedDefinition),
    /assetDefinitionHash 与资产定义不一致/,
  );

  const traversal = structuredClone(value);
  traversal.records[0].proofArtifact.path = '../outside.pdf';
  assert.throws(
    () => createFormalAssetIntakeBundle(policy, traversal),
    /不能包含空段、\. 或 \.\./,
  );

  const unknownSource = structuredClone(value);
  unknownSource.records[0].sourceKind = 'unknown-source';
  assert.throws(
    () => createFormalAssetIntakeBundle(policy, unknownSource),
    /sourceKind 不受 Policy 允许/,
  );

  const predatedBundle = structuredClone(value);
  predatedBundle.createdAt = ACQUIRED_AT;
  assert.throws(
    () => createFormalAssetIntakeBundle(policy, predatedBundle),
    /createdAt 不能早于资产批准时间/,
  );

  assert.throws(() => createFormalAssetIntakePolicy({
    ...policy.toJSON(),
    requiredAssetTags: ['formal', 'greybox'],
  }), /同时要求并禁止 tag greybox/);

  const otherPolicy = createFormalAssetIntakePolicy({
    ...policy.toJSON(),
    id: 'arena.stage7.formal-asset-intake.other',
  });
  const bundle = createFormalAssetIntakeBundle(policy, value);
  assert.throws(
    () => createFormalAssetIntakeBundle(otherPolicy, bundle),
    /请求的 Policy 身份不一致/,
  );
});

test('Formal Asset Intake verifier binds every declared artifact and rejects later mutation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-formal-assets-'));
  try {
    const { value, bytes } = fixture();
    await writeFixtureFiles(root, bytes);
    const result = await verifyArenaFormalAssetIntake({ bundle: value, artifactsRoot: root });
    assert.equal(result.status, 'verified-intake-only');
    assert.equal(result.assetCount, 2);
    assert.equal(result.artifactCount, 5);
    assert.deepEqual(
      result.verifiedArtifacts.find(({ path: artifactPath }) => (
        artifactPath === 'proof/rights.pdf'
      )).kinds,
      ['rights-proof'],
    );
    assert.deepEqual(
      result.verifiedArtifacts.map(({ path: artifactPath }) => artifactPath),
      [
        'content/character.glb',
        'content/character.png',
        'content/wing.glb',
        'licenses/license.txt',
        'proof/rights.pdf',
      ],
    );

    await writeFile(
      path.join(root, 'content/character.png'),
      Buffer.alloc(bytes.texture.byteLength, 0x78),
    );
    await assert.rejects(
      verifyArenaFormalAssetIntake({ bundle: value, artifactsRoot: root }),
      /SHA-256 不一致/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Formal Asset Intake CLI describes its non-release scope and verifies a complete fixture', async () => {
  const described = spawnSync(process.execPath, [
    '--import', 'tsx',
    'scripts/arena-formal-asset-intake.mjs',
    '--describe',
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(described.status, 0, described.stderr);
  assert.equal(JSON.parse(described.stdout).status, 'contract-only');

  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-formal-assets-cli-'));
  try {
    const { value, bytes } = fixture();
    await writeFixtureFiles(root, bytes);
    const bundlePath = path.join(root, 'intake-bundle.json');
    await writeFile(bundlePath, `${JSON.stringify(value, null, 2)}\n`);
    const verified = spawnSync(process.execPath, [
      '--import', 'tsx',
      'scripts/arena-formal-asset-intake.mjs',
      '--bundle', bundlePath,
      '--artifacts-root', root,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).status, 'verified-intake-only');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
