import { createArenaV1MapRegistry } from '../content/arena-v1-maps.js';
import { createArenaV1CharacterRegistry } from '../content/arena-v1-characters.js';
import { createCharacterRegistrySnapshot } from '../character/character-registry.js';
import { createStage4ContentRegistries } from '../content/stage4-equipment.js';
import { STAGE6_MOVEMENT_ACTION_DEFINITIONS } from '../content/stage6-movement-actions.js';
import { assertKnownKeys } from '../rules/definition-utils.js';

const REQUIRED_REGISTRY_METHODS = Object.freeze(['require', 'list']);
const CONTENT_KEYS = new Set([
  'actionRegistry',
  'equipmentRegistry',
  'mapRegistry',
  'characterRegistry',
]);

function assertRegistry(registry, name) {
  if (!registry || typeof registry !== 'object') throw new TypeError(`${name} 必须是 Registry。`);
  for (const method of REQUIRED_REGISTRY_METHODS) {
    if (typeof registry[method] !== 'function') throw new TypeError(`${name} 缺少 ${method}()。`);
  }
  return registry;
}

export function assertArenaV1AuthorityContent(content) {
  if (!content || typeof content !== 'object') {
    throw new TypeError('Arena V1 authority content 必须是对象。');
  }
  assertKnownKeys(content, CONTENT_KEYS, 'Arena V1 authority content');
  assertRegistry(content.actionRegistry, 'authorityContent.actionRegistry');
  assertRegistry(content.equipmentRegistry, 'authorityContent.equipmentRegistry');
  assertRegistry(content.mapRegistry, 'authorityContent.mapRegistry');
  assertRegistry(content.characterRegistry, 'authorityContent.characterRegistry');
  return content;
}

export function createArenaV1AuthorityContent(config, {
  mapRegistry = createArenaV1MapRegistry(),
  characterRegistry = createArenaV1CharacterRegistry(),
} = {}) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('createArenaV1AuthorityContent 需要已验证 match config。');
  }
  const { actionRegistry, equipmentRegistry } = createStage4ContentRegistries({
    basePush: config.basePush,
    additionalActionDefinitions: STAGE6_MOVEMENT_ACTION_DEFINITIONS,
    equipmentDefinitionIds: config.contentSelection?.equipmentDefinitionIds ?? null,
  });
  assertRegistry(mapRegistry, 'Arena V1 mapRegistry');
  const characterRegistrySnapshot = createCharacterRegistrySnapshot(characterRegistry);
  return Object.freeze({
    actionRegistry,
    equipmentRegistry,
    mapRegistry,
    characterRegistry: characterRegistrySnapshot,
  });
}
