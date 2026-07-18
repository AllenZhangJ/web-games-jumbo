import { ProductPresentationSession } from '../arena/presentation/session/product-presentation-session.js';
import { createRuntimeInstanceId } from './runtime-instance-id.js';

function readDataOptions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const result = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) return null;
    result[key] = descriptor.value;
  }
  return result;
}

export function createArenaProductGame(platform, options = {}) {
  const dataOptions = readDataOptions(options);
  if (dataOptions === null) return new ProductPresentationSession(platform, options);
  const singleActiveRuntime = platform?.storageConcurrency === 'single-active-runtime';
  const ownsDefaultIdentity = dataOptions.ownerId === undefined;
  const runtimeInstanceId = ownsDefaultIdentity
    ? createRuntimeInstanceId(
      globalThis,
      `arena-product-${platform?.id ?? 'unknown'}`,
    )
    : null;
  const ownerId = dataOptions.ownerId ?? (singleActiveRuntime
    ? `arena-product-${platform?.id ?? 'unknown'}-single-active-runtime`
    : runtimeInstanceId);
  return new ProductPresentationSession(platform, {
    ...dataOptions,
    ownerId,
    profileLeaseHolderId: dataOptions.profileLeaseHolderId
      ?? (ownsDefaultIdentity ? runtimeInstanceId : ownerId),
    profileLeaseTakeoverSameOwner: dataOptions.profileLeaseTakeoverSameOwner
      ?? (singleActiveRuntime && ownsDefaultIdentity),
  });
}
