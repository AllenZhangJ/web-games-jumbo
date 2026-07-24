import { MapRegistry } from '@number-strategy-jump/arena-definitions';
import { ARENA_GAMEPLAY_V2_MAP_DEFINITION } from './arena-gameplay-v2-map.js';
import { STAGE5_MAP_DEFINITION } from './stage5-map.js';

export const ARENA_V1_MAP_DEFINITIONS = Object.freeze([
  STAGE5_MAP_DEFINITION,
  ARENA_GAMEPLAY_V2_MAP_DEFINITION,
]);

export function createArenaV1MapRegistry() {
  return new MapRegistry(ARENA_V1_MAP_DEFINITIONS);
}
