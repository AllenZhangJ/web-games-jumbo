import { createArenaV1MapRegistry } from '../content/arena-v1-maps.js';
import { createStage4ContentRegistries } from '../content/stage4-equipment.js';
import { assertKnownKeys } from '../rules/definition-utils.js';

const REQUIRED_REGISTRY_METHODS = Object.freeze(['require', 'list']);
const CONTENT_KEYS = new Set(['actionRegistry', 'equipmentRegistry', 'mapRegistry']);

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
  return content;
}

export function createArenaV1AuthorityContent(config, {
  mapRegistry = createArenaV1MapRegistry(),
} = {}) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('createArenaV1AuthorityContent 需要已验证 match config。');
  }
  const { actionRegistry, equipmentRegistry } = createStage4ContentRegistries({
    basePush: config.basePush,
  });
  assertRegistry(mapRegistry, 'Arena V1 mapRegistry');
  return Object.freeze({
    actionRegistry,
    equipmentRegistry,
    mapRegistry,
  });
}
