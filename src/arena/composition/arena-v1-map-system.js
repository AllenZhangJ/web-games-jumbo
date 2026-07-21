import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { ARENA_PHYSICS } from '../config.js';
import { createArenaV1MapRegistry } from '../content/arena-v1-maps.js';
import {
  createDefaultMapCommandRegistry,
  createDefaultMapEventStrategyRegistry,
  ArenaMapSystem,
  validateCharacterSpawnSafety,
  validateDefaultMapSafety,
  validateWalkableMapTopology,
} from '@number-strategy-jump/arena-map';
import {
  STATIC_MAP_ID_PREFIX,
  createStaticMapDefinition,
} from '@number-strategy-jump/arena-definitions';
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
  characterDefinitionCatalog = null,
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
  const characterRegistry = characterDefinitionCatalog ?? content.characterRegistry;
  if (!characterRegistry || typeof characterRegistry.require !== 'function') {
    throw new TypeError('createArenaV1MapSystem 需要 CharacterDefinition catalog。');
  }
  if (!Array.isArray(config.participantCharacters) || config.participantCharacters.length === 0) {
    throw new RangeError('createArenaV1MapSystem 需要 participantCharacters。');
  }
  const selectedCharacters = config.participantIds.map((participantId) => {
    const assignment = config.participantCharacters.find((candidate) => (
      candidate.participantId === participantId
    ));
    if (!assignment) {
      throw new RangeError(`participant ${participantId} 没有 CharacterDefinition 分配。`);
    }
    return characterRegistry.require(assignment.definitionId);
  });
  const characterRadius = Math.max(...selectedCharacters.map(({ collision }) => collision.radius));
  const maximumStepHeight = Math.min(...selectedCharacters.map(
    ({ movement }) => movement.automaticStepHeight,
  ));
  const strategyRegistry = createDefaultMapEventStrategyRegistry();
  const permanentSafeSurfaceIds = validateDefaultMapSafety(mapDefinition);
  validateWalkableMapTopology(mapDefinition, {
    characterRadius,
    maximumStepHeight,
  });
  validateCharacterSpawnSafety(mapDefinition, {
    characterSpawns: selectedCharacters.map(({ id, collision }) => ({
      characterId: id,
      collision,
    })),
    permanentSafeSurfaceIds,
    groundProbeTolerance: ARENA_PHYSICS.groundProbeTolerance,
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
