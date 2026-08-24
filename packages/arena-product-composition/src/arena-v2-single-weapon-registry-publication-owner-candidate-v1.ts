import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import type {
  ActionRegistry,
  EquipmentRegistry,
  WeaponCombatGrammarDefinitionV1,
} from '@number-strategy-jump/arena-definitions';
import {
  createArenaV2SingleWeaponRegistrySnapshotCandidateV1,
  type ArenaV2SingleWeaponRegistrySnapshotCandidateV1,
} from './arena-v2-single-weapon-registry-snapshot-candidate-v1.js';

export const ARENA_V2_SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export type ArenaV2SingleWeaponRegistryPublicationStateCandidateV1 =
  | 'prepared'
  | 'published'
  | 'rolled-back'
  | 'sealed'
  | 'conflicted'
  | 'failed'
  | 'destroyed';

export interface ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1 {
  readonly collectionWeaponIds: readonly string[];
  readonly actionRegistry: ActionRegistry;
  readonly equipmentRegistry: EquipmentRegistry;
  readonly grammarDefinitions: readonly WeaponCombatGrammarDefinitionV1[];
}

export interface ArenaV2SingleWeaponRegistryPublicationReadCandidateV1 {
  readonly revision: number;
  readonly snapshotHash: string;
  readonly collectionWeaponIds: readonly string[];
}

export interface ArenaV2SingleWeaponRegistryPublicationCompareAndSwapInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly ownerId: string;
  readonly weaponId: string;
  readonly direction: 'publish' | 'rollback';
  readonly expectedRevision: number;
  readonly expectedSnapshotHash: string;
  readonly nextRevision: number;
  readonly nextSnapshotHash: string;
  readonly planContentHash: string;
  readonly snapshot: ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1;
}

export interface ArenaV2SingleWeaponRegistryPublicationCompareAndSwapResultCandidateV1 {
  readonly committed: boolean;
  readonly observedRevision: number;
  readonly observedSnapshotHash: string;
}

export interface ArenaV2SingleWeaponRegistryPublicationPortCandidateV1 {
  read(): unknown;
  compareAndSwap(input: ArenaV2SingleWeaponRegistryPublicationCompareAndSwapInputCandidateV1): unknown;
}

export interface ArenaV2SingleWeaponRegistryPublicationOwnerOptionsCandidateV1 {
  readonly ownerId: string;
  readonly snapshotOptions: unknown;
  readonly port: ArenaV2SingleWeaponRegistryPublicationPortCandidateV1;
}

const CONTENT_HASH_PATTERN = /^[0-9a-f]{8}$/u;
const OPTION_KEYS = new Set(['ownerId', 'snapshotOptions', 'port']);
const PORT_KEYS = new Set(['read', 'compareAndSwap']);
const READ_KEYS = new Set(['revision', 'snapshotHash', 'collectionWeaponIds']);
const CAS_RESULT_KEYS = new Set(['committed', 'observedRevision', 'observedSnapshotHash']);

type UnknownMethod = (...args: unknown[]) => unknown;

const POLICY = Object.freeze({
  schemaVersion:
    ARENA_V2_SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.single-weapon-registry-publication-owner-policy.candidate.v1' as const,
  status: 'production-unreachable' as const,
  concurrency: 'synchronous-cas-with-readback' as const,
  revisionPolicy: 'monotonic-safe-integer' as const,
  staleSnapshotPolicy: 'fail-closed-before-cas' as const,
  ambiguousCommitPolicy: 'readback-or-failed-indeterminate' as const,
  rollbackPolicy: 'only-exact-published-head-can-rollback' as const,
  reentrancyAllowed: false as const,
  swallowedPortReentryFailsClosed: true as const,
  portCallbacksCheckedByReentrySequence: true as const,
  snapshotRejectedDuringTransition: true as const,
  autoRollbackOnDestroy: false as const,
  sealRequiredBeforePublishedOwnerDestroy: true as const,
  groupRegistrationPermitted: false as const,
  defaultPortImplemented: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_POLICY_CANDIDATE_V1 =
  POLICY;

export class ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1 extends Error {
  readonly reason:
    | 'stale-base'
    | 'cas-conflict'
    | 'indeterminate-publication'
    | 'rollback-head-drift'
    | 'indeterminate-rollback';

  constructor(
    message: string,
    reason: ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1['reason'],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1';
    this.reason = reason;
    Object.freeze(this);
  }
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function contentHash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!CONTENT_HASH_PATTERN.test(result)) throw new RangeError(`${name}必须是8位小写hash。`);
  return result;
}

function collectionWeaponIds(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  const result = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不能包含重复身份。`);
  return Object.freeze(result);
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function nextRevision(revision: number, name: string): number {
  if (revision >= Number.MAX_SAFE_INTEGER) throw new RangeError(`${name} revision已经耗尽。`);
  return revision + 1;
}

function normalizeRead(
  value: unknown,
  name: string,
): ArenaV2SingleWeaponRegistryPublicationReadCandidateV1 {
  exactRecord(value, READ_KEYS, name);
  return Object.freeze({
    revision: assertIntegerAtLeast(value.revision, 0, `${name}.revision`),
    snapshotHash: contentHash(value.snapshotHash, `${name}.snapshotHash`),
    collectionWeaponIds: collectionWeaponIds(
      value.collectionWeaponIds,
      `${name}.collectionWeaponIds`,
    ),
  });
}

function normalizeCasResult(
  value: unknown,
  name: string,
): ArenaV2SingleWeaponRegistryPublicationCompareAndSwapResultCandidateV1 {
  exactRecord(value, CAS_RESULT_KEYS, name);
  if (typeof value.committed !== 'boolean') throw new TypeError(`${name}.committed必须是布尔值。`);
  return Object.freeze({
    committed: value.committed,
    observedRevision: assertIntegerAtLeast(
      value.observedRevision,
      0,
      `${name}.observedRevision`,
    ),
    observedSnapshotHash: contentHash(
      value.observedSnapshotHash,
      `${name}.observedSnapshotHash`,
    ),
  });
}

function normalizePort(
  value: unknown,
): Readonly<ArenaV2SingleWeaponRegistryPublicationPortCandidateV1> {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    throw new TypeError('Arena V2 registry publication port无效。');
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      throw new TypeError('Arena V2 registry publication port不能包含Symbol字段。');
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) {
      throw new TypeError(`Arena V2 registry publication port.${key}必须是可枚举数据字段。`);
    }
    if (!PORT_KEYS.has(key)) {
      throw new RangeError(`Arena V2 registry publication port不支持字段${key}。`);
    }
  }

  const method = (name: 'read' | 'compareAndSwap'): UnknownMethod => {
    let owner: object | null = value;
    const visited = new Set<object>();
    while (owner !== null && !visited.has(owner)) {
      visited.add(owner);
      const descriptor = Object.getOwnPropertyDescriptor(owner, name);
      if (descriptor !== undefined) {
        if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
          throw new TypeError(`Arena V2 registry publication port.${name}必须是数据方法。`);
        }
        return descriptor.value as UnknownMethod;
      }
      owner = Object.getPrototypeOf(owner) as object | null;
    }
    throw new TypeError(`Arena V2 registry publication port.${name}必须是函数。`);
  };
  const read = method('read');
  const compareAndSwap = method('compareAndSwap');
  return Object.freeze({
    read: () => Reflect.apply(read, value, []),
    compareAndSwap: (
      input: ArenaV2SingleWeaponRegistryPublicationCompareAndSwapInputCandidateV1,
    ) => Reflect.apply(compareAndSwap, value, [input]),
  });
}

function publishedSnapshot(
  source: ArenaV2SingleWeaponRegistrySnapshotCandidateV1['previous']
    | ArenaV2SingleWeaponRegistrySnapshotCandidateV1['next'],
): ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1 {
  return Object.freeze({
    collectionWeaponIds: source.collectionWeaponIds,
    actionRegistry: source.actionRegistry,
    equipmentRegistry: source.equipmentRegistry,
    grammarDefinitions: source.grammarDefinitions,
  });
}

function message(error: unknown): string {
  return typeof error === 'string' && error.length > 0
    ? error
    : 'Arena V2 Registry publication发生非字符串失败。';
}

export class ArenaV2SingleWeaponRegistryPublicationOwnerCandidateV1 {
  #ownerId: string | null;
  #candidate: ArenaV2SingleWeaponRegistrySnapshotCandidateV1 | null;
  #port: Readonly<ArenaV2SingleWeaponRegistryPublicationPortCandidateV1> | null;
  #state: ArenaV2SingleWeaponRegistryPublicationStateCandidateV1 = 'prepared';
  #transitioning = false;
  #reentrySequence = 0;
  #baseRevision: number;
  #publishedRevision: number | null = null;
  #rollbackRevision: number | null = null;
  #publishAttempts = 0;
  #rollbackAttempts = 0;
  #lastFailure: string | null = null;

  constructor(options: ArenaV2SingleWeaponRegistryPublicationOwnerOptionsCandidateV1) {
    exactRecord(options, OPTION_KEYS, 'Arena V2 registry publication owner options');
    this.#ownerId = assertNonEmptyString(options.ownerId, 'Arena V2 registry publication ownerId');
    this.#candidate = createArenaV2SingleWeaponRegistrySnapshotCandidateV1(
      options.snapshotOptions,
    );
    this.#port = normalizePort(options.port);
    const current = this.#read('Arena V2 registry publication constructor read');
    if (!this.#matchesPrevious(current)) {
      throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
        'Arena V2 Registry当前头与候选previous快照不一致。',
        'stale-base',
      );
    }
    this.#baseRevision = current.revision;
    Object.freeze(this);
  }

  #requiredCandidate(): ArenaV2SingleWeaponRegistrySnapshotCandidateV1 {
    if (this.#candidate === null) throw new Error('Arena V2 Registry发布Owner已销毁。');
    return this.#candidate;
  }

  #requiredPort(): Readonly<ArenaV2SingleWeaponRegistryPublicationPortCandidateV1> {
    if (this.#port === null) throw new Error('Arena V2 Registry发布Owner已销毁。');
    return this.#port;
  }

  #notTransitioning(): void {
    if (!this.#transitioning) return;
    this.#reentrySequence += 1;
    throw new Error('Arena V2 Registry发布Owner操作不可重入。');
  }

  #hasState(state: ArenaV2SingleWeaponRegistryPublicationStateCandidateV1): boolean {
    return this.#state === state;
  }

  #beginTransition(): void {
    this.#notTransitioning();
    this.#transitioning = true;
  }

  #assertNoReentrySince(
    sequence: number,
    operation: string,
    reason: ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1['reason'],
    cause?: unknown,
  ): void {
    if (this.#reentrySequence === sequence) return;
    this.#state = 'failed';
    throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
      `Arena V2 Registry ${operation}期间发生重入。`,
      reason,
      cause === undefined ? undefined : { cause },
    );
  }

  #runPortOperation<T>(
    operation: string,
    reason: ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1['reason'],
    callback: () => T,
  ): T {
    const reentrySequence = this.#reentrySequence;
    let result: T;
    try {
      result = callback();
    } catch (error) {
      this.#assertNoReentrySince(reentrySequence, operation, reason, error);
      throw error;
    }
    this.#assertNoReentrySince(reentrySequence, operation, reason);
    return result;
  }

  #endTransition(): void {
    this.#transitioning = false;
  }

  #read(
    name: string,
    reason: ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1['reason'] =
      'indeterminate-publication',
  ): ArenaV2SingleWeaponRegistryPublicationReadCandidateV1 {
    return normalizeRead(this.#runPortOperation(
      name,
      reason,
      () => this.#requiredPort().read(),
    ), name);
  }

  #matchesPrevious(value: ArenaV2SingleWeaponRegistryPublicationReadCandidateV1): boolean {
    const candidate = this.#requiredCandidate();
    return value.snapshotHash === candidate.previousSnapshotHash
      && sameIds(value.collectionWeaponIds, candidate.previous.collectionWeaponIds);
  }

  #matchesNext(value: ArenaV2SingleWeaponRegistryPublicationReadCandidateV1): boolean {
    const candidate = this.#requiredCandidate();
    return value.snapshotHash === candidate.nextSnapshotHash
      && sameIds(value.collectionWeaponIds, candidate.next.collectionWeaponIds);
  }

  #recordFailure(error: unknown): void {
    this.#lastFailure = message(error);
  }

  #cas(
    direction: 'publish' | 'rollback',
    expected: ArenaV2SingleWeaponRegistryPublicationReadCandidateV1,
    nextHash: string,
    snapshot: ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1,
  ): ArenaV2SingleWeaponRegistryPublicationCompareAndSwapResultCandidateV1 {
    const candidate = this.#requiredCandidate();
    const name = `Arena V2 registry ${direction} CAS result`;
    return normalizeCasResult(this.#runPortOperation(
      name,
      direction === 'publish' ? 'indeterminate-publication' : 'indeterminate-rollback',
      () => this.#requiredPort().compareAndSwap(Object.freeze({
        schemaVersion:
          ARENA_V2_SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_CANDIDATE_V1_SCHEMA_VERSION,
        ownerId: this.#ownerId!,
        weaponId: candidate.weaponId,
        direction,
        expectedRevision: expected.revision,
        expectedSnapshotHash: expected.snapshotHash,
        nextRevision: nextRevision(expected.revision, `Arena V2 ${direction}`),
        nextSnapshotHash: nextHash,
        planContentHash: candidate.planContentHash,
        snapshot,
      })),
    ), name);
  }

  publish(): Readonly<ArenaV2SingleWeaponRegistryPublicationOwnerSnapshotCandidateV1> {
    this.#notTransitioning();
    if (this.#state !== 'prepared') throw new Error(`Arena V2 Registry发布状态无效：${this.#state}。`);
    this.#beginTransition();
    this.#publishAttempts += 1;
    const candidate = this.#requiredCandidate();
    let expected: ArenaV2SingleWeaponRegistryPublicationReadCandidateV1 | null = null;
    try {
      expected = this.#read('Arena V2 registry publication preflight read');
      if (expected.revision !== this.#baseRevision || !this.#matchesPrevious(expected)) {
        this.#state = 'conflicted';
        throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
          'Arena V2 Registry发布前基础快照已经变化。',
          'stale-base',
        );
      }
      let result: ArenaV2SingleWeaponRegistryPublicationCompareAndSwapResultCandidateV1;
      try {
        result = this.#cas(
          'publish',
          expected,
          candidate.nextSnapshotHash,
          publishedSnapshot(candidate.next),
        );
      } catch (error) {
        if (this.#hasState('failed')) throw error;
        let readback: ArenaV2SingleWeaponRegistryPublicationReadCandidateV1;
        try {
          readback = this.#read('Arena V2 registry publication exception readback');
        } catch (readbackError) {
          this.#state = 'failed';
          throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
            'Arena V2 Registry发布异常后无法完成readback，提交状态不确定。',
            'indeterminate-publication',
            { cause: new AggregateError([error, readbackError]) },
          );
        }
        if (readback.revision === nextRevision(expected.revision, 'Arena V2 publish readback')
          && this.#matchesNext(readback)) {
          this.#state = 'published';
          this.#publishedRevision = readback.revision;
          return this.#snapshot();
        }
        this.#state = 'failed';
        throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
          'Arena V2 Registry发布结果不确定且readback未证明提交。',
          'indeterminate-publication',
          { cause: error },
        );
      }
      const readback = this.#read('Arena V2 registry publication readback');
      const targetRevision = nextRevision(expected.revision, 'Arena V2 publish target');
      if (readback.revision === targetRevision && this.#matchesNext(readback)) {
        this.#state = 'published';
        this.#publishedRevision = readback.revision;
        return this.#snapshot();
      }
      if (!result.committed
        && readback.revision === expected.revision
        && this.#matchesPrevious(readback)) {
        this.#state = 'conflicted';
        throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
          'Arena V2 Registry CAS发布发生竞争冲突。',
          'cas-conflict',
        );
      }
      this.#state = 'failed';
      throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
        'Arena V2 Registry CAS返回与readback不一致。',
        'indeterminate-publication',
      );
    } catch (error) {
      if (this.#state === 'prepared') this.#state = 'failed';
      this.#recordFailure(error);
      throw error;
    } finally {
      this.#endTransition();
    }
  }

  rollback(): Readonly<ArenaV2SingleWeaponRegistryPublicationOwnerSnapshotCandidateV1> {
    this.#notTransitioning();
    if (this.#state !== 'published' || this.#publishedRevision === null) {
      throw new Error(`Arena V2 Registry回滚状态无效：${this.#state}。`);
    }
    this.#beginTransition();
    this.#rollbackAttempts += 1;
    const candidate = this.#requiredCandidate();
    try {
      const expected = this.#read(
        'Arena V2 registry rollback preflight read',
        'indeterminate-rollback',
      );
      if (expected.revision !== this.#publishedRevision || !this.#matchesNext(expected)) {
        this.#state = 'conflicted';
        throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
          'Arena V2 Registry当前头不再是该单把发布，拒绝误回滚后续武器。',
          'rollback-head-drift',
        );
      }
      let result: ArenaV2SingleWeaponRegistryPublicationCompareAndSwapResultCandidateV1;
      try {
        result = this.#cas(
          'rollback',
          expected,
          candidate.previousSnapshotHash,
          publishedSnapshot(candidate.previous),
        );
      } catch (error) {
        if (this.#hasState('failed')) throw error;
        let readback: ArenaV2SingleWeaponRegistryPublicationReadCandidateV1;
        try {
          readback = this.#read(
            'Arena V2 registry rollback exception readback',
            'indeterminate-rollback',
          );
        } catch (readbackError) {
          this.#state = 'failed';
          throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
            'Arena V2 Registry回滚异常后无法完成readback，恢复状态不确定。',
            'indeterminate-rollback',
            { cause: new AggregateError([error, readbackError]) },
          );
        }
        if (readback.revision === nextRevision(expected.revision, 'Arena V2 rollback readback')
          && this.#matchesPrevious(readback)) {
          this.#state = 'rolled-back';
          this.#rollbackRevision = readback.revision;
          return this.#snapshot();
        }
        this.#state = 'failed';
        throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
          'Arena V2 Registry回滚结果不确定且readback未证明恢复。',
          'indeterminate-rollback',
          { cause: error },
        );
      }
      const readback = this.#read(
        'Arena V2 registry rollback readback',
        'indeterminate-rollback',
      );
      const targetRevision = nextRevision(expected.revision, 'Arena V2 rollback target');
      if (readback.revision === targetRevision && this.#matchesPrevious(readback)) {
        this.#state = 'rolled-back';
        this.#rollbackRevision = readback.revision;
        return this.#snapshot();
      }
      if (!result.committed
        && readback.revision === expected.revision
        && this.#matchesNext(readback)) {
        this.#state = 'conflicted';
        throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
          'Arena V2 Registry CAS回滚发生竞争冲突。',
          'cas-conflict',
        );
      }
      this.#state = 'failed';
      throw new ArenaV2SingleWeaponRegistryPublicationErrorCandidateV1(
        'Arena V2 Registry回滚CAS返回与readback不一致。',
        'indeterminate-rollback',
      );
    } catch (error) {
      if (this.#state === 'published') this.#state = 'failed';
      this.#recordFailure(error);
      throw error;
    } finally {
      this.#endTransition();
    }
  }

  sealPublication(): Readonly<ArenaV2SingleWeaponRegistryPublicationOwnerSnapshotCandidateV1> {
    this.#notTransitioning();
    if (this.#state !== 'published') throw new Error(`Arena V2 Registry封存状态无效：${this.#state}。`);
    this.#state = 'sealed';
    return this.snapshot();
  }

  #snapshot(): Readonly<ArenaV2SingleWeaponRegistryPublicationOwnerSnapshotCandidateV1> {
    const candidate = this.#candidate;
    return Object.freeze({
      schemaVersion:
        ARENA_V2_SINGLE_WEAPON_REGISTRY_PUBLICATION_OWNER_CANDIDATE_V1_SCHEMA_VERSION,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      state: this.#state,
      transitioning: this.#transitioning,
      ownerId: this.#ownerId,
      weaponId: candidate?.weaponId ?? null,
      planContentHash: candidate?.planContentHash ?? null,
      previousSnapshotHash: candidate?.previousSnapshotHash ?? null,
      nextSnapshotHash: candidate?.nextSnapshotHash ?? null,
      baseRevision: this.#baseRevision,
      publishedRevision: this.#publishedRevision,
      rollbackRevision: this.#rollbackRevision,
      publishAttempts: this.#publishAttempts,
      rollbackAttempts: this.#rollbackAttempts,
      lastFailure: this.#lastFailure,
      defaultPortImplemented: false as const,
      defaultRegistryWired: false as const,
      defaultCompositionWired: false as const,
    });
  }

  snapshot(): Readonly<ArenaV2SingleWeaponRegistryPublicationOwnerSnapshotCandidateV1> {
    this.#notTransitioning();
    return this.#snapshot();
  }

  destroy(): Readonly<ArenaV2SingleWeaponRegistryPublicationOwnerSnapshotCandidateV1> {
    this.#notTransitioning();
    if (this.#state === 'destroyed') return this.snapshot();
    if (this.#state === 'published') {
      throw new Error('Arena V2 Registry发布后必须显式回滚或封存，禁止直接销毁Owner。');
    }
    this.#candidate = null;
    this.#port = null;
    this.#ownerId = null;
    this.#state = 'destroyed';
    return this.snapshot();
  }
}

export interface ArenaV2SingleWeaponRegistryPublicationOwnerSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly state: ArenaV2SingleWeaponRegistryPublicationStateCandidateV1;
  readonly transitioning: boolean;
  readonly ownerId: string | null;
  readonly weaponId: string | null;
  readonly planContentHash: string | null;
  readonly previousSnapshotHash: string | null;
  readonly nextSnapshotHash: string | null;
  readonly baseRevision: number;
  readonly publishedRevision: number | null;
  readonly rollbackRevision: number | null;
  readonly publishAttempts: number;
  readonly rollbackAttempts: number;
  readonly lastFailure: string | null;
  readonly defaultPortImplemented: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
}
