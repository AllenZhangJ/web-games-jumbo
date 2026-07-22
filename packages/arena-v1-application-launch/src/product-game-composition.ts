import { createRuntimeInstanceId } from '@number-strategy-jump/arena-platform-runtime';
import type { ProductPresentationSession } from '@number-strategy-jump/arena-product-presentation';
import { createProductPresentationSession } from '@number-strategy-jump/arena-v1-application-session';
import { optionalDataField, ownDataOptions } from './capability.js';

export function createArenaProductGame(
  platform: unknown,
  options: unknown = {},
): ProductPresentationSession {
  const dataOptions = ownDataOptions(options, 'createArenaProductGame options');
  const platformIdValue = optionalDataField(platform, 'id', 'createArenaProductGame platform');
  if (
    platformIdValue !== undefined
    && (typeof platformIdValue !== 'string' || platformIdValue.trim().length === 0)
  ) throw new TypeError('createArenaProductGame platform.id 必须是非空字符串。');
  const platformId = platformIdValue ?? 'unknown';
  const storageConcurrency = optionalDataField(
    platform,
    'storageConcurrency',
    'createArenaProductGame platform',
  );
  if (
    storageConcurrency !== undefined
    && storageConcurrency !== 'single-active-runtime'
    && storageConcurrency !== 'multi-runtime'
  ) throw new RangeError('createArenaProductGame platform.storageConcurrency 无效。');
  const singleActiveRuntime = storageConcurrency === 'single-active-runtime';
  const ownsDefaultIdentity = dataOptions.ownerId === undefined;
  const runtimeInstanceId = ownsDefaultIdentity
    ? createRuntimeInstanceId(globalThis, `arena-product-${platformId}`)
    : null;
  const ownerId = dataOptions.ownerId ?? (singleActiveRuntime
    ? `arena-product-${platformId}-single-active-runtime`
    : runtimeInstanceId);
  return createProductPresentationSession(platform, {
    ...dataOptions,
    ownerId,
    profileLeaseHolderId: dataOptions.profileLeaseHolderId
      ?? (ownsDefaultIdentity ? runtimeInstanceId : ownerId),
    profileLeaseTakeoverSameOwner: dataOptions.profileLeaseTakeoverSameOwner
      ?? (singleActiveRuntime && ownsDefaultIdentity),
  });
}
