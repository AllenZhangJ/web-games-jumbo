import { QuickMatchService as StrictQuickMatchService } from '@number-strategy-jump/arena-quick-match';
import type { QuickMatchServiceOptions } from '@number-strategy-jump/arena-quick-match';
import { createArenaV1MatchCore } from './arena-v1-match-core.js';

const ARENA_V1_QUICK_MATCH_DEFAULTS = Object.freeze({
  coreFactory: createArenaV1MatchCore,
});

export class ArenaV1QuickMatchService extends StrictQuickMatchService {
  constructor(options?: unknown) {
    super(options as QuickMatchServiceOptions | undefined, ARENA_V1_QUICK_MATCH_DEFAULTS);
  }
}

export { ArenaV1QuickMatchService as QuickMatchService };
