import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { ARENA_FIXED_DT } from '@number-strategy-jump/arena-match';
import { SequentialMatchSeedSource } from '@number-strategy-jump/arena-matchmaking';
import {
  ARENA_INPUT_MAPPER_ID,
  ARENA_V1_DEFAULT_PRESENTATION_QUALITY,
  FixedTickAccumulator,
  InputSampler,
  PointerInputAdapter,
  PresentationFrameLoop,
  PresentationPerformanceProbe,
  PresentationRenderPacer,
  createArenaInputMapper,
  createPresentationQualityDefinition,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ProductInputRouter,
  ProductPresentationFlow,
  ProductPresentationSession,
  type ProductPresentationSessionComposition,
} from '@number-strategy-jump/arena-product-presentation';
import { createArenaV1ProductSession } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
  ARENA_V1_PRODUCT_PRESENTATION_CONTENT,
  projectArenaPresentationFrame,
} from '@number-strategy-jump/arena-v1-presentation-content';

type UnknownFunction = (...args: unknown[]) => unknown;

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

const PLATFORM_METHODS = Object.freeze([
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
]);

const OPTIONAL_PLATFORM_METHODS = Object.freeze([
  'createOffscreenCanvas',
  'getWebGLContext',
  'createImage',
  'readAssetBytes',
  'storageGet',
  'storageSet',
  'storageRemove',
  'createAudio',
  'vibrate',
  'share',
]);

interface PlatformSnapshot {
  readonly id: unknown;
  readonly createCanvas: UnknownFunction;
  readonly createOffscreenCanvas?: UnknownFunction;
  readonly getWebGLContext?: UnknownFunction;
  readonly createImage?: UnknownFunction;
  readonly readAssetBytes?: UnknownFunction;
  readonly getViewport: UnknownFunction;
  readonly requestFrame: UnknownFunction;
  readonly cancelFrame: UnknownFunction;
  readonly now: UnknownFunction;
  readonly wallNow: UnknownFunction;
  readonly bindInput: UnknownFunction;
  readonly onResize: UnknownFunction;
  readonly onShow: UnknownFunction;
  readonly onHide: UnknownFunction;
  readonly storageRead: UnknownFunction;
  readonly storageWrite: UnknownFunction;
  readonly storageDelete: UnknownFunction;
  readonly storageGet?: UnknownFunction;
  readonly storageSet?: UnknownFunction;
  readonly storageRemove?: UnknownFunction;
  readonly createAudio?: UnknownFunction;
  readonly vibrate?: UnknownFunction;
  readonly share?: UnknownFunction;
}

let ownerSequence = 0;

function ownOptions(value: unknown): Readonly<Record<string, unknown>> {
  if (value === undefined) return Object.freeze({});
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ProductPresentationSession options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('ProductPresentationSession options 必须是普通对象。');
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      throw new RangeError('ProductPresentationSession options 不支持 Symbol 字段。');
    }
    if (!OPTION_KEYS.has(key)) {
      throw new RangeError(`ProductPresentationSession 不支持 option ${key}。`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`ProductPresentationSession option ${key} 不能是访问器。`);
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

function descriptorInPrototypeChain(value: object, key: PropertyKey, name: string): PropertyDescriptor | null {
  const visited = new Set<object>();
  let current: object | null = value;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) return descriptor;
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

function dataMethod(value: object, methodName: string, name: string): UnknownFunction {
  const descriptor = descriptorInPrototypeChain(value, methodName, name);
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as UnknownFunction;
}

function optionalDataMethod(value: object, methodName: string, name: string): UnknownFunction | null {
  const descriptor = descriptorInPrototypeChain(value, methodName, name);
  if (!descriptor) return null;
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as UnknownFunction;
}

function optionalDataField(value: object, key: string, name: string): unknown {
  const descriptor = descriptorInPrototypeChain(value, key, name);
  if (!descriptor) return undefined;
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${key} 不能是访问器。`);
  return descriptor.value;
}

function snapshotPlatform(value: unknown): PlatformSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ProductPresentationSession platform 无效。');
  }
  const source = value;
  const methods: Record<string, UnknownFunction> = {};
  for (const methodName of PLATFORM_METHODS) {
    methods[methodName] = dataMethod(source, methodName, 'ProductPresentationSession platform');
  }
  for (const methodName of OPTIONAL_PLATFORM_METHODS) {
    const method = optionalDataMethod(source, methodName, 'ProductPresentationSession platform');
    if (method !== null) methods[methodName] = method;
  }
  const id = optionalDataField(source, 'id', 'ProductPresentationSession platform');
  if (id !== undefined && (typeof id !== 'string' || id.trim().length === 0)) {
    throw new TypeError('ProductPresentationSession platform.id 必须是非空字符串。');
  }
  return Object.freeze({
    id,
    storageConcurrency: optionalDataField(
      source,
      'storageConcurrency',
      'ProductPresentationSession platform',
    ),
    ...methods,
  }) as unknown as PlatformSnapshot;
}

function snapshotSeedSource(value: unknown): Readonly<{ nextSeed: UnknownFunction }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ProductPresentationSession seedSource 必须是对象。');
  }
  return Object.freeze({
    nextSeed: dataMethod(value, 'nextSeed', 'ProductPresentationSession seedSource'),
  });
}

function requiredFunction(value: unknown, name: string): UnknownFunction {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as UnknownFunction;
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function integerInRange(value: unknown, minimum: number, maximum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new RangeError(`${name} 必须是 ${minimum}～${maximum} 的安全整数。`);
  }
  return value as number;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function hashString(value: unknown): number {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function finiteViewportDimension(value: unknown, key: 'width' | 'height'): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !Number.isFinite(descriptor.value)) {
      return 0;
    }
    return Math.floor(descriptor.value as number) >>> 0;
  } catch {
    return 0;
  }
}

function defaultInitialSeed(platform: PlatformSnapshot): number {
  let now: unknown = 0;
  let viewport: unknown = {};
  try { now = platform.now(); } catch { now = 0; }
  try { viewport = platform.getViewport() ?? {}; } catch { viewport = {}; }
  const time = Number.isFinite(now) ? Math.floor(Math.abs(now as number)) >>> 0 : 0;
  const width = finiteViewportDimension(viewport, 'width');
  const height = finiteViewportDimension(viewport, 'height');
  return (
    hashString(platform.id ?? 'arena-product')
    ^ Math.imul(time, 0x9e3779b1)
    ^ Math.imul(width, 0x85ebca6b)
    ^ Math.imul(height, 0xc2b2ae35)
  ) >>> 0;
}

function nextOwnerId(platform: PlatformSnapshot): string {
  ownerSequence = ownerSequence >= Number.MAX_SAFE_INTEGER ? 1 : ownerSequence + 1;
  return `arena-product:${String(platform.id ?? 'unknown')}:${ownerSequence}`;
}

function defaultFactory<T extends new (...args: never[]) => unknown>(
  Constructor: T,
): UnknownFunction {
  return (...args: unknown[]) => new Constructor(args[0] as never);
}

export function createProductPresentationSessionComposition(
  platformValue: unknown,
  optionsInput?: unknown,
): ProductPresentationSessionComposition {
  const platform = snapshotPlatform(platformValue);
  const options = ownOptions(optionsInput);
  const mapperId = options.mapperId ?? ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP;
  if (!Object.values(ARENA_INPUT_MAPPER_ID).includes(mapperId as never)) {
    throw new RangeError(`未知 Product Presentation mapperId ${String(mapperId)}。`);
  }
  const maximumCatchUpTicks = integerInRange(
    options.maximumCatchUpTicks ?? 8,
    1,
    30,
    'maximumCatchUpTicks',
  );
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
  const rendererFactory = requiredFunction(
    options.rendererFactory,
    'ProductPresentationSession.rendererFactory',
  );
  const onDiagnostic = options.onDiagnostic === undefined
    ? () => {}
    : requiredFunction(options.onDiagnostic, 'ProductPresentationSession.onDiagnostic');
  const performanceMemoryProvider = options.performanceMemoryProvider === undefined
    ? () => null
    : requiredFunction(
      options.performanceMemoryProvider,
      'ProductPresentationSession.performanceMemoryProvider',
    );
  if (options.seedSource !== undefined && options.initialSeed !== undefined) {
    throw new RangeError('seedSource 与 initialSeed 不能同时配置。');
  }
  const seedSource = snapshotSeedSource(options.seedSource ?? new SequentialMatchSeedSource(
    options.initialSeed === undefined
      ? defaultInitialSeed(platform)
      : uint32(options.initialSeed, 'initialSeed'),
  ));
  const matchConfig = options.matchConfig === undefined
    ? Object.freeze({})
    : cloneFrozenData(options.matchConfig, 'ProductPresentationSession matchConfig');
  const matchCompletionSink = options.matchCompletionSink ?? null;
  if (matchCompletionSink !== null) {
    requiredFunction(matchCompletionSink, 'ProductPresentationSession.matchCompletionSink');
  }
  const qualityDefinition = createPresentationQualityDefinition(
    options.qualityDefinition ?? ARENA_V1_DEFAULT_PRESENTATION_QUALITY,
  );
  const factories = Object.freeze({
    rendererFactory,
    controllerFactory: options.controllerFactory === undefined
      ? ((...args: unknown[]) => createArenaV1ProductSession(args[0] as never))
      : requiredFunction(options.controllerFactory, 'ProductPresentationSession.controllerFactory'),
    flowFactory: options.flowFactory === undefined
      ? ((...args: unknown[]) => new ProductPresentationFlow({
        ...(args[0] as ConstructorParameters<typeof ProductPresentationFlow>[0]),
        presentationContent: ARENA_V1_PRODUCT_PRESENTATION_CONTENT,
        matchPresentationContent: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
        frameProjector: projectArenaPresentationFrame as unknown as
          ConstructorParameters<typeof ProductPresentationFlow>[0]['frameProjector'],
      }))
      : requiredFunction(options.flowFactory, 'ProductPresentationSession.flowFactory'),
    mapperFactory: options.mapperFactory === undefined
      ? ((...args: unknown[]) => createArenaInputMapper(
        args[0] as Parameters<typeof createArenaInputMapper>[0],
      ))
      : requiredFunction(options.mapperFactory, 'ProductPresentationSession.mapperFactory'),
    samplerFactory: options.samplerFactory === undefined
      ? defaultFactory(InputSampler)
      : requiredFunction(options.samplerFactory, 'ProductPresentationSession.samplerFactory'),
    inputRouterFactory: options.inputRouterFactory === undefined
      ? defaultFactory(ProductInputRouter)
      : requiredFunction(options.inputRouterFactory, 'ProductPresentationSession.inputRouterFactory'),
    inputAdapterFactory: options.inputAdapterFactory === undefined
      ? defaultFactory(PointerInputAdapter)
      : requiredFunction(options.inputAdapterFactory, 'ProductPresentationSession.inputAdapterFactory'),
    frameLoopFactory: options.frameLoopFactory === undefined
      ? defaultFactory(PresentationFrameLoop)
      : requiredFunction(options.frameLoopFactory, 'ProductPresentationSession.frameLoopFactory'),
    accumulatorFactory: options.accumulatorFactory === undefined
      ? defaultFactory(FixedTickAccumulator)
      : requiredFunction(options.accumulatorFactory, 'ProductPresentationSession.accumulatorFactory'),
    renderPacerFactory: options.renderPacerFactory === undefined
      ? defaultFactory(PresentationRenderPacer)
      : requiredFunction(options.renderPacerFactory, 'ProductPresentationSession.renderPacerFactory'),
    performanceProbeFactory: options.performanceProbeFactory === undefined
      ? defaultFactory(PresentationPerformanceProbe)
      : requiredFunction(
        options.performanceProbeFactory,
        'ProductPresentationSession.performanceProbeFactory',
      ),
  });
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
    mapperId: mapperId as string,
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

export function createProductPresentationSession(
  platform: unknown,
  options: unknown = {},
): ProductPresentationSession {
  return new ProductPresentationSession(
    createProductPresentationSessionComposition(platform, options),
  );
}
