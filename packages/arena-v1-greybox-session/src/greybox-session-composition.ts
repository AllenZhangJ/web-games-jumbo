import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import { SequentialMatchSeedSource } from '@number-strategy-jump/arena-matchmaking';
import {
  ARENA_INPUT_MAPPER_ID,
  ArenaInputRouter,
  FixedTickAccumulator,
  InputSampler,
  PointerInputAdapter,
  PresentationEventWindow,
  PresentationFrameLoop,
  createArenaInputMapper,
} from '@number-strategy-jump/arena-presentation-runtime';
import { ArenaGreyboxRenderer } from '@number-strategy-jump/arena-presentation-three';
import { QuickMatchService } from '@number-strategy-jump/arena-v1-composition';
import { ARENA_V1_GREYBOX_CONTENT } from '@number-strategy-jump/arena-v1-presentation-content';

type UnknownFunction = (...args: unknown[]) => unknown;

const OPTION_KEYS = new Set([
  'mapperId',
  'matchService',
  'seedSource',
  'initialSeed',
  'rendererFactory',
  'samplerFactory',
  'inputRouterFactory',
  'inputAdapterFactory',
  'eventWindowFactory',
  'frameLoopFactory',
  'accumulatorFactory',
  'mapperFactory',
  'matchingDurationSeconds',
  'maximumCatchUpTicks',
  'matchConfig',
  'experimentLabel',
  'onDiagnostic',
  'onMatchProgress',
]);

const REQUIRED_PLATFORM_METHODS = Object.freeze([
  'createCanvas',
  'getViewport',
  'requestFrame',
  'cancelFrame',
  'now',
  'bindInput',
  'onResize',
  'onShow',
  'onHide',
]);

const OPTIONAL_PLATFORM_METHODS = Object.freeze([
  'createOffscreenCanvas',
  'getWebGLContext',
  'createImage',
  'readAssetBytes',
  'createAudio',
  'vibrate',
  'share',
]);

export const DEFAULT_ARENA_PRESENTATION_MATCH_CONFIG = Object.freeze({
  participantCharacters: Object.freeze([
    Object.freeze({
      participantId: 'player-1',
      definitionId: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
    }),
    Object.freeze({
      participantId: 'player-2',
      definitionId: ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
    }),
  ]),
});

export interface ArenaGreyboxSessionComposition {
  readonly platform: Readonly<Record<string, unknown>>;
  readonly mapperId: string;
  readonly matchService: Readonly<{ create: UnknownFunction }>;
  readonly matchingDurationSeconds: number;
  readonly maximumCatchUpTicks: number;
  readonly matchConfig: Readonly<Record<string, unknown>>;
  readonly presentationContent: typeof ARENA_V1_GREYBOX_CONTENT;
  readonly experimentLabel: string;
  readonly onDiagnostic: UnknownFunction;
  readonly onMatchProgress: UnknownFunction;
  readonly mapperFactory: UnknownFunction;
  readonly rendererFactory: UnknownFunction;
  readonly samplerFactory: UnknownFunction;
  readonly inputRouterFactory: UnknownFunction;
  readonly inputAdapterFactory: UnknownFunction;
  readonly eventWindowFactory: UnknownFunction;
  readonly frameLoopFactory: UnknownFunction;
  readonly accumulatorFactory: UnknownFunction;
}

function ownOptions(value: unknown): Readonly<Record<string, unknown>> {
  if (value === undefined) return Object.freeze({});
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ArenaPresentationSession options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('ArenaPresentationSession options 必须是普通对象。');
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      throw new RangeError('ArenaPresentationSession options 不支持 Symbol 字段。');
    }
    if (!OPTION_KEYS.has(key)) throw new RangeError(`ArenaPresentationSession 不支持 option ${key}。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`ArenaPresentationSession option ${key} 不能是访问器。`);
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

function descriptorInPrototypeChain(
  value: object,
  key: PropertyKey,
  name: string,
): PropertyDescriptor | null {
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

function dataMethod(value: unknown, methodName: string, name: string): UnknownFunction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
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

function snapshotPlatform(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Arena Session platform 无效。');
  }
  const methods: Record<string, UnknownFunction> = {};
  for (const methodName of REQUIRED_PLATFORM_METHODS) {
    methods[methodName] = dataMethod(value, methodName, 'Arena Session platform');
  }
  for (const methodName of OPTIONAL_PLATFORM_METHODS) {
    const method = optionalDataMethod(value, methodName, 'Arena Session platform');
    if (method !== null) methods[methodName] = method;
  }
  const id = optionalDataField(value, 'id', 'Arena Session platform');
  if (id !== undefined && (typeof id !== 'string' || id.trim().length === 0)) {
    throw new TypeError('Arena Session platform.id 必须是非空字符串。');
  }
  return Object.freeze({ id, ...methods });
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

function hashString(value: unknown): number {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function viewportDimension(value: unknown, key: 'width' | 'height'): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || !Number.isFinite(descriptor.value)) return 0;
  return Math.floor(descriptor.value as number) >>> 0;
}

function defaultInitialSeed(platform: Readonly<Record<string, unknown>>): number {
  const nowMethod = platform.now as UnknownFunction;
  const viewportMethod = platform.getViewport as UnknownFunction;
  let now: unknown = 0;
  let viewport: unknown = null;
  try { now = nowMethod(); } catch { now = 0; }
  try { viewport = viewportMethod(); } catch { viewport = null; }
  const time = Number.isFinite(now) ? Math.floor(Math.abs(now as number)) >>> 0 : 0;
  return (
    hashString(platform.id ?? 'arena')
    ^ Math.imul(time, 0x9e3779b1)
    ^ Math.imul(viewportDimension(viewport, 'width'), 0x85ebca6b)
    ^ Math.imul(viewportDimension(viewport, 'height'), 0xc2b2ae35)
  ) >>> 0;
}

function createMatchConfig(value: unknown): Readonly<Record<string, unknown>> {
  const overrides = value === undefined
    ? Object.freeze({})
    : cloneFrozenData(value, 'Arena presentation matchConfig');
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new TypeError('Arena presentation matchConfig 必须是对象。');
  }
  return cloneFrozenData({
    ...DEFAULT_ARENA_PRESENTATION_MATCH_CONFIG,
    ...overrides,
  }, 'Arena presentation resolved matchConfig');
}

function snapshotMatchService(value: unknown): Readonly<{ create: UnknownFunction }> {
  return Object.freeze({
    create: dataMethod(value, 'create', 'Arena Presentation matchService'),
  });
}

function rendererOptions(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Arena Greybox Renderer factory options 必须是对象。');
  }
  const result: Record<string, unknown> = {};
  for (const key of ['canvas', 'platform']) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena Greybox Renderer factory options.${key} 必须是数据字段。`);
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

export function createArenaGreyboxSessionComposition(
  platformValue: unknown,
  optionsValue: unknown = {},
): ArenaGreyboxSessionComposition {
  const platform = snapshotPlatform(platformValue);
  const options = ownOptions(optionsValue);
  const mapperId = options.mapperId ?? ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP;
  if (!Object.values(ARENA_INPUT_MAPPER_ID).includes(mapperId as never)) {
    throw new RangeError(`未知 Arena mapperId ${String(mapperId)}。`);
  }
  const matchingDurationSeconds = options.matchingDurationSeconds ?? 0.65;
  if (
    !Number.isFinite(matchingDurationSeconds)
    || (matchingDurationSeconds as number) < 0
    || (matchingDurationSeconds as number) > 10
  ) throw new RangeError('matchingDurationSeconds 必须在 0～10 秒。');
  const maximumCatchUpTicks = options.maximumCatchUpTicks ?? 8;
  if (
    !Number.isSafeInteger(maximumCatchUpTicks)
    || (maximumCatchUpTicks as number) < 1
    || (maximumCatchUpTicks as number) > 30
  ) throw new RangeError('maximumCatchUpTicks 必须是 1～30 的安全整数。');
  if (options.experimentLabel !== undefined && typeof options.experimentLabel !== 'string') {
    throw new TypeError('experimentLabel 必须是字符串。');
  }
  const onDiagnostic = requiredFunction(options.onDiagnostic ?? (() => {}), 'onDiagnostic');
  const onMatchProgress = requiredFunction(options.onMatchProgress ?? (() => {}), 'onMatchProgress');

  let matchService: Readonly<{ create: UnknownFunction }>;
  if (options.matchService !== undefined) {
    if (options.seedSource !== undefined || options.initialSeed !== undefined) {
      throw new RangeError('注入 matchService 时不能再配置 seedSource/initialSeed。');
    }
    matchService = snapshotMatchService(options.matchService);
  } else {
    const seedSource = options.seedSource === undefined
      ? new SequentialMatchSeedSource(
        options.initialSeed === undefined
          ? defaultInitialSeed(platform)
          : uint32(options.initialSeed, 'initialSeed'),
      )
      : Object.freeze({
        nextSeed: dataMethod(options.seedSource, 'nextSeed', 'Arena Presentation seedSource'),
      });
    matchService = snapshotMatchService(new QuickMatchService({ seedSource }));
  }

  const factories = Object.freeze({
    mapperFactory: requiredFunction(options.mapperFactory ?? createArenaInputMapper, 'mapperFactory'),
    rendererFactory: requiredFunction(options.rendererFactory ?? ((value: unknown) => {
      const renderer = rendererOptions(value);
      return new ArenaGreyboxRenderer({
        canvas: renderer.canvas,
        platform: renderer.platform,
        content: ARENA_V1_GREYBOX_CONTENT,
      });
    }), 'rendererFactory'),
    samplerFactory: requiredFunction(
      options.samplerFactory ?? ((value: unknown) => new InputSampler(value)),
      'samplerFactory',
    ),
    inputRouterFactory: requiredFunction(
      options.inputRouterFactory ?? ((value: unknown) => new ArenaInputRouter(value)),
      'inputRouterFactory',
    ),
    inputAdapterFactory: requiredFunction(
      options.inputAdapterFactory ?? ((value: unknown) => new PointerInputAdapter(value)),
      'inputAdapterFactory',
    ),
    eventWindowFactory: requiredFunction(
      options.eventWindowFactory ?? ((value: unknown) => new PresentationEventWindow(value)),
      'eventWindowFactory',
    ),
    frameLoopFactory: requiredFunction(
      options.frameLoopFactory ?? ((value: unknown) => new PresentationFrameLoop(value)),
      'frameLoopFactory',
    ),
    accumulatorFactory: requiredFunction(
      options.accumulatorFactory ?? ((value: unknown) => new FixedTickAccumulator(value)),
      'accumulatorFactory',
    ),
  });

  return Object.freeze({
    platform,
    mapperId: mapperId as string,
    matchService,
    matchingDurationSeconds: matchingDurationSeconds as number,
    maximumCatchUpTicks: maximumCatchUpTicks as number,
    matchConfig: createMatchConfig(options.matchConfig),
    presentationContent: ARENA_V1_GREYBOX_CONTENT,
    experimentLabel: (options.experimentLabel as string | undefined) ?? '',
    onDiagnostic,
    onMatchProgress,
    ...factories,
  });
}

export const createArenaSessionComposition = createArenaGreyboxSessionComposition;
