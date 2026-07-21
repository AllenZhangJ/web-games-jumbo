import {
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { assertEvidenceGitCommit } from '../arena/evidence/evidence-value-contract.js';
import {
  ARENA_RELEASE_EVIDENCE_STATUS,
  createArenaReleaseEvidenceStatement,
} from './release-evidence-statement.js';
import { createArenaReleaseCandidateBundle } from './release-candidate-bundle.js';
import { createArenaReleaseReadinessDefinition } from './release-readiness-definition.js';

const RESULT_KEYS = new Set(['commit', 'buildId', 'status', 'resultHash']);
const RESULT_HASH_PATTERN = /^(?:[0-9a-f]{8}|[0-9a-f]{64})$/;

export function verifyArenaReleaseEvidenceProducerResult({
  definition: definitionValue,
  bundle: bundleValue,
  statement: statementValue,
  result: resultValue,
}) {
  const definition = createArenaReleaseReadinessDefinition(definitionValue);
  const bundle = createArenaReleaseCandidateBundle(definition, bundleValue);
  const statement = createArenaReleaseEvidenceStatement(definition, statementValue);
  const registered = bundle.evidence.find(({ gateId }) => gateId === statement.gateId);
  if (!registered || registered.getContentHash() !== statement.getContentHash()) {
    throw new RangeError(`Release evidence ${statement.gateId} 不属于当前候选。`);
  }
  const result = cloneFrozenData(resultValue, `Release producer result ${statement.gateId}`);
  assertKnownKeys(result, RESULT_KEYS, `Release producer result ${statement.gateId}`);
  assertEvidenceGitCommit(result.commit, `Release producer ${statement.gateId}.commit`);
  if (result.buildId !== null && (typeof result.buildId !== 'string' || result.buildId.length === 0)) {
    throw new TypeError(`Release producer ${statement.gateId}.buildId 必须是 null 或非空字符串。`);
  }
  if (!Object.values(ARENA_RELEASE_EVIDENCE_STATUS).includes(result.status)) {
    throw new RangeError(`Release producer ${statement.gateId}.status 不受支持。`);
  }
  if (typeof result.resultHash !== 'string' || !RESULT_HASH_PATTERN.test(result.resultHash)) {
    throw new TypeError(`Release producer ${statement.gateId}.resultHash 格式无效。`);
  }
  for (const [field, declared, actual] of [
    ['commit', statement.commit, result.commit],
    ['buildId', statement.buildId, result.buildId],
    ['status', statement.status, result.status],
    ['resultHash', statement.resultHash, result.resultHash],
  ]) {
    if (declared !== actual) {
      throw new RangeError(
        `Release evidence ${statement.gateId}.${field} 与 producer 复算结果不一致。`,
      );
    }
  }
  return Object.freeze({
    gateId: statement.gateId,
    producerId: statement.producerId,
    evidenceHash: statement.getContentHash(),
    resultHash: statement.resultHash,
  });
}
