import { ARENA_FIXED_DT } from '@number-strategy-jump/arena-match';
import { SequentialMatchSeedSource } from '@number-strategy-jump/arena-matchmaking';
import { createArenaV1ProductSession } from '../../product/composition/arena-v1-product-composition.js';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_INPUT_MAPPER_ID,
  createArenaInputMapper,
  InputSampler,
  PointerInputAdapter,
} from '@number-strategy-jump/arena-presentation-runtime';
import { PresentationPerformanceProbe } from '@number-strategy-jump/arena-presentation-runtime';
import {
  ProductInputRouter,
  ProductPresentationFlow,
  ProductPresentationSession,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
  ARENA_V1_PRODUCT_PRESENTATION_CONTENT,
  projectArenaPresentationFrame,
} from '@number-strategy-jump/arena-v1-presentation-content';
import {
  ARENA_V1_DEFAULT_PRESENTATION_QUALITY,
  FixedTickAccumulator,
  PresentationFrameLoop,
  PresentationRenderPacer,
  createPresentationQualityDefinition,
} from '@number-strategy-jump/arena-presentation-runtime';

const OPTION_KEYS = new Set([
  'mapperId',
  'seedSource',
  'initialSeed',
  'ownerId',
  'profileLeaseHolderId',
  'keyPrefix',
  'matchConfig',
  'matchCompletionSink',
  'maximumCatchUpTicks',
  'profileLeaseHeartbeatIntervalMs',
  'profileLeaseTakeoverSameOwner',
  'qualityDefinition',
  'rendererFactory',
  'controllerFactory',
  'flowFactory',
  'mapperFactory',
  'samplerFactory',
  'inputRouterFactory',
  'inputAdapterFactory',
  'frameLoopFactory',
  'accumulatorFactory',
  'renderPacerFactory',
  'performanceProbeFactory',
  'performanceMemoryProvider',
  'onDiagnostic',
]);

let ownerSequence = 0;

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function optionsValue(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ProductPresentationSession options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('ProductPresentationSession options 必须是普通对象。');
  }
  const result = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!OPTION_KEYS.has(key)) {
      throw new RangeError(`ProductPresentationSession 不支持 option ${key}。`);
    }
    if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new TypeError(`ProductPresentationSession option ${key} 不能是访问器。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function validatePlatform(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductPresentationSession platform 无效。');
  }
  for (const method of [
    'createCanvas',
    'getViewport',
    'requestFrame',
    'cancelFrame',
    'now',
    'wallNow',
    'bindInput',
    'onResize',
    'onShow',
    'onHide',
    'storageRead',
    'storageWrite',
    'storageDelete',
  ]) requiredFunction(value[method], `ProductPresentationSession platform.${method}`);
  return value;
}

function uint32(value, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value;
}

function integerInRange(value, minimum, maximum, name) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} 必须是 ${minimum}～${maximum} 的安全整数。`);
  }
  return value;
}

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function hashString(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function defaultInitialSeed(platform) {
  let now = 0;
  let viewport = {};
  try { now = platform.now(); } catch { now = 0; }
  try { viewport = platform.getViewport() ?? {}; } catch { viewport = {}; }
  const time = Number.isFinite(now) ? Math.floor(Math.abs(now)) >>> 0 : 0;
  const width = Number.isFinite(viewport.width) ? Math.floor(viewport.width) >>> 0 : 0;
  const height = Number.isFinite(viewport.height) ? Math.floor(viewport.height) >>> 0 : 0;
  return (
    hashString(platform.id ?? 'arena-product')
    ^ Math.imul(time, 0x9e3779b1)
    ^ Math.imul(width, 0x85ebca6b)
    ^ Math.imul(height, 0xc2b2ae35)
  ) >>> 0;
}

function nextOwnerId(platform) {
  ownerSequence = ownerSequence >= Number.MAX_SAFE_INTEGER ? 1 : ownerSequence + 1;
  return `arena-product:${platform.id ?? 'unknown'}:${ownerSequence}`;
}

export function createProductPresentationSessionComposition(platformValue, optionsInput) {
  const platform = validatePlatform(platformValue);
  const options = optionsValue(optionsInput);
  const mapperId = options.mapperId ?? ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP;
  if (!Object.values(ARENA_INPUT_MAPPER_ID).includes(mapperId)) {
    throw new RangeError(`未知 Product Presentation mapperId ${String(mapperId)}。`);
  }
  const maximumCatchUpTicks = options.maximumCatchUpTicks ?? 8;
  if (
    !Number.isSafeInteger(maximumCatchUpTicks)
    || maximumCatchUpTicks < 1
    || maximumCatchUpTicks > 30
  ) throw new RangeError('maximumCatchUpTicks 必须是 1～30 的安全整数。');
  const profileLeaseHeartbeatIntervalMs = integerInRange(
    options.profileLeaseHeartbeatIntervalMs ?? 20_000,
    1_000,
    30_000,
    'profileLeaseHeartbeatIntervalMs',
  );
  const profileLeaseTakeoverSameOwner = options.profileLeaseTakeoverSameOwner ?? false;
  if (typeof profileLeaseTakeoverSameOwner !== 'boolean') {
    throw new TypeError('profileLeaseTakeoverSameOwner 必须是布尔值。');
  }
  if (options.rendererFactory === undefined) {
    throw new TypeError('ProductPresentationSession 当前需要显式 rendererFactory。');
  }
  const onDiagnostic = options.onDiagnostic ?? (() => {});
  requiredFunction(onDiagnostic, 'ProductPresentationSession.onDiagnostic');
  const performanceMemoryProvider = options.performanceMemoryProvider ?? (() => null);
  requiredFunction(
    performanceMemoryProvider,
    'ProductPresentationSession.performanceMemoryProvider',
  );
  if (options.seedSource !== undefined && options.initialSeed !== undefined) {
    throw new RangeError('seedSource 与 initialSeed 不能同时配置。');
  }
  const seedSource = options.seedSource ?? new SequentialMatchSeedSource(
    options.initialSeed === undefined
      ? defaultInitialSeed(platform)
      : uint32(options.initialSeed, 'initialSeed'),
  );
  if (!seedSource || typeof seedSource.nextSeed !== 'function') {
    throw new TypeError('ProductPresentationSession seedSource 必须实现 nextSeed()。');
  }
  const matchConfig = options.matchConfig === undefined
    ? Object.freeze({})
    : cloneFrozenData(options.matchConfig, 'ProductPresentationSession matchConfig');
  const matchCompletionSink = options.matchCompletionSink ?? null;
  if (matchCompletionSink !== null) {
    requiredFunction(
      matchCompletionSink,
      'ProductPresentationSession.matchCompletionSink',
    );
  }
  const qualityDefinition = createPresentationQualityDefinition(
    options.qualityDefinition ?? ARENA_V1_DEFAULT_PRESENTATION_QUALITY,
  );
  const factories = {
    rendererFactory: options.rendererFactory,
    controllerFactory: options.controllerFactory ?? createArenaV1ProductSession,
    flowFactory: options.flowFactory ?? ((args) => new ProductPresentationFlow({
      ...args,
      presentationContent: ARENA_V1_PRODUCT_PRESENTATION_CONTENT,
      matchPresentationContent: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
      frameProjector: projectArenaPresentationFrame,
    })),
    mapperFactory: options.mapperFactory ?? createArenaInputMapper,
    samplerFactory: options.samplerFactory ?? ((args) => new InputSampler(args)),
    inputRouterFactory: options.inputRouterFactory ?? ((args) => new ProductInputRouter(args)),
    inputAdapterFactory: options.inputAdapterFactory ?? ((args) => new PointerInputAdapter(args)),
    frameLoopFactory: options.frameLoopFactory ?? ((args) => new PresentationFrameLoop(args)),
    accumulatorFactory: options.accumulatorFactory ?? ((args) => new FixedTickAccumulator(args)),
    renderPacerFactory: options.renderPacerFactory
      ?? ((args) => new PresentationRenderPacer(args)),
    performanceProbeFactory: options.performanceProbeFactory
      ?? ((args) => new PresentationPerformanceProbe(args)),
  };
  for (const [name, factory] of Object.entries(factories)) {
    requiredFunction(factory, `ProductPresentationSession.${name}`);
  }
  const ownerId = options.ownerId === undefined
    ? nextOwnerId(platform)
    : nonEmptyString(options.ownerId, 'ProductPresentationSession.ownerId');
  const profileLeaseHolderId = options.profileLeaseHolderId === undefined
    ? ownerId
    : nonEmptyString(
      options.profileLeaseHolderId,
      'ProductPresentationSession.profileLeaseHolderId',
    );
  if (profileLeaseTakeoverSameOwner && profileLeaseHolderId === ownerId) {
    throw new RangeError(
      'profileLeaseTakeoverSameOwner 启用时必须提供不同于 ownerId 的唯一 profileLeaseHolderId。',
    );
  }
  return Object.freeze({
    platform,
    mapperId,
    seedSource,
    ownerId,
    profileLeaseHolderId,
    keyPrefix: options.keyPrefix === undefined
      ? 'arena.product.v1'
      : nonEmptyString(options.keyPrefix, 'ProductPresentationSession.keyPrefix'),
    matchConfig,
    matchCompletionSink,
    qualityDefinition,
    fixedDeltaSeconds: ARENA_FIXED_DT,
    maximumCatchUpTicks,
    profileLeaseHeartbeatIntervalMs,
    profileLeaseTakeoverSameOwner,
    profileLeaseRetryIntervalMs: Math.min(1_000, profileLeaseHeartbeatIntervalMs),
    performanceMemoryProvider,
    onDiagnostic,
    ...factories,
  });
}

export function createProductPresentationSession(platform, options = {}) {
  return new ProductPresentationSession(
    createProductPresentationSessionComposition(platform, options),
  );
}
