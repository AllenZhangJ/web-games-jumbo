import {
  createEquipmentRuntimeSnapshot,
  createEquipmentRuntimeState,
} from './equipment-runtime.js';
import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';

const SPAWN_KEYS = new Set(['instanceId', 'definitionId', 'spawnId', 'position']);

export class EquipmentSpawner {
  #equipmentRegistry;

  constructor({ equipmentRegistry }) {
    if (!equipmentRegistry || typeof equipmentRegistry.require !== 'function') {
      throw new TypeError('EquipmentSpawner 需要只读 EquipmentRegistry。');
    }
    this.#equipmentRegistry = equipmentRegistry;
    Object.freeze(this);
  }

  createRuntime(options) {
    assertKnownKeys(options, SPAWN_KEYS, 'EquipmentSpawn options');
    return createEquipmentRuntimeState({
      instanceId: options.instanceId,
      definitionId: options.definitionId,
      spawnId: options.spawnId,
      position: options.position,
      equipmentRegistry: this.#equipmentRegistry,
    });
  }

  preview(options) {
    return createEquipmentRuntimeSnapshot(this.createRuntime(options));
  }
}
