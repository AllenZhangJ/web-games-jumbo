import {
  normalizeInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_MATCH_PHASE, ARENA_TICK_RATE } from '@number-strategy-jump/arena-match';
import {
  InputPilotActionMetrics,
  type InputPilotActionEventObservation,
  type InputPilotActionParticipantObservation,
} from './input-pilot-action-metrics.js';
import {
  validateInputPilotAssignment,
  type InputPilotAssignment,
} from './input-pilot-assignment.js';
import {
  createInputPilotDefinition,
  type InputPilotDefinition,
} from './input-pilot-definition.js';
import {
  createInputPilotAutomatedMetrics,
  type InputPilotAutomatedMetrics,
} from './input-pilot-record-fields.js';

const MILLISECONDS_PER_SECOND = 1000;
const MOVEMENT_INTENT_EPSILON = 1e-6;
const MATCH_PHASES: ReadonlySet<string> = new Set(Object.values(ARENA_MATCH_PHASE));

type DataRecord = Readonly<Record<string, unknown>>;

interface ParticipantObservation extends InputPilotActionParticipantObservation {
  readonly position: Readonly<{ x: number; z: number }>;
}

interface StepProjection {
  readonly beforeTick: number;
  readonly beforeActiveTick: number;
  readonly beforePhase: string;
  readonly beforeParticipant: ParticipantObservation;
  readonly afterTick: number;
  readonly afterActiveTick: number;
  readonly afterPhase: string;
  readonly afterParticipant: ParticipantObservation;
  readonly input: ArenaInputFrame;
  readonly events: readonly InputPilotActionEventObservation[];
}

export interface InputPilotMetricCollectorStatus {
  readonly assignmentId: string;
  readonly started: boolean;
  readonly timedOut: boolean;
  readonly finalized: boolean;
  readonly trialDurationMs: number;
  readonly lastObservedTick: number;
}

function dataRecord(value: unknown, name: string): DataRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return value as DataRecord;
}

function ownDataValue(record: DataRecord, key: string, name: string, required = true): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${key} 必须是自有数据字段。`);
  }
  if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function dataArray(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const items: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError(`${name}[${index}] 必须是可枚举数据字段。`);
    items.push(descriptor.value);
  }
  return Object.freeze(items);
}

function integerAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value as number;
}

function finiteNumber(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value as number;
}

function matchPhase(value: unknown, name: string): string {
  if (typeof value !== 'string' || !MATCH_PHASES.has(value)) {
    throw new RangeError(`${name} 不是受支持的比赛阶段。`);
  }
  return value;
}

function selectedActionId(value: unknown, name: string): string | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const source = dataRecord(value, name);
  if (ownDataValue(source, 'kind', name, false) !== 'selected') return null;
  const actionDefinitionId = ownDataValue(source, 'actionDefinitionId', name, false);
  return typeof actionDefinitionId === 'string' ? actionDefinitionId : null;
}

function participantObservation(value: unknown, name: string): ParticipantObservation {
  const source = dataRecord(value, name);
  const position = dataRecord(ownDataValue(source, 'position', name), `${name}.position`);
  const grounded = ownDataValue(source, 'grounded', name);
  if (typeof grounded !== 'boolean') throw new TypeError(`${name}.grounded 必须是布尔值。`);
  const actionAffordanceValue = ownDataValue(source, 'actionAffordance', name, false);
  const channelsValue = actionAffordanceValue === null || actionAffordanceValue === undefined
    ? undefined
    : ownDataValue(
      dataRecord(actionAffordanceValue, `${name}.actionAffordance`),
      'channels',
      `${name}.actionAffordance`,
      false,
    );
  const channels = channelsValue === null || channelsValue === undefined
    ? null
    : dataRecord(channelsValue, `${name}.actionAffordance.channels`);
  return Object.freeze({
    grounded,
    position: Object.freeze({
      x: finiteNumber(ownDataValue(position, 'x', `${name}.position`), `${name}.position.x`),
      z: finiteNumber(ownDataValue(position, 'z', `${name}.position`), `${name}.position.z`),
    }),
    primaryActionId: channels === null
      ? null
      : selectedActionId(
        ownDataValue(channels, 'primary', `${name}.actionAffordance.channels`, false),
        `${name}.actionAffordance.channels.primary`,
      ),
    primaryHoldActionId: channels === null
      ? null
      : selectedActionId(
        ownDataValue(channels, 'primaryHold', `${name}.actionAffordance.channels`, false),
        `${name}.actionAffordance.channels.primaryHold`,
      ),
  });
}

function requiredParticipant(
  snapshot: DataRecord,
  participantId: string,
  name: string,
): ParticipantObservation {
  const participants = dataArray(ownDataValue(snapshot, 'participants', name), `${name}.participants`);
  let found: ParticipantObservation | null = null;
  for (let index = 0; index < participants.length; index += 1) {
    const participantName = `${name}.participants[${index}]`;
    const participant = dataRecord(participants[index], participantName);
    const id = ownDataValue(participant, 'id', participantName);
    if (typeof id !== 'string') throw new TypeError(`${participantName}.id 必须是字符串。`);
    if (id !== participantId) continue;
    if (found !== null) throw new RangeError(`${name} 包含重复 participant ${participantId}。`);
    found = participantObservation(participant, `${name}.${participantId}`);
  }
  if (found === null) throw new RangeError(`${name} 缺少 participant ${participantId}。`);
  return found;
}

function eventObservations(value: unknown): readonly InputPilotActionEventObservation[] {
  const events = dataArray(value, 'pilot observed result.events');
  return Object.freeze(events.map((event, index) => {
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      return Object.freeze({ type: undefined, participantId: undefined, action: undefined });
    }
    const source = dataRecord(event, `pilot observed result.events[${index}]`);
    return Object.freeze({
      type: ownDataValue(source, 'type', `pilot observed result.events[${index}]`, false),
      participantId: ownDataValue(
        source,
        'participantId',
        `pilot observed result.events[${index}]`,
        false,
      ),
      action: ownDataValue(source, 'action', `pilot observed result.events[${index}]`, false),
    });
  }));
}

function tickDurationMs(ticks: number): number {
  return Math.round((ticks * MILLISECONDS_PER_SECOND) / ARENA_TICK_RATE);
}

export class InputPilotMetricCollector {
  #definition: InputPilotDefinition | null;
  #assignment: InputPilotAssignment | null;
  readonly #localParticipantId: string;
  #lastObservedTick: number;
  #trialStartActiveTick: number | null;
  #movementIntentOrigin: Readonly<{ x: number; z: number }> | null;
  #trialDurationMs: number;
  #firstEffectiveMovementMs: number | null;
  #actionMetrics: InputPilotActionMetrics | null;
  #timedOut: boolean;
  #observing: boolean;
  #finalized: boolean;
  #finalSnapshot: InputPilotAutomatedMetrics | null;
  #destroyed: boolean;

  constructor({
    definition: definitionValue,
    assignment: assignmentValue,
    localParticipantId = 'player-1',
  }: {
    readonly definition: unknown;
    readonly assignment: unknown;
    readonly localParticipantId?: unknown;
  }) {
    const definition = createInputPilotDefinition(definitionValue);
    if (typeof localParticipantId !== 'string' || localParticipantId.length === 0) {
      throw new TypeError('InputPilotMetricCollector.localParticipantId 必须是非空字符串。');
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

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('InputPilotMetricCollector 已销毁。');
    if (this.#observing) throw new Error('InputPilotMetricCollector.observeStep() 不可重入。');
  }

  #projectStep(value: unknown): StepProjection {
    const options = dataRecord(value, 'InputPilotMetricCollector.observeStep options');
    const beforeSnapshot = dataRecord(
      ownDataValue(options, 'beforeSnapshot', 'InputPilotMetricCollector.observeStep options'),
      'pilot beforeSnapshot',
    );
    const result = dataRecord(
      ownDataValue(options, 'result', 'InputPilotMetricCollector.observeStep options'),
      'pilot observed result',
    );
    const afterSnapshot = dataRecord(
      ownDataValue(result, 'snapshot', 'pilot observed result'),
      'pilot result.snapshot',
    );
    const beforeTick = integerAtLeast(
      ownDataValue(beforeSnapshot, 'tick', 'pilot beforeSnapshot'),
      0,
      'pilot beforeSnapshot.tick',
    );
    const afterTick = integerAtLeast(
      ownDataValue(afterSnapshot, 'tick', 'pilot result.snapshot'),
      0,
      'pilot result.snapshot.tick',
    );
    const beforeActiveTick = integerAtLeast(
      ownDataValue(beforeSnapshot, 'activeTick', 'pilot beforeSnapshot'),
      0,
      'pilot beforeSnapshot.activeTick',
    );
    const afterActiveTick = integerAtLeast(
      ownDataValue(afterSnapshot, 'activeTick', 'pilot result.snapshot'),
      0,
      'pilot result.snapshot.activeTick',
    );
    const beforePhase = matchPhase(
      ownDataValue(beforeSnapshot, 'phase', 'pilot beforeSnapshot'),
      'pilot beforeSnapshot.phase',
    );
    const afterPhase = matchPhase(
      ownDataValue(afterSnapshot, 'phase', 'pilot result.snapshot'),
      'pilot result.snapshot.phase',
    );
    const beforeMatchSeed = integerAtLeast(
      ownDataValue(beforeSnapshot, 'matchSeed', 'pilot beforeSnapshot'),
      0,
      'pilot beforeSnapshot.matchSeed',
    );
    const afterMatchSeed = integerAtLeast(
      ownDataValue(afterSnapshot, 'matchSeed', 'pilot result.snapshot'),
      0,
      'pilot result.snapshot.matchSeed',
    );
    const assignment = this.#assignment;
    if (assignment === null) throw new Error('InputPilotMetricCollector Assignment 已释放。');
    if (beforeMatchSeed !== afterMatchSeed || beforeMatchSeed !== assignment.matchSeed) {
      throw new RangeError('pilot observed matchSeed 与当前 Assignment 不一致。');
    }
    const input = normalizeInputFrame(
      ownDataValue(options, 'input', 'InputPilotMetricCollector.observeStep options'),
      { expectedTick: beforeTick, participantIds: [this.#localParticipantId] },
    );
    return Object.freeze({
      beforeTick,
      beforeActiveTick,
      beforePhase,
      beforeParticipant: requiredParticipant(
        beforeSnapshot,
        this.#localParticipantId,
        'pilot beforeSnapshot',
      ),
      afterTick,
      afterActiveTick,
      afterPhase,
      afterParticipant: requiredParticipant(
        afterSnapshot,
        this.#localParticipantId,
        'pilot result.snapshot',
      ),
      input,
      events: eventObservations(ownDataValue(result, 'events', 'pilot observed result')),
    });
  }

  observeStep(value: unknown): boolean {
    this.#assertUsable();
    if (this.#finalized) throw new Error('InputPilotMetricCollector 已终结。');
    if (this.#timedOut) return false;
    this.#observing = true;
    try {
      const step = this.#projectStep(value);
      if (step.afterTick !== step.beforeTick + 1) {
        throw new RangeError('pilot observed step 必须恰好推进一个 authority tick。');
      }
      const beforeIsActive = (
        step.beforePhase === ARENA_MATCH_PHASE.RUNNING
        || step.beforePhase === ARENA_MATCH_PHASE.SUDDEN_DEATH
      );
      const afterIsActive = (
        step.afterPhase === ARENA_MATCH_PHASE.RUNNING
        || step.afterPhase === ARENA_MATCH_PHASE.SUDDEN_DEATH
      );
      const expectedActiveTick = beforeIsActive
        ? step.beforeActiveTick + 1
        : step.beforeActiveTick;
      if (step.afterActiveTick !== expectedActiveTick) {
        throw new RangeError('pilot observed activeTick 与比赛阶段推进不一致。');
      }
      if (this.#lastObservedTick >= 0 && step.beforeTick !== this.#lastObservedTick + 1) {
        throw new RangeError('pilot observed tick 必须连续。');
      }

      let trialStartActiveTick = this.#trialStartActiveTick;
      if (trialStartActiveTick === null) {
        if (beforeIsActive) trialStartActiveTick = step.beforeActiveTick;
        else if (afterIsActive) trialStartActiveTick = step.afterActiveTick;
      }
      if (trialStartActiveTick === null || step.beforePhase === ARENA_MATCH_PHASE.PREPARING) {
        this.#trialStartActiveTick = trialStartActiveTick;
        this.#lastObservedTick = step.beforeTick;
        return true;
      }

      const definition = this.#definition;
      const actionMetrics = this.#actionMetrics;
      if (definition === null || actionMetrics === null) {
        throw new Error('InputPilotMetricCollector 资源已释放。');
      }
      const elapsedMs = Math.min(
        definition.thresholds.maximumTrialDurationMs,
        tickDurationMs(step.afterActiveTick - trialStartActiveTick),
      );
      const trialDurationMs = Math.max(this.#trialDurationMs, elapsedMs);
      let movementIntentOrigin = this.#movementIntentOrigin;
      if (
        movementIntentOrigin === null
        && Math.hypot(step.input.moveX, step.input.moveZ) > MOVEMENT_INTENT_EPSILON
      ) {
        movementIntentOrigin = Object.freeze({
          x: step.beforeParticipant.position.x,
          z: step.beforeParticipant.position.z,
        });
      }
      let firstEffectiveMovementMs = this.#firstEffectiveMovementMs;
      if (firstEffectiveMovementMs === null && movementIntentOrigin !== null) {
        const distance = Math.hypot(
          step.afterParticipant.position.x - movementIntentOrigin.x,
          step.afterParticipant.position.z - movementIntentOrigin.z,
        );
        if (distance >= definition.thresholds.effectiveMovementDistance) {
          firstEffectiveMovementMs = elapsedMs;
        }
      }

      actionMetrics.observe({
        beforeParticipant: step.beforeParticipant,
        input: step.input,
        events: step.events,
        elapsedMs,
      });
      this.#trialStartActiveTick = trialStartActiveTick;
      this.#lastObservedTick = step.beforeTick;
      this.#trialDurationMs = trialDurationMs;
      this.#movementIntentOrigin = movementIntentOrigin;
      this.#firstEffectiveMovementMs = firstEffectiveMovementMs;
      this.#timedOut = elapsedMs >= definition.thresholds.maximumTrialDurationMs;
      return true;
    } finally {
      this.#observing = false;
    }
  }

  getStatus(): InputPilotMetricCollectorStatus {
    this.#assertUsable();
    const assignment = this.#assignment;
    if (assignment === null) throw new Error('InputPilotMetricCollector Assignment 已释放。');
    return Object.freeze({
      assignmentId: assignment.assignmentId,
      started: this.#trialStartActiveTick !== null,
      timedOut: this.#timedOut,
      finalized: this.#finalized,
      trialDurationMs: this.#trialDurationMs,
      lastObservedTick: this.#lastObservedTick,
    });
  }

  finalize(): InputPilotAutomatedMetrics {
    this.#assertUsable();
    if (this.#finalized) {
      if (this.#finalSnapshot === null) {
        throw new Error('InputPilotMetricCollector 终态快照缺失。');
      }
      return this.#finalSnapshot;
    }
    const definition = this.#definition;
    const actionMetrics = this.#actionMetrics;
    if (definition === null || actionMetrics === null) {
      throw new Error('InputPilotMetricCollector 资源已释放。');
    }
    const finalSnapshot = createInputPilotAutomatedMetrics({
      trialDurationMs: this.#trialDurationMs,
      firstEffectiveMovementMs: this.#firstEffectiveMovementMs,
      ...actionMetrics.getSnapshot(),
    }, definition.thresholds.maximumTrialDurationMs, 'InputPilotMetricCollector final snapshot');
    this.#finalSnapshot = finalSnapshot;
    this.#finalized = true;
    return finalSnapshot;
  }

  destroy(): void {
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
