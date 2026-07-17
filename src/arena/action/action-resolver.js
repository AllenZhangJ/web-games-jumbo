import { ACTION_INPUT_TRIGGER } from './action-definition.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '../rules/definition-utils.js';

export const ACTION_RESOLUTION_KIND = Object.freeze({
  NONE: 'none',
  IGNORED: 'ignored',
  SELECTED: 'selected',
});

export const ACTION_PRIORITY = Object.freeze({
  EQUIPMENT: 500,
  AIR: 400,
  INTERACTION: 300,
  BASE: 100,
});

const CONTEXT_KEYS = new Set(['tick', 'participantId', 'canAct', 'input', 'candidates']);
const INPUT_KEYS = new Set(['primaryPressed', 'primaryHeld']);
const CANDIDATE_KEYS = new Set([
  'id',
  'actionDefinitionId',
  'source',
  'priority',
  'available',
  'blocksFallback',
  'unavailableReason',
]);

function compareCandidates(left, right) {
  if (left.priority < right.priority) return 1;
  if (left.priority > right.priority) return -1;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

function cloneCandidate(value, index) {
  const name = `ActionCandidate[${index}]`;
  assertKnownKeys(value, CANDIDATE_KEYS, name);
  if (typeof value.available !== 'boolean' || typeof value.blocksFallback !== 'boolean') {
    throw new TypeError(`${name}.available/blocksFallback 必须是布尔值。`);
  }
  const unavailableReason = value.available
    ? null
    : assertNonEmptyString(value.unavailableReason, `${name}.unavailableReason`);
  return Object.freeze({
    id: assertNonEmptyString(value.id, `${name}.id`),
    actionDefinitionId: assertNonEmptyString(
      value.actionDefinitionId,
      `${name}.actionDefinitionId`,
    ),
    source: assertNonEmptyString(value.source, `${name}.source`),
    priority: assertIntegerAtLeast(value.priority, 0, `${name}.priority`),
    available: value.available,
    blocksFallback: value.blocksFallback,
    unavailableReason,
  });
}

function isTriggered(definition, input) {
  if (definition.input.trigger === ACTION_INPUT_TRIGGER.PRESSED) return input.primaryPressed;
  if (definition.input.trigger === ACTION_INPUT_TRIGGER.HELD) return input.primaryHeld;
  throw new RangeError(`ActionDefinition ${definition.id} 使用未知 input trigger。`);
}

function freezeResult(result) {
  return Object.freeze(result);
}

export class ActionResolver {
  #actionRegistry;

  constructor({ actionRegistry }) {
    if (!actionRegistry || typeof actionRegistry.require !== 'function') {
      throw new TypeError('ActionResolver 需要只读 ActionRegistry。');
    }
    this.#actionRegistry = actionRegistry;
    Object.freeze(this);
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
    assertKnownKeys(context.input, INPUT_KEYS, 'ActionResolutionContext.input');
    if (
      typeof context.input.primaryPressed !== 'boolean'
      || typeof context.input.primaryHeld !== 'boolean'
    ) throw new TypeError('ActionResolutionContext.input 必须包含布尔动作输入。');
    if (!Array.isArray(context.candidates)) {
      throw new TypeError('ActionResolutionContext.candidates 必须是数组。');
    }

    const candidates = context.candidates.map(cloneCandidate);
    const candidateIds = new Set();
    for (const candidate of candidates) {
      if (candidateIds.has(candidate.id)) {
        throw new RangeError(`ActionResolutionContext 包含重复 candidate id ${candidate.id}。`);
      }
      candidateIds.add(candidate.id);
      this.#actionRegistry.require(candidate.actionDefinitionId);
    }
    candidates.sort(compareCandidates);

    const input = Object.freeze({
      primaryPressed: context.input.primaryPressed,
      primaryHeld: context.input.primaryHeld,
    });
    const hasActionIntent = input.primaryPressed || input.primaryHeld;
    if (!hasActionIntent) {
      return freezeResult({
        kind: ACTION_RESOLUTION_KIND.NONE,
        tick,
        participantId,
        reason: 'no-input',
      });
    }
    if (!context.canAct) {
      return freezeResult({
        kind: ACTION_RESOLUTION_KIND.IGNORED,
        tick,
        participantId,
        reason: 'participant-unavailable',
        candidateId: null,
        actionDefinitionId: null,
        source: null,
      });
    }

    for (const candidate of candidates) {
      const definition = this.#actionRegistry.require(candidate.actionDefinitionId);
      if (!isTriggered(definition, input)) continue;
      if (candidate.available) {
        return freezeResult({
          kind: ACTION_RESOLUTION_KIND.SELECTED,
          tick,
          participantId,
          reason: 'candidate-selected',
          candidateId: candidate.id,
          actionDefinitionId: definition.id,
          source: candidate.source,
        });
      }
      if (candidate.blocksFallback) {
        return freezeResult({
          kind: ACTION_RESOLUTION_KIND.IGNORED,
          tick,
          participantId,
          reason: candidate.unavailableReason,
          candidateId: candidate.id,
          actionDefinitionId: definition.id,
          source: candidate.source,
        });
      }
    }

    return freezeResult({
      kind: ACTION_RESOLUTION_KIND.NONE,
      tick,
      participantId,
      reason: 'no-available-candidate',
    });
  }
}
