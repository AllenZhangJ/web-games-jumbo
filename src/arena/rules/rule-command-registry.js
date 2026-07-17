import {
  assertKnownKeys,
  assertNonEmptyString,
} from './definition-utils.js';

const HANDLER_KEYS = new Set(['kind', 'execute']);

export class RuleCommandRegistry {
  #handlers;

  constructor(handlers = []) {
    if (!Array.isArray(handlers)) throw new TypeError('RuleCommand handlers 必须是数组。');
    this.#handlers = new Map();
    for (const handler of handlers) {
      assertKnownKeys(handler, HANDLER_KEYS, 'RuleCommandHandler');
      const kind = assertNonEmptyString(handler.kind, 'RuleCommandHandler.kind');
      if (this.#handlers.has(kind)) throw new RangeError(`重复 RuleCommand kind ${kind}。`);
      if (typeof handler.execute !== 'function') {
        throw new TypeError(`RuleCommandHandler ${kind} 缺少 execute()。`);
      }
      this.#handlers.set(kind, Object.freeze({ kind, execute: handler.execute }));
    }
    Object.freeze(this);
  }

  assertSupported(commands) {
    if (!Array.isArray(commands)) throw new TypeError('RuleCommands 必须是数组。');
    for (const command of commands) {
      const kind = assertNonEmptyString(command?.kind, 'RuleCommand.kind');
      if (!this.#handlers.has(kind)) throw new RangeError(`未注册 RuleCommand ${kind}。`);
    }
  }

  execute(commands, context) {
    this.assertSupported(commands);
    for (const command of commands) this.#handlers.get(command.kind).execute(command, context);
  }
}
