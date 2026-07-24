import { createArenaV1MapRegistry } from '@number-strategy-jump/arena-v1-content';
import { createArenaV1CharacterRegistry } from '@number-strategy-jump/arena-v1-content';
import {
  ActionRegistry,
  CharacterRegistry,
  EquipmentRegistry,
  MapRegistry,
  createCharacterRegistrySnapshot,
  type ActionDefinition,
  type CharacterDefinition,
  type EquipmentDefinition,
  type MapDefinition,
} from '@number-strategy-jump/arena-definitions';
import { createStage4ContentRegistries } from '@number-strategy-jump/arena-v1-content';
import { STAGE6_MOVEMENT_ACTION_DEFINITIONS } from '@number-strategy-jump/arena-v1-content';
import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import type { ArenaMatchConfig } from '@number-strategy-jump/arena-match';

const CONTENT_KEYS = new Set([
  'actionRegistry',
  'equipmentRegistry',
  'mapRegistry',
  'characterRegistry',
]);

export interface ArenaV1AuthorityContent {
  readonly actionRegistry: ReadonlyRegistry<ActionDefinition>;
  readonly equipmentRegistry: ReadonlyRegistry<EquipmentDefinition>;
  readonly mapRegistry: ReadonlyRegistry<MapDefinition>;
  readonly characterRegistry: ReadonlyRegistry<CharacterDefinition>;
}

interface ReadonlyRegistry<T> {
  require(id: string): T;
  list(): readonly T[];
}

function dataMethod(
  value: unknown,
  methodName: string,
  name: string,
): (...args: never[]) => unknown {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是 Registry。`);
  const visited = new Set<object>();
  let current: object | null = value;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, methodName);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as (...args: never[]) => unknown;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${name} 缺少 ${methodName}()。`);
}

function snapshotRegistryValues<T>(registry: unknown, name: string): readonly T[] {
  if (!registry || typeof registry !== 'object') throw new TypeError(`${name} 必须是 Registry。`);
  dataMethod(registry, 'require', name);
  const values = dataMethod(registry, 'list', name)();
  if (!Array.isArray(values)) throw new TypeError(`${name}.list() 必须同步返回数组。`);
  return values as readonly T[];
}

export function assertArenaV1AuthorityContent(content: unknown): ArenaV1AuthorityContent {
  if (!content || typeof content !== 'object') {
    throw new TypeError('Arena V1 authority content 必须是对象。');
  }
  assertKnownKeys(content, CONTENT_KEYS, 'Arena V1 authority content');
  const actionRegistry = new ActionRegistry(snapshotRegistryValues<ActionDefinition>(
    content.actionRegistry,
    'authorityContent.actionRegistry',
  ));
  const equipmentRegistry = new EquipmentRegistry({
    definitions: snapshotRegistryValues<EquipmentDefinition>(
      content.equipmentRegistry,
      'authorityContent.equipmentRegistry',
    ),
    actionRegistry,
  });
  const mapRegistry = new MapRegistry(snapshotRegistryValues<MapDefinition>(
    content.mapRegistry,
    'authorityContent.mapRegistry',
  ));
  const characterRegistry = new CharacterRegistry(snapshotRegistryValues<CharacterDefinition>(
    content.characterRegistry,
    'authorityContent.characterRegistry',
  ));
  return Object.freeze({ actionRegistry, equipmentRegistry, mapRegistry, characterRegistry });
}

export function createArenaV1AuthorityContent(config: ArenaMatchConfig, {
  mapRegistry = createArenaV1MapRegistry(),
  characterRegistry = createArenaV1CharacterRegistry(),
}: Readonly<{
  mapRegistry?: ReadonlyRegistry<MapDefinition>;
  characterRegistry?: ReadonlyRegistry<CharacterDefinition>;
}> = {}): ArenaV1AuthorityContent {
  if (!config || typeof config !== 'object') {
    throw new TypeError('createArenaV1AuthorityContent 需要已验证 match config。');
  }
  const { actionRegistry, equipmentRegistry } = createStage4ContentRegistries({
    basePush: config.basePush,
    additionalActionDefinitions: STAGE6_MOVEMENT_ACTION_DEFINITIONS,
    equipmentDefinitionIds: config.contentSelection?.equipmentDefinitionIds ?? null,
  });
  const safeMapRegistry = new MapRegistry(snapshotRegistryValues<MapDefinition>(
    mapRegistry,
    'Arena V1 mapRegistry',
  ));
  const characterRegistrySnapshot = createCharacterRegistrySnapshot(characterRegistry);
  return Object.freeze({
    actionRegistry,
    equipmentRegistry,
    mapRegistry: safeMapRegistry,
    characterRegistry: characterRegistrySnapshot,
  });
}
