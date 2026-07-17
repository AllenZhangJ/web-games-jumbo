import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';

const HANDLER_KEYS = new Set(['kind', 'validate', 'plan', 'start', 'tick', 'end']);

function assertHandlerFunction(handler, name) {
  if (typeof handler[name] !== 'function') {
    throw new TypeError(`Map event handler ${handler.kind} 缺少 ${name}()。`);
  }
}

function normalizeResult(value, name, { plan = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须返回对象。`);
  }
  const allowed = plan
    ? new Set(['privatePlan', 'publicPayload'])
    : new Set(['commands', 'events']);
  assertKnownKeys(value, allowed, name);
  if (plan) {
    return Object.freeze({
      privatePlan: cloneFrozenData(value.privatePlan, `${name}.privatePlan`),
      publicPayload: cloneFrozenData(value.publicPayload, `${name}.publicPayload`),
    });
  }
  if (!Array.isArray(value.commands) || !Array.isArray(value.events)) {
    throw new TypeError(`${name}.commands/events 必须是数组。`);
  }
  return Object.freeze({
    commands: cloneFrozenData(value.commands, `${name}.commands`),
    events: cloneFrozenData(value.events, `${name}.events`),
  });
}

export class MapEventStrategyRegistry {
  #handlers;

  constructor(handlers = []) {
    if (!Array.isArray(handlers)) throw new TypeError('Map event handlers 必须是数组。');
    this.#handlers = new Map();
    for (const handler of handlers) {
      assertKnownKeys(handler, HANDLER_KEYS, 'Map event handler');
      const kind = assertNonEmptyString(handler.kind, 'Map event handler.kind');
      if (this.#handlers.has(kind)) throw new RangeError(`重复 map event handler ${kind}。`);
      for (const name of ['validate', 'plan', 'start', 'tick', 'end']) {
        assertHandlerFunction(handler, name);
      }
      this.#handlers.set(kind, Object.freeze({ ...handler }));
    }
    Object.freeze(this);
  }

  #require(kind) {
    const handler = this.#handlers.get(kind);
    if (!handler) throw new RangeError(`未注册 map event kind ${String(kind)}。`);
    return handler;
  }

  validateMapDefinition(mapDefinition, context = {}) {
    for (const event of mapDefinition.events) {
      this.#require(event.kind).validate(Object.freeze({ ...context, mapDefinition, event }));
    }
  }

  plan(occurrence, context) {
    return normalizeResult(
      this.#require(occurrence.kind).plan(Object.freeze({ ...context, occurrence })),
      `map handler ${occurrence.kind}.plan`,
      { plan: true },
    );
  }

  start(occurrence, context) {
    return normalizeResult(
      this.#require(occurrence.kind).start(Object.freeze({ ...context, occurrence })),
      `map handler ${occurrence.kind}.start`,
    );
  }

  tick(occurrence, context) {
    return normalizeResult(
      this.#require(occurrence.kind).tick(Object.freeze({ ...context, occurrence })),
      `map handler ${occurrence.kind}.tick`,
    );
  }

  end(occurrence, context) {
    return normalizeResult(
      this.#require(occurrence.kind).end(Object.freeze({ ...context, occurrence })),
      `map handler ${occurrence.kind}.end`,
    );
  }
}
