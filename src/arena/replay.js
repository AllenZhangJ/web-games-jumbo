import {
  createReplayMatch,
} from '@number-strategy-jump/arena-match';
import { createArenaV1MatchCore } from './arena-v1-match-core.js';

export {
  ARENA_REPLAY_ERROR_CODE,
  ARENA_REPLAY_SCHEMA_VERSION,
  ArenaReplayCompatibilityError,
  HEADLESS_MATCH_RUNNER_DEFAULTS,
  HeadlessMatchRunner,
} from '@number-strategy-jump/arena-match';

export const replayMatch = createReplayMatch(createArenaV1MatchCore);
