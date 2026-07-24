import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  MatchContentPoolResolver,
  ProfileContentPoolProvider,
} from '@number-strategy-jump/arena-product-content';
import {
  ProductMatchCoordinator,
  QuickMatchProductFactory,
  type ProductMatchCompletionSink,
} from '@number-strategy-jump/arena-product-match';
import { RewardCommitter } from '@number-strategy-jump/arena-product-progression';
import { ProductSessionController } from '@number-strategy-jump/arena-product-session';
import { ProductSessionStateMachine } from '@number-strategy-jump/arena-product-state';
import { PlayerProfileRepository } from '@number-strategy-jump/arena-profile-persistence';
import { PlayerProfileService } from '@number-strategy-jump/arena-profile-service';
interface MatchSeedSource {
  nextSeed(): number;
}

export interface ProductSessionCompositionOptions {
  readonly storage: unknown;
  readonly ownerId: unknown;
  readonly profileLeaseHolderId?: unknown;
  readonly wallNow: unknown;
  readonly seedSource: unknown;
  readonly matchConfig?: unknown;
  readonly matchCompletionSink?: ProductMatchCompletionSink | null;
  readonly keyPrefix?: unknown;
  readonly profileLeaseTakeoverSameOwner?: boolean;
  readonly diagnosticSink?: ((diagnostic: unknown) => unknown) | null;
}

export interface ProductSessionCompositionDefaults {
  readonly quickMatchServiceFactory: (options: Readonly<Record<string, unknown>>) => unknown;
  readonly profileDefinition: unknown;
  readonly contentPoolDefinition: unknown;
  readonly contentCatalog: unknown;
  readonly replacementRegistry: unknown;
  readonly progressionRegistry: unknown;
  readonly rewardDefinitionId: unknown;
  readonly baseMatchConfig: Readonly<Record<string, unknown>>;
  readonly enforcedMatchConfig?: Readonly<Record<string, unknown>>;
}

interface NormalizedOptions {
  readonly storage: unknown;
  readonly ownerId: unknown;
  readonly profileLeaseHolderId: unknown;
  readonly wallNow: unknown;
  readonly seedSource: Readonly<MatchSeedSource>;
  readonly matchConfig: Readonly<Record<string, unknown>>;
  readonly matchCompletionSink: ProductMatchCompletionSink | null;
  readonly keyPrefix: unknown;
  readonly profileLeaseTakeoverSameOwner: boolean;
  readonly diagnosticSink: ((diagnostic: unknown) => unknown) | null;
}

interface NormalizedDefaults {
  readonly quickMatchServiceFactory: (options: Readonly<Record<string, unknown>>) => unknown;
  readonly profileDefinition: unknown;
  readonly contentPoolDefinition: unknown;
  readonly contentCatalog: unknown;
  readonly replacementRegistry: unknown;
  readonly progressionRegistry: unknown;
  readonly rewardDefinitionId: unknown;
  readonly baseMatchConfig: Readonly<Record<string, unknown>>;
  readonly enforcedMatchConfig: Readonly<Record<string, unknown>>;
}

type Destroy = () => unknown;
type AnyMethod = (...arguments_: never[]) => unknown;

const OPTION_KEYS = new Set([
  'storage',
  'ownerId',
  'profileLeaseHolderId',
  'wallNow',
  'seedSource',
  'matchConfig',
  'matchCompletionSink',
  'keyPrefix',
  'profileLeaseTakeoverSameOwner',
  'diagnosticSink',
]);
const REQUIRED_OPTION_KEYS = Object.freeze([
  'storage', 'ownerId', 'wallNow', 'seedSource',
]);
const DEFAULT_KEYS = new Set([
  'quickMatchServiceFactory',
  'profileDefinition',
  'contentPoolDefinition',
  'contentCatalog',
  'replacementRegistry',
  'progressionRegistry',
  'rewardDefinitionId',
  'baseMatchConfig',
  'enforcedMatchConfig',
]);
const REQUIRED_DEFAULT_KEYS = Object.freeze([
  'quickMatchServiceFactory',
  'profileDefinition',
  'contentPoolDefinition',
  'contentCatalog',
  'replacementRegistry',
  'progressionRegistry',
  'rewardDefinitionId',
  'baseMatchConfig',
]);

function readDataField(
  record: object,
  key: string,
  label: string,
  fallback?: unknown,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined && arguments.length >= 4) return fallback;
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function requireFields(record: object, keys: readonly string[], label: string): void {
  for (const key of keys) readDataField(record, key, label);
}

function snapshotMethod<T extends AnyMethod>(
  value: unknown,
  methodName: string,
  label: string,
): T {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${label} 必须实现 ${methodName}()。`);
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError(`${label} 原型链无效。`);
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, methodName);
    if (descriptor) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        throw new TypeError(`${label}.${methodName} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as T;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${label} 必须实现 ${methodName}()。`);
}

function frozenRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  const cloned = cloneFrozenData(value, label);
  return assertPlainRecord(cloned, label);
}

function rejectAsyncSyncReturn(value: unknown, label: string): void {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  const visited = new Set<object>();
  let current: object | null = value as object;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError(`${label} 返回值原型链无效。`);
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if ('value' in descriptor && typeof descriptor.value === 'function') {
        Promise.resolve(value).catch(() => {
          // The synchronous factory is rejected, but its late rejection is contained.
        });
      }
      throw new TypeError(`${label} 必须同步完成。`);
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
}

function normalizeOptions(value: unknown): NormalizedOptions {
  const source = value === undefined ? {} : value;
  assertKnownKeys(source, OPTION_KEYS, 'ProductSession Composition options');
  const record = assertPlainRecord(source, 'ProductSession Composition options');
  const rawMatchConfig = readDataField(
    record,
    'matchConfig',
    'ProductSession Composition options',
    {},
  );
  const matchConfig = frozenRecord(
    rawMatchConfig === undefined ? {} : rawMatchConfig,
    'ProductSession Composition matchConfig',
  );
  const rawMatchCompletionSink = readDataField(
    record,
    'matchCompletionSink',
    'ProductSession Composition options',
    null,
  );
  const matchCompletionSink = rawMatchCompletionSink === undefined ? null : rawMatchCompletionSink;
  if (matchCompletionSink !== null && typeof matchCompletionSink !== 'function') {
    throw new TypeError('ProductSession Composition matchCompletionSink 必须是函数或 null。');
  }
  const rawDiagnosticSink = readDataField(
    record,
    'diagnosticSink',
    'ProductSession Composition options',
    null,
  );
  const diagnosticSink = rawDiagnosticSink === undefined ? null : rawDiagnosticSink;
  if (diagnosticSink !== null && typeof diagnosticSink !== 'function') {
    throw new TypeError('ProductSession Composition diagnosticSink 必须是函数或 null。');
  }
  const rawTakeover = readDataField(
    record,
    'profileLeaseTakeoverSameOwner',
    'ProductSession Composition options',
    false,
  );
  const takeover = rawTakeover === undefined ? false : rawTakeover;
  if (typeof takeover !== 'boolean') {
    throw new TypeError('ProductSession Composition profileLeaseTakeoverSameOwner 必须是布尔值。');
  }
  const seedSource = readDataField(record, 'seedSource', 'ProductSession Composition options');
  const nextSeed = snapshotMethod<() => number>(seedSource, 'nextSeed', 'match seedSource');
  requireFields(record, REQUIRED_OPTION_KEYS, 'ProductSession Composition options');
  const ownerId = readDataField(record, 'ownerId', 'ProductSession Composition options');
  const rawLeaseHolderId = readDataField(
    record,
    'profileLeaseHolderId',
    'ProductSession Composition options',
    ownerId,
  );
  return Object.freeze({
    storage: readDataField(record, 'storage', 'ProductSession Composition options'),
    ownerId,
    profileLeaseHolderId: rawLeaseHolderId === undefined ? ownerId : rawLeaseHolderId,
    wallNow: readDataField(record, 'wallNow', 'ProductSession Composition options'),
    seedSource: Object.freeze({ nextSeed }),
    matchConfig,
    matchCompletionSink: matchCompletionSink as ProductMatchCompletionSink | null,
    keyPrefix: readDataField(record, 'keyPrefix', 'ProductSession Composition options', null),
    profileLeaseTakeoverSameOwner: takeover,
    diagnosticSink: diagnosticSink as ((diagnostic: unknown) => unknown) | null,
  });
}

function normalizeDefaults(value: unknown): NormalizedDefaults {
  assertKnownKeys(value, DEFAULT_KEYS, 'ProductSession Composition defaults');
  const record = assertPlainRecord(value, 'ProductSession Composition defaults');
  requireFields(record, REQUIRED_DEFAULT_KEYS, 'ProductSession Composition defaults');
  const quickMatchServiceFactory = readDataField(
    record,
    'quickMatchServiceFactory',
    'ProductSession Composition defaults',
  );
  if (typeof quickMatchServiceFactory !== 'function') {
    throw new TypeError('ProductSession Composition quickMatchServiceFactory 必须是函数。');
  }
  const rawEnforcedMatchConfig = readDataField(
    record,
    'enforcedMatchConfig',
    'ProductSession Composition defaults',
    {},
  );
  return Object.freeze({
    quickMatchServiceFactory: quickMatchServiceFactory as (
      options: Readonly<Record<string, unknown>>,
    ) => unknown,
    profileDefinition: readDataField(record, 'profileDefinition', 'ProductSession Composition defaults'),
    contentPoolDefinition: readDataField(record, 'contentPoolDefinition', 'ProductSession Composition defaults'),
    contentCatalog: readDataField(record, 'contentCatalog', 'ProductSession Composition defaults'),
    replacementRegistry: readDataField(record, 'replacementRegistry', 'ProductSession Composition defaults'),
    progressionRegistry: readDataField(record, 'progressionRegistry', 'ProductSession Composition defaults'),
    rewardDefinitionId: readDataField(record, 'rewardDefinitionId', 'ProductSession Composition defaults'),
    baseMatchConfig: frozenRecord(
      readDataField(record, 'baseMatchConfig', 'ProductSession Composition defaults'),
      'ProductSession Composition baseMatchConfig',
    ),
    enforcedMatchConfig: frozenRecord(
      rawEnforcedMatchConfig === undefined ? {} : rawEnforcedMatchConfig,
      'ProductSession Composition enforcedMatchConfig',
    ),
  });
}

function report(sink: ((diagnostic: unknown) => unknown) | null, value: unknown): void {
  try {
    sink?.(Object.freeze(value as object));
  } catch {
    // Diagnostics never gain ownership of Product or Match lifecycle.
  }
}

function cleanupOwned(cleanups: readonly (Destroy | null)[]): Error[] {
  const errors: Error[] = [];
  for (const cleanup of cleanups) {
    if (!cleanup) continue;
    try {
      cleanup();
    } catch (error) {
      errors.push(normalizeThrownError(error, 'ProductSession Composition 清理失败'));
    }
  }
  return errors;
}

export function createProductSessionComposition(
  options: ProductSessionCompositionOptions,
  defaults: ProductSessionCompositionDefaults,
): ProductSessionController {
  const normalized = normalizeOptions(options);
  const definition = normalizeDefaults(defaults);
  const resolvedMatchConfig = cloneFrozenData({
    ...definition.baseMatchConfig,
    ...normalized.matchConfig,
    ...definition.enforcedMatchConfig,
  }, 'ProductSession Composition resolved matchConfig');

  const contentPoolResolver = new MatchContentPoolResolver({
    definition: definition.contentPoolDefinition,
    catalog: definition.contentCatalog,
    replacementRegistry: definition.replacementRegistry,
    profileDefinition: definition.profileDefinition,
  });

  let repository: PlayerProfileRepository | null = null;
  let destroyRepository: Destroy | null = null;
  let profileService: PlayerProfileService | null = null;
  let destroyProfileService: Destroy | null = null;
  let matchCoordinator: ProductMatchCoordinator | null = null;
  let destroyMatchCoordinator: Destroy | null = null;
  let controller: ProductSessionController | null = null;
  let destroyController: Destroy | null = null;
  try {
    repository = new PlayerProfileRepository({
      definition: definition.profileDefinition,
      storage: normalized.storage,
      ownerId: normalized.ownerId as string,
      leaseHolderId: normalized.profileLeaseHolderId as string,
      wallNow: normalized.wallNow as () => number,
      keyPrefix: normalized.keyPrefix as string | null,
      leaseTakeoverSameOwner: normalized.profileLeaseTakeoverSameOwner,
    });
    destroyRepository = snapshotMethod<Destroy>(repository, 'destroy', 'PlayerProfileRepository');
    profileService = new PlayerProfileService({
      definition: definition.profileDefinition,
      repository,
    });
    destroyProfileService = snapshotMethod<Destroy>(profileService, 'destroy', 'PlayerProfileService');
    repository = null;
    destroyRepository = null;

    const contentPoolProvider = new ProfileContentPoolProvider({
      profileService,
      resolver: contentPoolResolver,
    });
    const quickMatchService = definition.quickMatchServiceFactory(Object.freeze({
      seedSource: normalized.seedSource,
      contentPoolProvider,
      diagnosticSink: (detail: unknown) => report(normalized.diagnosticSink, Object.freeze({
        type: 'match-assignment',
        detail,
      })),
    }));
    rejectAsyncSyncReturn(quickMatchService, 'quickMatchServiceFactory');
    const matchFactory = new QuickMatchProductFactory({
      quickMatchService,
      matchConfig: resolvedMatchConfig,
      completionSink: normalized.matchCompletionSink,
    });
    matchCoordinator = new ProductMatchCoordinator({ matchFactory });
    destroyMatchCoordinator = snapshotMethod<Destroy>(
      matchCoordinator,
      'destroy',
      'ProductMatchCoordinator',
    );
    const rewardCommitter = new RewardCommitter({
      registry: definition.progressionRegistry,
      rewardDefinitionId: definition.rewardDefinitionId,
      profileDefinition: definition.profileDefinition,
      profileService,
    });
    controller = new ProductSessionController({
      stateMachine: new ProductSessionStateMachine(),
      profileService,
      matchCoordinator,
      rewardCommitter,
      diagnosticSink: (detail) => report(normalized.diagnosticSink, Object.freeze({
        type: 'product-lifecycle',
        detail,
      })),
    });
    destroyController = snapshotMethod<Destroy>(
      controller,
      'destroy',
      'ProductSessionController',
    );
    profileService = null;
    destroyProfileService = null;
    matchCoordinator = null;
    destroyMatchCoordinator = null;
    destroyController = null;
    return controller;
  } catch (error) {
    const cleanupErrors = cleanupOwned([
      destroyController,
      destroyMatchCoordinator,
      destroyProfileService,
      destroyRepository,
    ]);
    throw combineCleanupFailure(
      normalizeThrownError(error, 'ProductSession Composition 创建失败'),
      cleanupErrors,
      'ProductSession Composition 创建失败且清理未完整完成。',
    );
  }
}
