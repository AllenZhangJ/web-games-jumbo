import { createArenaV1RuleEngine } from './composition/arena-v1-rule-engine.js';
import { createArenaV1MapSystem } from './composition/arena-v1-map-system.js';
import { createArenaV1AuthorityContent } from './composition/arena-v1-authority-content.js';
import { STAGE4_INITIAL_EQUIPMENT_SPAWNS } from './content/stage4-equipment.js';
import { createArenaV1CharacterRegistry } from './content/arena-v1-characters.js';
import { createArenaV1MapRegistry } from './content/arena-v1-maps.js';
import { STAGE5_MAP_ID } from './content/stage5-map.js';
import {
  STATIC_MAP_ID_PREFIX,
  createStaticMapDefinition,
} from './map/map-definition.js';
import { MatchCore } from './match-core.js';
import { createArenaMatchConfig } from './config.js';
import {
  assertKnownKeys,
  cloneFrozenData,
} from './rules/definition-utils.js';

const MATCH_CORE_OPTION_KEYS = new Set([
  'seed',
  'config',
  'physicsFactory',
  'ruleEngineFactory',
  'mapSystemFactory',
  'characterRegistry',
]);

function resolveArenaV1Config(configValue = {}, mapRegistry = createArenaV1MapRegistry()) {
  const config = cloneFrozenData(configValue, 'Arena V1 config');
  const hasCustomArena = Object.prototype.hasOwnProperty.call(config, 'arena');
  const requestedMapDefinitionId = config.mapDefinitionId;
  let arena;
  let mapDefinitionId;
  if (hasCustomArena) {
    arena = config.arena;
    mapDefinitionId = requestedMapDefinitionId ?? createStaticMapDefinition(arena).id;
  } else {
    mapDefinitionId = requestedMapDefinitionId ?? STAGE5_MAP_ID;
    if (mapDefinitionId.startsWith(STATIC_MAP_ID_PREFIX)) {
      throw new RangeError(`MapDefinition ${mapDefinitionId} 需要显式 arena 内容。`);
    }
    arena = mapRegistry.require(mapDefinitionId).arena;
  }
  const equipment = Object.prototype.hasOwnProperty.call(config, 'equipment')
    ? config.equipment
    : { initialSpawns: hasCustomArena ? [] : STAGE4_INITIAL_EQUIPMENT_SPAWNS };
  return {
    ...config,
    arena,
    mapDefinitionId,
    equipment,
  };
}

export function createArenaV1MatchConfig(config = {}) {
  return createArenaMatchConfig(resolveArenaV1Config(config));
}

export function createArenaV1MatchCore(options = {}) {
  assertKnownKeys(options, MATCH_CORE_OPTION_KEYS, 'createArenaV1MatchCore options');
  const descriptors = Object.getOwnPropertyDescriptors(options);
  const mapRegistry = createArenaV1MapRegistry();
  const characterRegistry = descriptors.characterRegistry?.value
    ?? createArenaV1CharacterRegistry();
  const configOverrides = resolveArenaV1Config(
    descriptors.config?.value ?? {},
    mapRegistry,
  );
  const authorityContent = createArenaV1AuthorityContent(
    createArenaMatchConfig(configOverrides),
    { mapRegistry, characterRegistry },
  );
  const ruleEngineFactory = descriptors.ruleEngineFactory?.value ?? ((context) => (
    createArenaV1RuleEngine({ ...context, authorityContent })
  ));
  const mapSystemFactory = descriptors.mapSystemFactory?.value ?? ((context) => (
    createArenaV1MapSystem({ ...context, authorityContent })
  ));
  return new MatchCore({
    seed: descriptors.seed?.value,
    physicsFactory: descriptors.physicsFactory?.value,
    config: configOverrides,
    ruleEngineFactory,
    mapSystemFactory,
    characterRegistry: authorityContent.characterRegistry,
  });
}
