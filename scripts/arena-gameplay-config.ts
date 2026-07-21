import {
  ARENA_GAMEPLAY_V2_TUNING,
} from '@number-strategy-jump/arena-definitions';
import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';

const payload = Object.freeze({
  id: 'arena.gameplay.v2',
  hash: createDeterministicDataHash(ARENA_GAMEPLAY_V2_TUNING),
  config: ARENA_GAMEPLAY_V2_TUNING,
});

process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
