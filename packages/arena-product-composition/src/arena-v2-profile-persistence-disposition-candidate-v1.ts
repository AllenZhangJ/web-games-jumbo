import {
  ArenaV2LearningProfileIndeterminateWriteError,
  ArenaV2LearningProfileRepositoryBusyError,
  PlayerProfileIndeterminateWriteError,
  PlayerProfileRepositoryBusyError,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ArenaV2LearningProfileServiceErrorV1,
  PlayerProfilePersistenceError,
} from '@number-strategy-jump/arena-profile-service';

export type ArenaV2ProfilePersistenceDispositionCandidateV1 =
  | 'retry'
  | 'restart'
  | 'fail-closed';

/**
 * Classifies only known Profile persistence errors. The bounded own-data
 * cause walk intentionally rejects duck-typed flags, accessors and hostile
 * wrappers so code or schema defects cannot masquerade as player recovery.
 */
export function resolveArenaV2ProfilePersistenceDispositionCandidateV1(
  error: unknown,
): ArenaV2ProfilePersistenceDispositionCandidateV1 {
  const visited = new Set<object>();
  let current: unknown = error;
  for (let depth = 0; depth < 16; depth += 1) {
    if (typeof current !== 'object' || current === null || visited.has(current)) {
      return 'fail-closed';
    }
    visited.add(current);
    try {
      if (current instanceof PlayerProfilePersistenceError
        || current instanceof ArenaV2LearningProfileServiceErrorV1) {
        if (current.restartRequired) return 'restart';
        if (current.recoverable) return 'retry';
        return 'fail-closed';
      }
      if (current instanceof PlayerProfileRepositoryBusyError
        || current instanceof ArenaV2LearningProfileRepositoryBusyError) {
        return 'retry';
      }
      if (current instanceof PlayerProfileIndeterminateWriteError
        || current instanceof ArenaV2LearningProfileIndeterminateWriteError) {
        return 'restart';
      }
      const cause = Object.getOwnPropertyDescriptor(current, 'cause');
      if (cause !== undefined) {
        if (!Object.hasOwn(cause, 'value')) return 'fail-closed';
        current = cause.value;
        continue;
      }
      const originalError = Object.getOwnPropertyDescriptor(current, 'originalError');
      if (originalError !== undefined) {
        if (!Object.hasOwn(originalError, 'value')) return 'fail-closed';
        current = originalError.value;
        continue;
      }
    } catch {
      return 'fail-closed';
    }
    return 'fail-closed';
  }
  return 'fail-closed';
}

export const ARENA_V2_PROFILE_PERSISTENCE_DISPOSITION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  dispositions: Object.freeze(['retry', 'restart', 'fail-closed'] as const),
  maximumCauseDepth: 16 as const,
  knownErrorsOnly: true as const,
  hostileInspectionFailsClosed: true as const,
  validationStatus: 'not-run' as const,
});
