import { ARENA_MATCH_PHASE, ARENA_TICK_RATE } from '@number-strategy-jump/arena-match';
import { normalizeInputFrame } from '@number-strategy-jump/arena-contracts';
import { validateInputPilotAssignment } from '@number-strategy-jump/arena-input-pilot';
import { InputPilotActionMetrics } from './input-pilot-action-metrics.js';
import { createInputPilotDefinition } from '@number-strategy-jump/arena-input-pilot';

function requiredParticipant(snapshot, participantId, name) {
  if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.participants)) {
    throw new TypeError(`${name}.participants 必须是数组。`);
  }
  const participant = snapshot.participants.find(({ id }) => id === participantId);
  if (!participant) throw new RangeError(`${name} 缺少 participant ${participantId}。`);
  if (
    !participant.position
    || !Number.isFinite(participant.position.x)
    || !Number.isFinite(participant.position.z)
  ) {
    throw new TypeError(`${name}.${participantId}.position.x/z 必须是有限数。`);
  }
  if (typeof participant.grounded !== 'boolean') {
    throw new TypeError(`${name}.${participantId}.grounded 必须是布尔值。`);
  }
  return participant;
}

function integerAtLeast(value, minimum, name) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value;
}

function tickDurationMs(ticks) {
  return Math.round((ticks * 1000) / ARENA_TICK_RATE);
}

export class InputPilotMetricCollector {
  #definition;
  #assignment;
  #localParticipantId;
  #lastObservedTick;
  #trialStartActiveTick;
  #movementIntentOrigin;
  #trialDurationMs;
  #firstEffectiveMovementMs;
  #actionMetrics;
  #timedOut;
  #observing;
  #finalized;
  #finalSnapshot;
  #destroyed;

  constructor({
    definition: definitionValue,
    assignment: assignmentValue,
    localParticipantId = 'player-1',
  }) {
    const definition = createInputPilotDefinition(definitionValue);
    if (typeof localParticipantId !== 'string' || localParticipantId.length === 0) {
      throw new TypeError(
        'InputPilotMetricCollector.localParticipantId 必须是非空字符串。',
      );
    }
    this.#definition = definition;
    this.#assignment = validateInputPilotAssignment(definition, assignmentValue);
    this.#localParticipantId = localParticipantId;
    this.#lastObservedTick = -1;
    this.#trialStartActiveTick = null;
    this.#movementIntentOrigin = null;
    this.#trialDurationMs = 0;
    this.#firstEffectiveMovementMs = null;
    this.#actionMetrics = new InputPilotActionMetrics({ localParticipantId });
    this.#timedOut = false;
    this.#observing = false;
    this.#finalized = false;
    this.#finalSnapshot = null;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('InputPilotMetricCollector 已销毁。');
    if (this.#observing) throw new Error('InputPilotMetricCollector.observeStep() 不可重入。');
  }

  #startTrial(snapshot) {
    if (this.#trialStartActiveTick !== null) return;
    this.#trialStartActiveTick = integerAtLeast(
      snapshot.activeTick,
      0,
      'InputPilotMetricCollector trialStartActiveTick',
    );
  }

  #elapsedAt(snapshot) {
    if (this.#trialStartActiveTick === null) return 0;
    const activeTick = integerAtLeast(
      snapshot.activeTick,
      this.#trialStartActiveTick,
      'InputPilotMetricCollector activeTick',
    );
    return Math.min(
      this.#definition.thresholds.maximumTrialDurationMs,
      tickDurationMs(activeTick - this.#trialStartActiveTick),
    );
  }

  observeStep({ beforeSnapshot, input, result }) {
    this.#assertUsable();
    if (this.#finalized) throw new Error('InputPilotMetricCollector 已终结。');
    if (this.#timedOut) return false;
    if (!result || typeof result !== 'object' || !Array.isArray(result.events)) {
      throw new TypeError('pilot observed result 无效。');
    }
    const beforeTick = integerAtLeast(beforeSnapshot?.tick, 0, 'pilot beforeSnapshot.tick');
    const afterTick = integerAtLeast(result.snapshot?.tick, 0, 'pilot result.snapshot.tick');
    const beforeActiveTick = integerAtLeast(
      beforeSnapshot?.activeTick,
      0,
      'pilot beforeSnapshot.activeTick',
    );
    const afterActiveTick = integerAtLeast(
      result.snapshot?.activeTick,
      0,
      'pilot result.snapshot.activeTick',
    );
    const normalizedInput = normalizeInputFrame(input, {
      expectedTick: beforeTick,
      participantIds: [this.#localParticipantId],
    });
    if (afterTick !== beforeTick + 1) {
      throw new RangeError('pilot observed step 必须恰好推进一个 authority tick。');
    }
    const expectedActiveTick = (
      beforeSnapshot.phase === ARENA_MATCH_PHASE.RUNNING
      || beforeSnapshot.phase === ARENA_MATCH_PHASE.SUDDEN_DEATH
    ) ? beforeActiveTick + 1 : beforeActiveTick;
    if (afterActiveTick !== expectedActiveTick) {
      throw new RangeError('pilot observed activeTick 与比赛阶段推进不一致。');
    }
    if (this.#lastObservedTick >= 0 && beforeTick !== this.#lastObservedTick + 1) {
      throw new RangeError('pilot observed tick 必须连续。');
    }
    if (beforeSnapshot.matchSeed !== result.snapshot.matchSeed) {
      throw new RangeError('pilot observed matchSeed 在 step 前后不一致。');
    }
    const beforeParticipant = requiredParticipant(
      beforeSnapshot,
      this.#localParticipantId,
      'pilot beforeSnapshot',
    );
    const afterParticipant = requiredParticipant(
      result.snapshot,
      this.#localParticipantId,
      'pilot result.snapshot',
    );

    this.#observing = true;
    try {
      this.#lastObservedTick = beforeTick;
      if (this.#trialStartActiveTick === null) {
        if (
          beforeSnapshot.phase === ARENA_MATCH_PHASE.RUNNING
          || beforeSnapshot.phase === ARENA_MATCH_PHASE.SUDDEN_DEATH
        ) this.#startTrial(beforeSnapshot);
        else if (
          result.snapshot.phase === ARENA_MATCH_PHASE.RUNNING
          || result.snapshot.phase === ARENA_MATCH_PHASE.SUDDEN_DEATH
        ) this.#startTrial(result.snapshot);
      }
      if (
        this.#trialStartActiveTick === null
        || beforeSnapshot.phase === ARENA_MATCH_PHASE.PREPARING
      ) {
        return true;
      }

      const elapsedMs = this.#elapsedAt(result.snapshot);
      this.#trialDurationMs = Math.max(this.#trialDurationMs, elapsedMs);
      this.#actionMetrics.observe({
        beforeParticipant,
        input: normalizedInput,
        events: result.events,
        elapsedMs,
      });
      if (
        this.#movementIntentOrigin === null
        && Math.hypot(normalizedInput.moveX, normalizedInput.moveZ) > 1e-6
      ) {
        this.#movementIntentOrigin = Object.freeze({
          x: beforeParticipant.position.x,
          z: beforeParticipant.position.z,
        });
      }
      if (this.#firstEffectiveMovementMs === null && this.#movementIntentOrigin !== null) {
        const distance = Math.hypot(
          afterParticipant.position.x - this.#movementIntentOrigin.x,
          afterParticipant.position.z - this.#movementIntentOrigin.z,
        );
        if (distance >= this.#definition.thresholds.effectiveMovementDistance) {
          this.#firstEffectiveMovementMs = elapsedMs;
        }
      }
      if (elapsedMs >= this.#definition.thresholds.maximumTrialDurationMs) {
        this.#timedOut = true;
      }
      return true;
    } finally {
      this.#observing = false;
    }
  }

  getStatus() {
    this.#assertUsable();
    return Object.freeze({
      assignmentId: this.#assignment.assignmentId,
      started: this.#trialStartActiveTick !== null,
      timedOut: this.#timedOut,
      finalized: this.#finalized,
      trialDurationMs: this.#trialDurationMs,
      lastObservedTick: this.#lastObservedTick,
    });
  }

  finalize() {
    this.#assertUsable();
    if (this.#finalized) return this.#finalSnapshot;
    const actionMetrics = this.#actionMetrics.getSnapshot();
    this.#finalSnapshot = Object.freeze({
      trialDurationMs: this.#trialDurationMs,
      firstEffectiveMovementMs: this.#firstEffectiveMovementMs,
      ...actionMetrics,
    });
    this.#finalized = true;
    return this.#finalSnapshot;
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#observing) {
      throw new Error('observeStep() 期间不能销毁 InputPilotMetricCollector。');
    }
    this.#destroyed = true;
    this.#definition = null;
    this.#assignment = null;
    this.#movementIntentOrigin = null;
    this.#actionMetrics = null;
    this.#finalSnapshot = null;
  }
}
