import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION,
  createArenaReleaseCandidateBundle,
} from '../../src/arena-release/release-candidate-bundle.js';
import {
  ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION,
  ARENA_RELEASE_EVIDENCE_STATUS,
  createArenaReleaseEvidenceStatement,
} from '../../src/arena-release/release-evidence-statement.js';
import {
  ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE,
  ARENA_RELEASE_READINESS_DEFINITION_SCHEMA_VERSION,
  createArenaReleaseReadinessDefinition,
} from '../../src/arena-release/release-readiness-definition.js';
import {
  ARENA_RELEASE_READINESS_STATUS,
  createArenaReleaseReadinessReport,
} from '../../src/arena-release/release-readiness-report.js';
import {
  ARENA_STAGE9_RC_HANDOFF_GATE_ID,
  createArenaStage9RcHandoffV1Definition,
} from '../../src/arena-release/arena-stage9-rc-handoff-v1.js';

const COMMIT = 'a'.repeat(40);
const BUILD_ID = 'arena-release-test';
const SHA_A = '1'.repeat(64);
const SHA_B = '2'.repeat(64);

function definitionValue() {
  return {
    schemaVersion: ARENA_RELEASE_READINESS_DEFINITION_SCHEMA_VERSION,
    id: 'arena.release.test.v1',
    stage: 'S9.6',
    gates: [
      {
        id: 'source-gate',
        stage: 'S9.2',
        title: 'Source gate',
        producerId: 'test:source',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.SOURCE,
        requirementHash: '12345678',
      },
      {
        id: 'build-gate',
        stage: 'S9.4',
        title: 'Build gate',
        producerId: 'test:build',
        subjectScope: ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD,
        requirementHash: '87654321',
      },
    ],
  };
}

function statementValue(definition, gateId, overrides = {}) {
  const gate = definition.requireGate(gateId);
  return {
    schemaVersion: ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION,
    gateId,
    producerId: gate.producerId,
    requirementHash: gate.requirementHash,
    commit: COMMIT,
    buildId: gate.subjectScope === ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD
      ? BUILD_ID
      : null,
    status: ARENA_RELEASE_EVIDENCE_STATUS.READY,
    resultHash: 'abcdef12',
    materials: [{
      path: `${gateId}.json`,
      sha256: gateId === 'build-gate' ? SHA_B : SHA_A,
      byteLength: 100,
    }],
    ...overrides,
  };
}

function bundleValue(definition, evidence, overrides = {}) {
  return {
    schemaVersion: ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: BUILD_ID,
    sourceDirty: false,
    evidence,
    ...overrides,
  };
}

test('Stage 9 RC handoff V1 固定全部真实门禁且不把外部证据当作已完成', () => {
  const definition = createArenaStage9RcHandoffV1Definition();
  assert.equal(definition.id, 'arena.stage9.rc-handoff.v1');
  assert.equal(definition.stage, 'S9.6');
  assert.equal(definition.gates.length, 12);
  assert.equal(definition.getContentHash(), 'df7ab0c4');
  assert.deepEqual(definition.gates.map(({ id }) => id), [
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.INPUT_PILOT,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.FORMAL_ASSETS,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.GOLDEN_REPLAY,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.REGRESSION,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.BALANCE_VALIDATION,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_INTEGRITY,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_BUDGET,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE6_DEVICE,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE8_PRODUCT_DEVICE,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.PERFORMANCE_DEVICE,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.HUMAN_FAIRNESS,
    ARENA_STAGE9_RC_HANDOFF_GATE_ID.DEFECTS,
  ]);
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.gates));
});

test('Release Definition 拒绝未知字段、重复 Gate 与非法阶段，但允许一个 producer 承担多个门', () => {
  const base = definitionValue();
  assert.throws(
    () => createArenaReleaseReadinessDefinition({ ...base, unexpected: true }),
    /不支持字段 unexpected/,
  );
  assert.throws(
    () => createArenaReleaseReadinessDefinition({
      ...base,
      gates: [base.gates[0], { ...base.gates[1], id: base.gates[0].id }],
    }),
    /重复的 Release gate/,
  );
  assert.throws(
    () => createArenaReleaseReadinessDefinition({ ...base, stage: 'S11' }),
    /S4～S10/,
  );
  const sharedProducer = createArenaReleaseReadinessDefinition({
    ...base,
    gates: [base.gates[0], { ...base.gates[1], producerId: base.gates[0].producerId }],
  });
  assert.equal(sharedProducer.gates.length, 2);
});

test('Release Evidence 严格绑定 Gate、scope、commit/build 与内容寻址材料', () => {
  const definition = createArenaReleaseReadinessDefinition(definitionValue());
  const source = createArenaReleaseEvidenceStatement(
    definition,
    statementValue(definition, 'source-gate'),
  );
  assert.equal(source.buildId, null);
  assert.equal(source.getContentHash().length, 8);
  assert.ok(Object.isFrozen(source.materials[0]));
  assert.throws(
    () => createArenaReleaseEvidenceStatement(definition, {
      ...statementValue(definition, 'source-gate'),
      buildId: BUILD_ID,
    }),
    /source scope.*不能包含 buildId/,
  );
  assert.throws(
    () => createArenaReleaseEvidenceStatement(definition, {
      ...statementValue(definition, 'build-gate'),
      buildId: null,
    }),
    /build scope.*必须包含 buildId/,
  );
  assert.throws(
    () => createArenaReleaseEvidenceStatement(definition, {
      ...statementValue(definition, 'source-gate'),
      producerId: 'test:other',
    }),
    /producerId 与 Definition 不一致/,
  );
  assert.throws(
    () => createArenaReleaseEvidenceStatement(definition, {
      ...statementValue(definition, 'source-gate'),
      materials: [{ path: '../escape.json', sha256: SHA_A, byteLength: 1 }],
    }),
    /规范化的相对路径/,
  );
  assert.throws(
    () => createArenaReleaseEvidenceStatement(definition, {
      ...statementValue(definition, 'source-gate'),
      materials: [{ path: 'empty.json', sha256: SHA_A, byteLength: 0 }],
    }),
    /大于等于 1/,
  );
});

test('Release Candidate 统一身份、排序并拒绝重复 Gate 和冲突材料', () => {
  const definition = createArenaReleaseReadinessDefinition(definitionValue());
  const sourceGate = statementValue(definition, 'source-gate');
  const buildGate = statementValue(definition, 'build-gate');
  const bundle = createArenaReleaseCandidateBundle(
    definition,
    bundleValue(definition, [buildGate, sourceGate]),
  );
  assert.deepEqual(bundle.evidence.map(({ gateId }) => gateId), ['source-gate', 'build-gate']);
  assert.equal(bundle.getContentHash().length, 8);
  assert.throws(
    () => createArenaReleaseCandidateBundle(
      definition,
      bundleValue(definition, [sourceGate, sourceGate]),
    ),
    /重复的 Release evidence gate/,
  );
  assert.throws(
    () => createArenaReleaseCandidateBundle(
      definition,
      bundleValue(definition, [{ ...buildGate, buildId: 'other-build' }]),
    ),
    /buildId 与候选不一致/,
  );
  assert.throws(
    () => createArenaReleaseCandidateBundle(definition, bundleValue(definition, [
      sourceGate,
      {
        ...buildGate,
        materials: [{ ...buildGate.materials[0], path: sourceGate.materials[0].path }],
      },
    ])),
    /具有冲突描述/,
  );
});

test('Release Report 不信任未经过 producer 语义复验的 ready 声明', () => {
  const definition = createArenaReleaseReadinessDefinition(definitionValue());
  const candidate = createArenaReleaseCandidateBundle(definition, bundleValue(definition, [
    statementValue(definition, 'source-gate'),
    statementValue(definition, 'build-gate'),
  ]));
  const report = createArenaReleaseReadinessReport(definition, candidate);
  assert.equal(report.status, ARENA_RELEASE_READINESS_STATUS.INCOMPLETE);
  assert.equal(report.freezeEligible, false);
  assert.equal(report.readyGateCount, 0);
  assert.equal(report.verifiedEvidenceCount, 0);
  assert.deepEqual(report.incompleteGateIds, ['source-gate', 'build-gate']);
  assert.ok(report.gates.every(({ declaredStatus, evidenceVerified }) => (
    declaredStatus === ARENA_RELEASE_EVIDENCE_STATUS.READY && !evidenceVerified
  )));
});

test('Release Report 只有全部 evidence 被 producer 验证且 clean 时才 ready', () => {
  const definition = createArenaReleaseReadinessDefinition(definitionValue());
  const first = createArenaReleaseCandidateBundle(definition, bundleValue(definition, [
    statementValue(definition, 'build-gate'),
    statementValue(definition, 'source-gate'),
  ]));
  const verifiedEvidence = first.evidence.map((statement) => ({
    gateId: statement.gateId,
    evidenceHash: statement.getContentHash(),
  }));
  const report = createArenaReleaseReadinessReport(definition, first, {
    verifiedEvidence,
  });
  assert.equal(report.status, ARENA_RELEASE_READINESS_STATUS.READY);
  assert.equal(report.freezeEligible, true);
  assert.equal(report.readyGateCount, 2);
  assert.equal(report.verifiedEvidenceCount, 2);
  assert.deepEqual(report.missingGateIds, []);
  assert.deepEqual(report.failedGateIds, []);
  assert.deepEqual(report.incompleteGateIds, []);
  const reordered = createArenaReleaseCandidateBundle(definition, bundleValue(definition, [
    statementValue(definition, 'source-gate'),
    statementValue(definition, 'build-gate'),
  ]));
  assert.equal(first.getContentHash(), reordered.getContentHash());
  assert.equal(report.resultHash, createArenaReleaseReadinessReport(definition, reordered, {
    verifiedEvidence: reordered.evidence.map((statement) => ({
      gateId: statement.gateId,
      evidenceHash: statement.getContentHash(),
    })),
  }).resultHash);
  assert.throws(
    () => createArenaReleaseReadinessReport(definition, first, {
      verifiedEvidence: [{ gateId: 'unknown', evidenceHash: 'ffffffff' }],
    }),
    /gateId 不属于当前候选/,
  );
});

test('Release Report 已验证失败和 dirty source 均 fail closed', () => {
  const definition = createArenaReleaseReadinessDefinition(definitionValue());
  const failedCandidate = createArenaReleaseCandidateBundle(definition, bundleValue(definition, [
    statementValue(definition, 'source-gate', {
      status: ARENA_RELEASE_EVIDENCE_STATUS.FAILED,
    }),
  ]));
  const failedHash = failedCandidate.evidence[0].getContentHash();
  const failed = createArenaReleaseReadinessReport(definition, failedCandidate, {
    verifiedEvidence: [{ gateId: 'source-gate', evidenceHash: failedHash }],
  });
  assert.equal(failed.status, ARENA_RELEASE_READINESS_STATUS.FAILED);
  assert.deepEqual(failed.failedGateIds, ['source-gate']);
  assert.deepEqual(failed.missingGateIds, ['build-gate']);
  const dirtyCandidate = createArenaReleaseCandidateBundle(
    definition,
    bundleValue(definition, [], { sourceDirty: true }),
  );
  const dirty = createArenaReleaseReadinessReport(definition, dirtyCandidate);
  assert.equal(dirty.status, ARENA_RELEASE_READINESS_STATUS.FAILED);
  assert.deepEqual(dirty.failureReasons, ['candidate.source-dirty']);
  assert.equal(dirty.freezeEligible, false);
});

test('Stage 9 readiness CLI 校验材料完整性但不会把声明当 producer 结论', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-stage9-readiness-'));
  try {
    const definition = createArenaStage9RcHandoffV1Definition();
    const gate = definition.requireGate(ARENA_STAGE9_RC_HANDOFF_GATE_ID.GOLDEN_REPLAY);
    const materialBytes = Buffer.from('{"status":"ready"}\n');
    const material = {
      path: 'golden-replay-output.json',
      sha256: createHash('sha256').update(materialBytes).digest('hex'),
      byteLength: materialBytes.byteLength,
    };
    const candidate = {
      schemaVersion: ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      commit: COMMIT,
      buildId: BUILD_ID,
      sourceDirty: false,
      evidence: [{
        schemaVersion: ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION,
        gateId: gate.id,
        producerId: gate.producerId,
        requirementHash: gate.requirementHash,
        commit: COMMIT,
        buildId: null,
        status: ARENA_RELEASE_EVIDENCE_STATUS.READY,
        resultHash: 'abcdef12',
        materials: [material],
      }],
    };
    const bundlePath = path.join(directory, 'candidate.json');
    await writeFile(path.join(directory, material.path), materialBytes);
    await writeFile(bundlePath, `${JSON.stringify(candidate, null, 2)}\n`);
    const command = spawnSync(process.execPath, [
      'scripts/arena-stage9-readiness.mjs',
      '--bundle',
      bundlePath,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(command.status, 2, command.stderr);
    const output = JSON.parse(command.stdout);
    assert.equal(output.verifiedMaterialCount, 1);
    assert.equal(output.producerSemanticVerification, 'not-yet-enabled');
    assert.equal(output.report.status, ARENA_RELEASE_READINESS_STATUS.INCOMPLETE);
    assert.equal(output.report.freezeEligible, false);
    const secondGate = definition.requireGate(ARENA_STAGE9_RC_HANDOFF_GATE_ID.REGRESSION);
    const duplicateMaterial = { ...material, path: 'copied-output.json' };
    const duplicateCandidate = {
      ...candidate,
      evidence: [...candidate.evidence, {
        schemaVersion: ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION,
        gateId: secondGate.id,
        producerId: secondGate.producerId,
        requirementHash: secondGate.requirementHash,
        commit: COMMIT,
        buildId: null,
        status: ARENA_RELEASE_EVIDENCE_STATUS.READY,
        resultHash: 'abcdef12',
        materials: [duplicateMaterial],
      }],
    };
    const duplicateBundlePath = path.join(directory, 'duplicate-candidate.json');
    await writeFile(path.join(directory, duplicateMaterial.path), materialBytes);
    await writeFile(duplicateBundlePath, `${JSON.stringify(duplicateCandidate, null, 2)}\n`);
    const duplicate = spawnSync(process.execPath, [
      'scripts/arena-stage9-readiness.mjs',
      '--bundle',
      duplicateBundlePath,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(duplicate.status, 1);
    assert.match(duplicate.stderr, /复用了相同内容/);
    await writeFile(path.join(directory, material.path), 'tampered\n');
    const rejected = spawnSync(process.execPath, [
      'scripts/arena-stage9-readiness.mjs',
      '--bundle',
      bundlePath,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /大小不一致|SHA-256 不一致/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
