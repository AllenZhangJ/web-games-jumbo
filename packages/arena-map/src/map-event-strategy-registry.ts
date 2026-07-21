import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaMapSnapshot,
  DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import type {
  MapDefinition,
  MapEventDefinition,
  Vector3Definition,
} from '@number-strategy-jump/arena-definitions';
import type { MapRuleCommand } from './map-command-registry.js';
import type { MapOccurrence } from './map-timeline.js';

const HANDLER_KEYS = new Set(['kind', 'validate', 'plan', 'start', 'tick', 'end']);
const PLAN_RESULT_KEYS = new Set(['privatePlan', 'publicPayload']);
const EXECUTION_RESULT_KEYS = new Set(['commands', 'events']);
const UNSAFE_CONTEXT_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

export interface MapActorSnapshot {
  readonly id: string;
  readonly position: Vector3Definition;
  readonly eligible: boolean;
}

export interface EquipmentDefinitionCatalog {
  require(id: string): unknown;
}

export interface MapEventValidationContext extends Readonly<Record<string, unknown>> {
  readonly mapDefinition: MapDefinition;
  readonly event: MapEventDefinition;
  readonly equipmentRegistry?: EquipmentDefinitionCatalog;
}

export interface MapEventExecutionContext extends Readonly<Record<string, unknown>> {
  readonly occurrence: MapOccurrence;
  readonly mapDefinition: MapDefinition;
  readonly mapSnapshot: ArenaMapSnapshot;
  readonly actors: readonly MapActorSnapshot[];
  readonly seed: number;
  readonly privatePlan?: DeepReadonly<unknown>;
}

export interface MapEventPlanResult {
  readonly privatePlan: DeepReadonly<unknown>;
  readonly publicPayload: DeepReadonly<unknown>;
}

export interface MapEventExecutionResult {
  readonly commands: readonly MapRuleCommand[];
  readonly events: readonly Readonly<Record<string, unknown>>[];
}

export interface MapEventStrategy {
  readonly kind: string;
  validate(context: MapEventValidationContext): void;
  plan(context: MapEventExecutionContext): unknown;
  start(context: MapEventExecutionContext): unknown;
  tick(context: MapEventExecutionContext): unknown;
  end(context: MapEventExecutionContext): unknown;
}

function assertHandlerFunction(
  handler: Record<string, unknown>,
  kind: string,
  name: keyof Pick<MapEventStrategy, 'validate' | 'plan' | 'start' | 'tick' | 'end'>,
): void {
  if (typeof handler[name] !== 'function') {
    throw new TypeError(`Map event handler ${kind} 缺少 ${name}()。`);
  }
}

function cloneHandler(value: unknown, index: number): Readonly<MapEventStrategy> {
  const name = `Map event handlers[${index}]`;
  assertKnownKeys(value, HANDLER_KEYS, name);
  const kind = assertNonEmptyString(value.kind, `${name}.kind`);
  for (const method of ['validate', 'plan', 'start', 'tick', 'end'] as const) {
    assertHandlerFunction(value, kind, method);
  }
  return Object.freeze({
    kind,
    validate: value.validate as MapEventStrategy['validate'],
    plan: value.plan as MapEventStrategy['plan'],
    start: value.start as MapEventStrategy['start'],
    tick: value.tick as MapEventStrategy['tick'],
    end: value.end as MapEventStrategy['end'],
  });
}

function normalizePlanResult(value: unknown, name: string): Readonly<MapEventPlanResult> {
  assertKnownKeys(value, PLAN_RESULT_KEYS, name);
  return Object.freeze({
    privatePlan: cloneFrozenData(value.privatePlan, `${name}.privatePlan`),
    publicPayload: cloneFrozenData(value.publicPayload, `${name}.publicPayload`),
  });
}

function normalizeExecutionResult(value: unknown, name: string): Readonly<MapEventExecutionResult> {
  assertKnownKeys(value, EXECUTION_RESULT_KEYS, name);
  if (!Array.isArray(value.commands) || !Array.isArray(value.events)) {
    throw new TypeError(`${name}.commands/events 必须是数组。`);
  }
  return Object.freeze({
    commands: cloneFrozenData(value.commands, `${name}.commands`) as readonly MapRuleCommand[],
    events: cloneFrozenData(value.events, `${name}.events`) as readonly Readonly<Record<string, unknown>>[],
  });
}

function snapshotContext(value: unknown, name: string): Readonly<Record<string, unknown>> {
  const source = assertPlainRecord(value, name);
  const snapshot: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(source)) {
    if (typeof key !== 'string') throw new TypeError(`${name} 不能包含 Symbol 字段。`);
    if (UNSAFE_CONTEXT_KEYS.has(key)) throw new RangeError(`${name} 包含不安全字段 ${key}。`);
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

export class MapEventStrategyRegistry {
  readonly #handlers: ReadonlyMap<string, Readonly<MapEventStrategy>>;

  constructor(handlers: readonly MapEventStrategy[] = []) {
    if (!Array.isArray(handlers)) throw new TypeError('Map event handlers 必须是数组。');
    const registered = new Map<string, Readonly<MapEventStrategy>>();
    for (let index = 0; index < handlers.length; index += 1) {
      const handler = cloneHandler(handlers[index], index);
      if (registered.has(handler.kind)) {
        throw new RangeError(`重复 map event handler ${handler.kind}。`);
      }
      registered.set(handler.kind, handler);
    }
    this.#handlers = registered;
    Object.freeze(this);
  }

  #require(kind: string): Readonly<MapEventStrategy> {
    const handler = this.#handlers.get(kind);
    if (!handler) throw new RangeError(`未注册 map event kind ${String(kind)}。`);
    return handler;
  }

  validateMapDefinition(
    mapDefinition: MapDefinition,
    context: Readonly<Record<string, unknown>> = {},
  ): void {
    const contextSnapshot = snapshotContext(context, 'Map event validation context');
    for (const event of mapDefinition.events) {
      this.#require(event.kind).validate(Object.freeze({
        ...contextSnapshot,
        mapDefinition,
        event,
      }) as MapEventValidationContext);
    }
  }

  plan(
    occurrence: MapOccurrence,
    context: Omit<MapEventExecutionContext, 'occurrence'> & Readonly<Record<string, unknown>>,
  ): Readonly<MapEventPlanResult> {
    const contextSnapshot = snapshotContext(context, 'Map event plan context');
    return normalizePlanResult(
      this.#require(occurrence.kind).plan(
        Object.freeze({ ...contextSnapshot, occurrence }) as MapEventExecutionContext,
      ),
      `map handler ${occurrence.kind}.plan`,
    );
  }

  start(
    occurrence: MapOccurrence,
    context: Omit<MapEventExecutionContext, 'occurrence'> & Readonly<Record<string, unknown>>,
  ): Readonly<MapEventExecutionResult> {
    return this.#executePhase('start', occurrence, context);
  }

  tick(
    occurrence: MapOccurrence,
    context: Omit<MapEventExecutionContext, 'occurrence'> & Readonly<Record<string, unknown>>,
  ): Readonly<MapEventExecutionResult> {
    return this.#executePhase('tick', occurrence, context);
  }

  end(
    occurrence: MapOccurrence,
    context: Omit<MapEventExecutionContext, 'occurrence'> & Readonly<Record<string, unknown>>,
  ): Readonly<MapEventExecutionResult> {
    return this.#executePhase('end', occurrence, context);
  }

  #executePhase(
    phase: 'start' | 'tick' | 'end',
    occurrence: MapOccurrence,
    context: Omit<MapEventExecutionContext, 'occurrence'> & Readonly<Record<string, unknown>>,
  ): Readonly<MapEventExecutionResult> {
    const contextSnapshot = snapshotContext(context, `Map event ${phase} context`);
    return normalizeExecutionResult(
      this.#require(occurrence.kind)[phase](
        Object.freeze({ ...contextSnapshot, occurrence }) as MapEventExecutionContext,
      ),
      `map handler ${occurrence.kind}.${phase}`,
    );
  }
}
