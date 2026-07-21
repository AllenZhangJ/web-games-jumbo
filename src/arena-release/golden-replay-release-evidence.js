import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { assertEvidenceGitCommit } from '../arena/evidence/evidence-value-contract.js';
import { ARENA_REPLAY_SCHEMA_VERSION } from '../arena/replay.js';
import {
  ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID,
  createArenaV1GoldenReplayScenarioRegistry,
} from '../arena/regression/arena-v1-golden-replay-scenarios.js';
import {
  ARENA_GOLDEN_REPLAY_VERIFICATION_SCHEMA_VERSION,
} from '../arena/regression/golden-replay-verifier.js';
import { ARENA_RELEASE_EVIDENCE_STATUS } from './release-evidence-statement.js';

const VERIFICATION_KEYS = new Set([
  'schemaVersion',
  'manifestId',
  'manifestHash',
  'replaySchemaVersion',
  'mode',
  'verifiedEntryCount',
  'rejectedReplaySchemaVersions',
  'entries',
]);

export function createArenaGoldenReplayReleaseResult({ commit, verification: value }) {
  assertEvidenceGitCommit(commit, 'Golden replay release result.commit');
  const verification = cloneFrozenData(value, 'Golden replay release verification');
  assertKnownKeys(verification, VERIFICATION_KEYS, 'Golden replay release verification');
  const scenarios = createArenaV1GoldenReplayScenarioRegistry().list();
  if (
    verification.schemaVersion !== ARENA_GOLDEN_REPLAY_VERIFICATION_SCHEMA_VERSION
    || verification.manifestId !== ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID
    || verification.replaySchemaVersion !== ARENA_REPLAY_SCHEMA_VERSION
    || verification.mode !== 'current-strict-replay-and-regeneration'
    || verification.verifiedEntryCount !== scenarios.length
    || !Array.isArray(verification.entries)
    || verification.entries.length !== scenarios.length
    || verification.entries.some((entry, index) => entry.id !== scenarios[index].id)
  ) throw new Error('Golden replay release verification 未覆盖当前严格语料。');
  const summary = cloneFrozenData({
    producerId: 'arena:replay:verify',
    commit,
    verification,
  }, 'Golden replay release summary');
  return cloneFrozenData({
    commit,
    buildId: null,
    status: ARENA_RELEASE_EVIDENCE_STATUS.READY,
    resultHash: createDeterministicDataHash(summary, 'Release producer arena:replay:verify'),
  }, 'Golden replay release result');
}
