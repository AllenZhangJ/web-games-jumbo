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
  assertKnownKeys,
  assertNonEmptyString,
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

function cloneInput(input: unknown): ActionIntentInput {
  assertKnownKeys(input, INPUT_KEYS, 'ActionResolutionContext.input');
  const result: Record<string, boolean> = {};
  for (const key of INPUT_KEYS) {
    if (typeof input[key] !== 'boolean') {
      throw new TypeError(`ActionResolutionContext.input.${key} 必须是布尔值。`);
    }
    result[key] = input[key];
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
    Object.freeze(this);
  }

  #prepareCandidateBatch(values: readonly unknown[]): PreparedCandidateBatch {
    const cacheable = Object.isFrozen(values) && values.every(Object.isFrozen);
    if (cacheable) {
      const cached = this.#candidateBatchCache.get(values);
      if (cached) return cached;
    }
    const candidates = values.map(createActionCandidate);
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

  resolve(contextValue: unknown): ActionResolutionResult {
    assertKnownKeys(contextValue, CONTEXT_KEYS, 'ActionResolutionContext');
    const tick = assertIntegerAtLeast(contextValue.tick, 0, 'ActionResolutionContext.tick');
    const participantId = assertNonEmptyString(contextValue.participantId, 'ActionResolutionContext.participantId');
    if (typeof contextValue.canAct !== 'boolean') {
      throw new TypeError('ActionResolutionContext.canAct 必须是布尔值。');
    }
    const input = cloneInput(contextValue.input);
    if (!Array.isArray(contextValue.candidates)) {
      throw new TypeError('ActionResolutionContext.candidates 必须是数组。');
    }
    const occupiedLanes = cloneFrozenStringSet(
      contextValue.occupiedLanes as readonly unknown[] | undefined,
      'ActionResolutionContext.occupiedLanes',
    );
    for (const lane of occupiedLanes) {
      if (!ACTION_LANES.has(lane)) throw new RangeError(`未知 occupied action lane ${lane}。`);
    }
    const activeConflictTags = cloneFrozenStringSet(
      contextValue.activeConflictTags as readonly unknown[] | undefined,
      'ActionResolutionContext.activeConflictTags',
    );
    const occupiedLaneSet = new Set(occupiedLanes);
    const activeConflictTagSet = new Set(activeConflictTags);
    const { candidates, definitionByCandidateId } = this.#prepareCandidateBatch(contextValue.candidates);

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
    if (!contextValue.canAct) {
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
}
