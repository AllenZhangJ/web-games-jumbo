import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaMapOccurrenceSnapshot,
  ArenaMapSnapshot,
  ArenaMapSurfaceSnapshot,
  DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import { MapDefinition } from '@number-strategy-jump/arena-definitions';
import {
  MAP_RUNTIME_SCHEMA_VERSION,
  serializeMapRuntimeSnapshot,
} from './map-serializer.js';
import {
  MAP_OCCURRENCE_PHASE,
  type MapRuntimeInternalSnapshot,
  type MapRuntimeOccurrenceState,
  type MapRuntimeSurfaceState,
} from './map-runtime-types.js';
import type { MapOccurrence } from './map-timeline.js';

const RUNTIME_OPTIONS_KEYS = new Set(['mapDefinition', 'occurrences']);
const OCCURRENCE_KEYS = new Set([
  'occurrenceId',
  'occurrenceIndex',
  'eventId',
  'kind',
  'warningTick',
  'startTick',
  'endTick',
  'event',
]);
const PLAN_KEYS = new Set(['privatePlan', 'publicPayload']);
const SNAPSHOT_OPTIONS_KEYS = new Set(['includeInternal']);
const EVENT_KEYS = new Set(['id', 'kind', 'schedule', 'parameters']);

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function nextCounter(value: number, name: string): number {
  const next = value + 1;
  if (!Number.isSafeInteger(next)) throw new RangeError(`${name} 已达到安全整数上限。`);
  return next;
}

function createOccurrenceState(value: unknown, index: number): MapRuntimeOccurrenceState {
  const name = `MapRuntime occurrences[${index}]`;
  assertKnownKeys(value, OCCURRENCE_KEYS, name);
  const occurrenceId = assertNonEmptyString(value.occurrenceId, `${name}.occurrenceId`);
  const eventId = assertNonEmptyString(value.eventId, `${name}.eventId`);
  const kind = assertNonEmptyString(value.kind, `${name}.kind`);
  assertIntegerAtLeast(value.occurrenceIndex, 0, `${name}.occurrenceIndex`);
  const warningTick = assertIntegerAtLeast(value.warningTick, 0, `${name}.warningTick`);
  const startTick = assertIntegerAtLeast(value.startTick, 0, `${name}.startTick`);
  const endTick = value.endTick === null
    ? null
    : assertIntegerAtLeast(value.endTick, 0, `${name}.endTick`);
  if (warningTick > startTick || (endTick !== null && endTick <= startTick)) {
    throw new RangeError(`${name} 的 warning/start/end tick 顺序无效。`);
  }
  assertKnownKeys(value.event, EVENT_KEYS, `${name}.event`);
  if (value.event.id !== eventId || value.event.kind !== kind) {
    throw new RangeError(`${name}.event 与 occurrence identity 不一致。`);
  }
  return {
    occurrenceId,
    eventId,
    kind,
    warningTick,
    startTick,
    endTick,
    phase: MAP_OCCURRENCE_PHASE.DORMANT,
    privatePlan: null,
    publicPayload: null,
    revision: 0,
  };
}

function cloneOccurrence(
  state: MapRuntimeOccurrenceState,
  includeInternal = false,
): ArenaMapOccurrenceSnapshot | MapRuntimeInternalSnapshot['occurrences'][number] {
  const common = {
    occurrenceId: state.occurrenceId,
    eventId: state.eventId,
    kind: state.kind,
    warningTick: state.warningTick,
    startTick: state.startTick,
    endTick: state.endTick,
    phase: state.phase,
    publicPayload: state.publicPayload,
    revision: state.revision,
  };
  if (!includeInternal) return Object.freeze(common);
  return Object.freeze({ ...common, privatePlan: state.privatePlan }) as
    MapRuntimeInternalSnapshot['occurrences'][number];
}

function readSnapshotOption(options: unknown): boolean {
  assertKnownKeys(options, SNAPSHOT_OPTIONS_KEYS, 'MapRuntime snapshot options');
  const includeInternal = options.includeInternal ?? false;
  if (typeof includeInternal !== 'boolean') {
    throw new TypeError('MapRuntime snapshot includeInternal 必须是布尔值。');
  }
  return includeInternal;
}

export class MapRuntime {
  readonly #definitionId: string;
  readonly #surfaces: Map<string, MapRuntimeSurfaceState>;
  readonly #occurrences: Map<string, MapRuntimeOccurrenceState>;
  #nextActiveTick = 0;
  #revision = 0;
  #destroyed = false;

  constructor(options: unknown) {
    assertKnownKeys(options, RUNTIME_OPTIONS_KEYS, 'MapRuntime options');
    if (!(options.mapDefinition instanceof MapDefinition)) {
      throw new TypeError('MapRuntime 需要 MapDefinition。');
    }
    if (!Array.isArray(options.occurrences)) {
      throw new TypeError('MapRuntime occurrences 必须是数组。');
    }
    this.#definitionId = options.mapDefinition.id;
    this.#surfaces = new Map(options.mapDefinition.arena.surfaces.map((surface) => [
      surface.id,
      { id: surface.id, enabled: true, revision: 0 },
    ]));
    this.#occurrences = new Map();
    for (let index = 0; index < options.occurrences.length; index += 1) {
      const state = createOccurrenceState(options.occurrences[index], index);
      if (this.#occurrences.has(state.occurrenceId)) {
        throw new RangeError(`重复 map occurrence ${state.occurrenceId}。`);
      }
      this.#occurrences.set(state.occurrenceId, state);
    }
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('MapRuntime 已销毁。');
  }

  #requireOccurrence(occurrenceId: unknown): MapRuntimeOccurrenceState {
    this.#assertUsable();
    const id = assertNonEmptyString(occurrenceId, 'map occurrenceId');
    const state = this.#occurrences.get(id);
    if (!state) throw new RangeError(`未知 map occurrence ${id}。`);
    return state;
  }

  assertNextTick(activeTick: unknown): void {
    this.#assertUsable();
    const tick = assertIntegerAtLeast(activeTick, 0, 'MapRuntime activeTick');
    if (tick !== this.#nextActiveTick) {
      throw new RangeError(`MapRuntime 期望 activeTick ${this.#nextActiveTick}，实际 ${tick}。`);
    }
  }

  completeTick(activeTick: unknown): void {
    this.assertNextTick(activeTick);
    const nextActiveTick = nextCounter(this.#nextActiveTick, 'MapRuntime nextActiveTick');
    const nextRevision = nextCounter(this.#revision, 'MapRuntime revision');
    this.#nextActiveTick = nextActiveTick;
    this.#revision = nextRevision;
  }

  warn(
    occurrenceId: unknown,
    plan: unknown,
  ): ArenaMapOccurrenceSnapshot {
    const state = this.#requireOccurrence(occurrenceId);
    if (state.phase !== MAP_OCCURRENCE_PHASE.DORMANT) {
      throw new Error(`${String(occurrenceId)} 不能从 ${state.phase} 进入 warning。`);
    }
    assertKnownKeys(plan, PLAN_KEYS, `${state.occurrenceId}.plan`);
    const privatePlan = cloneFrozenData(plan.privatePlan, `${state.occurrenceId}.privatePlan`);
    const publicPayload = cloneFrozenData(plan.publicPayload, `${state.occurrenceId}.publicPayload`);
    const stateRevision = nextCounter(state.revision, `${state.occurrenceId}.revision`);
    const runtimeRevision = nextCounter(this.#revision, 'MapRuntime revision');
    state.privatePlan = privatePlan;
    state.publicPayload = publicPayload;
    state.phase = MAP_OCCURRENCE_PHASE.WARNING;
    state.revision = stateRevision;
    this.#revision = runtimeRevision;
    return cloneOccurrence(state) as ArenaMapOccurrenceSnapshot;
  }

  start(occurrenceId: unknown): ArenaMapOccurrenceSnapshot {
    const state = this.#requireOccurrence(occurrenceId);
    if (state.phase !== MAP_OCCURRENCE_PHASE.WARNING) {
      throw new Error(`${String(occurrenceId)} 不能从 ${state.phase} 进入 active。`);
    }
    const stateRevision = nextCounter(state.revision, `${state.occurrenceId}.revision`);
    const runtimeRevision = nextCounter(this.#revision, 'MapRuntime revision');
    state.phase = state.endTick === null
      ? MAP_OCCURRENCE_PHASE.COMPLETED
      : MAP_OCCURRENCE_PHASE.ACTIVE;
    state.revision = stateRevision;
    this.#revision = runtimeRevision;
    return cloneOccurrence(state) as ArenaMapOccurrenceSnapshot;
  }

  end(occurrenceId: unknown): ArenaMapOccurrenceSnapshot {
    const state = this.#requireOccurrence(occurrenceId);
    if (state.phase !== MAP_OCCURRENCE_PHASE.ACTIVE) {
      throw new Error(`${String(occurrenceId)} 不能从 ${state.phase} 进入 ended。`);
    }
    const stateRevision = nextCounter(state.revision, `${state.occurrenceId}.revision`);
    const runtimeRevision = nextCounter(this.#revision, 'MapRuntime revision');
    state.phase = MAP_OCCURRENCE_PHASE.ENDED;
    state.revision = stateRevision;
    this.#revision = runtimeRevision;
    return cloneOccurrence(state) as ArenaMapOccurrenceSnapshot;
  }

  getPrivatePlan(occurrenceId: unknown): DeepReadonly<unknown> {
    const state = this.#requireOccurrence(occurrenceId);
    if (state.phase === MAP_OCCURRENCE_PHASE.DORMANT || state.privatePlan === null) {
      throw new Error(`${String(occurrenceId)} 尚未建立预告计划。`);
    }
    return state.privatePlan;
  }

  listActiveOccurrenceIds(): readonly string[] {
    this.#assertUsable();
    return Object.freeze([...this.#occurrences.values()]
      .filter(({ phase }) => phase === MAP_OCCURRENCE_PHASE.ACTIVE)
      .map(({ occurrenceId }) => occurrenceId)
      .sort(compareText));
  }

  setSurfaceEnabled(surfaceId: unknown, enabled: unknown): ArenaMapSurfaceSnapshot {
    this.#assertUsable();
    const id = assertNonEmptyString(surfaceId, 'map surfaceId');
    if (typeof enabled !== 'boolean') throw new TypeError('map surface enabled 必须是布尔值。');
    const surface = this.#surfaces.get(id);
    if (!surface) throw new RangeError(`未知 map surface ${id}。`);
    if (surface.enabled === enabled) return Object.freeze({ ...surface });
    const surfaceRevision = nextCounter(surface.revision, `map surface ${id}.revision`);
    const runtimeRevision = nextCounter(this.#revision, 'MapRuntime revision');
    surface.enabled = enabled;
    surface.revision = surfaceRevision;
    this.#revision = runtimeRevision;
    return Object.freeze({ ...surface });
  }

  isSurfaceEnabled(surfaceId: unknown): boolean {
    this.#assertUsable();
    const id = assertNonEmptyString(surfaceId, 'map surfaceId');
    const surface = this.#surfaces.get(id);
    if (!surface) throw new RangeError(`未知 map surface ${id}。`);
    return surface.enabled;
  }

  getSnapshot(): ArenaMapSnapshot;
  getSnapshot(options: Readonly<{ includeInternal?: false }>): ArenaMapSnapshot;
  getSnapshot(options: Readonly<{ includeInternal: true }>): MapRuntimeInternalSnapshot;
  getSnapshot(
    options: Readonly<{ includeInternal: boolean }>,
  ): ArenaMapSnapshot | MapRuntimeInternalSnapshot;
  getSnapshot(options: unknown = {}): ArenaMapSnapshot | MapRuntimeInternalSnapshot {
    this.#assertUsable();
    const includeInternal = readSnapshotOption(options);
    const rawSnapshot = {
      schemaVersion: MAP_RUNTIME_SCHEMA_VERSION,
      definitionId: this.#definitionId,
      nextActiveTick: this.#nextActiveTick,
      revision: this.#revision,
      surfaces: Object.freeze([...this.#surfaces.values()]
        .sort((left, right) => compareText(left.id, right.id))
        .map((surface) => Object.freeze({ ...surface }))),
      occurrences: Object.freeze([...this.#occurrences.values()]
        .filter(({ phase }) => phase !== MAP_OCCURRENCE_PHASE.DORMANT)
        .sort((left, right) => compareText(left.occurrenceId, right.occurrenceId))
        .map((state) => cloneOccurrence(state, includeInternal))),
    };
    return includeInternal
      ? serializeMapRuntimeSnapshot(rawSnapshot, { includeInternal: true })
      : serializeMapRuntimeSnapshot(rawSnapshot);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#surfaces.clear();
    this.#occurrences.clear();
  }
}

export type { MapOccurrence };
