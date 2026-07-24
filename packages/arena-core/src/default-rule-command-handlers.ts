import type { RuleCommand } from './action-effect-registry.js';
import { ACTION_RULE_COMMAND } from './default-effect-handlers.js';
import {
  RuleCommandRegistry,
  type RuleCommandExecutionContext,
  type RuleCommandHandler,
} from './rule-command-registry.js';

type MutationPort = (...arguments_: readonly unknown[]) => unknown;

function requirePort(context: RuleCommandExecutionContext, name: string): MutationPort {
  const ports = context.ports;
  const port = ports && typeof ports === 'object' && !Array.isArray(ports)
    ? (ports as Readonly<Record<string, unknown>>)[name]
    : undefined;
  if (typeof port !== 'function') throw new TypeError(`Rule mutation port 缺少 ${name}()。`);
  return port as MutationPort;
}

function requireParticipantId(command: RuleCommand): string {
  if (typeof command.participantId !== 'string' || command.participantId.length === 0) {
    throw new TypeError('RuleCommand participantId 无效。');
  }
  return command.participantId;
}

export function createDefaultRuleCommandRegistry(): RuleCommandRegistry {
  const handlers: readonly RuleCommandHandler[] = [
    {
      kind: ACTION_RULE_COMMAND.APPLY_HITSTUN,
      execute: (command, context) => {
        requirePort(context, 'applyHitstun')(requireParticipantId(command), command.ticks);
      },
    },
    {
      kind: ACTION_RULE_COMMAND.APPLY_IMPULSE,
      execute: (command, context) => {
        requirePort(context, 'applyImpulse')(requireParticipantId(command), command.impulse);
      },
    },
    {
      kind: ACTION_RULE_COMMAND.INTERRUPT_ACTION,
      execute: (command, context) => {
        const system = context.actionExecutionSystem;
        if (!system || typeof system !== 'object' || !('interrupt' in system)) {
          throw new TypeError('interrupt-action 缺少 ActionExecutionSystem。');
        }
        const interrupt = system.interrupt;
        if (typeof interrupt !== 'function') {
          throw new TypeError('interrupt-action 缺少 ActionExecutionSystem。');
        }
        interrupt.call(system, [requireParticipantId(command)]);
      },
    },
  ];
  return new RuleCommandRegistry(handlers);
}
