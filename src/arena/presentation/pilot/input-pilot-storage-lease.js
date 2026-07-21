import {
  SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION,
  SynchronousStorageLease,
} from '@number-strategy-jump/arena-storage';

export const INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION = (
  SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
);

const INPUT_PILOT_STORAGE_LEASE_OPTION_KEYS = new Set([
  'storage',
  'key',
  'ownerId',
  'holderId',
  'wallNow',
  'durationMs',
  'takeoverSameOwner',
]);

/**
 * Pilot keeps its public class name and stored schema while sharing the
 * low-level synchronous storage ownership protocol with Stage 8 profiles.
 */
export class InputPilotStorageLease extends SynchronousStorageLease {
  constructor(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('InputPilotStorageLease options 必须是普通对象。');
    }
    const prototype = Object.getPrototypeOf(options);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('InputPilotStorageLease options 必须是普通对象。');
    }
    const descriptors = Object.getOwnPropertyDescriptors(options);
    const normalized = {};
    for (const key of Reflect.ownKeys(descriptors)) {
      const descriptor = descriptors[key];
      if (
        typeof key !== 'string'
        || !INPUT_PILOT_STORAGE_LEASE_OPTION_KEYS.has(key)
        || !descriptor
        || !descriptor.enumerable
        || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
      ) {
        throw new TypeError(`InputPilotStorageLease options.${String(key)} 必须是已知可枚举数据字段。`);
      }
      normalized[key] = descriptor.value;
    }
    super({ ...normalized, label: 'InputPilotStorageLease' });
  }
}
