import {
  createEquipmentRuntimeSnapshot,
  createEquipmentRuntimeState,
  type EquipmentRegistryContract,
  type EquipmentRuntimeSnapshot,
  type EquipmentRuntimeState,
} from './equipment-runtime.js';
import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';

const SPAWN_KEYS = new Set(['instanceId', 'definitionId', 'spawnId', 'position']);

export class EquipmentSpawner {
  readonly #equipmentRegistry: EquipmentRegistryContract;

  constructor({ equipmentRegistry }: { readonly equipmentRegistry: unknown }) {
    const registry = equipmentRegistry as Partial<EquipmentRegistryContract> | null;
    if (!registry || typeof registry.require !== 'function') {
      throw new TypeError('EquipmentSpawner 需要只读 EquipmentRegistry。');
    }
    this.#equipmentRegistry = registry as EquipmentRegistryContract;
    Object.freeze(this);
  }

  createRuntime(options: unknown): EquipmentRuntimeState {
    assertKnownKeys(options, SPAWN_KEYS, 'EquipmentSpawn options');
    return createEquipmentRuntimeState({
      instanceId: options.instanceId,
      definitionId: options.definitionId,
      spawnId: options.spawnId,
      position: options.position,
      equipmentRegistry: this.#equipmentRegistry,
    });
  }

  preview(options: unknown): EquipmentRuntimeSnapshot {
    return createEquipmentRuntimeSnapshot(this.createRuntime(options));
  }
}
