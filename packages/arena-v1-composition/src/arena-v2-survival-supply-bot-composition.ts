import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  combineCleanupFailure,
  cloneFrozenData,
  createDeterministicDataHash,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_V2_SURVIVAL_SUPPLY_DEFINITION } from '@number-strategy-jump/arena-v1-content';
import {
  assertBotProfileRegistry,
  BotController,
  type BotControllerOptions,
  type BotProfileRegistryContract,
} from '@number-strategy-jump/arena-bot';
import {
  LocalMatchSession,
  createMatchReadBotBundleV2,
  type BotInputController,
  type BotMatchReadBundleV2,
  type CreateBotMatchReadBundleV2Options,
  type LocalMatchPublicInfo,
  type LocalMatchSessionOptions,
} from '@number-strategy-jump/arena-session';
import type { MatchCore } from '@number-strategy-jump/arena-match';
import type { EquipmentSupplySpawnSpec } from '@number-strategy-jump/arena-equipment';
import {
  createArenaV2SurvivalSupplyMatchCore,
  type ArenaV2SurvivalSupplyMatchCoreOptions,
} from './arena-v2-survival-supply-match-core.js';

const OPTION_KEYS = new Set([
  'seed',
  'config',
  'physicsFactory',
  'ruleEngineFactory',
  'mapSystemFactory',
  'characterRegistry',
  'supply',
  'bot',
  'playerParticipantId',
  'publicMatchInfo',
]);
const CORE_OPTION_KEYS = [
  'seed',
  'config',
  'physicsFactory',
  'ruleEngineFactory',
  'mapSystemFactory',
  'characterRegistry',
  'supply',
] as const;
const BOT_KEYS = new Set([
  'participantId',
  'difficultyId',
  'behaviorSeed',
  'personalitySeed',
  'profileRegistry',
]);
const SUPPLY_KEYS = new Set(['supplyDefinitionId', 'spawnSpecs']);
const SURVIVAL_BOT_COMPOSITION_ID = 'arena-v2-survival-supply.v1';
const FORMAL_COMPOSITION_IDENTITY_SCHEMA_VERSION = 1 as const;
const COMPOSITION_SPAWN_SPEC_KEYS = new Set([
  'slotId',
  'equipmentDefinitionId',
  'spawnId',
  'position',
]);
const COMPOSITION_VECTOR_KEYS = new Set(['x', 'y', 'z']);

export interface ArenaV2SurvivalSupplyBotCompositionOptions
  extends ArenaV2SurvivalSupplyMatchCoreOptions {
  readonly bot: {
    readonly participantId: string;
    readonly difficultyId: string;
    readonly behaviorSeed: number;
    readonly personalitySeed: number;
    readonly profileRegistry: BotProfileRegistryContract;
  };
  readonly playerParticipantId?: string;
  readonly publicMatchInfo: LocalMatchPublicInfo;
}

/**
 * Frozen provenance emitted by the production composition after every owner
 * boundary has accepted the same descriptor. It intentionally excludes the
 * Core, binding, readers and hash builders.
 */
export interface ArenaV2SurvivalSupplyBotCompositionIdentityV1 {
  readonly schemaVersion: typeof FORMAL_COMPOSITION_IDENTITY_SCHEMA_VERSION;
  readonly compositionId: typeof SURVIVAL_BOT_COMPOSITION_ID;
  readonly participantIds: readonly string[];
  readonly mapDefinitionId: string;
  readonly contentSelectionHash: string | null;
  readonly compositionContractHash: string;
}

interface SurvivalOuterFactories {
  readonly bundleFactory: (options: CreateBotMatchReadBundleV2Options) => BotMatchReadBundleV2;
  readonly botControllerFactory: (options: BotControllerOptions) => unknown;
  readonly sessionFactory: (options: LocalMatchSessionOptions) => unknown;
  coreSupplyObserver?: (
    core: MatchCore,
    normalizedSupply: Readonly<Record<string, unknown>>,
  ) => void;
}

interface CleanupHandle {
  cleanup(): void;
}

const NATIVE_SURVIVAL_OUTER_FACTORIES: SurvivalOuterFactories = Object.freeze({
  bundleFactory: (options: CreateBotMatchReadBundleV2Options) => createMatchReadBotBundleV2(options),
  botControllerFactory: (options: BotControllerOptions) => new BotController(options),
  sessionFactory: (options: LocalMatchSessionOptions) => new LocalMatchSession(options),
});

const FORMAL_COMPOSITION_IDENTITIES = new WeakMap<
  LocalMatchSession,
  ArenaV2SurvivalSupplyBotCompositionIdentityV1
>();
const LOCAL_MATCH_GET_PUBLIC_INFO = Object.getOwnPropertyDescriptor(
  LocalMatchSession.prototype,
  'getPublicMatchInfo',
)?.value;
if (typeof LOCAL_MATCH_GET_PUBLIC_INFO !== 'function') {
  throw new Error('LocalMatchSession public-info native method 初始化捕获失败。');
}

const SURVIVAL_TEST_FACTORY_KEYS = new Set([
  'bundleFactory',
  'botControllerFactory',
  'coreSupplyObserver',
  'sessionFactory',
]);

function dataMethod(value: unknown, methodName: string, ownerName: string): (...args: never[]) => unknown {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${ownerName} 必须实现 ${methodName}()。`);
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError(`${ownerName} 原型链无效。`);
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, methodName);
    if (descriptor !== undefined) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName} 必须是数据方法。`);
      }
      return descriptor.value as (...args: never[]) => unknown;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${ownerName} 必须实现 ${methodName}()。`);
}

function assertBotControllerCandidate(value: unknown): BotInputController {
  for (const methodName of [
    'createInput',
    'attachTrustedCommandSourceReader',
    'createInputFromTrustedCommandSource',
    'destroy',
  ]) dataMethod(value, methodName, 'survival botControllerFactory 返回值');
  return value as BotInputController;
}

function assertNativeLocalMatchSessionBrand(value: unknown): LocalMatchSession {
  if (
    value === null
    || typeof value !== 'object'
    || Object.getPrototypeOf(value) !== LocalMatchSession.prototype
  ) throw new TypeError('survival sessionFactory 必须返回原生 LocalMatchSession。');
  try {
    LocalMatchSession.prototype.getPublicMatchInfo.call(value);
  } catch {
    throw new TypeError('survival sessionFactory 返回值不是原生 LocalMatchSession 实例。');
  }
  return value as LocalMatchSession;
}

function assertNativeLocalMatchSessionSurface(value: LocalMatchSession): void {
  for (const methodName of [
    'start',
    'setPaused',
    'getPresentationReadFrame',
    'stepWithPresentationReadFrame',
    'getPublicMatchInfo',
    'exportReplay',
    'destroy',
  ]) {
    if (Object.prototype.hasOwnProperty.call(value, methodName)) {
      throw new TypeError(`原生 LocalMatchSession 不得 own shadow ${methodName}()。`);
    }
  }
}

function bindCleanupMethod(
  destroy: (...args: never[]) => unknown,
  value: unknown,
): CleanupHandle {
  const bound = Reflect.apply(Function.prototype.bind, destroy, [value]) as () => void;
  return Object.freeze({
    cleanup: (): void => { Reflect.apply(bound, undefined, []); },
  });
}

function captureCleanupHandle(value: unknown, ownerName: string): CleanupHandle | null {
  try {
    const destroy = dataMethod(value, 'destroy', `${ownerName} cleanup`);
    return bindCleanupMethod(destroy, value);
  } catch {
    return null;
  }
}

function readDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function readOptionalDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return undefined;
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function compareStableStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareSpawnSpecs(
  left: EquipmentSupplySpawnSpec,
  right: EquipmentSupplySpawnSpec,
): number {
  return compareStableStrings(left.slotId, right.slotId);
}

export interface ArenaV2SurvivalBotCompositionContractInput {
  readonly spawnSpecs: readonly EquipmentSupplySpawnSpec[];
  readonly profileRegistry: BotProfileRegistryContract;
  readonly difficultyId: string;
  readonly playerParticipantId: string;
  readonly botParticipantId: string;
}

function normalizeCompositionSpawnSpecs(value: unknown): readonly EquipmentSupplySpawnSpec[] {
  const cloned = cloneFrozenData(value, 'formal survival composition spawnSpecs');
  if (!Array.isArray(cloned)) {
    throw new TypeError('formal survival composition spawnSpecs 必须是数组。');
  }
  const slots = new Set<string>();
  const result = cloned.map((candidate, index) => {
    const source = assertPlainRecord(candidate, `formal survival composition spawnSpecs[${index}]`);
    assertKnownKeys(source, COMPOSITION_SPAWN_SPEC_KEYS, `formal survival composition spawnSpecs[${index}]`);
    const slotId = assertNonEmptyString(
      readDataProperty(source, 'slotId', `formal survival composition spawnSpecs[${index}]`),
      `formal survival composition spawnSpecs[${index}].slotId`,
    );
    if (slots.has(slotId)) throw new RangeError('formal survival composition slotId 不能重复。');
    slots.add(slotId);
    const equipmentDefinitionId = assertNonEmptyString(
      readDataProperty(source, 'equipmentDefinitionId', `formal survival composition spawnSpecs[${index}]`),
      `formal survival composition spawnSpecs[${index}].equipmentDefinitionId`,
    );
    const spawnId = assertNonEmptyString(
      readDataProperty(source, 'spawnId', `formal survival composition spawnSpecs[${index}]`),
      `formal survival composition spawnSpecs[${index}].spawnId`,
    );
    const position = assertPlainRecord(
      readDataProperty(source, 'position', `formal survival composition spawnSpecs[${index}]`),
      `formal survival composition spawnSpecs[${index}].position`,
    );
    assertKnownKeys(position, COMPOSITION_VECTOR_KEYS, `formal survival composition spawnSpecs[${index}].position`);
    const coordinates = Object.freeze({
      x: position.x,
      y: position.y,
      z: position.z,
    });
    if (![coordinates.x, coordinates.y, coordinates.z].every((coordinate) => (
      typeof coordinate === 'number' && Number.isFinite(coordinate)
    ))) throw new TypeError('formal survival composition spawn spec position 无效。');
    return Object.freeze({
      slotId,
      equipmentDefinitionId,
      spawnId,
      position: coordinates,
    }) as EquipmentSupplySpawnSpec;
  });
  return Object.freeze(result.sort(compareSpawnSpecs));
}

/** Package-private pure contract builder; intentionally absent from the package index. */
export function buildArenaV2SurvivalBotCompositionContract(
  options: ArenaV2SurvivalBotCompositionContractInput,
): Readonly<Record<string, unknown>> {
  const spawnSpecs = normalizeCompositionSpawnSpecs(options.spawnSpecs);
  return Object.freeze({
    schemaVersion: 1,
    compositionId: SURVIVAL_BOT_COMPOSITION_ID,
    survivalSupplyDefinition: cloneFrozenData(
      ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
      'formal survival supply Definition',
    ),
    spawnSpecs,
    equipmentDefinitionIds: Object.freeze(
      [...new Set(spawnSpecs.map(({ equipmentDefinitionId }) => equipmentDefinitionId))]
        .sort(compareStableStrings),
    ),
    profileRegistry: cloneFrozenData(
      options.profileRegistry.list(),
      'formal survival Bot profile registry snapshot',
    ),
    selectedDifficultyId: options.difficultyId,
    roleParticipantIds: Object.freeze({
      player: options.playerParticipantId,
      bot: options.botParticipantId,
    }),
  });
}

export function createArenaV2SurvivalBotCompositionContractHash(
  options: ArenaV2SurvivalBotCompositionContractInput,
): string {
  return createDeterministicDataHash(
    buildArenaV2SurvivalBotCompositionContract(options),
    'formal survival Bot composition contract',
  );
}

function cleanupComposition(
  sessionCleanup: CleanupHandle | null,
  controllerCleanup: CleanupHandle | null,
  core: MatchCore | null,
  error: unknown,
): never {
  const cleanupErrors: Error[] = [];
  for (const [label, handle] of [
    ['survival LocalMatchSession', sessionCleanup],
    ['survival BotController', controllerCleanup],
  ] as const) {
    if (handle === null) continue;
    try {
      handle.cleanup();
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, `${label} 清理失败`));
    }
  }
  if (core !== null) {
    try {
      core.destroy();
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'survival MatchCore 清理失败'));
    }
  }
  throw combineCleanupFailure(
    normalizeThrownError(error, 'Arena V2 survival Bot composition 创建失败'),
    cleanupErrors,
    'Arena V2 survival Bot composition 创建失败且清理未完整完成。',
  );
}

/**
 * Creates the production survival Core + read-only Bot input composition.
 * The Bot receives only LocalMatchSession snapshots and returns an InputFrame;
 * it never receives EquipmentSystem or supply lifecycle authority.
 */
export function createArenaV2SurvivalSupplyBotSession(
  options: ArenaV2SurvivalSupplyBotCompositionOptions,
): LocalMatchSession;
export function createArenaV2SurvivalSupplyBotSession(options: unknown): LocalMatchSession;
export function createArenaV2SurvivalSupplyBotSession(options: unknown): LocalMatchSession {
  return createArenaV2SurvivalSupplyBotSessionInternal(options, NATIVE_SURVIVAL_OUTER_FACTORIES);
}

/**
 * Deep-only test/governance seam. It is intentionally absent from the package
 * index; production callers can only use native constructors. Candidate
 * validation below prevents a fake session from taking ownership of Core.
 */
export function createArenaV2SurvivalSupplyBotSessionForTest(
  options: unknown,
  factories: unknown,
): LocalMatchSession {
  const record = assertPlainRecord(factories, 'survival outer test factories');
  assertKnownKeys(record, SURVIVAL_TEST_FACTORY_KEYS, 'survival outer test factories');
  const bundleFactory = readDataProperty(record, 'bundleFactory', 'survival outer test factories');
  const botControllerFactory = readDataProperty(
    record,
    'botControllerFactory',
    'survival outer test factories',
  );
  const coreSupplyObserver = readOptionalDataProperty(
    record,
    'coreSupplyObserver',
    'survival outer test factories',
  );
  const sessionFactory = readDataProperty(record, 'sessionFactory', 'survival outer test factories');
  if (
    typeof bundleFactory !== 'function'
    || typeof botControllerFactory !== 'function'
    || (coreSupplyObserver !== undefined && typeof coreSupplyObserver !== 'function')
    || typeof sessionFactory !== 'function'
  ) {
    throw new TypeError('survival outer test factories 必须是函数。');
  }
  const internalFactories: SurvivalOuterFactories = {
    bundleFactory: bundleFactory as SurvivalOuterFactories['bundleFactory'],
    botControllerFactory: botControllerFactory as SurvivalOuterFactories['botControllerFactory'],
    sessionFactory: sessionFactory as SurvivalOuterFactories['sessionFactory'],
  };
  if (coreSupplyObserver !== undefined) {
    internalFactories.coreSupplyObserver = coreSupplyObserver as NonNullable<
      SurvivalOuterFactories['coreSupplyObserver']
    >;
  }
  return createArenaV2SurvivalSupplyBotSessionInternal(options, Object.freeze(internalFactories));
}

function createArenaV2SurvivalSupplyBotSessionInternal(
  options: unknown,
  factories: SurvivalOuterFactories,
): LocalMatchSession {
  assertKnownKeys(options, OPTION_KEYS, 'Arena V2 survival Bot composition');
  const record = assertPlainRecord(options, 'Arena V2 survival Bot composition');
  const bot = assertPlainRecord(
    readDataProperty(record, 'bot', 'Arena V2 survival Bot composition'),
    'Arena V2 survival Bot composition.bot',
  );
  assertKnownKeys(bot, BOT_KEYS, 'Arena V2 survival Bot composition.bot');

  const botParticipantId = assertNonEmptyString(
    readDataProperty(bot, 'participantId', 'Arena V2 survival Bot composition.bot'),
    'Arena V2 survival Bot composition.bot.participantId',
  );
  const playerParticipantId = assertNonEmptyString(
    readOptionalDataProperty(record, 'playerParticipantId', 'Arena V2 survival Bot composition')
      ?? 'player-1',
    'Arena V2 survival Bot composition.playerParticipantId',
  );
  if (playerParticipantId === botParticipantId) {
    throw new RangeError('survival Bot 与 player 不能使用同一 participantId。');
  }
  const expectedParticipantIds = Object.freeze(
    [playerParticipantId, botParticipantId].sort(compareStableStrings),
  );
  const difficultyId = assertNonEmptyString(
    readDataProperty(bot, 'difficultyId', 'Arena V2 survival Bot composition.bot'),
    'Arena V2 survival Bot composition.bot.difficultyId',
  );
  const behaviorSeed = uint32(
    readDataProperty(bot, 'behaviorSeed', 'Arena V2 survival Bot composition.bot'),
    'Arena V2 survival Bot composition.bot.behaviorSeed',
  );
  const personalitySeed = uint32(
    readDataProperty(bot, 'personalitySeed', 'Arena V2 survival Bot composition.bot'),
    'Arena V2 survival Bot composition.bot.personalitySeed',
  );
  const profileRegistry = assertBotProfileRegistry(
    readDataProperty(bot, 'profileRegistry', 'Arena V2 survival Bot composition.bot'),
  );
  profileRegistry.require(difficultyId);
  const publicMatchInfo = readDataProperty(
    record,
    'publicMatchInfo',
    'Arena V2 survival Bot composition',
  ) as LocalMatchPublicInfo;
  const frozenSupply = assertPlainRecord(
    cloneFrozenData(
      readDataProperty(record, 'supply', 'Arena V2 survival Bot composition'),
      'Arena V2 survival Bot composition.supply',
    ),
    'Arena V2 survival Bot composition.supply',
  );
  assertKnownKeys(frozenSupply, SUPPLY_KEYS, 'Arena V2 survival Bot composition.supply');
  if (frozenSupply.supplyDefinitionId !== ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id) {
    throw new RangeError('survival Bot composition 只能使用正式 survival supply Definition。');
  }
  if (!Array.isArray(frozenSupply.spawnSpecs)) {
    throw new TypeError('Arena V2 survival Bot composition.supply.spawnSpecs 必须是数组。');
  }
  const spawnSpecs = Object.freeze(
    [...frozenSupply.spawnSpecs as readonly EquipmentSupplySpawnSpec[]].sort(compareSpawnSpecs),
  );
  const equipmentDefinitionIds = Object.freeze(
    [...new Set(spawnSpecs.map(({ equipmentDefinitionId }) => equipmentDefinitionId))]
      .sort(compareStableStrings),
  );
  const normalizedSupply = Object.freeze({
    supplyDefinitionId: frozenSupply.supplyDefinitionId,
    spawnSpecs,
  });
  const compositionContractHash = createArenaV2SurvivalBotCompositionContractHash({
    spawnSpecs,
    profileRegistry,
    difficultyId,
    playerParticipantId,
    botParticipantId,
  });
  const supplyProjectionContract = Object.freeze({
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick,
    spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnIntervalTicks,
    spawnCount: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnCount,
    lifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.lifetimeTicks,
    spawnSpecs,
    equipmentDefinitionIds,
  });
  const coreOptions: Record<string, unknown> = {};
  for (const key of CORE_OPTION_KEYS) {
    if (key === 'supply') {
      coreOptions[key] = normalizedSupply;
      continue;
    }
    const value = readOptionalDataProperty(record, key, 'Arena V2 survival Bot composition');
    if (value !== undefined) coreOptions[key] = value;
  }

  let core: MatchCore | null = null;
  let controllerCleanup: CleanupHandle | null = null;
  let sessionCleanup: CleanupHandle | null = null;
  try {
    core = createArenaV2SurvivalSupplyMatchCore(coreOptions);
    factories.coreSupplyObserver?.(core, normalizedSupply);
    if (
      core.config.participantIds.length !== 2
      || core.config.participantIds[0] !== expectedParticipantIds[0]
      || core.config.participantIds[1] !== expectedParticipantIds[1]
    ) {
      throw new RangeError('survival Core participantIds 必须严格等于 player 与 Bot 的稳定排序集合。');
    }
    const compositionIdentity = Object.freeze({
      schemaVersion: FORMAL_COMPOSITION_IDENTITY_SCHEMA_VERSION,
      compositionId: SURVIVAL_BOT_COMPOSITION_ID,
      participantIds: Object.freeze([...core.config.participantIds]),
      mapDefinitionId: core.config.mapDefinitionId,
      contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
      compositionContractHash,
    }) satisfies ArenaV2SurvivalSupplyBotCompositionIdentityV1;
    const botCharacter = core.getCharacterDefinition(botParticipantId);
    const botMatchReadBundle = factories.bundleFactory({
      ownedNewCore: core,
      descriptor: Object.freeze({
        schemaVersion: 1,
        compositionId: SURVIVAL_BOT_COMPOSITION_ID,
        participantIds: Object.freeze([...core.config.participantIds]),
        mapDefinitionId: core.config.mapDefinitionId,
        contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
        compositionContractHash,
      }),
      localId: playerParticipantId,
      botId: botParticipantId,
      projectionContract: supplyProjectionContract,
    });
    const controllerCandidate = factories.botControllerFactory({
      participantId: botParticipantId,
      difficultyId,
      behaviorSeed,
      personalitySeed,
      profileRegistry,
      requireActiveSupplyProjection: true,
      supplyProjectionContract,
      trustedCommandSourceHandle: botMatchReadBundle,
      arena: core.config.arena,
      characterRadius: botCharacter.collision.radius,
      maximumStepHeight: botCharacter.movement.automaticStepHeight,
    });
    controllerCleanup = captureCleanupHandle(controllerCandidate, 'survival BotController');
    const botController = assertBotControllerCandidate(controllerCandidate);
    const sessionCandidate = factories.sessionFactory({
      core,
      botController,
      playerParticipantId,
      botParticipantId,
      botMatchReadBundle,
      publicMatchInfo,
    });
    sessionCleanup = captureCleanupHandle(sessionCandidate, 'survival LocalMatchSession');
    const session = assertNativeLocalMatchSessionBrand(sessionCandidate);
    // Native LocalMatchSession construction transfers Core/Bot ownership
    // before the remaining surface audit. Any later failure is therefore
    // cleaned through the Session exactly once, never through outer handles.
    core = null;
    controllerCleanup = null;
    sessionCleanup = bindCleanupMethod(LocalMatchSession.prototype.destroy, session);
    assertNativeLocalMatchSessionSurface(session);
    FORMAL_COMPOSITION_IDENTITIES.set(session, compositionIdentity);
    sessionCleanup = null;
    return session;
  } catch (error) {
    return cleanupComposition(sessionCleanup, controllerCleanup, core, error);
  }
}

/**
 * Reads only the identity registered by the production survival composition.
 * Fake, cloned, destroyed or prototype-drifted sessions fail closed.
 */
export function readArenaV2SurvivalSupplyBotCompositionIdentity(
  value: unknown,
): ArenaV2SurvivalSupplyBotCompositionIdentityV1 {
  if (value === null || typeof value !== 'object') {
    throw new TypeError('formal composition identity 需要原生 LocalMatchSession。');
  }
  // Resolve provenance before touching caller-controlled prototype traps. A
  // Proxy or clone is never the WeakMap key registered by the composition.
  const identity = FORMAL_COMPOSITION_IDENTITIES.get(value as LocalMatchSession);
  if (identity === undefined) {
    throw new TypeError('LocalMatchSession 不具备正式 survival composition provenance。');
  }
  if (Object.getPrototypeOf(value) !== LocalMatchSession.prototype) {
    throw new TypeError('formal composition identity 需要原生 LocalMatchSession。');
  }
  if (
    Object.getOwnPropertyDescriptor(LocalMatchSession.prototype, 'getPublicMatchInfo')?.value
    !== LOCAL_MATCH_GET_PUBLIC_INFO
  ) throw new Error('LocalMatchSession public-info 原型已漂移。');
  Reflect.apply(LOCAL_MATCH_GET_PUBLIC_INFO, value, []);
  return identity;
}
