import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import type { RuleCommand } from './action-effect-registry.js';

export type RuleCommandExecutionContext = Readonly<Record<string, unknown>>;

export interface RuleCommandHandler {
  readonly kind: string;
  readonly execute: (command: RuleCommand, context: RuleCommandExecutionContext) => void;
}

const HANDLER_KEYS = new Set(['kind', 'execute']);

export class RuleCommandRegistry {
  readonly #handlers: ReadonlyMap<string, RuleCommandHandler>;

  constructor(handlers: readonly RuleCommandHandler[] = []) {
    if (!Array.isArray(handlers)) throw new TypeError('RuleCommand handlers 必须是数组。');
    const registered = new Map<string, RuleCommandHandler>();
    for (const handler of handlers) {
      assertKnownKeys(handler, HANDLER_KEYS, 'RuleCommandHandler');
      const kind = assertNonEmptyString(handler.kind, 'RuleCommandHandler.kind');
      if (registered.has(kind)) throw new RangeError(`重复 RuleCommand kind ${kind}。`);
      if (typeof handler.execute !== 'function') {
        throw new TypeError(`RuleCommandHandler ${kind} 缺少 execute()。`);
      }
      registered.set(kind, Object.freeze({
        kind,
        execute: handler.execute as RuleCommandHandler['execute'],
      }));
    }
    this.#handlers = registered;
    Object.freeze(this);
  }

  assertSupported(commands: readonly RuleCommand[]): void {
    if (!Array.isArray(commands)) throw new TypeError('RuleCommands 必须是数组。');
    for (const command of commands) {
      const kind = assertNonEmptyString(command?.kind, 'RuleCommand.kind');
      if (!this.#handlers.has(kind)) throw new RangeError(`未注册 RuleCommand ${kind}。`);
    }
  }

  execute(commands: readonly RuleCommand[], context: RuleCommandExecutionContext): void {
    this.assertSupported(commands);
    for (const command of commands) {
      const handler = this.#handlers.get(command.kind);
      if (!handler) throw new Error(`已验证的 RuleCommand ${command.kind} 丢失处理器。`);
      handler.execute(command, context);
    }
  }
}
