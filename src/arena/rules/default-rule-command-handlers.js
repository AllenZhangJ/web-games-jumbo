import { ACTION_RULE_COMMAND } from '../action/effects/default-effect-handlers.js';
import { RuleCommandRegistry } from './rule-command-registry.js';

function requirePort(context, name) {
  const port = context?.ports?.[name];
  if (typeof port !== 'function') throw new TypeError(`Rule mutation port 缺少 ${name}()。`);
  return port;
}

export function createDefaultRuleCommandRegistry() {
  return new RuleCommandRegistry([
    {
      kind: ACTION_RULE_COMMAND.APPLY_HITSTUN,
      execute: (command, context) => {
        requirePort(context, 'applyHitstun')(command.participantId, command.ticks);
      },
    },
    {
      kind: ACTION_RULE_COMMAND.APPLY_IMPULSE,
      execute: (command, context) => {
        requirePort(context, 'applyImpulse')(command.participantId, command.impulse);
      },
    },
    {
      kind: ACTION_RULE_COMMAND.INTERRUPT_ACTION,
      execute: (command, context) => {
        if (!context?.actionExecutionSystem) {
          throw new TypeError('interrupt-action 缺少 ActionExecutionSystem。');
        }
        context.actionExecutionSystem.interrupt([command.participantId]);
      },
    },
  ]);
}
