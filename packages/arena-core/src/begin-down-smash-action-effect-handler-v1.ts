import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { ACTION_EFFECT_TRIGGER } from '@number-strategy-jump/arena-definitions';
import type {
  ActionEffectHandler,
  ActionEffectResolutionContext,
  RuleCommand,
} from './action-effect-registry.js';

export const ARENA_BEGIN_DOWN_SMASH_ACTION_EFFECT_KIND_V1 = 'begin-down-smash' as const;

const EMPTY_KEYS: ReadonlySet<string> = new Set();

export interface ArenaBeginDownSmashRuleCommandV1 extends RuleCommand {
  readonly kind: typeof ARENA_BEGIN_DOWN_SMASH_ACTION_EFFECT_KIND_V1;
  readonly participantId: string;
}

function requireSourceParticipantId(source: unknown): string {
  const record = assertPlainRecord(source, 'begin-down-smash source');
  const descriptor = Object.getOwnPropertyDescriptor(record, 'id');
  if (
    !descriptor
    || !descriptor.enumerable
    || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
  ) {
    throw new TypeError('begin-down-smash source.id必须是可枚举数据字段。');
  }
  return assertNonEmptyString(descriptor.value, 'begin-down-smash source.id');
}

export function createArenaBeginDownSmashActionEffectHandlerV1(): ActionEffectHandler {
  return Object.freeze({
    kind: ARENA_BEGIN_DOWN_SMASH_ACTION_EFFECT_KIND_V1,
    triggers: Object.freeze([ACTION_EFFECT_TRIGGER.ACTION_STARTED]),
    validateParameters(parameters: unknown, actionDefinitionId: string): void {
      assertKnownKeys(
        parameters,
        EMPTY_KEYS,
        `${actionDefinitionId}.${ARENA_BEGIN_DOWN_SMASH_ACTION_EFFECT_KIND_V1}`,
      );
    },
    resolve({ context }: ActionEffectResolutionContext): readonly ArenaBeginDownSmashRuleCommandV1[] {
      return Object.freeze([
        Object.freeze({
          kind: ARENA_BEGIN_DOWN_SMASH_ACTION_EFFECT_KIND_V1,
          participantId: requireSourceParticipantId(context.source),
        }),
      ]);
    },
  });
}
