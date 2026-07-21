import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  deriveSeed,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaMapSnapshot,
  DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import { MapDefinition } from '@number-strategy-jump/arena-definitions';
import {
  MapCommandRegistry,
  type MapCommandPhase,
  type MapMutationPorts,
  type MapRuleCommand,
} from './map-command-registry.js';
import {
  MapEventStrategyRegistry,
  type MapActorSnapshot,
  type MapEventExecutionResult,
} from './map-event-strategy-registry.js';
import { MAP_RULE_COMMAND } from './map-event-types.js';
import { MapRuntime } from './map-runtime.js';
import type { MapRuntimeInternalSnapshot } from './map-runtime-types.js';
import {
  MAP_TIMELINE_TRANSITION,
  MapTimeline,
  type MapOccurrence,
} from './map-timeline.js';

export const ARENA_MAP_EVENT = Object.freeze({
  EVENT_WARNED: 'MapEventWarned',
  EVENT_STARTED: 'MapEventStarted',
  EVENT_ENDED: 'MapEventEnded',
} as const);

export type ArenaMapEventType =
  typeof ARENA_MAP_EVENT[keyof typeof ARENA_MAP_EVENT];

export interface ArenaMapDomainEvent extends Readonly<Record<string, unknown>> {
  readonly type: string;
}

export interface ArenaMapAdvanceBatch {
  readonly activeTick: number;
  readonly commands: readonly MapRuleCommand[];
  readonly events: readonly ArenaMapDomainEvent[];
}

export interface ArenaMapSystemContract {
  advance(options: unknown): ArenaMapAdvanceBatch;
  commit(batch: unknown, ports: unknown): void;
  getSnapshot(): ArenaMapSnapshot;
  getStateSnapshot(): MapRuntimeInternalSnapshot;
  getContentHash(): string;
  isSurfaceEnabled(surfaceId: unknown): boolean;
  isPositionOnEnabledSurface(position: unknown): boolean;
  destroy(): void;
}

const SYSTEM_OPTIONS_KEYS = new Set([
  'mapDefinition',
  'strategyRegistry',
  'commandRegistry',
  'matchSeed',
  'rulesetVersion',
  'validationContext',
]);
const ADVANCE_KEYS = new Set(['activeTick', 'actors']);
const ACTOR_KEYS = new Set(['id', 'position', 'eligible']);
const POSITION_AXES = ['x', 'y', 'z'] as const;
const POSITION_KEYS = new Set(POSITION_AXES);
const COMMIT_PORT_KEYS = new Set(['applyImpulse', 'setSurfaceEnabled', 'spawnEquipment']);
const REQUIRED_MAP_SYSTEM_METHODS = Object.freeze([
  'advance',
  'commit',
  'getSnapshot',
  'getStateSnapshot',
  'getContentHash',
  'isSurfaceEnabled',
  'isPositionOnEnabledSurface',
  'destroy',
] as const);

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function findDataMethod(value: object, name: string): ((...args: unknown[]) => unknown) | null {
  let target: object | null = value;
  while (target) {
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    if (descriptor) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError(`mapSystemFactory 返回值.${name} 必须是数据方法。`);
      }
      return typeof descriptor.value === 'function'
        ? descriptor.value as (...args: unknown[]) => unknown
        : null;
    }
    target = Object.getPrototypeOf(target) as object | null;
  }
  return null;
}

export function assertArenaMapSystem(system: unknown): ArenaMapSystemContract {
  if (!system || (typeof system !== 'object' && typeof system !== 'function')) {
    throw new TypeError('mapSystemFactory 必须返回对象。');
  }
  for (const method of REQUIRED_MAP_SYSTEM_METHODS) {
    if (!findDataMethod(system, method)) {
      throw new TypeError(`mapSystemFactory 返回值缺少 ${method}()。`);
    }
  }
  return system as ArenaMapSystemContract;
}

function cloneActors(values: unknown): readonly MapActorSnapshot[] {
  if (!Array.isArray(values)) throw new TypeError('MapSystem actors 必须是数组。');
  const ids = new Set<string>();
  const actors = values.map((actor, index) => {
    const name = `MapSystem actors[${index}]`;
    assertKnownKeys(actor, ACTOR_KEYS, name);
    const id = assertNonEmptyString(actor.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复 map actor ${id}。`);
    ids.add(id);
    if (typeof actor.eligible !== 'boolean') {
      throw new TypeError(`${name}.eligible 必须是布尔值。`);
    }
    assertKnownKeys(actor.position, POSITION_KEYS, `${name}.position`);
    const position = { x: 0, y: 0, z: 0 };
    for (const axis of POSITION_AXES) {
      const component = actor.position[axis];
      if (!Number.isFinite(component)) {
        throw new TypeError(`${name}.position.${axis} 必须是有限数。`);
      }
      position[axis] = component as number;
    }
    return Object.freeze({
      id,
      eligible: actor.eligible,
      position: Object.freeze(position),
    });
  });
  return Object.freeze(actors.sort((left, right) => compareText(left.id, right.id)));
}

function enrichCommands(
  commands: readonly MapRuleCommand[],
  occurrence: MapOccurrence,
  phase: MapCommandPhase,
  sequenceOffset: number,
): readonly MapRuleCommand[] {
  return Object.freeze(commands.map((command, index) => {
    const safeCommand = cloneFrozenData(command, `MapRuleCommand[${index}]`);
    assertPlainRecord(safeCommand, `MapRuleCommand[${index}]`);
    return cloneFrozenData({
      ...safeCommand,
      occurrenceId: occurrence.occurrenceId,
      mapEventId: occurrence.eventId,
      mapEventKind: occurrence.kind,
      phase,
      sequence: sequenceOffset + index,
    }, 'MapRuleCommand') as MapRuleCommand;
  }));
}

function enrichEvents(
  events: readonly Readonly<Record<string, unknown>>[],
  occurrence: MapOccurrence,
): readonly ArenaMapDomainEvent[] {
  return Object.freeze(events.map((event, index) => {
    const safeEvent = cloneFrozenData(event, `MapDomainEvent[${index}]`);
    assertPlainRecord(safeEvent, `MapDomainEvent[${index}]`);
    const type = assertNonEmptyString(safeEvent.type, `MapDomainEvent[${index}].type`);
    return cloneFrozenData({
      ...safeEvent,
      type,
      occurrenceId: occurrence.occurrenceId,
      mapEventId: occurrence.eventId,
      mapEventKind: occurrence.kind,
    }, 'MapDomainEvent') as ArenaMapDomainEvent;
  }));
}

function cloneMutationPorts(value: unknown): Readonly<MapMutationPorts> {
  assertKnownKeys(value, COMMIT_PORT_KEYS, 'Map mutation ports');
  for (const name of COMMIT_PORT_KEYS) {
    if (typeof value[name] !== 'function') {
      throw new TypeError(`Map mutation port 缺少 ${name}()。`);
    }
  }
  return Object.freeze({
    applyImpulse: value.applyImpulse as MapMutationPorts['applyImpulse'],
    setSurfaceEnabled: value.setSurfaceEnabled as MapMutationPorts['setSurfaceEnabled'],
    spawnEquipment: value.spawnEquipment as MapMutationPorts['spawnEquipment'],
  });
}

function readHorizontalPosition(value: unknown): Readonly<{ x: number; z: number }> | null {
  try {
    const record = assertPlainRecord(value, 'map position');
    const x = Object.getOwnPropertyDescriptor(record, 'x');
    const z = Object.getOwnPropertyDescriptor(record, 'z');
    if (
      !x
      || !z
      || !Object.prototype.hasOwnProperty.call(x, 'value')
      || !Object.prototype.hasOwnProperty.call(z, 'value')
      || !Number.isFinite(x.value)
      || !Number.isFinite(z.value)
    ) return null;
    return Object.freeze({ x: x.value as number, z: z.value as number });
  } catch {
    return null;
  }
}

export class ArenaMapSystem implements ArenaMapSystemContract {
  readonly #definition: MapDefinition;
  readonly #strategyRegistry: MapEventStrategyRegistry;
  readonly #commandRegistry: MapCommandRegistry;
  readonly #timeline: MapTimeline;
  readonly #runtime: MapRuntime;
  readonly #matchSeed: number;
  readonly #contentHash: string;
  #destroyed = false;
  #advancing = false;
  #committing = false;
  #failed = false;
  #pendingBatch: ArenaMapAdvanceBatch | null = null;

  constructor(options: unknown) {
    assertKnownKeys(options, SYSTEM_OPTIONS_KEYS, 'ArenaMapSystem options');
    if (!(options.mapDefinition instanceof MapDefinition)) {
      throw new TypeError('ArenaMapSystem 需要 MapDefinition。');
    }
    if (!(options.strategyRegistry instanceof MapEventStrategyRegistry)) {
      throw new TypeError('ArenaMapSystem 需要 MapEventStrategyRegistry。');
    }
    if (!(options.commandRegistry instanceof MapCommandRegistry)) {
      throw new TypeError('ArenaMapSystem 需要 MapCommandRegistry。');
    }
    if (
      !Number.isSafeInteger(options.matchSeed)
      || (options.matchSeed as number) < 0
      || (options.matchSeed as number) > 0xffffffff
    ) throw new RangeError('ArenaMapSystem matchSeed 必须是 uint32。');
    const rulesetVersion = assertNonEmptyString(
      options.rulesetVersion,
      'ArenaMapSystem rulesetVersion',
    );
    const validationContext = options.validationContext ?? {};
    options.strategyRegistry.validateMapDefinition(
      options.mapDefinition,
      validationContext as Readonly<Record<string, unknown>>,
    );
    const contentHash = createDeterministicDataHash({
      rulesetVersion,
      definition: options.mapDefinition.toJSON(),
    }, 'Map authority content');
    const timeline = new MapTimeline(options.mapDefinition);
    const runtime = new MapRuntime({
      mapDefinition: options.mapDefinition,
      occurrences: timeline.listOccurrences(),
    });
    this.#definition = options.mapDefinition;
    this.#strategyRegistry = options.strategyRegistry;
    this.#commandRegistry = options.commandRegistry;
    this.#timeline = timeline;
    this.#runtime = runtime;
    this.#matchSeed = options.matchSeed as number;
    this.#contentHash = contentHash;
    Object.freeze(this);
  }

  #assertAvailable(): void {
    if (this.#destroyed) throw new Error('ArenaMapSystem 已销毁。');
    if (this.#failed) throw new Error('ArenaMapSystem 已失败，不能继续推进。');
  }

  #assertReadable(): void {
    this.#assertAvailable();
    if (this.#advancing) {
      throw new Error('ArenaMapSystem advance 期间不能读取。');
    }
  }

  #assertUsable(): void {
    this.#assertAvailable();
    if (this.#advancing || this.#committing) {
      throw new Error('ArenaMapSystem 权威变更不可重入。');
    }
  }

  #handlerContext(
    occurrence: MapOccurrence,
    actors: readonly MapActorSnapshot[],
  ): Readonly<{
    mapDefinition: MapDefinition;
    mapSnapshot: ArenaMapSnapshot;
    privatePlan: DeepReadonly<unknown>;
    actors: readonly MapActorSnapshot[];
    seed: number;
  }> {
    return Object.freeze({
      mapDefinition: this.#definition,
      mapSnapshot: this.#runtime.getSnapshot(),
      privatePlan: this.#runtime.getPrivatePlan(occurrence.occurrenceId),
      actors,
      seed: deriveSeed(
        this.#matchSeed,
        `map:${this.#definition.id}:${occurrence.occurrenceId}`,
      ),
    });
  }

  #validateAndApplyInternalCommands(commands: readonly MapRuleCommand[]): void {
    this.#commandRegistry.assertSupported(commands);
    const surfaceCommands: Array<Readonly<{
      surfaceId: string;
      enabled: boolean;
    }>> = [];
    for (const command of commands) {
      if (command.kind !== MAP_RULE_COMMAND.SET_SURFACE_ENABLED) continue;
      const surfaceId = assertNonEmptyString(command.surfaceId, 'map surface command.surfaceId');
      if (typeof command.enabled !== 'boolean') {
        throw new TypeError('map surface command.enabled 必须是布尔值。');
      }
      this.#runtime.isSurfaceEnabled(surfaceId);
      surfaceCommands.push(Object.freeze({ surfaceId, enabled: command.enabled }));
    }
    for (const command of surfaceCommands) {
      this.#runtime.setSurfaceEnabled(command.surfaceId, command.enabled);
    }
  }

  #prepareResult(
    result: Readonly<MapEventExecutionResult>,
    occurrence: MapOccurrence,
    phase: MapCommandPhase,
    sequenceOffset: number,
  ): Readonly<{
    commands: readonly MapRuleCommand[];
    events: readonly ArenaMapDomainEvent[];
  }> {
    const commands = enrichCommands(result.commands, occurrence, phase, sequenceOffset);
    const events = enrichEvents(result.events, occurrence);
    this.#validateAndApplyInternalCommands(commands);
    return Object.freeze({ commands, events });
  }

  advance(value: unknown): ArenaMapAdvanceBatch {
    this.#assertUsable();
    if (this.#pendingBatch) {
      throw new Error('ArenaMapSystem 上一个 advance 批次尚未 commit。');
    }
    this.#advancing = true;
    let validated = false;
    const commands: MapRuleCommand[] = [];
    const events: ArenaMapDomainEvent[] = [];
    try {
      assertKnownKeys(value, ADVANCE_KEYS, 'ArenaMapSystem advance options');
      const activeTick = assertIntegerAtLeast(value.activeTick, 0, 'ArenaMapSystem activeTick');
      const actors = cloneActors(value.actors);
      this.#runtime.assertNextTick(activeTick);
      validated = true;
      for (const transition of this.#timeline.transitionsAt(activeTick)) {
        const occurrence = this.#timeline.requireOccurrence(transition.occurrenceId);
        if (transition.transition === MAP_TIMELINE_TRANSITION.WARNING) {
          const seed = deriveSeed(
            this.#matchSeed,
            `map:${this.#definition.id}:${occurrence.occurrenceId}`,
          );
          const plan = this.#strategyRegistry.plan(occurrence, {
            mapDefinition: this.#definition,
            mapSnapshot: this.#runtime.getSnapshot(),
            actors,
            seed,
          });
          const publicState = this.#runtime.warn(occurrence.occurrenceId, plan);
          events.push(Object.freeze({
            type: ARENA_MAP_EVENT.EVENT_WARNED,
            occurrenceId: occurrence.occurrenceId,
            mapEventId: occurrence.eventId,
            mapEventKind: occurrence.kind,
            startsAtActiveTick: occurrence.startTick,
            endsAtActiveTick: occurrence.endTick,
            publicPayload: publicState.publicPayload,
          }));
          continue;
        }
        if (transition.transition === MAP_TIMELINE_TRANSITION.END) {
          const prepared = this.#prepareResult(
            this.#strategyRegistry.end(
              occurrence,
              this.#handlerContext(occurrence, actors),
            ),
            occurrence,
            'end',
            commands.length,
          );
          commands.push(...prepared.commands);
          events.push(...prepared.events);
          this.#runtime.end(occurrence.occurrenceId);
          events.push(Object.freeze({
            type: ARENA_MAP_EVENT.EVENT_ENDED,
            occurrenceId: occurrence.occurrenceId,
            mapEventId: occurrence.eventId,
            mapEventKind: occurrence.kind,
          }));
          continue;
        }
        const prepared = this.#prepareResult(
          this.#strategyRegistry.start(
            occurrence,
            this.#handlerContext(occurrence, actors),
          ),
          occurrence,
          'start',
          commands.length,
        );
        commands.push(...prepared.commands);
        events.push(...prepared.events);
        const publicState = this.#runtime.start(occurrence.occurrenceId);
        events.push(Object.freeze({
          type: ARENA_MAP_EVENT.EVENT_STARTED,
          occurrenceId: occurrence.occurrenceId,
          mapEventId: occurrence.eventId,
          mapEventKind: occurrence.kind,
          publicPayload: publicState.publicPayload,
        }));
      }
      for (const occurrenceId of this.#runtime.listActiveOccurrenceIds()) {
        const occurrence = this.#timeline.requireOccurrence(occurrenceId);
        const prepared = this.#prepareResult(
          this.#strategyRegistry.tick(
            occurrence,
            this.#handlerContext(occurrence, actors),
          ),
          occurrence,
          'tick',
          commands.length,
        );
        commands.push(...prepared.commands);
        events.push(...prepared.events);
      }
      this.#runtime.completeTick(activeTick);
      const batch = Object.freeze({
        activeTick,
        commands: Object.freeze(commands),
        events: Object.freeze(events),
      });
      this.#pendingBatch = batch;
      return batch;
    } catch (error) {
      if (validated) this.#failed = true;
      throw error;
    } finally {
      this.#advancing = false;
    }
  }

  commit(batch: unknown, value: unknown): void {
    this.#assertUsable();
    if (!this.#pendingBatch) throw new Error('ArenaMapSystem 没有待提交的 advance 批次。');
    if (batch !== this.#pendingBatch) {
      throw new Error('ArenaMapSystem 只能提交最近一次 advance 返回的原始批次。');
    }
    this.#committing = true;
    let authoritativeFailure = false;
    try {
      const ports = cloneMutationPorts(value);
      authoritativeFailure = true;
      this.#commandRegistry.assertSupported(this.#pendingBatch.commands);
      this.#commandRegistry.execute(this.#pendingBatch.commands, { ports });
      this.#pendingBatch = null;
    } catch (error) {
      if (authoritativeFailure) this.#failed = true;
      throw error;
    } finally {
      this.#committing = false;
    }
  }

  getSnapshot(): ArenaMapSnapshot {
    this.#assertReadable();
    return this.#runtime.getSnapshot();
  }

  getStateSnapshot(): MapRuntimeInternalSnapshot {
    this.#assertReadable();
    return this.#runtime.getSnapshot({ includeInternal: true });
  }

  getContentHash(): string {
    this.#assertReadable();
    return this.#contentHash;
  }

  isSurfaceEnabled(surfaceId: unknown): boolean {
    this.#assertReadable();
    return this.#runtime.isSurfaceEnabled(surfaceId);
  }

  isPositionOnEnabledSurface(position: unknown): boolean {
    this.#assertReadable();
    const horizontal = readHorizontalPosition(position);
    if (!horizontal) return false;
    return this.#definition.arena.surfaces.some((surface) => (
      this.#runtime.isSurfaceEnabled(surface.id)
      && Math.abs(horizontal.x - surface.center.x) <= surface.halfExtents.x
      && Math.abs(horizontal.z - surface.center.z) <= surface.halfExtents.z
    ));
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#advancing || this.#committing) {
      throw new Error('ArenaMapSystem 权威变更期间不能销毁。');
    }
    this.#runtime.destroy();
    this.#pendingBatch = null;
    this.#destroyed = true;
  }
}
