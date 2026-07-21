import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  ACTION_EFFECT_TRIGGER,
  type ActionDefinition,
  type ActionEffect,
  type ActionEffectTrigger,
} from '@number-strategy-jump/arena-definitions';

export interface RuleCommand {
  readonly kind: string;
  readonly [key: string]: unknown;
}

export type ActionEffectContext = Readonly<Record<string, unknown>>;

export interface ActionEffectResolutionContext {
  readonly effect: ActionEffect;
  readonly context: DeepReadonly<ActionEffectContext>;
}

export interface ActionEffectHandler {
  readonly kind: string;
  readonly triggers: readonly ActionEffectTrigger[];
  readonly validateParameters: (
    parameters: unknown,
    actionDefinitionId: string,
    effectId?: string,
  ) => void;
  readonly resolve: (context: ActionEffectResolutionContext) => readonly RuleCommand[];
}

export interface EffectActionRegistryContract {
  list(): readonly ActionDefinition[];
}

const HANDLER_KEYS = new Set(['kind', 'triggers', 'validateParameters', 'resolve']);
const EFFECT_TRIGGERS: ReadonlySet<unknown> = new Set(Object.values(ACTION_EFFECT_TRIGGER));

export class ActionEffectRegistry {
  readonly #handlers: ReadonlyMap<string, ActionEffectHandler>;

  constructor(handlers: readonly ActionEffectHandler[] = []) {
    if (!Array.isArray(handlers)) throw new TypeError('ActionEffect handlers 必须是数组。');
    const registered = new Map<string, ActionEffectHandler>();
    for (const handler of handlers) {
      assertKnownKeys(handler, HANDLER_KEYS, 'ActionEffectHandler');
      const kind = assertNonEmptyString(handler.kind, 'ActionEffectHandler.kind');
      if (registered.has(kind)) throw new RangeError(`重复 action effect kind ${kind}。`);
      if (
        !Array.isArray(handler.triggers)
        || handler.triggers.length === 0
        || handler.triggers.some((trigger) => !EFFECT_TRIGGERS.has(trigger))
        || new Set(handler.triggers).size !== handler.triggers.length
      ) throw new RangeError(`ActionEffectHandler ${kind} 的 triggers 无效。`);
      if (
        typeof handler.validateParameters !== 'function'
        || typeof handler.resolve !== 'function'
      ) throw new TypeError(`ActionEffectHandler ${kind} 缺少函数合同。`);
      registered.set(kind, Object.freeze({
        kind,
        triggers: Object.freeze([...(handler.triggers as readonly ActionEffectTrigger[])].sort()),
        validateParameters: handler.validateParameters as ActionEffectHandler['validateParameters'],
        resolve: handler.resolve as ActionEffectHandler['resolve'],
      }));
    }
    this.#handlers = registered;
    Object.freeze(this);
  }

  validateActionRegistry(actionRegistry: EffectActionRegistryContract): this {
    if (!actionRegistry || typeof actionRegistry.list !== 'function') {
      throw new TypeError('ActionEffectRegistry 需要只读 ActionRegistry。');
    }
    for (const definition of actionRegistry.list()) {
      for (const effect of definition.effects) {
        const handler = this.#handlers.get(effect.kind);
        if (!handler) {
          throw new RangeError(`ActionDefinition ${definition.id} 使用未注册 effect ${effect.kind}。`);
        }
        if (!handler.triggers.includes(effect.trigger)) {
          throw new RangeError(
            `ActionDefinition ${definition.id} 的 effect ${effect.id} 不允许 trigger ${effect.trigger}。`,
          );
        }
        handler.validateParameters(effect.parameters, definition.id, effect.id);
      }
    }
    return this;
  }

  resolve(effect: ActionEffect, context: ActionEffectContext): readonly DeepReadonly<RuleCommand>[] {
    if (!effect || typeof effect !== 'object') throw new TypeError('Action effect 必须是对象。');
    const handler = this.#handlers.get(effect.kind);
    if (!handler) throw new RangeError(`未注册 action effect ${String(effect.kind)}。`);
    if (!handler.triggers.includes(effect.trigger)) {
      throw new RangeError(`Action effect ${effect.id} 不允许 trigger ${effect.trigger}。`);
    }
    const actionDefinitionId = typeof context?.actionDefinitionId === 'string'
      ? context.actionDefinitionId
      : 'action';
    handler.validateParameters(effect.parameters, actionDefinitionId, effect.id);
    const commands = handler.resolve({
      effect,
      context: cloneFrozenData(context, 'ActionEffect context'),
    });
    if (!Array.isArray(commands)) throw new TypeError('ActionEffect handler 必须返回 RuleCommand 数组。');
    return cloneFrozenData(commands, `ActionEffect ${effect.id} commands`);
  }
}
