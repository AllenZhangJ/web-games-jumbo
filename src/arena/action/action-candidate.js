import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '../rules/definition-utils.js';

const CANDIDATE_KEYS = new Set([
  'id',
  'actionDefinitionId',
  'source',
  'priority',
  'available',
  'blocksFallback',
  'unavailableReason',
]);

export function compareActionCandidates(left, right) {
  if (left.priority < right.priority) return 1;
  if (left.priority > right.priority) return -1;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function createActionCandidate(value, index = 0) {
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
