import {
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  type ActionDefinition,
  type ActionInputChannel,
  type ActionLane,
} from '@number-strategy-jump/arena-definitions';
import {
  ACTION_RESOLUTION_KIND,
  assertIntegerAtLeast,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  cloneFrozenStringSet,
  type ActionResolutionKind,
} from '@number-strategy-jump/arena-contracts';
import {
  compareActionCandidates,
  createActionCandidate,
  type ActionCandidate,
} from './action-candidate.js';

export { ACTION_RESOLUTION_KIND } from '@number-strategy-jump/arena-contracts';

export const ACTION_PRIORITY = Object.freeze({
  AIR_COMBAT: 550,
  EQUIPMENT: 500,
  LOCOMOTION: 400,
  AIR: 400,
  INTERACTION: 300,
  BASE: 100,
} as const);

export interface ActionIntentInput {
  readonly primaryPressed: boolean;
  readonly primaryHeld: boolean;
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
  readonly slamPressed: boolean;
}

export interface ActionResolution {
  readonly kind: ActionResolutionKind;
  readonly tick: number;
  readonly participantId: string;
  readonly inputChannel: ActionInputChannel | null;
  readonly lane: ActionLane | null;
  readonly reason: string;
  readonly candidateId: string | null;
  readonly actionDefinitionId: string | null;
  readonly source: string | null;
}

export interface ActionResolutionResult {
  readonly tick: number;
  readonly participantId: string;
  readonly outcomes: readonly ActionResolution[];
}

export interface ActionResolutionContext {
  readonly tick: number;
  readonly participantId: string;
  readonly canAct: boolean;
  readonly input: ActionIntentInput;
  readonly candidates: readonly unknown[];
  readonly occupiedLanes: readonly string[];
  readonly activeConflictTags: readonly string[];
}

export interface ActionRegistryContract {
  require(id: string): ActionDefinition;
}

const CONTEXT_KEYS = new Set([
  'tick', 'participantId', 'canAct', 'input', 'candidates',
  'occupiedLanes', 'activeConflictTags',
]);
const PREVIEW_CONTEXT_KEYS = new Set([
  'tick', 'participantId', 'canAct', 'candidates',
  'occupiedLanes', 'activeConflictTags',
]);
const INPUT_KEYS = new Set([
  'primaryPressed', 'primaryHeld', 'jumpPressed', 'jumpHeld', 'slamPressed',
]);
const INPUT_CHANNEL_ORDER = Object.freeze<ActionInputChannel[]>([
  ACTION_INPUT_CHANNEL.PRIMARY,
  ACTION_INPUT_CHANNEL.JUMP,
  ACTION_INPUT_CHANNEL.SLAM,
]);
const ACTION_LANES: ReadonlySet<unknown> = new Set(Object.values(ACTION_LANE));

interface PreparedCandidateBatch {
  readonly candidates: readonly ActionCandidate[];
  readonly definitionByCandidateId: ReadonlyMap<string, ActionDefinition>;
}

interface PreparedResolutionContext {
  readonly tick: number;
  readonly participantId: string;
  readonly canAct: boolean;
  readonly candidates: readonly ActionCandidate[];
  readonly definitionByCandidateId: ReadonlyMap<string, ActionDefinition>;
  readonly occupiedLanes: readonly string[];
  readonly activeConflictTags: readonly string[];
  readonly occupiedLaneSet: ReadonlySet<string>;
  readonly activeConflictTagSet: ReadonlySet<string>;
}

interface ActionResolverPreviewResult {
  readonly resolutions: readonly ActionResolutionResult[];
  readonly displayResolution: ActionResolutionResult | null;
}

export interface ActionResolverPreviewPort {
  readonly resolve: (
    contextValue: unknown,
    intentInputsValue: unknown,
  ) => ActionResolverPreviewResult;
  readonly resolveWithoutDisplay: (
    contextValue: unknown,
    intentInputsValue: unknown,
  ) => ActionResolverPreviewResult;
}

const ACTION_RESOLVER_PREVIEW_PORTS = new WeakMap<object, ActionResolverPreviewPort>();

export function getActionResolverPreviewPort(
  resolver: object,
): ActionResolverPreviewPort | null {
  return ACTION_RESOLVER_PREVIEW_PORTS.get(resolver) ?? null;
}

const DISPLAY_PRIMARY_INPUT: ActionIntentInput = Object.freeze({
  primaryPressed: true,
  primaryHeld: false,
  jumpPressed: false,
  jumpHeld: false,
  slamPressed: false,
});
const NO_PREVIEW_INPUT = Symbol('no preview input');

function snapshotKnownRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  const record = assertPlainRecord(value, name);
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== 'string') throw new TypeError(`${name} 不能包含 Symbol 字段。`);
    if (!allowedKeys.has(key)) throw new RangeError(`${name} 不支持字段 ${key}。`);
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    result[key] = descriptor.value;
  }
  return result;
}

function snapshotDataArray(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (
    !lengthDescriptor
    || !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value')
    || !Number.isSafeInteger(lengthDescriptor.value)
    || lengthDescriptor.value < 0
  ) throw new TypeError(`${name} 必须包含安全的 length 数据字段。`);
  const length = lengthDescriptor.value as number;
  const keys = Reflect.ownKeys(value);
  const keySet = new Set(keys);
  if (keys.length !== length + 1 || !keySet.has('length')) {
    throw new TypeError(`${name} 不能包含额外字段或隐藏索引。`);
  }
  const result: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    if (!keySet.has(key)) throw new TypeError(`${name} 不能包含空槽或隐藏索引。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError(`${name}[${index}] 必须是可枚举数据字段。`);
    result.push(descriptor.value);
  }
  return Object.freeze(result);
}

function isFrozenCandidateArray(values: readonly unknown[]): boolean {
  if (!Object.isFrozen(values)) return false;
  const lengthDescriptor = Object.getOwnPropertyDescriptor(values, 'length');
  if (
    !lengthDescriptor
    || !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value')
    || !Number.isSafeInteger(lengthDescriptor.value)
    || lengthDescriptor.value < 0
  ) return false;
  const length = lengthDescriptor.value as number;
  const keys = Reflect.ownKeys(values);
  const keySet = new Set(keys);
  if (keys.length !== length + 1 || !keySet.has('length')) return false;
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
      || !descriptor.value
      || typeof descriptor.value !== 'object'
      || !Object.isFrozen(descriptor.value)
    ) return false;
  }
  return true;
}

function cloneInput(input: unknown): ActionIntentInput {
  const source = snapshotKnownRecord(input, INPUT_KEYS, 'ActionResolutionContext.input');
  const result: Record<string, boolean> = {};
  for (const key of INPUT_KEYS) {
    if (typeof source[key] !== 'boolean') {
      throw new TypeError(`ActionResolutionContext.input.${key} 必须是布尔值。`);
    }
    result[key] = source[key] as boolean;
  }
  return Object.freeze(result) as unknown as ActionIntentInput;
}

function hasChannelIntent(channel: ActionInputChannel, input: ActionIntentInput): boolean {
  if (channel === ACTION_INPUT_CHANNEL.PRIMARY) return input.primaryPressed || input.primaryHeld;
  if (channel === ACTION_INPUT_CHANNEL.JUMP) return input.jumpPressed || input.jumpHeld;
  if (channel === ACTION_INPUT_CHANNEL.SLAM) return input.slamPressed;
  throw new RangeError(`未知 Action input channel ${String(channel)}。`);
}

function isTriggered(definition: ActionDefinition, input: ActionIntentInput): boolean {
  const { channel, trigger } = definition.input;
  if (channel === ACTION_INPUT_CHANNEL.PRIMARY) {
    if (trigger === ACTION_INPUT_TRIGGER.PRESSED) return input.primaryPressed;
    if (trigger === ACTION_INPUT_TRIGGER.HELD) return input.primaryHeld;
    return !input.primaryHeld;
  }
  if (channel === ACTION_INPUT_CHANNEL.JUMP) {
    if (trigger === ACTION_INPUT_TRIGGER.PRESSED) return input.jumpPressed;
    if (trigger === ACTION_INPUT_TRIGGER.HELD) return input.jumpHeld;
    return !input.jumpHeld;
  }
  if (channel === ACTION_INPUT_CHANNEL.SLAM) return input.slamPressed;
  throw new RangeError(`ActionDefinition ${definition.id} 使用未知 input channel。`);
}

function createOutcome(options: {
  readonly kind: ActionResolutionKind;
  readonly tick: number;
  readonly participantId: string;
  readonly inputChannel: ActionInputChannel | null;
  readonly lane?: ActionLane | null;
  readonly reason: string;
  readonly candidate?: ActionCandidate | null;
  readonly actionDefinitionId?: string | null;
}): ActionResolution {
  const {
    kind, tick, participantId, inputChannel, lane = null, reason,
    candidate = null, actionDefinitionId = null,
  } = options;
  return Object.freeze({
    kind,
    tick,
    participantId,
    inputChannel,
    lane,
    reason,
    candidateId: candidate?.id ?? null,
    actionDefinitionId,
    source: candidate?.source ?? null,
  });
}

function firstIntersection(left: readonly string[], right: ReadonlySet<string>): string | null {
  for (const value of left) if (right.has(value)) return value;
  return null;
}

export class ActionResolver {
  readonly #actionRegistry: ActionRegistryContract;
  readonly #candidateBatchCache = new WeakMap<readonly unknown[], PreparedCandidateBatch>();

  constructor({ actionRegistry }: { readonly actionRegistry: ActionRegistryContract }) {
    if (!actionRegistry || typeof actionRegistry.require !== 'function') {
      throw new TypeError('ActionResolver 需要只读 ActionRegistry。');
    }
    this.#actionRegistry = actionRegistry;
    if (new.target === ActionResolver) {
      ACTION_RESOLVER_PREVIEW_PORTS.set(this, Object.freeze({
        resolve: (contextValue: unknown, intentInputsValue: unknown) => (
          this.#resolvePreviewBatch(contextValue, intentInputsValue, true)
        ),
        resolveWithoutDisplay: (contextValue: unknown, intentInputsValue: unknown) => (
          this.#resolvePreviewBatch(contextValue, intentInputsValue, false)
        ),
      }));
    }
    Object.freeze(this);
  }

  #prepareCandidateBatch(values: readonly unknown[]): PreparedCandidateBatch {
    if (!Array.isArray(values)) {
      throw new TypeError('ActionResolutionContext.candidates 必须是数组。');
    }
    const cacheable = isFrozenCandidateArray(values);
    if (cacheable) {
      const cached = this.#candidateBatchCache.get(values);
      if (cached) return cached;
    }
    const candidateValues = snapshotDataArray(values, 'ActionResolutionContext.candidates');
    const candidates = candidateValues.map((value, index) => (
      createActionCandidate(
        cloneFrozenData(value, `ActionCandidate[${index}]`),
        index,
      )
    ));
    const candidateIds = new Set<string>();
    const definitionByCandidateId = new Map<string, ActionDefinition>();
    for (const candidate of candidates) {
      if (candidateIds.has(candidate.id)) {
        throw new RangeError(`ActionResolutionContext 包含重复 candidate id ${candidate.id}。`);
      }
      candidateIds.add(candidate.id);
      definitionByCandidateId.set(candidate.id, this.#actionRegistry.require(candidate.actionDefinitionId));
    }
    candidates.sort(compareActionCandidates);
    const prepared = Object.freeze({
      candidates: Object.freeze(candidates),
      definitionByCandidateId,
    });
    if (cacheable) this.#candidateBatchCache.set(values, prepared);
    return prepared;
  }

  #prepareContext(
    source: Record<string, unknown>,
    inputValue: unknown | typeof NO_PREVIEW_INPUT,
  ): { readonly context: PreparedResolutionContext; readonly input: ActionIntentInput | undefined } {
    const tick = assertIntegerAtLeast(source.tick, 0, 'ActionResolutionContext.tick');
    const participantId = assertNonEmptyString(source.participantId, 'ActionResolutionContext.participantId');
    if (typeof source.canAct !== 'boolean') {
      throw new TypeError('ActionResolutionContext.canAct 必须是布尔值。');
    }
    const input = inputValue === NO_PREVIEW_INPUT ? undefined : cloneInput(inputValue);
    if (!Array.isArray(source.candidates)) {
      throw new TypeError('ActionResolutionContext.candidates 必须是数组。');
    }
    const occupiedValues = source.occupiedLanes === undefined
      ? Object.freeze([])
      : snapshotDataArray(source.occupiedLanes, 'ActionResolutionContext.occupiedLanes');
    const occupiedLanes = cloneFrozenStringSet(
      occupiedValues,
      'ActionResolutionContext.occupiedLanes',
    );
    for (const lane of occupiedLanes) {
      if (!ACTION_LANES.has(lane)) throw new RangeError(`未知 occupied action lane ${lane}。`);
    }
    const conflictValues = source.activeConflictTags === undefined
      ? Object.freeze([])
      : snapshotDataArray(source.activeConflictTags, 'ActionResolutionContext.activeConflictTags');
    const activeConflictTags = cloneFrozenStringSet(
      conflictValues,
      'ActionResolutionContext.activeConflictTags',
    );
    const { candidates, definitionByCandidateId } = this.#prepareCandidateBatch(source.candidates);
    return {
      context: Object.freeze({
        tick,
        participantId,
        canAct: source.canAct as boolean,
        candidates,
        definitionByCandidateId,
        occupiedLanes,
        activeConflictTags,
        occupiedLaneSet: new Set(occupiedLanes),
        activeConflictTagSet: new Set(activeConflictTags),
      }),
      input,
    };
  }

  #evaluatePreparedContext(
    context: PreparedResolutionContext,
    input: ActionIntentInput,
    canAct = context.canAct,
  ): ActionResolutionResult {
    const {
      tick,
      participantId,
      candidates,
      definitionByCandidateId,
      occupiedLaneSet,
      activeConflictTagSet,
    } = context;
    const activeChannels = INPUT_CHANNEL_ORDER.filter((channel) => (
      hasChannelIntent(channel, input)
      || candidates.some((candidate) => {
        const definition = definitionByCandidateId.get(candidate.id);
        return definition?.input.channel === channel && isTriggered(definition, input);
      })
    ));
    if (activeChannels.length === 0) {
      return Object.freeze({
        tick,
        participantId,
        outcomes: Object.freeze([createOutcome({
          kind: ACTION_RESOLUTION_KIND.NONE,
          tick,
          participantId,
          inputChannel: null,
          reason: 'no-input',
        })]),
      });
    }
    if (!canAct) {
      return Object.freeze({
        tick,
        participantId,
        outcomes: Object.freeze(activeChannels.map((inputChannel) => createOutcome({
          kind: ACTION_RESOLUTION_KIND.IGNORED,
          tick,
          participantId,
          inputChannel,
          reason: 'participant-unavailable',
        }))),
      });
    }

    const provisional = activeChannels.map((inputChannel): ActionResolution => {
      for (const candidate of candidates) {
        const definition = definitionByCandidateId.get(candidate.id);
        if (!definition || definition.input.channel !== inputChannel || !isTriggered(definition, input)) continue;
        if (occupiedLaneSet.has(definition.lane)) {
          return createOutcome({ kind: ACTION_RESOLUTION_KIND.IGNORED, tick, participantId, inputChannel, lane: definition.lane, reason: 'action-lane-occupied', candidate, actionDefinitionId: definition.id });
        }
        if (firstIntersection(definition.conflictTags, activeConflictTagSet) !== null) {
          return createOutcome({ kind: ACTION_RESOLUTION_KIND.IGNORED, tick, participantId, inputChannel, lane: definition.lane, reason: 'active-action-conflict', candidate, actionDefinitionId: definition.id });
        }
        if (candidate.available) {
          return createOutcome({ kind: ACTION_RESOLUTION_KIND.SELECTED, tick, participantId, inputChannel, lane: definition.lane, reason: 'candidate-selected', candidate, actionDefinitionId: definition.id });
        }
        if (candidate.blocksFallback) {
          return createOutcome({ kind: ACTION_RESOLUTION_KIND.IGNORED, tick, participantId, inputChannel, lane: definition.lane, reason: candidate.unavailableReason ?? 'candidate-unavailable', candidate, actionDefinitionId: definition.id });
        }
      }
      return createOutcome({ kind: ACTION_RESOLUTION_KIND.NONE, tick, participantId, inputChannel, reason: 'no-available-candidate' });
    });

    const selectedByCandidateId = new Map(provisional
      .filter((outcome) => outcome.kind === ACTION_RESOLUTION_KIND.SELECTED && outcome.candidateId !== null)
      .map((outcome) => [outcome.candidateId as string, outcome]));
    const acceptedCandidateIds = new Set<string>();
    const selectedLanes = new Set<ActionLane>();
    const selectedConflictTags = new Set<string>();
    for (const candidate of candidates) {
      const outcome = selectedByCandidateId.get(candidate.id);
      if (!outcome) continue;
      const definition = definitionByCandidateId.get(candidate.id);
      if (!definition) throw new Error(`ActionCandidate ${candidate.id} 缺少已校验 Definition。`);
      if (
        selectedLanes.has(definition.lane)
        || firstIntersection(definition.conflictTags, selectedConflictTags) !== null
      ) continue;
      acceptedCandidateIds.add(candidate.id);
      selectedLanes.add(definition.lane);
      definition.conflictTags.forEach((tag) => selectedConflictTags.add(tag));
    }
    const outcomes = provisional.map((outcome): ActionResolution => {
      if (
        outcome.kind !== ACTION_RESOLUTION_KIND.SELECTED
        || (outcome.candidateId !== null && acceptedCandidateIds.has(outcome.candidateId))
      ) return outcome;
      const candidateId = outcome.candidateId;
      if (candidateId === null) throw new Error('Selected ActionResolution 缺少 candidateId。');
      const definition = definitionByCandidateId.get(candidateId);
      if (!definition) throw new Error(`ActionCandidate ${candidateId} 缺少已校验 Definition。`);
      const candidate = candidates.find(({ id }) => id === candidateId);
      if (!candidate) throw new Error(`ActionCandidate ${candidateId} 缺少已校验候选。`);
      return createOutcome({
        kind: ACTION_RESOLUTION_KIND.IGNORED,
        tick,
        participantId,
        inputChannel: outcome.inputChannel,
        lane: definition.lane,
        reason: selectedLanes.has(definition.lane)
          ? 'same-tick-lane-conflict'
          : 'same-tick-action-conflict',
        candidate,
        actionDefinitionId: definition.id,
      });
    });
    return Object.freeze({ tick, participantId, outcomes: Object.freeze(outcomes) });
  }

  #resolvePreviewBatch(
    contextValue: unknown,
    intentInputsValue: unknown,
    includeUnavailableDisplay: boolean,
  ): ActionResolverPreviewResult {
    const source = snapshotKnownRecord(
      contextValue,
      PREVIEW_CONTEXT_KEYS,
      'ActionResolver preview context',
    );
    const intentValues = snapshotDataArray(intentInputsValue, 'ActionResolver preview intents');
    if (intentValues.length === 0) {
      throw new RangeError('ActionResolver preview intents 不能为空。');
    }
    const inputs = intentValues.map((value) => cloneInput(value));
    const { context } = this.#prepareContext(source, NO_PREVIEW_INPUT);
    const resolutions = inputs.map((input) => this.#evaluatePreparedContext(context, input));
    const displayResolution = !includeUnavailableDisplay || context.canAct
      ? null
      : this.#evaluatePreparedContext(context, DISPLAY_PRIMARY_INPUT, true);
    return Object.freeze({
      resolutions: Object.freeze(resolutions),
      displayResolution,
    });
  }

  resolve(contextValue: unknown): ActionResolutionResult {
    const source = snapshotKnownRecord(contextValue, CONTEXT_KEYS, 'ActionResolutionContext');
    const { context, input } = this.#prepareContext(source, source.input);
    if (!input) throw new Error('ActionResolutionContext.input 缺失。');
    return this.#evaluatePreparedContext(context, input);
  }
}
