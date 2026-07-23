import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ARENA_DEFECT_LEDGER_SCHEMA_VERSION,
  ARENA_DEFECT_REPORT_STATUS,
  ARENA_DEFECT_SEVERITY,
  ARENA_DEFECT_STATUS,
  createArenaDefectLedger,
  createArenaDefectReport,
  createArenaDefectReleaseResult,
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
  arenaStage9ReleaseRequiresSourceIdentity,
  verifyArenaStage9ReleaseProducerEvidence,
} from '../../scripts/lib/arena-stage9-release-producers.ts';

const COMMIT = 'a'.repeat(40);
const BUILD_ID = 'arena-defect-ledger-test';

function ledgerValue(overrides = {}) {
  return {
    schemaVersion: ARENA_DEFECT_LEDGER_SCHEMA_VERSION,
    commit: COMMIT,
    reviewedAt: '2026-07-18T12:00:00.000Z',
    reviewerId: 'release-reviewer-01',
    knownIssuesComplete: true,
    defects: [],
    residualRisks: [],
    ...overrides,
  };
}

function openDefect(severity = ARENA_DEFECT_SEVERITY.MEDIUM) {
  return {
    id: 'arena-101',
    title: '恢复后第一次表现帧可能短暂降级',
    severity,
    status: ARENA_DEFECT_STATUS.OPEN,
    ownerId: 'runtime-owner',
    references: ['issue:arena-101'],
    resolutionSummary: null,
    verificationReferences: [],
  };
}

function residualRisk() {
  return {
    id: 'risk-101',
    title: '恢复后的瞬时表现降级',
    ownerId: 'runtime-owner',
    mitigation: '低质量档保持 60 Hz Core，下一表现帧恢复资源。',
    reviewTrigger: '恢复时间超过当前性能 Policy 或影响权威 tick。',
    defectIds: ['arena-101'],
  };
}

function resolvedDefect() {
  return {
    id: 'arena-099',
    title: '旧输入在恢复后复活',
    severity: ARENA_DEFECT_SEVERITY.HIGH,
    status: ARENA_DEFECT_STATUS.RESOLVED,
    ownerId: 'input-owner',
    references: ['issue:arena-099'],
    resolutionSummary: '恢复时清空全部 pointer ownership。',
    verificationReferences: ['test:pointer-input-adapter:resume-clears-input'],
  };
}

function releaseStatement(definition, result, material) {
  const gate = definition.requireGate(ARENA_STAGE9_RC_HANDOFF_GATE_ID.DEFECTS);
  return {
    schemaVersion: ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION,
    gateId: gate.id,
    producerId: gate.producerId,
    requirementHash: gate.requirementHash,
    commit: COMMIT,
    buildId: null,
    status: result.status,
    resultHash: result.resultHash,
    materials: [material],
  };
}

test('Defect Ledger derives ready, incomplete and failed without accepting a manual status', () => {
  const ready = createArenaDefectReport(ledgerValue({ defects: [resolvedDefect()] }));
  assert.equal(ready.status, ARENA_DEFECT_REPORT_STATUS.READY);
  assert.equal(ready.counts.high.resolved, 1);
  assert.equal(ready.counts.high.open, 0);
  assert.match(ready.resultHash, /^[0-9a-f]{8}$/);

  const incomplete = createArenaDefectReport(ledgerValue({ knownIssuesComplete: false }));
  assert.equal(incomplete.status, ARENA_DEFECT_REPORT_STATUS.INCOMPLETE);

  const medium = createArenaDefectReport(ledgerValue({
    defects: [openDefect()],
    residualRisks: [residualRisk()],
  }));
  assert.equal(medium.status, ARENA_DEFECT_REPORT_STATUS.READY);
  assert.equal(medium.counts.medium.open, 1);

  const high = createArenaDefectReport(ledgerValue({
    defects: [openDefect(ARENA_DEFECT_SEVERITY.HIGH)],
    residualRisks: [residualRisk()],
  }));
  assert.equal(high.status, ARENA_DEFECT_REPORT_STATUS.FAILED);
  assert.equal(high.counts.high.open, 1);
  assert.throws(() => { high.counts.high.open = 0; }, /read only|Cannot assign/i);
});

test('Defect Ledger requires traceable resolutions and owned residual risk for every open issue', () => {
  const unresolved = resolvedDefect();
  unresolved.verificationReferences = [];
  assert.throws(
    () => createArenaDefectLedger(ledgerValue({ defects: [unresolved] })),
    /verificationReferences.*不能为空/,
  );
  assert.throws(
    () => createArenaDefectLedger(ledgerValue({ defects: [openDefect()] })),
    /必须由 residual risk 明确承接/,
  );
  const unknownRisk = residualRisk();
  unknownRisk.defectIds = ['arena-404'];
  assert.throws(
    () => createArenaDefectLedger(ledgerValue({ residualRisks: [unknownRisk] })),
    /引用未知 defect arena-404/,
  );
  const resolvedRisk = residualRisk();
  resolvedRisk.defectIds = ['arena-099'];
  assert.throws(
    () => createArenaDefectLedger(ledgerValue({
      defects: [resolvedDefect()],
      residualRisks: [resolvedRisk],
    })),
    /不能引用已解决 defect arena-099/,
  );
  assert.throws(
    () => createArenaDefectLedger({ ...ledgerValue(), status: 'ready' }),
    /不支持字段 status/,
  );
});

test('Defect release result binds clean candidate commit and preserves non-ready outcomes', () => {
  const ready = createArenaDefectReleaseResult({
    commit: COMMIT,
    sourceDirty: false,
    ledger: ledgerValue(),
  });
  assert.equal(ready.status, ARENA_RELEASE_EVIDENCE_STATUS.READY);
  assert.equal(ready.buildId, null);
  assert.equal(createArenaDefectReleaseResult({
    commit: COMMIT,
    sourceDirty: true,
    ledger: ledgerValue(),
  }).status, ARENA_RELEASE_EVIDENCE_STATUS.FAILED);
  assert.equal(createArenaDefectReleaseResult({
    commit: COMMIT,
    sourceDirty: false,
    ledger: ledgerValue({ knownIssuesComplete: false }),
  }).status, ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE);
  assert.throws(
    () => createArenaDefectReleaseResult({
      commit: 'b'.repeat(40),
      sourceDirty: false,
      ledger: ledgerValue(),
    }),
    /candidate commit 不一致/,
  );
});

test('defect CLI and Stage 9 producer recompute ledger and reject material mutation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-defect-ledger-'));
  try {
    const ledger = ledgerValue({ defects: [resolvedDefect()] });
    const bytes = Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`);
    const ledgerPath = path.join(root, 'defect-ledger.json');
    await writeFile(ledgerPath, bytes);
    const cli = spawnSync(process.execPath, [
      '--import', 'tsx',
      'scripts/arena-defects.ts',
      '--ledger',
      ledgerPath,
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(JSON.parse(cli.stdout).report.status, ARENA_DEFECT_REPORT_STATUS.READY);

    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const material = {
      path: 'defect-ledger.json',
      sha256,
      byteLength: bytes.byteLength,
    };
    const verifiedMaterial = Object.freeze({
      ...material,
      resolvedPath: ledgerPath,
      fileIdentity: 'test:defect-ledger',
    });
    const definition = createArenaStage9RcHandoffV1Definition();
    const result = createArenaDefectReleaseResult({
      commit: COMMIT,
      sourceDirty: false,
      ledger,
    });
    const statement = releaseStatement(definition, result, material);
    const bundle = createArenaReleaseCandidateBundle(definition, {
      schemaVersion: ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      commit: COMMIT,
      buildId: BUILD_ID,
      sourceDirty: false,
      evidence: [statement],
    });
    assert.equal(arenaStage9ReleaseRequiresSourceIdentity(bundle), true);
    const verified = await verifyArenaStage9ReleaseProducerEvidence({
      definition,
      bundle,
      verifiedMaterialsByPath: new Map([[material.path, verifiedMaterial]]),
      sourceIdentity: { sourceCommit: COMMIT, sourceDirty: false },
    });
    assert.equal(verified.length, 1);
    assert.equal(verified[0].gateId, ARENA_STAGE9_RC_HANDOFF_GATE_ID.DEFECTS);

    await writeFile(ledgerPath, '{}\n');
    await assert.rejects(
      verifyArenaStage9ReleaseProducerEvidence({
        definition,
        bundle,
        verifiedMaterialsByPath: new Map([[material.path, verifiedMaterial]]),
        sourceIdentity: { sourceCommit: COMMIT, sourceDirty: false },
      }),
      /producer 复验前发生变化/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
