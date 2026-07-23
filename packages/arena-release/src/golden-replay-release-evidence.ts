import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { assertEvidenceGitCommit } from '@number-strategy-jump/arena-evidence-contracts';
import { ARENA_REPLAY_SCHEMA_VERSION } from '@number-strategy-jump/arena-match';
import {
  ARENA_GOLDEN_REPLAY_VERIFICATION_SCHEMA_VERSION,
  ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID,
  createArenaV1GoldenReplayScenarioRegistry,
} from '@number-strategy-jump/arena-regression';
import { ARENA_RELEASE_EVIDENCE_STATUS } from '@number-strategy-jump/arena-release-contracts';

const VERIFICATION_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion', 'manifestId', 'manifestHash', 'replaySchemaVersion', 'mode',
  'verifiedEntryCount', 'rejectedReplaySchemaVersions', 'entries',
]);

export function createArenaGoldenReplayReleaseResult(options: unknown) {
  assertKnownKeys(options, new Set(['commit', 'verification']), 'Golden replay release result options');
  const commit = assertEvidenceGitCommit(options.commit, 'Golden replay release result.commit');
  const verification = cloneFrozenData(options.verification, 'Golden replay release verification');
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
    || verification.entries.some((entry, index) => {
      if (!entry || typeof entry !== 'object') return true;
      return (entry as Record<string, unknown>).id !== scenarios[index]?.id;
    })
  ) throw new Error('Golden replay release verification 未覆盖当前严格语料。');
  const summary = cloneFrozenData({ producerId: 'arena:replay:verify', commit, verification }, 'Golden replay release summary');
  return cloneFrozenData({
    commit,
    buildId: null,
    status: ARENA_RELEASE_EVIDENCE_STATUS.READY,
    resultHash: createDeterministicDataHash(summary, 'Release producer arena:replay:verify'),
  }, 'Golden replay release result');
}
