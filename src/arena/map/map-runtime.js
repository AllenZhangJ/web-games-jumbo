import {
  assertIntegerAtLeast,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';
import {
  MAP_RUNTIME_SCHEMA_VERSION,
  serializeMapRuntimeSnapshot,
} from './map-serializer.js';

export const MAP_OCCURRENCE_PHASE = Object.freeze({
  DORMANT: 'dormant',
  WARNING: 'warning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ENDED: 'ended',
});

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function createOccurrenceState(occurrence) {
  return {
    occurrenceId: occurrence.occurrenceId,
    eventId: occurrence.eventId,
    kind: occurrence.kind,
    warningTick: occurrence.warningTick,
    startTick: occurrence.startTick,
    endTick: occurrence.endTick,
    phase: MAP_OCCURRENCE_PHASE.DORMANT,
    privatePlan: null,
    publicPayload: null,
    revision: 0,
  };
}

function cloneOccurrence(state, includeInternal = false) {
  const snapshot = {
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
  if (includeInternal) snapshot.privatePlan = state.privatePlan;
  return Object.freeze(snapshot);
}

export class MapRuntime {
  #definitionId;
  #surfaces;
  #occurrences;
  #nextActiveTick;
  #revision;
  #destroyed;

  constructor({ mapDefinition, occurrences }) {
    if (!mapDefinition || typeof mapDefinition.id !== 'string') {
      throw new TypeError('MapRuntime 需要 MapDefinition。');
    }
    if (!Array.isArray(occurrences)) throw new TypeError('MapRuntime occurrences 必须是数组。');
    this.#definitionId = mapDefinition.id;
    this.#surfaces = new Map(mapDefinition.arena.surfaces.map((surface) => [
      surface.id,
      { id: surface.id, enabled: true, revision: 0 },
    ]));
    this.#occurrences = new Map();
    for (const occurrence of occurrences) {
      if (this.#occurrences.has(occurrence.occurrenceId)) {
        throw new RangeError(`重复 map occurrence ${occurrence.occurrenceId}。`);
      }
      this.#occurrences.set(occurrence.occurrenceId, createOccurrenceState(occurrence));
    }
    this.#nextActiveTick = 0;
    this.#revision = 0;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('MapRuntime 已销毁。');
  }

  #requireOccurrence(occurrenceId) {
    this.#assertUsable();
    const id = assertNonEmptyString(occurrenceId, 'map occurrenceId');
    const state = this.#occurrences.get(id);
    if (!state) throw new RangeError(`未知 map occurrence ${id}。`);
    return state;
  }

  assertNextTick(activeTick) {
    this.#assertUsable();
    const tick = assertIntegerAtLeast(activeTick, 0, 'MapRuntime activeTick');
    if (tick !== this.#nextActiveTick) {
      throw new RangeError(`MapRuntime 期望 activeTick ${this.#nextActiveTick}，实际 ${tick}。`);
    }
  }

  completeTick(activeTick) {
    this.assertNextTick(activeTick);
    this.#nextActiveTick += 1;
    this.#revision += 1;
  }

  warn(occurrenceId, { privatePlan, publicPayload }) {
    const state = this.#requireOccurrence(occurrenceId);
    if (state.phase !== MAP_OCCURRENCE_PHASE.DORMANT) {
      throw new Error(`${occurrenceId} 不能从 ${state.phase} 进入 warning。`);
    }
    state.privatePlan = cloneFrozenData(privatePlan, `${occurrenceId}.privatePlan`);
    state.publicPayload = cloneFrozenData(publicPayload, `${occurrenceId}.publicPayload`);
    state.phase = MAP_OCCURRENCE_PHASE.WARNING;
    state.revision += 1;
    this.#revision += 1;
    return cloneOccurrence(state);
  }

  start(occurrenceId) {
    const state = this.#requireOccurrence(occurrenceId);
    if (state.phase !== MAP_OCCURRENCE_PHASE.WARNING) {
      throw new Error(`${occurrenceId} 不能从 ${state.phase} 进入 active。`);
    }
    state.phase = state.endTick === null
      ? MAP_OCCURRENCE_PHASE.COMPLETED
      : MAP_OCCURRENCE_PHASE.ACTIVE;
    state.revision += 1;
    this.#revision += 1;
    return cloneOccurrence(state);
  }

  end(occurrenceId) {
    const state = this.#requireOccurrence(occurrenceId);
    if (state.phase !== MAP_OCCURRENCE_PHASE.ACTIVE) {
      throw new Error(`${occurrenceId} 不能从 ${state.phase} 进入 ended。`);
    }
    state.phase = MAP_OCCURRENCE_PHASE.ENDED;
    state.revision += 1;
    this.#revision += 1;
    return cloneOccurrence(state);
  }

  getPrivatePlan(occurrenceId) {
    const state = this.#requireOccurrence(occurrenceId);
    if (state.phase === MAP_OCCURRENCE_PHASE.DORMANT || state.privatePlan === null) {
      throw new Error(`${occurrenceId} 尚未建立预告计划。`);
    }
    return state.privatePlan;
  }

  listActiveOccurrenceIds() {
    this.#assertUsable();
    return Object.freeze([...this.#occurrences.values()]
      .filter(({ phase }) => phase === MAP_OCCURRENCE_PHASE.ACTIVE)
      .map(({ occurrenceId }) => occurrenceId)
      .sort(compareText));
  }

  setSurfaceEnabled(surfaceId, enabled) {
    this.#assertUsable();
    const id = assertNonEmptyString(surfaceId, 'map surfaceId');
    if (typeof enabled !== 'boolean') throw new TypeError('map surface enabled 必须是布尔值。');
    const surface = this.#surfaces.get(id);
    if (!surface) throw new RangeError(`未知 map surface ${id}。`);
    if (surface.enabled === enabled) return Object.freeze({ ...surface });
    surface.enabled = enabled;
    surface.revision += 1;
    this.#revision += 1;
    return Object.freeze({ ...surface });
  }

  isSurfaceEnabled(surfaceId) {
    this.#assertUsable();
    const surface = this.#surfaces.get(surfaceId);
    if (!surface) throw new RangeError(`未知 map surface ${String(surfaceId)}。`);
    return surface.enabled;
  }

  getSnapshot({ includeInternal = false } = {}) {
    this.#assertUsable();
    return serializeMapRuntimeSnapshot({
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
    }, { includeInternal });
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#surfaces.clear();
    this.#occurrences.clear();
  }
}
