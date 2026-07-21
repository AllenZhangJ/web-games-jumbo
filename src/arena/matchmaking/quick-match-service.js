import { QuickMatchService as StrictQuickMatchService } from '@number-strategy-jump/arena-quick-match';
import { createArenaV1MatchCore } from '../arena-v1-match-core.js';

const ARENA_V1_QUICK_MATCH_DEFAULTS = Object.freeze({
  coreFactory: createArenaV1MatchCore,
});

export class QuickMatchService extends StrictQuickMatchService {
  constructor(options) {
    super(options, ARENA_V1_QUICK_MATCH_DEFAULTS);
  }
}
