import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { assertKnownKeys, cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_RELEASE_EVIDENCE_STATUS,
} from '@number-strategy-jump/arena-release-contracts';
import {
  createArenaReleaseCandidateBundle,
  type ArenaReleaseCandidateBundle,
} from './release-candidate-bundle.js';
import { createArenaReleaseReadinessDefinition } from '@number-strategy-jump/arena-release-contracts';

export const ARENA_RELEASE_READINESS_REPORT_SCHEMA_VERSION = 1;

export const ARENA_RELEASE_READINESS_STATUS = Object.freeze({
  READY: 'ready',
  FAILED: 'failed',
  INCOMPLETE: 'incomplete',
} as const);

const VERIFIED_EVIDENCE_KEYS = new Set(['gateId', 'evidenceHash']);
const OPTION_KEYS = new Set(['verifiedEvidence']);

function verifiedEvidenceGateSet(
  values: unknown,
  bundle: ArenaReleaseCandidateBundle,
): Set<string> {
  if (!Array.isArray(values)) {
    throw new TypeError('ArenaReleaseReadinessReport verifiedEvidence 必须是数组。');
  }
  const known = new Map(bundle.evidence.map((statement) => [statement.gateId, statement]));
  const result = new Set<string>();
  for (const [index, value] of values.entries()) {
    const name = `verifiedEvidence[${index}]`;
    assertKnownKeys(value, VERIFIED_EVIDENCE_KEYS, name);
    if (typeof value.gateId !== 'string') throw new TypeError(`${name}.gateId 必须是字符串。`);
    const gateId = value.gateId;
    const statement = known.get(gateId);
    if (!statement) throw new RangeError(`${name}.gateId 不属于当前候选。`);
    if (typeof value.evidenceHash !== 'string' || !/^[0-9a-f]{8}$/.test(value.evidenceHash)) {
      throw new TypeError(`${name}.evidenceHash 必须是 8 位小写十六进制 hash。`);
    }
    if (statement.getContentHash() !== value.evidenceHash) {
      throw new RangeError(`${name}.evidenceHash 与当前候选不一致。`);
    }
    if (result.has(gateId)) throw new RangeError(`重复 verified evidence gate ${gateId}。`);
    result.add(gateId);
  }
  return result;
}

export function createArenaReleaseReadinessReport(
  definitionValue: unknown,
  bundleValue: unknown,
  optionsValue: unknown = {},
) {
  const options = cloneFrozenData(optionsValue, 'ArenaReleaseReadinessReport options');
  assertKnownKeys(options, OPTION_KEYS, 'ArenaReleaseReadinessReport options');
  const verifiedEvidence = options.verifiedEvidence ?? [];
  const definition = createArenaReleaseReadinessDefinition(definitionValue);
  const bundle = createArenaReleaseCandidateBundle(definition, bundleValue);
  const verifiedGateIds = verifiedEvidenceGateSet(verifiedEvidence, bundle);
  const evidenceByGate = new Map(bundle.evidence.map((statement) => [statement.gateId, statement]));
  const gates = definition.gates.map((gate) => {
    const statement = evidenceByGate.get(gate.id) ?? null;
    const evidenceHash = statement?.getContentHash() ?? null;
    const evidenceVerified = verifiedGateIds.has(gate.id);
    const declaredStatus = statement?.status ?? null;
    const status = statement === null
      || !evidenceVerified
      || declaredStatus === ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE
      ? ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE
      : declaredStatus;
    return Object.freeze({
      gateId: gate.id,
      stage: gate.stage,
      title: gate.title,
      producerId: gate.producerId,
      subjectScope: gate.subjectScope,
      requirementHash: gate.requirementHash,
      status,
      declaredStatus,
      evidenceVerified,
      evidenceHash,
      resultHash: statement?.resultHash ?? null,
      materialCount: statement?.materials.length ?? 0,
      missing: statement === null,
    });
  });
  const missingGateIds = gates.filter(({ missing }) => missing).map(({ gateId }) => gateId);
  const failedGateIds = gates
    .filter(({ status }) => status === ARENA_RELEASE_EVIDENCE_STATUS.FAILED)
    .map(({ gateId }) => gateId);
  const incompleteGateIds = gates
    .filter(({ status }) => status === ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE)
    .map(({ gateId }) => gateId);
  const failureReasons = [
    ...(bundle.sourceDirty ? ['candidate.source-dirty'] : []),
    ...failedGateIds.map((gateId) => `gate.${gateId}.failed`),
  ];
  const status = failureReasons.length > 0
    ? ARENA_RELEASE_READINESS_STATUS.FAILED
    : incompleteGateIds.length > 0
      ? ARENA_RELEASE_READINESS_STATUS.INCOMPLETE
      : ARENA_RELEASE_READINESS_STATUS.READY;
  const result = cloneFrozenData({
    schemaVersion: ARENA_RELEASE_READINESS_REPORT_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    candidateHash: bundle.getContentHash(),
    commit: bundle.commit,
    buildId: bundle.buildId,
    sourceDirty: bundle.sourceDirty,
    status,
    freezeEligible: status === ARENA_RELEASE_READINESS_STATUS.READY,
    gateCount: gates.length,
    readyGateCount: gates.filter(({ status: gateStatus }) => (
      gateStatus === ARENA_RELEASE_EVIDENCE_STATUS.READY
    )).length,
    verifiedEvidenceCount: verifiedGateIds.size,
    missingGateIds,
    failedGateIds,
    incompleteGateIds,
    failureReasons,
    gates,
  }, 'ArenaReleaseReadinessReport');
  return cloneFrozenData({
    ...result,
    resultHash: createDeterministicDataHash(result, 'ArenaReleaseReadinessReport result'),
  }, 'ArenaReleaseReadinessReport with hash');
}
