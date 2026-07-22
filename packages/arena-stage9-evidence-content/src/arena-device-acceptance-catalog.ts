import {
  ARENA_STAGE6_DEVICE_ACCEPTANCE_V1_ID,
  createArenaStage6DeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import { assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID,
  createArenaStage8ProductDeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID,
  createArenaStage9PerformanceDeviceAcceptanceV1Definition,
} from './arena-stage9-performance-device-acceptance-v1.js';

export const ARENA_DEFAULT_DEVICE_ACCEPTANCE_DEFINITION_ID =
  ARENA_STAGE6_DEVICE_ACCEPTANCE_V1_ID;

const IDS = Object.freeze([
  ARENA_STAGE6_DEVICE_ACCEPTANCE_V1_ID,
  ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID,
  ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID,
]);

export function listArenaDeviceAcceptanceDefinitionIds() {
  return IDS;
}

export function createArenaDeviceAcceptanceDefinitionById(idValue: unknown) {
  const id = assertNonEmptyString(idValue, 'Arena device acceptance definition id');
  if (id === ARENA_STAGE6_DEVICE_ACCEPTANCE_V1_ID) {
    return createArenaStage6DeviceAcceptanceV1Definition();
  }
  if (id === ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID) {
    return createArenaStage8ProductDeviceAcceptanceV1Definition();
  }
  if (id === ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID) {
    return createArenaStage9PerformanceDeviceAcceptanceV1Definition();
  }
  throw new RangeError(`未知 Arena 设备验收 Definition：${id}。`);
}
