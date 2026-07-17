import { createDeterministicDataHash } from '../../shared/deterministic-data-hash.js';
import { ARENA_PHYSICS } from '../config.js';
import { createArenaV1MapRegistry } from '../content/arena-v1-maps.js';
import { createDefaultMapCommandRegistry } from '../map/default-map-command-handlers.js';
import {
  createDefaultMapEventStrategyRegistry,
  validateDefaultMapSafety,
} from '../map/default-map-event-handlers.js';
import {
  STATIC_MAP_ID_PREFIX,
  createStaticMapDefinition,
} from '../map/map-definition.js';
import { ArenaMapSystem } from '../map/map-system.js';
import { validateWalkableMapTopology } from '../map/map-topology-validator.js';
import {
  assertArenaV1AuthorityContent,
  createArenaV1AuthorityContent,
} from './arena-v1-authority-content.js';

export const ARENA_V1_MAP_RULESET_VERSION = 'arena-v1-map-ruleset-v1';

export function resolveArenaV1MapDefinition(config, mapRegistry = createArenaV1MapRegistry()) {
  if (!config || typeof config !== 'object') throw new TypeError('resolveArenaV1MapDefinition 需要 config。');
  if (config.mapDefinitionId.startsWith(STATIC_MAP_ID_PREFIX)) {
    const definition = createStaticMapDefinition(config.arena);
    if (definition.id !== config.mapDefinitionId) {
      throw new RangeError('custom static mapDefinitionId 与 arena 内容不一致。');
    }
    return definition;
  }
  if (!mapRegistry || typeof mapRegistry.require !== 'function') {
    throw new TypeError('resolveArenaV1MapDefinition 需要 MapRegistry。');
  }
  const definition = mapRegistry.require(config.mapDefinitionId);
  if (
    createDeterministicDataHash(config.arena, 'configured map arena')
    !== createDeterministicDataHash(definition.arena, 'registered map arena')
  ) throw new RangeError(`MapDefinition ${definition.id} 与 config.arena 不一致。`);
  return definition;
}

export function createArenaV1MapSystem({
  config,
  matchSeed,
  equipmentDefinitionCatalog = null,
  authorityContent = null,
}) {
  const content = authorityContent
    ? assertArenaV1AuthorityContent(authorityContent)
    : createArenaV1AuthorityContent(config);
  const mapDefinition = resolveArenaV1MapDefinition(config, content.mapRegistry);
  const equipmentRegistry = equipmentDefinitionCatalog ?? content.equipmentRegistry;
  if (!equipmentRegistry || typeof equipmentRegistry.require !== 'function') {
    throw new TypeError('createArenaV1MapSystem 需要 EquipmentDefinition catalog。');
  }
  const strategyRegistry = createDefaultMapEventStrategyRegistry();
  validateDefaultMapSafety(mapDefinition);
  validateWalkableMapTopology(mapDefinition, {
    characterRadius: config.character.radius,
    maximumStepHeight: ARENA_PHYSICS.maxStepHeight,
  });
  return new ArenaMapSystem({
    mapDefinition,
    strategyRegistry,
    commandRegistry: createDefaultMapCommandRegistry(),
    matchSeed,
    rulesetVersion: ARENA_V1_MAP_RULESET_VERSION,
    validationContext: { equipmentRegistry },
  });
}
