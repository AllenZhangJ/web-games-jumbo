import { ACTION_EFFECT_TRIGGER } from '../action/action-definition.js';
import { MOVEMENT_COMMAND_KIND } from './movement-command.js';
import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';

const EMPTY_KEYS = new Set();

function requireSource(context) {
  if (!context?.source || typeof context.source.id !== 'string' || context.source.id.length === 0) {
    throw new TypeError('Movement action effect 需要 source actor。');
  }
  return context.source;
}

function handler(kind) {
  return {
    kind,
    triggers: [ACTION_EFFECT_TRIGGER.ACTION_STARTED],
    validateParameters(parameters, actionId) {
      assertKnownKeys(parameters, EMPTY_KEYS, `${actionId}.${kind}`);
    },
    resolve({ context }) {
      return [{ kind, participantId: requireSource(context).id }];
    },
  };
}

export function createMovementActionEffectHandlers() {
  return Object.freeze(Object.values(MOVEMENT_COMMAND_KIND).map(handler));
}
