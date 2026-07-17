import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';

const HANDLER_KEYS = new Set(['kind', 'validateParameters', 'resolveTargets']);

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export class TargetingRegistry {
  #handlers;

  constructor(handlers = []) {
    if (!Array.isArray(handlers)) throw new TypeError('Targeting handlers 必须是数组。');
    this.#handlers = new Map();
    for (const handler of handlers) {
      assertKnownKeys(handler, HANDLER_KEYS, 'TargetingHandler');
      const kind = assertNonEmptyString(handler.kind, 'TargetingHandler.kind');
      if (this.#handlers.has(kind)) throw new RangeError(`重复 targeting kind ${kind}。`);
      if (
        typeof handler.validateParameters !== 'function'
        || typeof handler.resolveTargets !== 'function'
      ) throw new TypeError(`TargetingHandler ${kind} 缺少函数合同。`);
      this.#handlers.set(kind, Object.freeze({ ...handler, kind }));
    }
    Object.freeze(this);
  }

  validateActionRegistry(actionRegistry) {
    if (!actionRegistry || typeof actionRegistry.list !== 'function') {
      throw new TypeError('TargetingRegistry 需要只读 ActionRegistry。');
    }
    for (const definition of actionRegistry.list()) {
      const handler = this.#handlers.get(definition.targeting.kind);
      if (!handler) {
        throw new RangeError(
          `ActionDefinition ${definition.id} 使用未注册 targeting ${definition.targeting.kind}。`,
        );
      }
      handler.validateParameters(definition.targeting.parameters, definition.id);
    }
    return this;
  }

  resolve({ definition, source, candidates }) {
    if (!definition || typeof definition !== 'object') {
      throw new TypeError('Targeting resolve 缺少 ActionDefinition。');
    }
    if (!source || typeof source !== 'object') throw new TypeError('Targeting source 必须是对象。');
    if (!Array.isArray(candidates)) throw new TypeError('Targeting candidates 必须是数组。');
    const handler = this.#handlers.get(definition.targeting.kind);
    if (!handler) throw new RangeError(`未注册 targeting ${definition.targeting.kind}。`);
    handler.validateParameters(definition.targeting.parameters, definition.id);
    const result = handler.resolveTargets({
      parameters: definition.targeting.parameters,
      source: cloneFrozenData(source, 'Targeting source'),
      candidates: cloneFrozenData(candidates, 'Targeting candidates'),
    });
    if (!Array.isArray(result)) throw new TypeError('Targeting handler 必须返回 target ID 数组。');
    const ids = result.map((id, index) => assertNonEmptyString(id, `targetIds[${index}]`));
    if (new Set(ids).size !== ids.length) throw new RangeError('Targeting handler 返回了重复 target ID。');
    return Object.freeze([...ids].sort(compareStrings));
  }
}
