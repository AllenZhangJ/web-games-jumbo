import {
  EQUIPMENT_LOCATION_STATE,
  createEquipmentRuntimeSnapshot,
  createEquipmentRuntimeState,
  type EquipmentRegistryContract,
  type EquipmentRuntimeSnapshot,
  type EquipmentRuntimeState,
} from './equipment-runtime.js';

function compareIds(left: EquipmentRuntimeSnapshot, right: EquipmentRuntimeSnapshot): number {
  if (left.instanceId < right.instanceId) return -1;
  if (left.instanceId > right.instanceId) return 1;
  return 0;
}

export function serializeEquipmentRuntimeStates(states: unknown): readonly EquipmentRuntimeSnapshot[] {
  if (!Array.isArray(states)) throw new TypeError('EquipmentSerializer states 必须是数组。');
  const snapshots = states.map(createEquipmentRuntimeSnapshot).sort(compareIds);
  if (new Set(snapshots.map(({ instanceId }) => instanceId)).size !== snapshots.length) {
    throw new RangeError('EquipmentSerializer 不能序列化重复 instanceId。');
  }
  return Object.freeze(snapshots);
}

export function deserializeEquipmentRuntimeState(
  snapshot: unknown,
  { equipmentRegistry }: { readonly equipmentRegistry: EquipmentRegistryContract },
): EquipmentRuntimeState {
  const validated = createEquipmentRuntimeSnapshot(snapshot);
  const state = createEquipmentRuntimeState({
    instanceId: validated.instanceId,
    definitionId: validated.definitionId,
    spawnId: validated.spawnId,
    position: validated.originPosition,
    equipmentRegistry,
  });
  state.locationState = validated.locationState;
  state.ownerId = validated.ownerId;
  state.position = validated.position ? { ...validated.position } : null;
  state.lastSafePosition = validated.lastSafePosition
    ? { ...validated.lastSafePosition }
    : null;
  state.cooldownRemainingTicks = validated.cooldownRemainingTicks;
  state.revision = validated.revision;
  if (state.locationState === EQUIPMENT_LOCATION_STATE.SPAWNED) {
    if (!validated.position) throw new Error('spawned EquipmentRuntime 缺少已验证 position。');
    state.position = { ...validated.position };
  }
  createEquipmentRuntimeSnapshot(state);
  return state;
}
