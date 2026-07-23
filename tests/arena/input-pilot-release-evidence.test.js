import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  createArenaInputPilotReleaseResult,
} from '@number-strategy-jump/arena-release';
import {
  ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION,
  createArenaReleaseCandidateBundle,
} from '@number-strategy-jump/arena-release';
import {
  ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION,
  ARENA_RELEASE_EVIDENCE_STATUS,
} from '@number-strategy-jump/arena-release-contracts';
import {
  ARENA_STAGE9_RC_HANDOFF_GATE_ID,
  createArenaStage9RcHandoffV1Definition,
} from '@number-strategy-jump/arena-release';
import {
  createArenaStage6DeviceReleaseResult,
} from '@number-strategy-jump/arena-release';
import {
  ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_BUILD_MANIFEST_FILENAME,
  createArenaBuildManifest,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage6DeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_INPUT_PILOT_VARIANT_ID,
  INPUT_PILOT_EVIDENCE_BUNDLE_SCHEMA_VERSION,
  INPUT_PILOT_EXPORT_PRIVACY_CLASS,
  INPUT_PILOT_EXPORT_SCHEMA_VERSION,
  createArenaInputPilotV1Definition,
  createInputPilotAssignment,
  createInputPilotEvidenceBundle,
  validateInputPilotAuditExport,
} from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_RECORD_SCHEMA_VERSION,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_STATUS,
} from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_ASSESSMENT_STATUS,
  createInputPilotReport,
} from '@number-strategy-jump/arena-input-pilot';
import {
  writeArenaBuildManifest,
} from '../../scripts/lib/arena-build-manifest-files.mjs';
import {
  verifyArenaStage9ReleaseProducerEvidence,
} from '../../scripts/lib/arena-stage9-release-producers.mjs';

const COMMIT = 'a'.repeat(40);
const BUILD_ID = 'arena-input-pilot-release-test';
const CREATED_AT = '2026-07-18T00:00:00.000Z';

function inputRecord(definition, enrollmentIndex, success) {
  return {
    schemaVersion: INPUT_PILOT_RECORD_SCHEMA_VERSION,
    trialId: `trial-${enrollmentIndex}`,
    assignment: createInputPilotAssignment({
      definition,
      participantId: `pilot-${enrollmentIndex}`,
      enrollmentIndex,
    }),
    trialStatus: INPUT_PILOT_TRIAL_STATUS.COMPLETED,
    terminationReason: INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED,
    device: definition.environment,
    eligibility: { priorArenaExperience: false, priorOtherVariantExposure: false },
    automated: {
      trialDurationMs: 20_000,
      firstEffectiveMovementMs: 1_500,
      firstCorrectContextActionMs: success ? 5_000 : 12_000,
      groundJump: INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED,
      airJump: success
        ? INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED
        : INPUT_PILOT_ACTION_OUTCOME.FAILED,
      downSmash: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
    },
    observer: {
      intentMismatchCount: success ? 0 : 1,
      accidentalInputCount: success ? 0 : 1,
      repeatedInputCount: 0,
      abandonedInputCount: 0,
      correctionCount: success ? 0 : 1,
      oneHandCompleted: true,
      objectiveCompleted: success,
    },
    selfReport: {
      groundAction: INPUT_PILOT_COMPREHENSION.CORRECT,
      airAction: success
        ? INPUT_PILOT_COMPREHENSION.CORRECT
        : INPUT_PILOT_COMPREHENSION.PARTIAL,
      equipmentAction: INPUT_PILOT_COMPREHENSION.CORRECT,
    },
  };
}

function auditValue(definition, { winner = false } = {}) {
  const variantOrdinals = new Map(definition.variants.map(({ id }) => [id, 0]));
  const records = winner
    ? Array.from({ length: 10 }, (_, enrollmentIndex) => {
      const assignment = createInputPilotAssignment({
        definition,
        participantId: `probe-${enrollmentIndex}`,
        enrollmentIndex,
      });
      const ordinal = variantOrdinals.get(assignment.variantId);
      variantOrdinals.set(assignment.variantId, ordinal + 1);
      const success = assignment.variantId === ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY
        || ordinal < 4;
      return inputRecord(definition, enrollmentIndex, success);
    })
    : [];
  const report = createInputPilotReport(definition, records);
  return {
    schemaVersion: INPUT_PILOT_EXPORT_SCHEMA_VERSION,
    privacyClass: INPUT_PILOT_EXPORT_PRIVACY_CLASS.PSEUDONYMOUS_RESEARCH_DATA,
    definition: definition.toJSON(),
    definitionHash: definition.getContentHash(),
    workspaceRevision: records.length * 4,
    recordCount: records.length,
    sourceDataHash: createDeterministicDataHash(records, 'InputPilot audit records'),
    records,
    report,
  };
}

function deviceBundle(definition) {
  return {
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: BUILD_ID,
    createdAt: CREATED_AT,
    records: [],
  };
}

async function createWebBuild(root, { dirty = false } = {}) {
  const buildRoot = path.join(root, dirty ? 'dirty-web' : 'web');
  await mkdir(buildRoot, { recursive: true });
  for (const fileName of ['greybox.html', 'index.html', 'product.html', 'pilot.html']) {
    await writeFile(path.join(buildRoot, fileName), `<p>${fileName}</p>\n`);
  }
  const manifest = await writeArenaBuildManifest({
    outDir: buildRoot,
    buildId: BUILD_ID,
    commit: COMMIT,
    sourceDirty: dirty,
    target: 'web',
    defaultEntry: 'product',
  });
  return Object.freeze({ buildRoot, manifest });
}

async function materialFor(relativePath, resolvedPath) {
  const bytes = await readFile(resolvedPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return Object.freeze({
    material: Object.freeze({ path: relativePath, sha256, byteLength: bytes.byteLength }),
    verified: Object.freeze({
      path: relativePath,
      sha256,
      byteLength: bytes.byteLength,
      resolvedPath,
      fileIdentity: `test:${relativePath}`,
    }),
  });
}

function statement(definition, gateId, result, materials) {
  const gate = definition.requireGate(gateId);
  return {
    schemaVersion: ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION,
    gateId,
    producerId: gate.producerId,
    requirementHash: gate.requirementHash,
    commit: COMMIT,
    buildId: BUILD_ID,
    status: result.status,
    resultHash: result.resultHash,
    materials,
  };
}

function candidate(definition, evidence) {
  return createArenaReleaseCandidateBundle(definition, {
    schemaVersion: ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: BUILD_ID,
    sourceDirty: false,
    evidence,
  });
}

test('Input Pilot audit and release result are recomputed and require build plus E3 identity', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-input-pilot-result-'));
  try {
    const definition = createArenaInputPilotV1Definition();
    const { manifest } = await createWebBuild(root);
    const audit = auditValue(definition, { winner: true });
    const evidenceBundle = createInputPilotEvidenceBundle(definition, {
      schemaVersion: INPUT_PILOT_EVIDENCE_BUNDLE_SCHEMA_VERSION,
      commit: COMMIT,
      buildId: BUILD_ID,
      buildManifestHash: manifest.getContentHash(),
      audit,
    });
    assert.equal(
      evidenceBundle.audit.report.assessment.status,
      INPUT_PILOT_ASSESSMENT_STATUS.CANDIDATE_WINNER,
    );
    const result = createArenaInputPilotReleaseResult({
      evidenceBundle,
      buildManifest: manifest,
      stage6DeviceResult: {
        commit: COMMIT,
        buildId: BUILD_ID,
        status: ARENA_RELEASE_EVIDENCE_STATUS.READY,
        resultHash: 'abcdef12',
      },
    });
    assert.equal(result.status, ARENA_RELEASE_EVIDENCE_STATUS.READY);
    const tampered = structuredClone(audit);
    tampered.report.assessment.status = INPUT_PILOT_ASSESSMENT_STATUS.CANDIDATE_WINNER;
    assert.throws(
      () => validateInputPilotAuditExport(definition, {
        ...tampered,
        records: [],
        recordCount: 0,
      }),
      /sourceDataHash|report 无法由 records 重建/,
    );
    assert.throws(
      () => createArenaInputPilotReleaseResult({
        evidenceBundle,
        buildManifest: createArenaBuildManifest({ ...manifest.toJSON(), sourceDirty: true }),
        stage6DeviceResult: {
          commit: COMMIT,
          buildId: BUILD_ID,
          status: ARENA_RELEASE_EVIDENCE_STATUS.READY,
          resultHash: 'abcdef12',
        },
      }),
      /dirty Web 构建/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Input Pilot producer requires the same candidate Stage 6 gate and reopens every material', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-input-pilot-producer-'));
  try {
    const pilotDefinition = createArenaInputPilotV1Definition();
    const deviceDefinition = createArenaStage6DeviceAcceptanceV1Definition();
    const releaseDefinition = createArenaStage9RcHandoffV1Definition();
    const { buildRoot, manifest } = await createWebBuild(root);
    const pilotBundle = createInputPilotEvidenceBundle(pilotDefinition, {
      schemaVersion: INPUT_PILOT_EVIDENCE_BUNDLE_SCHEMA_VERSION,
      commit: COMMIT,
      buildId: BUILD_ID,
      buildManifestHash: manifest.getContentHash(),
      audit: auditValue(pilotDefinition),
    });
    const device = deviceBundle(deviceDefinition);
    const evidencePath = path.join(root, 'input-pilot-evidence.json');
    const devicePath = path.join(root, 'device-evidence.json');
    await writeFile(evidencePath, `${JSON.stringify(pilotBundle, null, 2)}\n`);
    await writeFile(devicePath, `${JSON.stringify(device, null, 2)}\n`);
    const evidenceMaterial = await materialFor('pilot/input-pilot-evidence.json', evidencePath);
    const buildMaterial = await materialFor(
      `web/${ARENA_BUILD_MANIFEST_FILENAME}`,
      path.join(buildRoot, ARENA_BUILD_MANIFEST_FILENAME),
    );
    const deviceMaterial = await materialFor('stage6/device-evidence.json', devicePath);
    const deviceResult = createArenaStage6DeviceReleaseResult({ bundle: device });
    const pilotResult = createArenaInputPilotReleaseResult({
      evidenceBundle: pilotBundle,
      buildManifest: manifest,
      stage6DeviceResult: deviceResult,
    });
    assert.equal(pilotResult.status, ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE);
    const pilotStatement = statement(
      releaseDefinition,
      ARENA_STAGE9_RC_HANDOFF_GATE_ID.INPUT_PILOT,
      pilotResult,
      [evidenceMaterial.material, buildMaterial.material],
    );
    const deviceStatement = statement(
      releaseDefinition,
      ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE6_DEVICE,
      deviceResult,
      [deviceMaterial.material],
    );
    const verifiedByPath = new Map([
      [evidenceMaterial.material.path, evidenceMaterial.verified],
      [buildMaterial.material.path, buildMaterial.verified],
      [deviceMaterial.material.path, deviceMaterial.verified],
    ]);
    const releaseBundle = candidate(releaseDefinition, [pilotStatement, deviceStatement]);
    const verified = await verifyArenaStage9ReleaseProducerEvidence({
      definition: releaseDefinition,
      bundle: releaseBundle,
      verifiedMaterialsByPath: verifiedByPath,
    });
    assert.deepEqual(verified.map(({ gateId }) => gateId), [
      ARENA_STAGE9_RC_HANDOFF_GATE_ID.INPUT_PILOT,
      ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE6_DEVICE,
    ]);
    await assert.rejects(
      verifyArenaStage9ReleaseProducerEvidence({
        definition: releaseDefinition,
        bundle: candidate(releaseDefinition, [pilotStatement]),
        verifiedMaterialsByPath: verifiedByPath,
      }),
      /缺少同候选 Stage 6 Device Gate/,
    );
    const falseReady = structuredClone(pilotStatement);
    falseReady.status = ARENA_RELEASE_EVIDENCE_STATUS.READY;
    await assert.rejects(
      verifyArenaStage9ReleaseProducerEvidence({
        definition: releaseDefinition,
        bundle: candidate(releaseDefinition, [falseReady, deviceStatement]),
        verifiedMaterialsByPath: verifiedByPath,
      }),
      /status 与 producer 复算结果不一致/,
    );
    await writeFile(evidencePath, '{}\n');
    await assert.rejects(
      verifyArenaStage9ReleaseProducerEvidence({
        definition: releaseDefinition,
        bundle: releaseBundle,
        verifiedMaterialsByPath: verifiedByPath,
      }),
      /producer 复验前发生变化/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Input Pilot CLI describes fixed release prerequisites', () => {
  const result = spawnSync(process.execPath, [
    '--import', 'tsx',
    'scripts/arena-input-pilot-evidence.mjs',
    '--describe',
  ], { cwd: path.resolve('.'), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.requiredAssessmentStatus, 'candidate-winner');
  assert.equal(output.requiredBuildArtifact, 'pilot.html');
  assert.equal(output.requiredDeviceDefinition.status, 'ready');
});
