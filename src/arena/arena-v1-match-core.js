import { createArenaV1RuleEngine } from './composition/arena-v1-rule-engine.js';
import { STAGE4_INITIAL_EQUIPMENT_SPAWNS } from './content/stage4-equipment.js';
import { MatchCore } from './match-core.js';
import {
  assertKnownKeys,
  cloneFrozenData,
} from './rules/definition-utils.js';

const MATCH_CORE_OPTION_KEYS = new Set([
  'seed',
  'config',
  'physicsFactory',
  'ruleEngineFactory',
]);

export function createArenaV1MatchCore(options = {}) {
  assertKnownKeys(options, MATCH_CORE_OPTION_KEYS, 'createArenaV1MatchCore options');
  const descriptors = Object.getOwnPropertyDescriptors(options);
  const config = cloneFrozenData(descriptors.config?.value ?? {}, 'createArenaV1MatchCore config');
  const hasCustomArena = Object.prototype.hasOwnProperty.call(config, 'arena');
  const equipment = Object.prototype.hasOwnProperty.call(config, 'equipment')
    ? config.equipment
    : { initialSpawns: hasCustomArena ? [] : STAGE4_INITIAL_EQUIPMENT_SPAWNS };
  return new MatchCore({
    seed: descriptors.seed?.value,
    physicsFactory: descriptors.physicsFactory?.value,
    config: {
      ...config,
      equipment,
    },
    ruleEngineFactory: descriptors.ruleEngineFactory?.value ?? createArenaV1RuleEngine,
  });
}
