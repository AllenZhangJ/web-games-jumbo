import { CharacterRegistry } from '@number-strategy-jump/arena-definitions';
import { createMatchContentSelection } from '../content/match-content-selection.js';
import { STAGE4_EQUIPMENT_DEFINITIONS } from '../content/stage4-equipment.js';
import { createMapDefinition } from '@number-strategy-jump/arena-definitions';
import { MAP_EVENT_KIND } from '../map/map-event-types.js';
import { MapRegistry } from '@number-strategy-jump/arena-definitions';
import {
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

function requireRegistry(value, name) {
  if (!value || typeof value.require !== 'function' || typeof value.list !== 'function') {
    throw new TypeError(`${name} 必须实现 require() 和 list()。`);
  }
  return value;
}

function projectEquipmentWave(event, equipmentDefinitionIds, mapId) {
  if (event.kind !== MAP_EVENT_KIND.EQUIPMENT_WAVE) return event;
  const allowed = new Set(equipmentDefinitionIds);
  const waveEquipmentDefinitionIds = cloneFrozenData(
    event.parameters?.equipmentDefinitionIds,
    `MapDefinition ${mapId} event ${event.id} equipmentDefinitionIds`,
  );
  if (!Array.isArray(waveEquipmentDefinitionIds)) {
    throw new TypeError(
      `MapDefinition ${mapId} event ${event.id} equipmentDefinitionIds 必须是数组。`,
    );
  }
  waveEquipmentDefinitionIds.forEach((definitionId, index) => assertNonEmptyString(
    definitionId,
    `MapDefinition ${mapId} event ${event.id} equipmentDefinitionIds[${index}]`,
  ));
  if (new Set(waveEquipmentDefinitionIds).size !== waveEquipmentDefinitionIds.length) {
    throw new RangeError(
      `MapDefinition ${mapId} event ${event.id} equipmentDefinitionIds 不能包含重复项。`,
    );
  }
  const projectedIds = waveEquipmentDefinitionIds.filter((id) => allowed.has(id));
  if (projectedIds.length === 0) {
    throw new RangeError(
      `MapDefinition ${mapId} 的装备波 ${event.id} 与本局装备池没有交集。`,
    );
  }
  return {
    ...event,
    parameters: {
      ...event.parameters,
      equipmentDefinitionIds: projectedIds,
    },
  };
}

function projectMapDefinitionForEquipmentPool(
  definitionValue,
  equipmentDefinitionIds,
) {
  const definition = createMapDefinition(definitionValue);
  return createMapDefinition({
    ...definition.toJSON(),
    events: definition.events.map((event) => (
      projectEquipmentWave(event, equipmentDefinitionIds, definition.id)
    )),
  });
}

export function createArenaV1SelectedAuthorityRegistries({
  selection: selectionValue,
  mapRegistry: mapRegistryValue,
  characterRegistry: characterRegistryValue,
}) {
  const selection = createMatchContentSelection(selectionValue);
  const mapRegistry = requireRegistry(mapRegistryValue, 'Arena V1 full mapRegistry');
  const characterRegistry = requireRegistry(
    characterRegistryValue,
    'Arena V1 full characterRegistry',
  );
  const knownEquipmentIds = new Set(STAGE4_EQUIPMENT_DEFINITIONS.map(({ id }) => id));
  for (const id of selection.equipmentDefinitionIds) {
    if (!knownEquipmentIds.has(id)) {
      throw new RangeError(`MatchContentSelection 引用未知 EquipmentDefinition ${id}。`);
    }
  }
  const maps = selection.mapDefinitionIds.map((id) => (
    projectMapDefinitionForEquipmentPool(
      mapRegistry.require(id),
      selection.equipmentDefinitionIds,
    )
  ));
  const characters = selection.characterDefinitionIds.map((id) => characterRegistry.require(id));
  return Object.freeze({
    selection,
    mapRegistry: new MapRegistry(maps),
    characterRegistry: new CharacterRegistry(characters),
  });
}
