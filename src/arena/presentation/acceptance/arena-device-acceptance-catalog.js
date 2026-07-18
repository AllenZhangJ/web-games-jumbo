import {
  ARENA_STAGE6_DEVICE_ACCEPTANCE_V1_ID,
  createArenaStage6DeviceAcceptanceV1Definition,
} from './arena-stage6-device-acceptance-v1.js';
import {
  ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID,
  createArenaStage8ProductDeviceAcceptanceV1Definition,
} from './arena-stage8-product-device-acceptance-v1.js';

export const ARENA_DEFAULT_DEVICE_ACCEPTANCE_DEFINITION_ID =
  ARENA_STAGE6_DEVICE_ACCEPTANCE_V1_ID;

const IDS = Object.freeze([
  ARENA_STAGE6_DEVICE_ACCEPTANCE_V1_ID,
  ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID,
]);

export function listArenaDeviceAcceptanceDefinitionIds() {
  return IDS;
}

export function createArenaDeviceAcceptanceDefinitionById(id) {
  if (id === ARENA_STAGE6_DEVICE_ACCEPTANCE_V1_ID) {
    return createArenaStage6DeviceAcceptanceV1Definition();
  }
  if (id === ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID) {
    return createArenaStage8ProductDeviceAcceptanceV1Definition();
  }
  throw new RangeError(`未知 Arena 设备验收 Definition：${String(id)}。`);
}
