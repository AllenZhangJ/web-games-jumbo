import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import type { ActionDefinition } from '@number-strategy-jump/arena-definitions';

export interface TargetingActor {
  readonly id: string;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
  readonly facing?: Readonly<{ x: number; z: number }>;
  readonly [key: string]: unknown;
}

export interface TargetingResolutionContext {
  readonly parameters: DeepReadonly<unknown>;
  readonly source: DeepReadonly<TargetingActor>;
  readonly candidates: readonly DeepReadonly<TargetingActor>[];
}

export interface TargetingHandler {
  readonly kind: string;
  readonly validateParameters: (parameters: unknown, actionId: string) => void;
  readonly resolveTargets: (context: TargetingResolutionContext) => readonly string[];
}

export interface TargetingActionRegistryContract {
  list(): readonly ActionDefinition[];
}

const HANDLER_KEYS = new Set(['kind', 'validateParameters', 'resolveTargets']);

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function cloneActor(value: unknown, name: string): DeepReadonly<TargetingActor> {
  const cloned = cloneFrozenData(value, name);
  if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) {
    throw new TypeError(`${name} 必须是 actor 对象。`);
  }
  return cloned as DeepReadonly<TargetingActor>;
}

export class TargetingRegistry {
  readonly #handlers: ReadonlyMap<string, TargetingHandler>;

  constructor(handlers: readonly TargetingHandler[] = []) {
    if (!Array.isArray(handlers)) throw new TypeError('Targeting handlers 必须是数组。');
    const registered = new Map<string, TargetingHandler>();
    for (const handler of handlers) {
      assertKnownKeys(handler, HANDLER_KEYS, 'TargetingHandler');
      const kind = assertNonEmptyString(handler.kind, 'TargetingHandler.kind');
      if (registered.has(kind)) throw new RangeError(`重复 targeting kind ${kind}。`);
      if (
        typeof handler.validateParameters !== 'function'
        || typeof handler.resolveTargets !== 'function'
      ) throw new TypeError(`TargetingHandler ${kind} 缺少函数合同。`);
      registered.set(kind, Object.freeze({
        kind,
        validateParameters: handler.validateParameters as TargetingHandler['validateParameters'],
        resolveTargets: handler.resolveTargets as TargetingHandler['resolveTargets'],
      }));
    }
    this.#handlers = registered;
    Object.freeze(this);
  }

  validateActionRegistry(actionRegistry: TargetingActionRegistryContract): this {
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

  resolve(options: {
    readonly definition: ActionDefinition;
    readonly source: unknown;
    readonly candidates: readonly unknown[];
  }): readonly string[] {
    const { definition, source, candidates } = options;
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
      source: cloneActor(source, 'Targeting source'),
      candidates: Object.freeze(candidates.map((candidate, index) => (
        cloneActor(candidate, `Targeting candidates[${index}]`)
      ))),
    });
    if (!Array.isArray(result)) throw new TypeError('Targeting handler 必须返回 target ID 数组。');
    const ids = result.map((id, index) => assertNonEmptyString(id, `targetIds[${index}]`));
    if (new Set(ids).size !== ids.length) throw new RangeError('Targeting handler 返回了重复 target ID。');
    return Object.freeze([...ids].sort(compareStrings));
  }
}
