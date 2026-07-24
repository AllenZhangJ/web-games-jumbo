import { ACTION_EFFECT_TRIGGER } from '@number-strategy-jump/arena-definitions';
import { MOVEMENT_COMMAND_KIND } from '@number-strategy-jump/arena-movement';
import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import type {
  ActionEffectHandler,
  ActionEffectResolutionContext,
  RuleCommand,
} from '@number-strategy-jump/arena-core';

const EMPTY_KEYS: ReadonlySet<string> = new Set();

function requireSource(context: ActionEffectResolutionContext['context']): Readonly<{ id: string }> {
  const source = context.source;
  if (!source || typeof source !== 'object') {
    throw new TypeError('Movement action effect 需要 source actor。');
  }
  const id = (source as Readonly<Record<string, unknown>>).id;
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('Movement action effect 需要 source actor。');
  }
  return Object.freeze({ id });
}

function handler(kind: string): ActionEffectHandler {
  return {
    kind,
    triggers: [ACTION_EFFECT_TRIGGER.ACTION_STARTED],
    validateParameters(parameters: unknown, actionId: string) {
      assertKnownKeys(parameters, EMPTY_KEYS, `${actionId}.${kind}`);
    },
    resolve({ context }: ActionEffectResolutionContext): readonly RuleCommand[] {
      return [Object.freeze({ kind, participantId: requireSource(context).id })];
    },
  };
}

export function createMovementActionEffectHandlers(): readonly ActionEffectHandler[] {
  return Object.freeze(Object.values(MOVEMENT_COMMAND_KIND).map(handler));
}
