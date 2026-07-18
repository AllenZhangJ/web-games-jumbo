import { createDeterministicDataHash } from '../shared/deterministic-data-hash.js';
import {
  assertKnownKeys,
  cloneFrozenData,
} from '../arena/rules/definition-utils.js';
import { ARENA_REPLAY_SCHEMA_VERSION } from '../arena/replay.js';
import {
  ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID,
  createArenaV1GoldenReplayScenarioRegistry,
} from '../arena/regression/arena-v1-golden-replay-scenarios.js';
import {
  ARENA_GOLDEN_REPLAY_VERIFICATION_SCHEMA_VERSION,
} from '../arena/regression/golden-replay-verifier.js';
import { ARENA_RELEASE_EVIDENCE_STATUS } from './release-evidence-statement.js';

const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
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
  if (typeof commit !== 'string' || !GIT_COMMIT_PATTERN.test(commit)) {
    throw new TypeError('Golden replay release result.commit 必须是 40 位小写 Git commit。');
  }
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
