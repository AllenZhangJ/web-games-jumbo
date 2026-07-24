import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';

export interface ActionCandidate {
  readonly id: string;
  readonly actionDefinitionId: string;
  readonly source: string;
  readonly priority: number;
  readonly available: boolean;
  readonly blocksFallback: boolean;
  readonly unavailableReason: string | null;
}

const CANDIDATE_KEYS = new Set([
  'id', 'actionDefinitionId', 'source', 'priority',
  'available', 'blocksFallback', 'unavailableReason',
]);

export function compareActionCandidates(left: ActionCandidate, right: ActionCandidate): number {
  if (left.priority < right.priority) return 1;
  if (left.priority > right.priority) return -1;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function createActionCandidate(value: unknown, index = 0): ActionCandidate {
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
    actionDefinitionId: assertNonEmptyString(value.actionDefinitionId, `${name}.actionDefinitionId`),
    source: assertNonEmptyString(value.source, `${name}.source`),
    priority: assertIntegerAtLeast(value.priority, 0, `${name}.priority`),
    available: value.available,
    blocksFallback: value.blocksFallback,
    unavailableReason,
  });
}
