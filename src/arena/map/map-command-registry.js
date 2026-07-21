import { assertKnownKeys, assertNonEmptyString } from '@number-strategy-jump/arena-contracts';

const HANDLER_KEYS = new Set(['kind', 'validate', 'execute']);

export class MapCommandRegistry {
  #handlers;

  constructor(handlers = []) {
    if (!Array.isArray(handlers)) throw new TypeError('MapCommandRegistry handlers 必须是数组。');
    this.#handlers = new Map();
    for (const handler of handlers) {
      assertKnownKeys(handler, HANDLER_KEYS, 'Map command handler');
      const kind = assertNonEmptyString(handler.kind, 'Map command handler.kind');
      if (typeof handler.validate !== 'function') {
        throw new TypeError(`Map command handler ${kind} 缺少 validate()。`);
      }
      if (typeof handler.execute !== 'function') {
        throw new TypeError(`Map command handler ${kind} 缺少 execute()。`);
      }
      if (this.#handlers.has(kind)) throw new RangeError(`重复 map command handler ${kind}。`);
      this.#handlers.set(kind, Object.freeze({ ...handler }));
    }
    Object.freeze(this);
  }

  assertSupported(commands) {
    if (!Array.isArray(commands)) throw new TypeError('map commands 必须是数组。');
    for (let index = 0; index < commands.length; index += 1) {
      const command = commands[index];
      if (!command || typeof command !== 'object' || Array.isArray(command)) {
        throw new TypeError(`map commands[${index}] 必须是对象。`);
      }
      const handler = this.#handlers.get(command.kind);
      if (!handler) {
        throw new RangeError(`未注册 map command ${String(command?.kind)}。`);
      }
      handler.validate(command, `map commands[${index}]`);
    }
  }

  execute(commands, context) {
    this.assertSupported(commands);
    for (const command of commands) this.#handlers.get(command.kind).execute(command, context);
  }
}
