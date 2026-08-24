import {
  ARENA_MATCH_EVENT_V6,
  assertKnownKeys,
  assertArenaV6ActionFeedbackOutcomeConsistencyV1,
  assertArenaV6CompetitiveEquipmentActionEligibilityV1,
  assertArenaV6SurvivalEquipmentActionEligibilityV1,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createArenaMatchEventV6,
  createParticipantEquipmentUsageV3FromEvents,
  type ArenaMatchEventV6,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createProductMatchResultV3,
  createProductPublicMatchInfoV2,
  type ProductAuthorityIdentityV3,
  type ProductMatchResultV3,
  type ProductPublicMatchInfoV2,
} from '@number-strategy-jump/arena-product-contracts';

export const MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE = Object.freeze({
  COLLECTING: 'collecting',
  FINALIZED: 'finalized',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ModeProductResultAssemblerV3State = typeof MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE[
  keyof typeof MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE
];

export interface ModeProductResultAssemblerV3Options {
  readonly modeKind: 'duel' | 'race' | 'survival';
  readonly publicMatchInfo: unknown;
  /**
   * Accepts either the legacy finalized value or a narrow runtime source with
   * getTerminalAuthorityIdentity(). The latter is resolved only after the
   * unique MatchEnded event has been accepted.
   */
  readonly authorityIdentity: unknown;
}

const OPTION_KEYS = new Set(['modeKind', 'publicMatchInfo', 'authorityIdentity']);
const AUTHORITY_KEYS = new Set([
  'replaySchemaVersion', 'ruleSchemaVersion', 'physicsBackendVersion', 'configHash',
  'ruleContentHash', 'finalHash',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);
const MAX_SYNC_RETURN_PROTOTYPE_DEPTH = 32;
const NATIVE_PROMISE_PROTOTYPE = Promise.prototype;
const NATIVE_PROMISE_CONSTRUCTOR = Promise;
const CAPTURED_PROMISE_THEN_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_PROTOTYPE,
  'then',
);
if (CAPTURED_PROMISE_THEN_DESCRIPTOR === undefined
  || !Object.hasOwn(CAPTURED_PROMISE_THEN_DESCRIPTOR, 'value')
  || typeof CAPTURED_PROMISE_THEN_DESCRIPTOR.value !== 'function') {
  throw new TypeError('ModeProductResultAssemblerV3无法捕获原生Promise.prototype.then。');
}
const NATIVE_PROMISE_THEN = CAPTURED_PROMISE_THEN_DESCRIPTOR.value as (
  ...arguments_: unknown[]
) => unknown;
const NATIVE_PROMISE_THEN_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_THEN_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_THEN_DESCRIPTOR.enumerable,
  writable: CAPTURED_PROMISE_THEN_DESCRIPTOR.writable,
});
const CAPTURED_PROMISE_SPECIES_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_CONSTRUCTOR,
  Symbol.species,
);
if (CAPTURED_PROMISE_SPECIES_DESCRIPTOR === undefined
  || typeof CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get !== 'function'
  || CAPTURED_PROMISE_SPECIES_DESCRIPTOR.set !== undefined) {
  throw new TypeError('ModeProductResultAssemblerV3无法捕获原生Promise[Symbol.species]。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.enumerable,
});
const NOOP = (): void => {};

type PortMethod = (...arguments_: readonly unknown[]) => unknown;

interface AuthorityIdentitySourceV3 {
  readonly read: () => unknown;
}

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少字段${key}。`);
  }
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash。`);
  }
  return value;
}

function authorityIdentity(value: unknown): ProductAuthorityIdentityV3 {
  const source = cloneFrozenData(value, 'ModeProductResultAssemblerV3 authorityIdentity');
  assertKnownKeys(source, AUTHORITY_KEYS, 'ModeProductResultAssemblerV3 authorityIdentity');
  requireKeys(source, AUTHORITY_KEYS, 'ModeProductResultAssemblerV3 authorityIdentity');
  if (source.replaySchemaVersion !== 6 || source.ruleSchemaVersion !== 6) {
    throw new RangeError('ModeProductResultAssemblerV3只接受Replay/Rule schema 6。');
  }
  return Object.freeze({
    replaySchemaVersion: 6,
    ruleSchemaVersion: 6,
    physicsBackendVersion: assertNonEmptyString(
      source.physicsBackendVersion,
      'ModeProductResultAssemblerV3.physicsBackendVersion',
    ),
    configHash: hash(source.configHash, 'ModeProductResultAssemblerV3.configHash'),
    ruleContentHash: hash(
      source.ruleContentHash,
      'ModeProductResultAssemblerV3.ruleContentHash',
    ),
    finalHash: hash(source.finalHash, 'ModeProductResultAssemblerV3.finalHash'),
  });
}

function optionalDataMethod(target: unknown, key: string): PortMethod | null {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    return null;
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNC_RETURN_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) {
      throw new TypeError('ModeProductResultAssemblerV3 authority source原型链循环。');
    }
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`ModeProductResultAssemblerV3 authority source.${key}必须是数据方法。`);
      }
      const method = descriptor.value as PortMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(method, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  if (cursor !== null) {
    throw new RangeError(
      `ModeProductResultAssemblerV3 authority source原型链超过${MAX_SYNC_RETURN_PROTOTYPE_DEPTH}层。`,
    );
  }
  return null;
}

function assertNativePromiseIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (descriptor === undefined
    || !Object.hasOwn(descriptor, 'value')
    || descriptor.value !== NATIVE_PROMISE_THEN
    || descriptor.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || descriptor.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError(
      'ModeProductResultAssemblerV3原生Promise.prototype.then描述符漂移。',
    );
  }
}

function assertNativePromiseSpeciesIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    NATIVE_PROMISE_CONSTRUCTOR,
    Symbol.species,
  );
  if (descriptor === undefined
    || descriptor.get !== NATIVE_PROMISE_SPECIES_GETTER
    || descriptor.set !== undefined
    || descriptor.configurable !== NATIVE_PROMISE_SPECIES_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_SPECIES_FLAGS.enumerable) {
    throw new TypeError('ModeProductResultAssemblerV3原生Promise[Symbol.species]描述符漂移。');
  }
}

function synchronous<T>(value: T, name: string): T {
  assertNativePromiseIntegrity();
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return value;
  const visited = new Set<object>();
  let cursor: object | null = value as object;
  let thenDescriptor: PropertyDescriptor | null = null;
  let constructorDescriptor: PropertyDescriptor | null = null;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNC_RETURN_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) throw new TypeError(`${name}返回值原型链循环。`);
    visited.add(cursor);
    thenDescriptor ??= Object.getOwnPropertyDescriptor(cursor, 'then') ?? null;
    constructorDescriptor ??=
      Object.getOwnPropertyDescriptor(cursor, 'constructor') ?? null;
    cursor = Object.getPrototypeOf(cursor);
  }
  if (cursor !== null) {
    throw new RangeError(`${name}返回值原型链超过${MAX_SYNC_RETURN_PROTOTYPE_DEPTH}层。`);
  }
  if (constructorDescriptor !== null && !Object.hasOwn(constructorDescriptor, 'value')) {
    throw new TypeError(`${name}返回访问器constructor。`);
  }
  if (constructorDescriptor?.value === NATIVE_PROMISE_CONSTRUCTOR) {
    assertNativePromiseSpeciesIntegrity();
    let nativePromise = false;
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, value, [NOOP, NOOP]);
      nativePromise = true;
    } catch {
      // constructor identity can be spoofed; ordinary thenables stay descriptor-only.
    }
    if (nativePromise) throw new TypeError(`${name}必须同步完成。`);
  }
  if (thenDescriptor === null) return value;
  if (!Object.hasOwn(thenDescriptor, 'value')) {
    throw new TypeError(`${name}返回访问器thenable。`);
  }
  throw new TypeError(`${name}返回then字段，必须同步完成。`);
}

function authorityIdentitySource(value: unknown): AuthorityIdentitySourceV3 {
  const deferred = optionalDataMethod(value, 'getTerminalAuthorityIdentity');
  if (deferred !== null) {
    return Object.freeze({
      read: () => synchronous(
        deferred(),
        'ModeProductResultAssemblerV3 getTerminalAuthorityIdentity',
      ),
    });
  }
  const fixed = authorityIdentity(value);
  return Object.freeze({ read: () => fixed });
}

function eventModeDefinitionId(event: DeepReadonly<ArenaMatchEventV6>): string | null {
  return 'modeDefinitionId' in event ? event.modeDefinitionId : null;
}

export class ModeProductResultAssemblerV3 {
  readonly #modeKind: 'duel' | 'race' | 'survival';
  readonly #publicMatchInfo: DeepReadonly<ProductPublicMatchInfoV2>;
  #authorityIdentitySource: AuthorityIdentitySourceV3 | null;
  readonly #events: DeepReadonly<ArenaMatchEventV6>[] = [];
  readonly #eventIds = new Set<string>();
  #state: ModeProductResultAssemblerV3State = MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.COLLECTING;
  #result: DeepReadonly<ProductMatchResultV3> | null = null;

  constructor(options: ModeProductResultAssemblerV3Options);
  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'ModeProductResultAssemblerV3 options');
    assertKnownKeys(source, OPTION_KEYS, 'ModeProductResultAssemblerV3 options');
    requireKeys(source, OPTION_KEYS, 'ModeProductResultAssemblerV3 options');
    if (!MODE_KINDS.has(source.modeKind)) {
      throw new RangeError('ModeProductResultAssemblerV3.modeKind不受支持。');
    }
    this.#modeKind = source.modeKind as 'duel' | 'race' | 'survival';
    this.#publicMatchInfo = createProductPublicMatchInfoV2(source.publicMatchInfo);
    this.#authorityIdentitySource = authorityIdentitySource(source.authorityIdentity);
  }

  get state(): ModeProductResultAssemblerV3State { return this.#state; }

  get result(): DeepReadonly<ProductMatchResultV3> | null { return this.#result; }

  appendEvents(value: unknown): readonly DeepReadonly<ArenaMatchEventV6>[] {
    if (this.#state !== MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.COLLECTING) {
      throw new Error(`ModeProductResultAssemblerV3状态${this.#state}拒绝事件。`);
    }
    if (!Array.isArray(value)) throw new TypeError('ModeProductResultAssemblerV3 events必须是数组。');
    if (this.#events.at(-1)?.type === ARENA_MATCH_EVENT_V6.MATCH_ENDED) {
      throw new Error('ModeProductResultAssemblerV3终局后拒绝追加事件。');
    }
    let previousSequence = this.#events.at(-1)?.sequence ?? -1;
    let previousTick = this.#events.at(-1)?.tick ?? -1;
    const batchEventIds = new Set<string>();
    const batch = value.map((candidate, index) => {
      const event = createArenaMatchEventV6(candidate);
      if (this.#eventIds.has(event.id) || batchEventIds.has(event.id)) {
        throw new RangeError(`ModeProductResultAssemblerV3 events[${index}] id重复。`);
      }
      batchEventIds.add(event.id);
      if (event.sequence !== previousSequence + 1) {
        throw new RangeError('ModeProductResultAssemblerV3 events必须全局sequence连续唯一升序。');
      }
      if (event.tick < previousTick) {
        throw new RangeError('ModeProductResultAssemblerV3 events的authority tick不能回退。');
      }
      const eventModeId = eventModeDefinitionId(event);
      if (eventModeId !== null && eventModeId !== this.#publicMatchInfo.modeDefinitionId) {
        throw new RangeError('ModeProductResultAssemblerV3 event Mode身份漂移。');
      }
      if (event.type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED) {
        const participantIds = new Set(
          this.#publicMatchInfo.participantAssignments.map(({ participantId }) => participantId),
        );
        for (const [name, participantId] of [
          ['attackerId', event.attackerId],
          ['targetId', event.targetId],
          ['creditedAttackerId', event.creditedAttackerId],
        ] as const) {
          if (participantId !== null && !participantIds.has(participantId)) {
            throw new RangeError(`ModeProductResultAssemblerV3 feedback ${name}不属于当局。`);
          }
        }
      }
      previousSequence = event.sequence;
      previousTick = event.tick;
      return event;
    });
    if (this.#events.length === 0 && batch[0]?.type !== ARENA_MATCH_EVENT_V6.MATCH_STARTED) {
      throw new RangeError('ModeProductResultAssemblerV3首个事件必须是MatchStarted。');
    }
    const startedEvents = batch.filter(
      (event) => event.type === ARENA_MATCH_EVENT_V6.MATCH_STARTED,
    );
    if (startedEvents.length > 1) {
      throw new RangeError('ModeProductResultAssemblerV3 MatchStarted只能出现一次。');
    }
    const started = startedEvents[0];
    if (started && this.#events.length !== 0) {
      throw new RangeError('ModeProductResultAssemblerV3 MatchStarted只能出现一次。');
    }
    if (started) {
      const expected = this.#publicMatchInfo.participantAssignments.map(({ participantId }) => (
        participantId
      ));
      if (
        started.participantIds.length !== expected.length
        || started.participantIds.some((id, index) => id !== expected[index])
      ) {
        throw new RangeError('ModeProductResultAssemblerV3 MatchStarted participant集合不一致。');
      }
    }
    const endedEvents = batch.filter(
      (event) => event.type === ARENA_MATCH_EVENT_V6.MATCH_ENDED,
    );
    if (endedEvents.length > 1) {
      throw new RangeError('ModeProductResultAssemblerV3 MatchEnded只能出现一次。');
    }
    const endedIndex = batch.findIndex((event) => event.type === ARENA_MATCH_EVENT_V6.MATCH_ENDED);
    if (endedIndex !== -1 && endedIndex !== batch.length - 1) {
      throw new RangeError('ModeProductResultAssemblerV3 MatchEnded必须是最后事件。');
    }
    for (const event of batch) {
      this.#eventIds.add(event.id);
      this.#events.push(event);
    }
    return Object.freeze([...batch]);
  }

  finalize(): DeepReadonly<ProductMatchResultV3> {
    if (this.#state === MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.FINALIZED) return this.#result!;
    if (this.#state !== MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.COLLECTING) {
      throw new Error(`ModeProductResultAssemblerV3状态${this.#state}不能finalize。`);
    }
    try {
      const first = this.#events[0];
      const last = this.#events.at(-1);
      if (first?.type !== ARENA_MATCH_EVENT_V6.MATCH_STARTED) {
        throw new RangeError('ModeProductResultAssemblerV3缺少MatchStarted。');
      }
      if (last?.type !== ARENA_MATCH_EVENT_V6.MATCH_ENDED) {
        throw new RangeError('ModeProductResultAssemblerV3缺少终局MatchEnded。');
      }
      if (last.modeResult.kind !== this.#modeKind) {
        throw new RangeError('ModeProductResultAssemblerV3 Mode kind与终局结果不一致。');
      }
      const participantIds = this.#publicMatchInfo.participantAssignments.map(
        ({ participantId }) => participantId,
      );
      assertArenaV6ActionFeedbackOutcomeConsistencyV1(this.#events);
      if (this.#modeKind === 'duel' || this.#modeKind === 'race') {
        assertArenaV6CompetitiveEquipmentActionEligibilityV1({
          modeKind: this.#modeKind,
          participants: this.#publicMatchInfo.participantAssignments.map((entry) => ({
            participantId: entry.participantId,
            modeRole: entry.modeRole,
            slotId: entry.slotId,
            slotGeneration: entry.slotGeneration,
          })),
          events: this.#events,
        });
      } else {
        assertArenaV6SurvivalEquipmentActionEligibilityV1({
          participants: this.#publicMatchInfo.participantAssignments.map((entry) => ({
            participantId: entry.participantId,
            modeRole: entry.modeRole,
            slotId: entry.slotId,
            slotGeneration: entry.slotGeneration,
          })),
          events: this.#events,
        });
      }
      const participantEquipmentUsage = createParticipantEquipmentUsageV3FromEvents({
        participantIds,
        allowedCollectionEquipmentDefinitionIds:
          this.#publicMatchInfo.content.equipmentDefinitionIds,
        events: this.#events,
      });
      if (this.#authorityIdentitySource === null) {
        throw new Error('ModeProductResultAssemblerV3 authority identity source不可用。');
      }
      const terminalAuthorityIdentity = authorityIdentity(
        this.#authorityIdentitySource.read(),
      );
      this.#result = createProductMatchResultV3({
        schemaVersion: 3,
        modeDefinitionId: this.#publicMatchInfo.modeDefinitionId,
        matchSeed: this.#publicMatchInfo.matchSeed,
        authorityIdentity: terminalAuthorityIdentity,
        content: this.#publicMatchInfo.content,
        participantAssignments: this.#publicMatchInfo.participantAssignments,
        participantEquipmentUsage,
        modeResult: last.modeResult,
        publicParticipants: this.#publicMatchInfo.publicParticipants,
      });
      this.#state = MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.FINALIZED;
      return this.#result;
    } catch (error) {
      this.#state = MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.FAILED;
      throw error;
    }
  }

  destroy(): void {
    if (this.#state === MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.DESTROYED) return;
    this.#events.length = 0;
    this.#eventIds.clear();
    this.#authorityIdentitySource = null;
    this.#result = null;
    this.#state = MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.DESTROYED;
  }
}
