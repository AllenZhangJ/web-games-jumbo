import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import { QuickMatchService } from '../../matchmaking/quick-match-service.js';
import { SequentialMatchSeedSource } from '@number-strategy-jump/arena-matchmaking';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { ArenaInputRouter } from '../input/arena-input-router.js';
import {
  ARENA_INPUT_MAPPER_ID,
  createArenaInputMapper,
  InputSampler,
  PointerInputAdapter,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  FixedTickAccumulator,
  PresentationEventWindow,
  PresentationFrameLoop,
} from '@number-strategy-jump/arena-presentation-runtime';
import { ArenaGreyboxRenderer } from '@number-strategy-jump/arena-presentation-three';
import { ARENA_V1_GREYBOX_CONTENT } from '../content/arena-v1-greybox-content.js';

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

function optionValues(options) {
  if (options === undefined) return {};
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('ArenaPresentationSession options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(options);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('ArenaPresentationSession options 必须是普通对象。');
  }
  const result = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(options))) {
    if (!OPTION_KEYS.has(key)) throw new RangeError(`ArenaPresentationSession 不支持 option ${key}。`);
    if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new TypeError(`ArenaPresentationSession option ${key} 不能是访问器。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function validatePlatform(platform) {
  if (!platform || typeof platform !== 'object') throw new TypeError('Arena Session platform 无效。');
  for (const method of [
    'createCanvas',
    'getViewport',
    'requestFrame',
    'cancelFrame',
    'now',
    'bindInput',
    'onResize',
    'onShow',
    'onHide',
  ]) requiredFunction(platform[method], `Arena Session platform.${method}`);
  return platform;
}

function uint32(value, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
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
    hashString(platform.id ?? 'arena')
    ^ Math.imul(time, 0x9e3779b1)
    ^ Math.imul(width, 0x85ebca6b)
    ^ Math.imul(height, 0xc2b2ae35)
  ) >>> 0;
}

function createMatchConfig(value) {
  const overrides = value === undefined
    ? Object.freeze({})
    : cloneFrozenData(value, 'Arena presentation matchConfig');
  return cloneFrozenData({
    ...DEFAULT_ARENA_PRESENTATION_MATCH_CONFIG,
    ...overrides,
  }, 'Arena presentation resolved matchConfig');
}

export function createArenaSessionComposition(platformValue, optionsValue) {
  const platform = validatePlatform(platformValue);
  const options = optionValues(optionsValue);
  const mapperId = options.mapperId ?? ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP;
  if (!Object.values(ARENA_INPUT_MAPPER_ID).includes(mapperId)) {
    throw new RangeError(`未知 Arena mapperId ${String(mapperId)}。`);
  }
  const matchingDurationSeconds = options.matchingDurationSeconds ?? 0.65;
  if (
    !Number.isFinite(matchingDurationSeconds)
    || matchingDurationSeconds < 0
    || matchingDurationSeconds > 10
  ) throw new RangeError('matchingDurationSeconds 必须在 0～10 秒。');
  const maximumCatchUpTicks = options.maximumCatchUpTicks ?? 8;
  if (!Number.isSafeInteger(maximumCatchUpTicks) || maximumCatchUpTicks < 1 || maximumCatchUpTicks > 30) {
    throw new RangeError('maximumCatchUpTicks 必须是 1～30 的安全整数。');
  }
  if (options.experimentLabel !== undefined && typeof options.experimentLabel !== 'string') {
    throw new TypeError('experimentLabel 必须是字符串。');
  }
  const onDiagnostic = options.onDiagnostic ?? (() => {});
  requiredFunction(onDiagnostic, 'onDiagnostic');
  const onMatchProgress = options.onMatchProgress ?? (() => {});
  requiredFunction(onMatchProgress, 'onMatchProgress');

  let matchService = options.matchService;
  if (matchService !== undefined) {
    if (options.seedSource !== undefined || options.initialSeed !== undefined) {
      throw new RangeError('注入 matchService 时不能再配置 seedSource/initialSeed。');
    }
    if (!matchService || typeof matchService.create !== 'function') {
      throw new TypeError('matchService 必须实现 create()。');
    }
  } else {
    const seedSource = options.seedSource ?? new SequentialMatchSeedSource(
      options.initialSeed === undefined
        ? defaultInitialSeed(platform)
        : uint32(options.initialSeed, 'initialSeed'),
    );
    if (!seedSource || typeof seedSource.nextSeed !== 'function') {
      throw new TypeError('seedSource 必须实现 nextSeed()。');
    }
    matchService = new QuickMatchService({ seedSource });
  }

  const factories = {
    mapperFactory: options.mapperFactory ?? createArenaInputMapper,
    rendererFactory: options.rendererFactory ?? ((args) => new ArenaGreyboxRenderer({
      ...args,
      content: ARENA_V1_GREYBOX_CONTENT,
    })),
    samplerFactory: options.samplerFactory ?? ((args) => new InputSampler(args)),
    inputRouterFactory: options.inputRouterFactory ?? ((args) => new ArenaInputRouter(args)),
    inputAdapterFactory: options.inputAdapterFactory ?? ((args) => new PointerInputAdapter(args)),
    eventWindowFactory: options.eventWindowFactory
      ?? ((args) => new PresentationEventWindow(args)),
    frameLoopFactory: options.frameLoopFactory ?? ((args) => new PresentationFrameLoop(args)),
    accumulatorFactory: options.accumulatorFactory ?? ((args) => new FixedTickAccumulator(args)),
  };
  for (const [name, factory] of Object.entries(factories)) requiredFunction(factory, name);

  return Object.freeze({
    platform,
    mapperId,
    matchService,
    matchingDurationSeconds,
    maximumCatchUpTicks,
    matchConfig: createMatchConfig(options.matchConfig),
    experimentLabel: options.experimentLabel ?? '',
    onDiagnostic,
    onMatchProgress,
    ...factories,
  });
}
