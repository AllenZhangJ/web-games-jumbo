import {
  ARENA_MATCH_EVENT_V6,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createArenaMatchEventV6,
  createDeterministicDataHash,
  createEquipmentReplacedEventPayload,
  type DeepReadonly,
  type WeaponFeedbackResolvedEventV6,
} from '@number-strategy-jump/arena-contracts';
import { ACTION_LANE } from '@number-strategy-jump/arena-definitions';

export const MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;
export const MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V1_SCHEMA_VERSION = 1 as const;

export interface MatchCoreWeaponFeedbackParticipantObservationV1 {
  readonly participantId: string;
  readonly active: boolean;
  readonly actionDefinitionId: string | null;
  readonly supportSurfaceId: string | null;
}

export interface MatchCoreWeaponFeedbackObservationV1 {
  readonly tick: number;
  readonly eventSequence: number;
  readonly participants: readonly MatchCoreWeaponFeedbackParticipantObservationV1[];
}

export interface MatchCoreWeaponFeedbackAdapterV1Options {
  readonly participantIds: readonly string[];
  readonly outcomeWindowTicks: number;
  readonly initialObservation: MatchCoreWeaponFeedbackObservationV1;
}

export interface MatchCoreWeaponFeedbackAdapterCheckpointV1 {
  readonly schemaVersion:
    typeof MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V1_SCHEMA_VERSION;
  readonly participantIds: readonly string[];
  readonly outcomeWindowTicks: number;
  readonly tick: number;
  readonly sourceEventSequence: number;
  readonly actions: readonly Readonly<{
    readonly sourceEventId: string;
    readonly attackerId: string;
    readonly actionDefinitionId: string;
    readonly startedTick: number;
    readonly hitCount: number;
  }>[];
  readonly pendingHits: readonly Readonly<{
    readonly sourceEventId: string;
    readonly attackerId: string;
    readonly targetId: string;
    readonly actionDefinitionId: string;
    readonly actionStartedTick: number;
    readonly firstHitTick: number;
    readonly initialSupportSurfaceId: string;
  }>[];
  readonly lastSupportedSurfaceIds: readonly Readonly<{
    readonly participantId: string;
    readonly supportSurfaceId: string;
  }>[];
  readonly checkpointIdentityHash: string;
}

interface TrackedAction {
  readonly sourceEventId: string;
  readonly attackerId: string;
  readonly actionDefinitionId: string;
  readonly startedTick: number;
  hitCount: number;
}

interface PendingHit {
  readonly sourceEventId: string;
  readonly attackerId: string;
  readonly targetId: string;
  readonly actionDefinitionId: string;
  readonly actionStartedTick: number;
  readonly firstHitTick: number;
  readonly initialSupportSurfaceId: string;
}

type SourceEvent = Readonly<{
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: string;
  readonly participantId?: string;
  readonly attackerId?: string;
  readonly targetId?: string;
  readonly action?: string;
  readonly lane?: string;
  readonly source?: string;
  readonly creditedAttackerId?: string | null;
  readonly payload?: unknown;
}>;

const OPTION_KEYS = new Set(['participantIds', 'outcomeWindowTicks', 'initialObservation']);
const STEP_KEYS = new Set(['sequenceStart', 'sourceEvents', 'observation']);
const OBSERVATION_KEYS = new Set(['tick', 'eventSequence', 'participants']);
const PARTICIPANT_KEYS = new Set([
  'participantId', 'active', 'actionDefinitionId', 'supportSurfaceId',
]);
const SOURCE_EVENT_ENVELOPE_KEYS = new Set(['id', 'sequence', 'tick', 'type']);
const ACTION_STARTED_KEYS = new Set([
  ...SOURCE_EVENT_ENVELOPE_KEYS, 'participantId', 'action', 'lane', 'source',
]);
const ACTION_STARTED_REQUIRED_KEYS = new Set([
  ...SOURCE_EVENT_ENVELOPE_KEYS, 'participantId', 'action',
]);
const ACTION_LANES = new Set<string>(Object.values(ACTION_LANE));
const ACTION_COMMITMENT_CANCELLED_KEYS = new Set([
  ...SOURCE_EVENT_ENVELOPE_KEYS, 'participantId', 'action', 'chargeTicks',
  'chargeLevel', 'facingAtStart', 'facingAtResult', 'lane',
]);
const ACTION_COMMITMENT_CANCELLED_REQUIRED_KEYS = new Set([
  ...SOURCE_EVENT_ENVELOPE_KEYS, 'participantId', 'action', 'chargeTicks',
  'chargeLevel', 'facingAtStart', 'facingAtResult',
]);
const ACTION_INTERRUPTED_KEYS = new Set([
  ...SOURCE_EVENT_ENVELOPE_KEYS, 'participantId', 'action',
]);
const EQUIPMENT_PICKED_UP_KEYS = new Set([
  ...SOURCE_EVENT_ENVELOPE_KEYS, 'participantId', 'equipmentInstanceId',
  'equipmentDefinitionId',
]);
const EQUIPMENT_REPLACED_KEYS = new Set([
  ...SOURCE_EVENT_ENVELOPE_KEYS, 'payload',
]);
const HIT_RESOLVED_KEYS = new Set([
  ...SOURCE_EVENT_ENVELOPE_KEYS, 'attackerId', 'targetId', 'action',
]);
const PLAYER_ELIMINATED_KEYS = new Set([
  ...SOURCE_EVENT_ENVELOPE_KEYS, 'participantId', 'remainingLives', 'creditedAttackerId',
]);
const CHECKPOINT_CORE_KEYS = new Set([
  'schemaVersion', 'participantIds', 'outcomeWindowTicks', 'tick', 'sourceEventSequence',
  'actions', 'pendingHits', 'lastSupportedSurfaceIds',
]);
const CHECKPOINT_KEYS = new Set([...CHECKPOINT_CORE_KEYS, 'checkpointIdentityHash']);
const CHECKPOINT_ACTION_KEYS = new Set([
  'sourceEventId', 'attackerId', 'actionDefinitionId', 'startedTick', 'hitCount',
]);
const CHECKPOINT_HIT_KEYS = new Set([
  'sourceEventId', 'attackerId', 'targetId', 'actionDefinitionId',
  'actionStartedTick', 'firstHitTick', 'initialSupportSurfaceId',
]);
const CHECKPOINT_SURFACE_KEYS = new Set(['participantId', 'supportSurfaceId']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function requireKeys(
  value: Readonly<Record<string, unknown>>,
  keys: ReadonlySet<string>,
  name: string,
): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少${key}。`);
  }
}

function optionalId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function participantIds(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 17) {
    throw new RangeError('MatchCoreWeaponFeedbackAdapterV1 participantIds必须包含2-17项。');
  }
  const result = value.map((id, index) => assertNonEmptyString(id, `participantIds[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError('participantIds不能重复。');
  return Object.freeze(result);
}

function observation(
  value: unknown,
  expectedParticipantIds: readonly string[],
  name: string,
): MatchCoreWeaponFeedbackObservationV1 {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, OBSERVATION_KEYS, name);
  requireKeys(source, OBSERVATION_KEYS, name);
  if (!Array.isArray(source.participants)) throw new TypeError(`${name}.participants必须是数组。`);
  if (source.participants.length !== expectedParticipantIds.length) {
    throw new RangeError(`${name}.participants长度与配置不一致。`);
  }
  const participants = source.participants.map((entry, index) => {
    assertKnownKeys(entry, PARTICIPANT_KEYS, `${name}.participants[${index}]`);
    requireKeys(entry, PARTICIPANT_KEYS, `${name}.participants[${index}]`);
    const participantId = assertNonEmptyString(
      entry.participantId,
      `${name}.participants[${index}].participantId`,
    );
    if (participantId !== expectedParticipantIds[index]) {
      throw new RangeError(`${name}.participants必须按配置顺序完整提供。`);
    }
    if (typeof entry.active !== 'boolean') {
      throw new TypeError(`${name}.participants[${index}].active必须是boolean。`);
    }
    return Object.freeze({
      participantId,
      active: entry.active,
      actionDefinitionId: optionalId(
        entry.actionDefinitionId,
        `${name}.participants[${index}].actionDefinitionId`,
      ),
      supportSurfaceId: optionalId(
        entry.supportSurfaceId,
        `${name}.participants[${index}].supportSurfaceId`,
      ),
    });
  });
  return Object.freeze({
    tick: assertIntegerAtLeast(source.tick, 0, `${name}.tick`),
    eventSequence: assertIntegerAtLeast(
      source.eventSequence,
      0,
      `${name}.eventSequence`,
    ),
    participants: Object.freeze(participants),
  });
}

function sourceEvent(value: unknown, expectedSequence: number): SourceEvent {
  const source = cloneFrozenData(value, `MatchCore source event ${expectedSequence}`);
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('MatchCore source event必须是普通对象。');
  }
  const record = source as Readonly<Record<string, unknown>>;
  const type = assertNonEmptyString(record.type, 'MatchCore source event.type');
  const keys = type === 'ActionStarted'
    ? ACTION_STARTED_KEYS
    : type === 'ActionCommitmentCancelled'
      ? ACTION_COMMITMENT_CANCELLED_KEYS
      : type === 'ActionInterrupted'
        ? ACTION_INTERRUPTED_KEYS
        : type === 'EquipmentPickedUp'
          ? EQUIPMENT_PICKED_UP_KEYS
          : type === 'EquipmentReplaced'
            ? EQUIPMENT_REPLACED_KEYS
    : type === 'HitResolved'
      ? HIT_RESOLVED_KEYS
      : type === 'PlayerEliminated'
        ? PLAYER_ELIMINATED_KEYS
        : null;
  if (keys !== null) {
    assertKnownKeys(record, keys, `MatchCore ${type}`);
    requireKeys(
      record,
      type === 'ActionStarted'
        ? ACTION_STARTED_REQUIRED_KEYS
        : type === 'ActionCommitmentCancelled'
          ? ACTION_COMMITMENT_CANCELLED_REQUIRED_KEYS
          : keys,
      `MatchCore ${type}`,
    );
    if ((type === 'ActionStarted' || type === 'ActionCommitmentCancelled')
      && record.lane !== undefined) {
      const lane = assertNonEmptyString(record.lane, `MatchCore ${type}.lane`);
      if (!ACTION_LANES.has(lane)) throw new RangeError(`MatchCore ${type}.lane不受支持。`);
    }
    if (type === 'ActionStarted' && record.source !== undefined) {
      assertNonEmptyString(record.source, 'MatchCore ActionStarted.source');
    }
  } else {
    for (const key of SOURCE_EVENT_ENVELOPE_KEYS) {
      if (!Object.hasOwn(record, key)) throw new TypeError(`MatchCore source event缺少${key}。`);
    }
  }
  const sequence = assertIntegerAtLeast(record.sequence, 0, 'MatchCore source event.sequence');
  if (sequence !== expectedSequence) throw new RangeError('MatchCore source event sequence不连续。');
  assertNonEmptyString(record.id, 'MatchCore source event.id');
  assertIntegerAtLeast(record.tick, 0, 'MatchCore source event.tick');
  return record as SourceEvent;
}

function participantById(
  value: MatchCoreWeaponFeedbackObservationV1,
): ReadonlyMap<string, MatchCoreWeaponFeedbackParticipantObservationV1> {
  return new Map(value.participants.map((entry) => [entry.participantId, entry] as const));
}

type FeedbackCheckpointCore = Omit<
  MatchCoreWeaponFeedbackAdapterCheckpointV1,
  'checkpointIdentityHash'
>;

function checkpointRecords(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): readonly Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  return Object.freeze(value.map((entry, index) => {
    const record = cloneFrozenData(entry, `${name}[${index}]`);
    assertKnownKeys(record, keys, `${name}[${index}]`);
    requireKeys(record, keys, `${name}[${index}]`);
    return record;
  }));
}

function normalizeCheckpointCore(value: unknown): FeedbackCheckpointCore {
  const source = cloneFrozenData(value, 'MatchCoreWeaponFeedbackAdapter checkpoint core');
  assertKnownKeys(source, CHECKPOINT_CORE_KEYS, 'MatchCoreWeaponFeedbackAdapter checkpoint core');
  requireKeys(source, CHECKPOINT_CORE_KEYS, 'MatchCoreWeaponFeedbackAdapter checkpoint core');
  if (source.schemaVersion !== MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V1_SCHEMA_VERSION) {
    throw new RangeError('MatchCoreWeaponFeedbackAdapter checkpoint schemaVersion不受支持。');
  }
  const ids = participantIds(source.participantIds);
  const idOrder = new Map(ids.map((id, index) => [id, index] as const));
  const tick = assertIntegerAtLeast(source.tick, 0, 'feedback checkpoint.tick');
  const sourceEventSequence = assertIntegerAtLeast(
    source.sourceEventSequence,
    0,
    'feedback checkpoint.sourceEventSequence',
  );
  const actions = checkpointRecords(
    source.actions,
    CHECKPOINT_ACTION_KEYS,
    'feedback checkpoint.actions',
  ).map((entry, index) => {
    const attackerId = assertNonEmptyString(
      entry.attackerId,
      `feedback checkpoint.actions[${index}].attackerId`,
    );
    if (!idOrder.has(attackerId)) throw new RangeError('feedback checkpoint action参与者越界。');
    const startedTick = assertIntegerAtLeast(
      entry.startedTick,
      0,
      `feedback checkpoint.actions[${index}].startedTick`,
    );
    if (startedTick >= tick) throw new RangeError('feedback checkpoint action时间越过当前水位。');
    return Object.freeze({
      sourceEventId: assertNonEmptyString(
        entry.sourceEventId,
        `feedback checkpoint.actions[${index}].sourceEventId`,
      ),
      attackerId,
      actionDefinitionId: assertNonEmptyString(
        entry.actionDefinitionId,
        `feedback checkpoint.actions[${index}].actionDefinitionId`,
      ),
      startedTick,
      hitCount: assertIntegerAtLeast(
        entry.hitCount,
        0,
        `feedback checkpoint.actions[${index}].hitCount`,
      ),
    });
  });
  if (
    actions.length > ids.length
    || new Set(actions.map(({ attackerId }) => attackerId)).size !== actions.length
  ) {
    throw new RangeError('feedback checkpoint actions存在重复参与者或越界数量。');
  }
  actions.sort(
    (left, right) => idOrder.get(left.attackerId)! - idOrder.get(right.attackerId)!,
  );

  const pendingHits = checkpointRecords(
    source.pendingHits,
    CHECKPOINT_HIT_KEYS,
    'feedback checkpoint.pendingHits',
  ).map((entry, index) => {
    const attackerId = assertNonEmptyString(
      entry.attackerId,
      `feedback checkpoint.pendingHits[${index}].attackerId`,
    );
    const targetId = assertNonEmptyString(
      entry.targetId,
      `feedback checkpoint.pendingHits[${index}].targetId`,
    );
    if (!idOrder.has(attackerId) || !idOrder.has(targetId)) {
      throw new RangeError('feedback checkpoint pendingHit参与者越界。');
    }
    const actionStartedTick = assertIntegerAtLeast(
      entry.actionStartedTick,
      0,
      `feedback checkpoint.pendingHits[${index}].actionStartedTick`,
    );
    const firstHitTick = assertIntegerAtLeast(
      entry.firstHitTick,
      0,
      `feedback checkpoint.pendingHits[${index}].firstHitTick`,
    );
    if (actionStartedTick > firstHitTick || firstHitTick >= tick) {
      throw new RangeError('feedback checkpoint pendingHit时间关系无效。');
    }
    return Object.freeze({
      sourceEventId: assertNonEmptyString(
        entry.sourceEventId,
        `feedback checkpoint.pendingHits[${index}].sourceEventId`,
      ),
      attackerId,
      targetId,
      actionDefinitionId: assertNonEmptyString(
        entry.actionDefinitionId,
        `feedback checkpoint.pendingHits[${index}].actionDefinitionId`,
      ),
      actionStartedTick,
      firstHitTick,
      initialSupportSurfaceId: assertNonEmptyString(
        entry.initialSupportSurfaceId,
        `feedback checkpoint.pendingHits[${index}].initialSupportSurfaceId`,
      ),
    });
  });
  if (
    pendingHits.length > ids.length
    || new Set(pendingHits.map(({ targetId }) => targetId)).size !== pendingHits.length
  ) throw new RangeError('feedback checkpoint pendingHits存在重复目标或越界数量。');
  pendingHits.sort(
    (left, right) => idOrder.get(left.targetId)! - idOrder.get(right.targetId)!,
  );

  const lastSupportedSurfaceIds = checkpointRecords(
    source.lastSupportedSurfaceIds,
    CHECKPOINT_SURFACE_KEYS,
    'feedback checkpoint.lastSupportedSurfaceIds',
  ).map((entry, index) => {
    const participantId = assertNonEmptyString(
      entry.participantId,
      `feedback checkpoint.lastSupportedSurfaceIds[${index}].participantId`,
    );
    if (!idOrder.has(participantId)) {
      throw new RangeError('feedback checkpoint lastSupportedSurface参与者越界。');
    }
    return Object.freeze({
      participantId,
      supportSurfaceId: assertNonEmptyString(
        entry.supportSurfaceId,
        `feedback checkpoint.lastSupportedSurfaceIds[${index}].supportSurfaceId`,
      ),
    });
  });
  if (
    lastSupportedSurfaceIds.length > ids.length
    || new Set(lastSupportedSurfaceIds.map(({ participantId }) => participantId)).size
      !== lastSupportedSurfaceIds.length
  ) throw new RangeError('feedback checkpoint lastSupportedSurface存在重复参与者或越界数量。');
  lastSupportedSurfaceIds.sort(
    (left, right) => idOrder.get(left.participantId)! - idOrder.get(right.participantId)!,
  );
  const surfaceParticipants = new Set(
    lastSupportedSurfaceIds.map(({ participantId }) => participantId),
  );
  if (pendingHits.some(({ targetId }) => !surfaceParticipants.has(targetId))) {
    throw new RangeError('feedback checkpoint pendingHit目标缺少支撑面历史。');
  }
  return Object.freeze({
    schemaVersion: MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V1_SCHEMA_VERSION,
    participantIds: ids,
    outcomeWindowTicks: assertIntegerAtLeast(
      source.outcomeWindowTicks,
      1,
      'feedback checkpoint.outcomeWindowTicks',
    ),
    tick,
    sourceEventSequence,
    actions: Object.freeze(actions),
    pendingHits: Object.freeze(pendingHits),
    lastSupportedSurfaceIds: Object.freeze(lastSupportedSurfaceIds),
  });
}

function withCheckpointIdentityHash(
  core: FeedbackCheckpointCore,
): MatchCoreWeaponFeedbackAdapterCheckpointV1 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'MatchCoreWeaponFeedbackAdapterCheckpointV1 identity',
    ),
  });
}

export function validateMatchCoreWeaponFeedbackAdapterCheckpointV1(
  value: unknown,
): MatchCoreWeaponFeedbackAdapterCheckpointV1 {
  const source = cloneFrozenData(value, 'MatchCoreWeaponFeedbackAdapter checkpoint');
  assertKnownKeys(source, CHECKPOINT_KEYS, 'MatchCoreWeaponFeedbackAdapter checkpoint');
  requireKeys(source, CHECKPOINT_KEYS, 'MatchCoreWeaponFeedbackAdapter checkpoint');
  const claimedHash = assertNonEmptyString(
    source.checkpointIdentityHash,
    'feedback checkpoint.checkpointIdentityHash',
  );
  if (!HASH_PATTERN.test(claimedHash)) {
    throw new RangeError('feedback checkpoint.checkpointIdentityHash格式无效。');
  }
  const core = Object.fromEntries(
    [...CHECKPOINT_CORE_KEYS].map((key) => [key, source[key]]),
  );
  const checkpoint = withCheckpointIdentityHash(normalizeCheckpointCore(core));
  if (checkpoint.checkpointIdentityHash !== claimedHash) {
    throw new RangeError('feedback checkpoint身份hash不一致。');
  }
  return checkpoint;
}

/**
 * Candidate bridge from the existing MatchCore event/snapshot boundary to the
 * V6 causal feedback event. It is deliberately not wired into default MatchCore.
 */
export class MatchCoreWeaponFeedbackAdapterV1 {
  readonly #participantIds: readonly string[];
  readonly #participantIdSet: ReadonlySet<string>;
  readonly #outcomeWindowTicks: number;
  #actions = new Map<string, TrackedAction>();
  #pendingHits = new Map<string, PendingHit>();
  #lastSupportedSurfaceIds = new Map<string, string>();
  #tick: number;
  #sourceEventSequence: number;
  #destroyed = false;

  constructor(options: MatchCoreWeaponFeedbackAdapterV1Options);
  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'MatchCoreWeaponFeedbackAdapterV1 options');
    assertKnownKeys(source, OPTION_KEYS, 'MatchCoreWeaponFeedbackAdapterV1 options');
    requireKeys(source, OPTION_KEYS, 'MatchCoreWeaponFeedbackAdapterV1 options');
    this.#participantIds = participantIds(source.participantIds);
    this.#participantIdSet = new Set(this.#participantIds);
    this.#outcomeWindowTicks = assertIntegerAtLeast(
      source.outcomeWindowTicks,
      1,
      'MatchCoreWeaponFeedbackAdapterV1 outcomeWindowTicks',
    );
    const initial = observation(
      source.initialObservation,
      this.#participantIds,
      'MatchCoreWeaponFeedbackAdapterV1 initialObservation',
    );
    this.#tick = initial.tick;
    this.#sourceEventSequence = initial.eventSequence;
    this.#rememberSupportedSurfaces(initial);
  }

  static restoreFromCheckpointV1(
    value: unknown,
  ): MatchCoreWeaponFeedbackAdapterV1 {
    const checkpoint = validateMatchCoreWeaponFeedbackAdapterCheckpointV1(value);
    const supportSurfaceIds = new Map(
      checkpoint.lastSupportedSurfaceIds.map((entry) => [
        entry.participantId,
        entry.supportSurfaceId,
      ] as const),
    );
    const adapter = new MatchCoreWeaponFeedbackAdapterV1({
      participantIds: checkpoint.participantIds,
      outcomeWindowTicks: checkpoint.outcomeWindowTicks,
      initialObservation: {
        tick: checkpoint.tick,
        eventSequence: checkpoint.sourceEventSequence,
        participants: checkpoint.participantIds.map((participantId) => ({
          participantId,
          active: false,
          actionDefinitionId: null,
          supportSurfaceId: supportSurfaceIds.get(participantId) ?? null,
        })),
      },
    });
    adapter.#actions = new Map(checkpoint.actions.map((entry) => [
      entry.attackerId,
      { ...entry },
    ] as const));
    adapter.#pendingHits = new Map(checkpoint.pendingHits.map((entry) => [
      entry.targetId,
      { ...entry },
    ] as const));
    return adapter;
  }

  get pendingActionCount(): number { return this.#actions.size; }

  get pendingHitCount(): number { return this.#pendingHits.size; }

  exportCheckpointV1(): MatchCoreWeaponFeedbackAdapterCheckpointV1 {
    this.#assertUsable();
    const idOrder = new Map(this.#participantIds.map((id, index) => [id, index] as const));
    return withCheckpointIdentityHash(normalizeCheckpointCore({
      schemaVersion: MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V1_SCHEMA_VERSION,
      participantIds: this.#participantIds,
      outcomeWindowTicks: this.#outcomeWindowTicks,
      tick: this.#tick,
      sourceEventSequence: this.#sourceEventSequence,
      actions: [...this.#actions.values()].sort(
        (left, right) => idOrder.get(left.attackerId)! - idOrder.get(right.attackerId)!,
      ),
      pendingHits: [...this.#pendingHits.values()].sort(
        (left, right) => idOrder.get(left.targetId)! - idOrder.get(right.targetId)!,
      ),
      lastSupportedSurfaceIds: [...this.#lastSupportedSurfaceIds.entries()]
        .sort((left, right) => idOrder.get(left[0])! - idOrder.get(right[0])!)
        .map(([participantId, supportSurfaceId]) => ({ participantId, supportSurfaceId })),
    }));
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('MatchCoreWeaponFeedbackAdapterV1已销毁。');
  }

  #requireParticipantId(value: unknown, name: string): string {
    const id = assertNonEmptyString(value, name);
    if (!this.#participantIdSet.has(id)) throw new RangeError(`${name}不属于当前对局。`);
    return id;
  }

  #rememberSupportedSurfaces(value: MatchCoreWeaponFeedbackObservationV1): void {
    for (const participant of value.participants) {
      if (participant.supportSurfaceId !== null) {
        this.#lastSupportedSurfaceIds.set(
          participant.participantId,
          participant.supportSurfaceId,
        );
      }
    }
  }

  #event(
    pending: PendingHit,
    sequence: number,
    tick: number,
    finalSupportSurfaceId: string | null,
    targetFallTick: number | null,
    fallCause: 'credited-hit' | null,
  ): DeepReadonly<WeaponFeedbackResolvedEventV6> {
    const kind = targetFallTick !== null
      ? 'hit-ring-out'
      : finalSupportSurfaceId !== pending.initialSupportSurfaceId
        ? 'hit-surface-transfer'
        : 'hit-confirm';
    return createArenaMatchEventV6({
      id: `feedback:${pending.sourceEventId}`,
      sequence,
      tick,
      type: ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
      kind,
      attackerId: pending.attackerId,
      targetId: pending.targetId,
      actionDefinitionId: pending.actionDefinitionId,
      actionStartedTick: pending.actionStartedTick,
      firstHitTick: pending.firstHitTick,
      targetFallTick,
      initialSupportSurfaceId: pending.initialSupportSurfaceId,
      finalSupportSurfaceId,
      fallCause,
      creditedAttackerId: fallCause === null ? null : pending.attackerId,
    }) as DeepReadonly<WeaponFeedbackResolvedEventV6>;
  }

  step(value: unknown): readonly DeepReadonly<WeaponFeedbackResolvedEventV6>[] {
    this.#assertUsable();
    const source = cloneFrozenData(value, 'MatchCoreWeaponFeedbackAdapterV1 step');
    assertKnownKeys(source, STEP_KEYS, 'MatchCoreWeaponFeedbackAdapterV1 step');
    requireKeys(source, STEP_KEYS, 'MatchCoreWeaponFeedbackAdapterV1 step');
    if (!Array.isArray(source.sourceEvents)) throw new TypeError('sourceEvents必须是数组。');
    const next = observation(
      source.observation,
      this.#participantIds,
      'MatchCoreWeaponFeedbackAdapterV1 step.observation',
    );
    if (next.tick !== this.#tick + 1) throw new RangeError('feedback observation必须推进1 tick。');
    if (next.eventSequence !== this.#sourceEventSequence + source.sourceEvents.length) {
      throw new RangeError('feedback observation eventSequence与sourceEvents不闭合。');
    }
    const authorityTick = next.tick - 1;
    const nextParticipants = participantById(next);
    const actions = new Map<string, TrackedAction>(
      [...this.#actions].map(([id, action]): [string, TrackedAction] => [
        id,
        { ...action },
      ]),
    );
    const pendingHits = new Map(this.#pendingHits);
    const lastSupportedSurfaceIds = new Map(this.#lastSupportedSurfaceIds);
    const output: DeepReadonly<WeaponFeedbackResolvedEventV6>[] = [];
    let outputSequence = assertIntegerAtLeast(source.sequenceStart, 0, 'feedback sequenceStart');

    const emitMovementFall = (event: SourceEvent, participantId: string): void => {
      const initialSupportSurfaceId = lastSupportedSurfaceIds.get(participantId);
      if (initialSupportSurfaceId === undefined) {
        throw new RangeError('movement-fall缺少最后权威支撑面。');
      }
      output.push(createArenaMatchEventV6({
        id: `feedback:${event.id}`,
        sequence: outputSequence,
        tick: event.tick,
        type: ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
        kind: 'movement-fall',
        attackerId: null,
        targetId: participantId,
        actionDefinitionId: null,
        actionStartedTick: null,
        firstHitTick: null,
        targetFallTick: event.tick,
        initialSupportSurfaceId,
        finalSupportSurfaceId: null,
        fallCause: 'movement',
        creditedAttackerId: null,
      }) as DeepReadonly<WeaponFeedbackResolvedEventV6>);
      outputSequence += 1;
    };
    const emitEvaded = (action: TrackedAction, tick: number): void => {
      output.push(createArenaMatchEventV6({
        id: `feedback:${action.sourceEventId}`,
        sequence: outputSequence,
        tick,
        type: ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
        kind: 'attack-evaded',
        attackerId: action.attackerId,
        targetId: null,
        actionDefinitionId: action.actionDefinitionId,
        actionStartedTick: action.startedTick,
        firstHitTick: null,
        targetFallTick: null,
        initialSupportSurfaceId: null,
        finalSupportSurfaceId: null,
        fallCause: null,
        creditedAttackerId: null,
      }) as DeepReadonly<WeaponFeedbackResolvedEventV6>);
      outputSequence += 1;
    };

    for (let index = 0; index < source.sourceEvents.length; index += 1) {
      const event = sourceEvent(source.sourceEvents[index], this.#sourceEventSequence + index);
      if (event.tick > authorityTick || event.tick < this.#tick) {
        throw new RangeError('MatchCore source event tick不属于当前提交步。');
      }
      if (event.type === 'ActionStarted') {
        // 旧证据未携带 lane 时保持兼容；新权威事件只允许 combat
        // 进入武器反馈，避免 jump/interaction 覆盖正在追踪的攻击。
        if (event.lane !== undefined && event.lane !== ACTION_LANE.COMBAT) continue;
        const attackerId = this.#requireParticipantId(
          event.participantId,
          'ActionStarted participantId',
        );
        const actionDefinitionId = assertNonEmptyString(event.action, 'ActionStarted action');
        const previousAction = actions.get(attackerId);
        if (previousAction) {
          if (previousAction.hitCount === 0) emitEvaded(previousAction, event.tick);
          actions.delete(attackerId);
        }
        actions.set(attackerId, {
          sourceEventId: event.id,
          attackerId,
          actionDefinitionId,
          startedTick: event.tick,
          hitCount: 0,
        });
      } else if (event.type === 'ActionCommitmentCancelled') {
        if (event.lane !== undefined && event.lane !== ACTION_LANE.COMBAT) continue;
        const attackerId = this.#requireParticipantId(
          event.participantId,
          'ActionCommitmentCancelled participantId',
        );
        const actionDefinitionId = assertNonEmptyString(
          event.action,
          'ActionCommitmentCancelled action',
        );
        const action = actions.get(attackerId);
        if (!action || action.actionDefinitionId !== actionDefinitionId) {
          throw new RangeError('ActionCommitmentCancelled缺少匹配的已开始动作。');
        }
        if (action.hitCount !== 0) {
          throw new RangeError('ActionCommitmentCancelled不能取消已经命中的动作。');
        }
        actions.delete(attackerId);
      } else if (event.type === 'ActionInterrupted') {
        const attackerId = this.#requireParticipantId(
          event.participantId,
          'ActionInterrupted participantId',
        );
        const actionDefinitionId = assertNonEmptyString(
          event.action,
          'ActionInterrupted action',
        );
        const action = actions.get(attackerId);
        if (!action || action.actionDefinitionId !== actionDefinitionId) {
          throw new RangeError('ActionInterrupted缺少匹配的已开始动作。');
        }
        actions.delete(attackerId);
      } else if (event.type === 'EquipmentPickedUp') {
        const participantId = this.#requireParticipantId(
          event.participantId,
          'EquipmentPickedUp participantId',
        );
        actions.delete(participantId);
      } else if (event.type === 'EquipmentReplaced') {
        const payload = createEquipmentReplacedEventPayload(event.payload);
        const participantId = this.#requireParticipantId(
          payload.participantId,
          'EquipmentReplaced payload.participantId',
        );
        actions.delete(participantId);
      } else if (event.type === 'HitResolved') {
        const attackerId = this.#requireParticipantId(event.attackerId, 'HitResolved attackerId');
        const targetId = this.#requireParticipantId(event.targetId, 'HitResolved targetId');
        const actionDefinitionId = assertNonEmptyString(event.action, 'HitResolved action');
        const action = actions.get(attackerId);
        if (!action || action.actionDefinitionId !== actionDefinitionId) {
          throw new RangeError('HitResolved缺少匹配的已开始动作。');
        }
        const initialSupportSurfaceId = lastSupportedSurfaceIds.get(targetId);
        if (initialSupportSurfaceId === undefined) {
          throw new RangeError('HitResolved目标缺少最后权威支撑面。');
        }
        const previous = pendingHits.get(targetId);
        if (previous) {
          const participant = nextParticipants.get(targetId);
          if (!participant) throw new RangeError('新命中覆盖旧归因时目标观察缺失。');
          const supersededFinalSupportSurfaceId = participant.supportSurfaceId
            ?? lastSupportedSurfaceIds.get(targetId)
            ?? previous.initialSupportSurfaceId;
          output.push(this.#event(
            previous,
            outputSequence,
            event.tick,
            supersededFinalSupportSurfaceId,
            null,
            null,
          ));
          outputSequence += 1;
        }
        action.hitCount += 1;
        pendingHits.set(targetId, {
          sourceEventId: event.id,
          attackerId,
          targetId,
          actionDefinitionId,
          actionStartedTick: action.startedTick,
          firstHitTick: event.tick,
          initialSupportSurfaceId,
        });
      } else if (event.type === 'PlayerEliminated') {
        const targetId = this.#requireParticipantId(
          event.participantId,
          'PlayerEliminated participantId',
        );
        const creditedAttackerId = optionalId(
          event.creditedAttackerId,
          'PlayerEliminated creditedAttackerId',
        );
        if (creditedAttackerId === null) {
          pendingHits.delete(targetId);
          emitMovementFall(event, targetId);
        } else {
          this.#requireParticipantId(creditedAttackerId, 'PlayerEliminated creditedAttackerId');
          const pending = pendingHits.get(targetId);
          if (!pending || pending.attackerId !== creditedAttackerId) {
            throw new RangeError('credited elimination缺少匹配的HitResolved归因。');
          }
          output.push(this.#event(
            pending,
            outputSequence,
            event.tick,
            null,
            event.tick,
            'credited-hit',
          ));
          outputSequence += 1;
          pendingHits.delete(targetId);
        }
      }
    }

    for (const [attackerId, action] of [...actions.entries()]) {
      const participant = nextParticipants.get(attackerId);
      if (!participant) throw new Error('feedback action participant观察缺失。');
      if (participant.actionDefinitionId === action.actionDefinitionId) continue;
      if (!participant.active) {
        actions.delete(attackerId);
        continue;
      }
      if (action.hitCount === 0) emitEvaded(action, authorityTick);
      actions.delete(attackerId);
    }

    for (const [targetId, pending] of [...pendingHits.entries()]) {
      if (authorityTick - pending.firstHitTick < this.#outcomeWindowTicks) continue;
      const participant = nextParticipants.get(targetId);
      if (!participant) {
        throw new RangeError('命中结果窗口结束时目标仍无可归类支撑结果。');
      }
      // A terminal frame may retire the target after the already-recorded hit
      // but before a new support observation. With no PlayerEliminated event,
      // the only authority-backed non-ring-out closure is its last observed
      // support surface; do not invent a fall or discard the pending hit.
      const finalSupportSurfaceId = participant.supportSurfaceId
        ?? lastSupportedSurfaceIds.get(targetId);
      if (finalSupportSurfaceId === undefined) {
        throw new RangeError('命中结果窗口结束时目标仍无可归类支撑结果。');
      }
      output.push(this.#event(
        pending,
        outputSequence,
        authorityTick,
        finalSupportSurfaceId,
        null,
        null,
      ));
      outputSequence += 1;
      pendingHits.delete(targetId);
    }

    for (const participant of next.participants) {
      if (participant.supportSurfaceId !== null) {
        lastSupportedSurfaceIds.set(participant.participantId, participant.supportSurfaceId);
      }
    }
    this.#actions = actions;
    this.#pendingHits = pendingHits;
    this.#lastSupportedSurfaceIds = lastSupportedSurfaceIds;
    this.#tick = next.tick;
    this.#sourceEventSequence = next.eventSequence;
    return Object.freeze(output);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#actions.clear();
    this.#pendingHits.clear();
    this.#lastSupportedSurfaceIds.clear();
  }
}
