import {
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
} from '@number-strategy-jump/arena-definitions';
import {
  compareActionCandidates,
  createActionCandidate,
} from './action-candidate.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';

export const ACTION_RESOLUTION_KIND = Object.freeze({
  NONE: 'none',
  IGNORED: 'ignored',
  SELECTED: 'selected',
});

export const ACTION_PRIORITY = Object.freeze({
  AIR_COMBAT: 550,
  EQUIPMENT: 500,
  LOCOMOTION: 400,
  AIR: 400,
  INTERACTION: 300,
  BASE: 100,
});

const CONTEXT_KEYS = new Set([
  'tick',
  'participantId',
  'canAct',
  'input',
  'candidates',
  'occupiedLanes',
  'activeConflictTags',
]);
const INPUT_KEYS = new Set([
  'primaryPressed',
  'primaryHeld',
  'jumpPressed',
  'jumpHeld',
  'slamPressed',
]);
const INPUT_CHANNEL_ORDER = Object.freeze([
  ACTION_INPUT_CHANNEL.PRIMARY,
  ACTION_INPUT_CHANNEL.JUMP,
  ACTION_INPUT_CHANNEL.SLAM,
]);
const ACTION_LANES = new Set(Object.values(ACTION_LANE));

function cloneInput(input) {
  assertKnownKeys(input, INPUT_KEYS, 'ActionResolutionContext.input');
  const result = {};
  for (const key of INPUT_KEYS) {
    if (typeof input[key] !== 'boolean') {
      throw new TypeError(`ActionResolutionContext.input.${key} 必须是布尔值。`);
    }
    result[key] = input[key];
  }
  return Object.freeze(result);
}

function hasChannelIntent(channel, input) {
  if (channel === ACTION_INPUT_CHANNEL.PRIMARY) {
    return input.primaryPressed || input.primaryHeld;
  }
  if (channel === ACTION_INPUT_CHANNEL.JUMP) return input.jumpPressed || input.jumpHeld;
  if (channel === ACTION_INPUT_CHANNEL.SLAM) return input.slamPressed;
  throw new RangeError(`未知 Action input channel ${channel}。`);
}

function isTriggered(definition, input) {
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

function createOutcome({
  kind,
  tick,
  participantId,
  inputChannel,
  lane = null,
  reason,
  candidate = null,
  actionDefinitionId = null,
}) {
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

function firstIntersection(left, right) {
  for (const value of left) if (right.has(value)) return value;
  return null;
}

export class ActionResolver {
  #actionRegistry;
  #candidateBatchCache;

  constructor({ actionRegistry }) {
    if (!actionRegistry || typeof actionRegistry.require !== 'function') {
      throw new TypeError('ActionResolver 需要只读 ActionRegistry。');
    }
    this.#actionRegistry = actionRegistry;
    this.#candidateBatchCache = new WeakMap();
    Object.freeze(this);
  }

  #prepareCandidateBatch(values) {
    const cacheable = Object.isFrozen(values) && values.every(Object.isFrozen);
    if (cacheable) {
      const cached = this.#candidateBatchCache.get(values);
      if (cached) return cached;
    }
    const candidates = values.map(createActionCandidate);
    const candidateIds = new Set();
    const definitionByCandidateId = new Map();
    for (const candidate of candidates) {
      if (candidateIds.has(candidate.id)) {
        throw new RangeError(`ActionResolutionContext 包含重复 candidate id ${candidate.id}。`);
      }
      candidateIds.add(candidate.id);
      definitionByCandidateId.set(
        candidate.id,
        this.#actionRegistry.require(candidate.actionDefinitionId),
      );
    }
    candidates.sort(compareActionCandidates);
    const prepared = Object.freeze({
      candidates: Object.freeze(candidates),
      definitionByCandidateId,
    });
    if (cacheable) this.#candidateBatchCache.set(values, prepared);
    return prepared;
  }

  resolve(context) {
    assertKnownKeys(context, CONTEXT_KEYS, 'ActionResolutionContext');
    const tick = assertIntegerAtLeast(context.tick, 0, 'ActionResolutionContext.tick');
    const participantId = assertNonEmptyString(
      context.participantId,
      'ActionResolutionContext.participantId',
    );
    if (typeof context.canAct !== 'boolean') {
      throw new TypeError('ActionResolutionContext.canAct 必须是布尔值。');
    }
    const input = cloneInput(context.input);
    if (!Array.isArray(context.candidates)) {
      throw new TypeError('ActionResolutionContext.candidates 必须是数组。');
    }
    const occupiedLanes = cloneFrozenStringSet(
      context.occupiedLanes,
      'ActionResolutionContext.occupiedLanes',
    );
    for (const lane of occupiedLanes) {
      if (!ACTION_LANES.has(lane)) throw new RangeError(`未知 occupied action lane ${lane}。`);
    }
    const activeConflictTags = cloneFrozenStringSet(
      context.activeConflictTags,
      'ActionResolutionContext.activeConflictTags',
    );
    const occupiedLaneSet = new Set(occupiedLanes);
    const activeConflictTagSet = new Set(activeConflictTags);
    const { candidates, definitionByCandidateId } = this.#prepareCandidateBatch(
      context.candidates,
    );

    const activeChannels = INPUT_CHANNEL_ORDER.filter((channel) => (
      hasChannelIntent(channel, input)
      || candidates.some((candidate) => {
        const definition = definitionByCandidateId.get(candidate.id);
        return definition.input.channel === channel && isTriggered(definition, input);
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
    if (!context.canAct) {
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

    const provisional = activeChannels.map((inputChannel) => {
      for (const candidate of candidates) {
        const definition = definitionByCandidateId.get(candidate.id);
        if (definition.input.channel !== inputChannel || !isTriggered(definition, input)) continue;
        if (occupiedLaneSet.has(definition.lane)) {
          return createOutcome({
            kind: ACTION_RESOLUTION_KIND.IGNORED,
            tick,
            participantId,
            inputChannel,
            lane: definition.lane,
            reason: 'action-lane-occupied',
            candidate,
            actionDefinitionId: definition.id,
          });
        }
        if (firstIntersection(definition.conflictTags, activeConflictTagSet) !== null) {
          return createOutcome({
            kind: ACTION_RESOLUTION_KIND.IGNORED,
            tick,
            participantId,
            inputChannel,
            lane: definition.lane,
            reason: 'active-action-conflict',
            candidate,
            actionDefinitionId: definition.id,
          });
        }
        if (candidate.available) {
          return createOutcome({
            kind: ACTION_RESOLUTION_KIND.SELECTED,
            tick,
            participantId,
            inputChannel,
            lane: definition.lane,
            reason: 'candidate-selected',
            candidate,
            actionDefinitionId: definition.id,
          });
        }
        if (candidate.blocksFallback) {
          return createOutcome({
            kind: ACTION_RESOLUTION_KIND.IGNORED,
            tick,
            participantId,
            inputChannel,
            lane: definition.lane,
            reason: candidate.unavailableReason,
            candidate,
            actionDefinitionId: definition.id,
          });
        }
      }
      return createOutcome({
        kind: ACTION_RESOLUTION_KIND.NONE,
        tick,
        participantId,
        inputChannel,
        reason: 'no-available-candidate',
      });
    });

    const selectedByCandidateId = new Map(provisional
      .filter(({ kind }) => kind === ACTION_RESOLUTION_KIND.SELECTED)
      .map((outcome) => [outcome.candidateId, outcome]));
    const acceptedCandidateIds = new Set();
    const selectedLanes = new Set();
    const selectedConflictTags = new Set();
    for (const candidate of candidates) {
      const outcome = selectedByCandidateId.get(candidate.id);
      if (!outcome) continue;
      const definition = definitionByCandidateId.get(candidate.id);
      if (
        selectedLanes.has(definition.lane)
        || firstIntersection(definition.conflictTags, selectedConflictTags) !== null
      ) continue;
      acceptedCandidateIds.add(candidate.id);
      selectedLanes.add(definition.lane);
      for (const tag of definition.conflictTags) selectedConflictTags.add(tag);
    }
    const outcomes = provisional.map((outcome) => {
      if (
        outcome.kind !== ACTION_RESOLUTION_KIND.SELECTED
        || acceptedCandidateIds.has(outcome.candidateId)
      ) return outcome;
      const definition = definitionByCandidateId.get(outcome.candidateId);
      return createOutcome({
        kind: ACTION_RESOLUTION_KIND.IGNORED,
        tick,
        participantId,
        inputChannel: outcome.inputChannel,
        lane: definition.lane,
        reason: selectedLanes.has(definition.lane)
          ? 'same-tick-lane-conflict'
          : 'same-tick-action-conflict',
        candidate: candidates.find(({ id }) => id === outcome.candidateId),
        actionDefinitionId: definition.id,
      });
    });
    return Object.freeze({ tick, participantId, outcomes: Object.freeze(outcomes) });
  }
}
