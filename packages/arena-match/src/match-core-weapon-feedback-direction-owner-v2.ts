import {
  ARENA_MATCH_EVENT_V6,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createArenaMatchEventV6,
  createArenaWeaponFeedbackDirectionFactV2,
  type ArenaWeaponFeedbackSemanticKindV1,
  type ArenaWeaponFeedbackDirectionFactV2,
  type DeepReadonly,
  type WeaponFeedbackResolvedEventV6,
} from '@number-strategy-jump/arena-contracts';
import {
  resolveArenaWeaponFeedbackResultDirectionV2,
} from '@number-strategy-jump/arena-core';
import {
  createMatchCoreWeaponFeedbackDirectionCheckpointV2,
  validateMatchCoreWeaponFeedbackDirectionCheckpointV2,
  type MatchCoreWeaponFeedbackDirectionCheckpointV2,
  type MatchCoreWeaponFeedbackPendingDirectionV2,
} from './match-core-weapon-feedback-direction-checkpoint-v2.js';
import {
  validateMatchCoreWeaponFeedbackAdapterCheckpoint,
  type MatchCoreWeaponFeedbackAdapterCheckpoint,
} from './match-core-weapon-feedback-adapter-v1.js';

export interface MatchCoreWeaponFeedbackDirectionOwnerV2StepResult {
  readonly schemaVersion: 2;
  readonly facts: readonly ArenaWeaponFeedbackDirectionFactV2[];
  readonly checkpoint: MatchCoreWeaponFeedbackDirectionCheckpointV2;
}

type PendingMutable = Omit<MatchCoreWeaponFeedbackPendingDirectionV2, 'knockbackSourceEventId' | 'impulse'> & {
  readonly knockbackSourceEventId: string | null;
  readonly impulse: Readonly<{ readonly x: number; readonly y: number; readonly z: number }> | null;
};

type SourceEvent = Readonly<Record<string, unknown>> & Readonly<{
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: string;
}>;

const OPTION_KEYS = new Set(['feedbackCheckpoint', 'directionCheckpoint']);
const STEP_KEYS = new Set(['sourceEvents', 'feedbackEvents', 'feedbackCheckpoint']);
const ENVELOPE_KEYS = new Set(['id', 'sequence', 'tick', 'type']);
const HIT_KEYS = new Set([
  ...ENVELOPE_KEYS, 'attackerId', 'targetId', 'action',
]);
const KNOCKBACK_KEYS = new Set([
  ...ENVELOPE_KEYS, 'attackerId', 'targetId', 'impulse',
]);
const PLAYER_ELIMINATED_KEYS = new Set([
  ...ENVELOPE_KEYS, 'participantId', 'remainingLives', 'creditedAttackerId',
]);
const IMPULSE_KEYS = new Set(['x', 'y', 'z']);
const HIT_KINDS: ReadonlySet<ArenaWeaponFeedbackSemanticKindV1> = new Set([
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_CONFIRM,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_SURFACE_TRANSFER,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_RING_OUT,
]);
const FEEDBACK_EVENT_ID_PREFIX = 'feedback:';

function requireKeys(value: Readonly<Record<string, unknown>>, keys: ReadonlySet<string>, name: string) {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少${key}。`);
  }
}

function impulse(value: unknown, name: string) {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, IMPULSE_KEYS, name);
  requireKeys(source, IMPULSE_KEYS, name);
  for (const axis of ['x', 'y', 'z'] as const) {
    if (typeof source[axis] !== 'number' || !Number.isFinite(source[axis])) {
      throw new TypeError(`${name}.${axis}必须是有限数。`);
    }
  }
  if (Math.hypot(source.x as number, source.z as number) <= 1e-7) {
    throw new RangeError(`${name}水平冲量不可为零。`);
  }
  return Object.freeze({
    x: source.x as number,
    y: source.y as number,
    z: source.z as number,
  });
}

function sourceEvents(
  value: unknown,
  expectedSequence: number,
  minimumTick: number,
  maximumTick: number,
): readonly SourceEvent[] {
  if (!Array.isArray(value)) throw new TypeError('feedback direction owner sourceEvents必须是数组。');
  const ids = new Set<string>();
  return Object.freeze(value.map((entry, index) => {
    const name = `feedback direction owner sourceEvents[${index}]`;
    const source = cloneFrozenData(entry, name);
    const type = assertNonEmptyString(source.type, `${name}.type`);
    const keys = type === 'HitResolved'
      ? HIT_KEYS
      : type === 'KnockbackApplied'
        ? KNOCKBACK_KEYS
        : type === 'PlayerEliminated'
          ? PLAYER_ELIMINATED_KEYS
          : ENVELOPE_KEYS;
    if (
      type === 'HitResolved'
      || type === 'KnockbackApplied'
      || type === 'PlayerEliminated'
    ) {
      assertKnownKeys(source, keys, name);
    }
    requireKeys(source, keys, name);
    const id = assertNonEmptyString(source.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`feedback direction owner重复source event id：${id}。`);
    ids.add(id);
    const sequence = assertIntegerAtLeast(source.sequence, 0, `${name}.sequence`);
    if (sequence !== expectedSequence + index) {
      throw new RangeError('feedback direction owner source event sequence不连续。');
    }
    const tick = assertIntegerAtLeast(source.tick, 0, `${name}.tick`);
    if (tick < minimumTick || tick > maximumTick) {
      throw new RangeError('feedback direction owner source event tick越过当前提交步。');
    }
    return Object.freeze({ ...source, id, type, sequence, tick }) as SourceEvent;
  }));
}

function feedbackEvents(value: unknown): readonly DeepReadonly<WeaponFeedbackResolvedEventV6>[] {
  if (!Array.isArray(value)) throw new TypeError('feedback direction owner feedbackEvents必须是数组。');
  const ids = new Set<string>();
  return Object.freeze(value.map((entry, index) => {
    const event = createArenaMatchEventV6(entry);
    if (event.type !== ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED) {
      throw new RangeError(`feedback direction owner feedbackEvents[${index}]不是武器反馈。`);
    }
    if (ids.has(event.id)) throw new RangeError(`feedback direction owner重复feedback id：${event.id}。`);
    ids.add(event.id);
    return event as DeepReadonly<WeaponFeedbackResolvedEventV6>;
  }));
}

function hitSourceEventIdFromFeedbackEventId(value: string): string {
  if (!value.startsWith(FEEDBACK_EVENT_ID_PREFIX)) {
    throw new RangeError('命中反馈事件ID缺少权威source前缀。');
  }
  return assertNonEmptyString(
    value.slice(FEEDBACK_EVENT_ID_PREFIX.length),
    '命中反馈事件sourceEventId',
  );
}

function pendingFromCheckpoint(
  checkpoint: MatchCoreWeaponFeedbackDirectionCheckpointV2,
): Map<string, PendingMutable> {
  return new Map(checkpoint.pendingDirections.map((entry) => [
    entry.hitSourceEventId,
    { ...entry },
  ]));
}

function closedPending(value: PendingMutable): MatchCoreWeaponFeedbackPendingDirectionV2 {
  if (value.knockbackSourceEventId === null || value.impulse === null) {
    throw new RangeError(`HitResolved ${value.hitSourceEventId}缺少同批KnockbackApplied。`);
  }
  return Object.freeze({
    ...value,
    knockbackSourceEventId: value.knockbackSourceEventId,
    impulse: value.impulse,
  });
}

/**
 * Companion owner for MatchCoreWeaponFeedbackAdapterV1. It never classifies a
 * hit result; it only binds the committed KnockbackApplied impulse to the V1
 * result and maintains an independently restorable direction checkpoint.
 */
export class MatchCoreWeaponFeedbackDirectionOwnerV2 {
  #feedbackCheckpoint: MatchCoreWeaponFeedbackAdapterCheckpoint;
  #directionCheckpoint: MatchCoreWeaponFeedbackDirectionCheckpointV2;
  #pending: Map<string, PendingMutable>;
  #destroyed = false;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'feedback direction owner options');
    assertKnownKeys(source, OPTION_KEYS, 'feedback direction owner options');
    requireKeys(source, OPTION_KEYS, 'feedback direction owner options');
    const feedbackCheckpoint = validateMatchCoreWeaponFeedbackAdapterCheckpoint(
      source.feedbackCheckpoint,
    );
    const directionCheckpoint = source.directionCheckpoint === null
      ? (() => {
        if (feedbackCheckpoint.pendingHits.length !== 0) {
          throw new RangeError('feedback direction owner非空V1 pendingHits必须提供方向checkpoint。');
        }
        return createMatchCoreWeaponFeedbackDirectionCheckpointV2({
          feedbackCheckpoint,
          pendingDirections: [],
        });
      })()
      : validateMatchCoreWeaponFeedbackDirectionCheckpointV2(
        source.directionCheckpoint,
        feedbackCheckpoint,
      );
    this.#feedbackCheckpoint = feedbackCheckpoint;
    this.#directionCheckpoint = directionCheckpoint;
    this.#pending = pendingFromCheckpoint(directionCheckpoint);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('feedback direction owner已销毁。');
  }

  step(value: unknown): MatchCoreWeaponFeedbackDirectionOwnerV2StepResult {
    this.#assertUsable();
    const source = cloneFrozenData(value, 'feedback direction owner step');
    assertKnownKeys(source, STEP_KEYS, 'feedback direction owner step');
    requireKeys(source, STEP_KEYS, 'feedback direction owner step');
    const nextFeedbackCheckpoint = validateMatchCoreWeaponFeedbackAdapterCheckpoint(
      source.feedbackCheckpoint,
    );
    const events = sourceEvents(
      source.sourceEvents,
      this.#feedbackCheckpoint.sourceEventSequence,
      this.#feedbackCheckpoint.tick,
      nextFeedbackCheckpoint.tick - 1,
    );
    if (nextFeedbackCheckpoint.tick !== this.#feedbackCheckpoint.tick + 1
      || nextFeedbackCheckpoint.sourceEventSequence
        !== this.#feedbackCheckpoint.sourceEventSequence + events.length) {
      throw new RangeError('feedback direction owner下一V1 checkpoint水位不连续。');
    }
    const outputs = feedbackEvents(source.feedbackEvents);
    const pending = new Map(
      [...this.#pending].map(([id, entry]) => [id, { ...entry }] as const),
    );
    const openHitSourceEventIdsByTargetAndAttacker = new Map<
      string,
      Map<string, string[]>
    >();
    const newHitIds = new Set<string>();
    const uncreditedEliminationTargets = new Set<string>();
    const participantIds = new Set(this.#feedbackCheckpoint.participantIds);

    for (const event of events) {
      if (event.type === 'HitResolved') {
        const hitSourceEventId = event.id;
        if (pending.has(hitSourceEventId)) {
          throw new RangeError(`feedback direction owner重复HitResolved：${hitSourceEventId}。`);
        }
        const attackerId = assertNonEmptyString(event.attackerId, 'HitResolved.attackerId');
        const targetId = assertNonEmptyString(event.targetId, 'HitResolved.targetId');
        pending.set(hitSourceEventId, {
          hitSourceEventId,
          attackerId,
          targetId,
          actionDefinitionId: assertNonEmptyString(event.action, 'HitResolved.action'),
          firstHitTick: event.tick,
          knockbackSourceEventId: null,
          impulse: null,
        });
        newHitIds.add(hitSourceEventId);
        let byAttacker = openHitSourceEventIdsByTargetAndAttacker.get(targetId);
        if (byAttacker === undefined) {
          byAttacker = new Map<string, string[]>();
          openHitSourceEventIdsByTargetAndAttacker.set(targetId, byAttacker);
        }
        const queuedHitSourceEventIds = byAttacker.get(attackerId) ?? [];
        queuedHitSourceEventIds.push(hitSourceEventId);
        byAttacker.set(attackerId, queuedHitSourceEventIds);
      } else if (event.type === 'KnockbackApplied') {
        const attackerId = assertNonEmptyString(
          event.attackerId,
          'KnockbackApplied.attackerId',
        );
        const targetId = assertNonEmptyString(event.targetId, 'KnockbackApplied.targetId');
        const byAttacker = openHitSourceEventIdsByTargetAndAttacker.get(targetId);
        const queuedHitSourceEventIds = byAttacker?.get(attackerId);
        const hitSourceEventId = queuedHitSourceEventIds?.shift();
        if (hitSourceEventId === undefined) {
          throw new RangeError('KnockbackApplied缺少同目标、同攻击者的HitResolved。');
        }
        if (queuedHitSourceEventIds!.length === 0) {
          byAttacker!.delete(attackerId);
          if (byAttacker!.size === 0) {
            openHitSourceEventIdsByTargetAndAttacker.delete(targetId);
          }
        }
        const hit = pending.get(hitSourceEventId);
        if (hit === undefined
          || hit.knockbackSourceEventId !== null
          || hit.attackerId !== attackerId
          || hit.targetId !== targetId
          || hit.firstHitTick !== event.tick) {
          throw new RangeError('KnockbackApplied与HitResolved身份或顺序不闭合。');
        }
        pending.set(hitSourceEventId, {
          ...hit,
          knockbackSourceEventId: event.id,
          impulse: impulse(event.impulse, `KnockbackApplied ${event.id}.impulse`),
        });
      } else if (event.type === 'PlayerEliminated') {
        const targetId = assertNonEmptyString(
          event.participantId,
          'PlayerEliminated.participantId',
        );
        if (!participantIds.has(targetId)) {
          throw new RangeError('PlayerEliminated participantId不属于当前对局。');
        }
        assertIntegerAtLeast(event.remainingLives, 0, 'PlayerEliminated.remainingLives');
        if (event.creditedAttackerId === null) {
          uncreditedEliminationTargets.add(targetId);
        } else {
          const creditedAttackerId = assertNonEmptyString(
            event.creditedAttackerId,
            'PlayerEliminated.creditedAttackerId',
          );
          if (!participantIds.has(creditedAttackerId)) {
            throw new RangeError('PlayerEliminated creditedAttackerId不属于当前对局。');
          }
        }
      }
    }
    for (const hitSourceEventId of newHitIds) closedPending(pending.get(hitSourceEventId)!);

    const facts: ArenaWeaponFeedbackDirectionFactV2[] = [];
    const movementFallTargets = new Set<string>();
    for (const event of outputs) {
      if (HIT_KINDS.has(event.kind)) {
        const hitSourceEventId = hitSourceEventIdFromFeedbackEventId(event.id);
        const match = pending.get(hitSourceEventId);
        if (
          match === undefined
          || match.attackerId !== event.attackerId
          || match.targetId !== event.targetId
          || match.actionDefinitionId !== event.actionDefinitionId
          || match.firstHitTick !== event.firstHitTick
        ) {
          throw new RangeError(`feedback direction owner命中反馈${event.id}缺少唯一方向来源。`);
        }
        const closed = closedPending(match);
        facts.push(createArenaWeaponFeedbackDirectionFactV2({
          schemaVersion: 2,
          feedbackEventId: event.id,
          feedbackTick: event.tick,
          feedbackSequence: event.sequence,
          feedbackKind: event.kind,
          resultDirection: resolveArenaWeaponFeedbackResultDirectionV2({
            feedbackKind: event.kind,
            sourceEventId: closed.knockbackSourceEventId,
            impulse: closed.impulse,
          }),
        }));
        pending.delete(closed.hitSourceEventId);
      } else {
        if (event.kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.MOVEMENT_FALL) {
          movementFallTargets.add(assertNonEmptyString(
            event.targetId,
            'movement-fall feedback targetId',
          ));
        }
        facts.push(createArenaWeaponFeedbackDirectionFactV2({
          schemaVersion: 2,
          feedbackEventId: event.id,
          feedbackTick: event.tick,
          feedbackSequence: event.sequence,
          feedbackKind: event.kind,
          resultDirection: resolveArenaWeaponFeedbackResultDirectionV2({
            feedbackKind: event.kind,
            sourceEventId: event.id,
            impulse: null,
          }),
        }));
      }
    }

    const nextPendingHitIds = new Set(
      nextFeedbackCheckpoint.pendingHits.map(({ sourceEventId }) => sourceEventId),
    );
    for (const [hitSourceEventId, entry] of [...pending]) {
      if (nextPendingHitIds.has(hitSourceEventId)) continue;
      if (
        !uncreditedEliminationTargets.has(entry.targetId)
        || !movementFallTargets.has(entry.targetId)
      ) {
        throw new RangeError('feedback direction owner的V1/V2 pending清理原因不闭合。');
      }
      pending.delete(hitSourceEventId);
    }

    const directionCheckpoint = createMatchCoreWeaponFeedbackDirectionCheckpointV2({
      feedbackCheckpoint: nextFeedbackCheckpoint,
      pendingDirections: [...pending.values()].map(closedPending),
    });
    this.#feedbackCheckpoint = nextFeedbackCheckpoint;
    this.#directionCheckpoint = directionCheckpoint;
    this.#pending = pending;
    return Object.freeze({
      schemaVersion: 2 as const,
      facts: Object.freeze(facts),
      checkpoint: directionCheckpoint,
    });
  }

  exportCheckpointV2(): MatchCoreWeaponFeedbackDirectionCheckpointV2 {
    this.#assertUsable();
    return this.#directionCheckpoint;
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#pending.clear();
  }
}

export const MATCH_CORE_WEAPON_FEEDBACK_DIRECTION_OWNER_V2 = Object.freeze({
  schemaVersion: 2 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  companionToFeedbackAdapterV1: true as const,
  consumesSameAuthorityBatch: true as const,
  groupedHitEventsCanPrecedeKnockbacks: true as const,
  sameTargetRepeatedHitsUseDeterministicFifo: true as const,
  classifiesFeedbackOutcome: false as const,
  atomicStepCommit: true as const,
  presentationPositionInferenceAllowed: false as const,
});
