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
} from '@number-strategy-jump/arena-contracts';
import {
  MAP_OCCURRENCE_PHASE,
  type MapRuntimeInternalOccurrenceSnapshot,
  type MapRuntimeInternalSnapshot,
  type SerializableMapOccurrencePhase,
} from './map-runtime-types.js';

export const MAP_RUNTIME_SCHEMA_VERSION = 1;

const SNAPSHOT_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'nextActiveTick',
  'revision',
  'surfaces',
  'occurrences',
]);
const SURFACE_KEYS = new Set(['id', 'enabled', 'revision']);
const PUBLIC_OCCURRENCE_KEYS = new Set([
  'occurrenceId',
  'eventId',
  'kind',
  'warningTick',
  'startTick',
  'endTick',
  'phase',
  'publicPayload',
  'revision',
]);
const INTERNAL_OCCURRENCE_KEYS = new Set([...PUBLIC_OCCURRENCE_KEYS, 'privatePlan']);
const SERIALIZABLE_OCCURRENCE_PHASES: ReadonlySet<string> = new Set([
  MAP_OCCURRENCE_PHASE.WARNING,
  MAP_OCCURRENCE_PHASE.ACTIVE,
  MAP_OCCURRENCE_PHASE.COMPLETED,
  MAP_OCCURRENCE_PHASE.ENDED,
]);
const SERIALIZE_OPTIONS_KEYS = new Set(['includeInternal']);

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function readIncludeInternal(options: unknown): boolean {
  assertKnownKeys(options, SERIALIZE_OPTIONS_KEYS, 'MapRuntime serializer options');
  const includeInternal = options.includeInternal ?? false;
  if (typeof includeInternal !== 'boolean') {
    throw new TypeError('MapRuntime serializer includeInternal 必须是布尔值。');
  }
  return includeInternal;
}

function cloneSurface(
  value: unknown,
  index: number,
  snapshotRevision: number,
  ids: Set<string>,
): ArenaMapSurfaceSnapshot {
  const name = `MapRuntime snapshot.surfaces[${index}]`;
  assertKnownKeys(value, SURFACE_KEYS, name);
  const id = assertNonEmptyString(value.id, `${name}.id`);
  if (ids.has(id)) throw new RangeError(`重复 map runtime surface ${id}。`);
  ids.add(id);
  if (typeof value.enabled !== 'boolean') {
    throw new TypeError(`${name}.enabled 必须是布尔值。`);
  }
  const revision = assertIntegerAtLeast(value.revision, 0, `${name}.revision`);
  if (revision > snapshotRevision) {
    throw new RangeError(`${name}.revision 不能超过 MapRuntime snapshot.revision。`);
  }
  return Object.freeze({ id, enabled: value.enabled, revision });
}

function cloneOccurrence(
  value: unknown,
  index: number,
  snapshotRevision: number,
  includeInternal: boolean,
  ids: Set<string>,
): ArenaMapOccurrenceSnapshot | MapRuntimeInternalOccurrenceSnapshot {
  const name = `MapRuntime snapshot.occurrences[${index}]`;
  assertKnownKeys(
    value,
    includeInternal ? INTERNAL_OCCURRENCE_KEYS : PUBLIC_OCCURRENCE_KEYS,
    name,
  );
  const occurrenceId = assertNonEmptyString(value.occurrenceId, `${name}.occurrenceId`);
  if (ids.has(occurrenceId)) {
    throw new RangeError(`重复 map runtime occurrence ${occurrenceId}。`);
  }
  ids.add(occurrenceId);
  const warningTick = assertIntegerAtLeast(value.warningTick, 0, `${name}.warningTick`);
  const startTick = assertIntegerAtLeast(value.startTick, 0, `${name}.startTick`);
  const endTick = value.endTick === null
    ? null
    : assertIntegerAtLeast(value.endTick, 0, `${name}.endTick`);
  if (warningTick > startTick || (endTick !== null && endTick <= startTick)) {
    throw new RangeError(`${name} 的 warning/start/end tick 顺序无效。`);
  }
  if (typeof value.phase !== 'string' || !SERIALIZABLE_OCCURRENCE_PHASES.has(value.phase)) {
    throw new RangeError(`${name}.phase 无效。`);
  }
  const phase = value.phase as SerializableMapOccurrencePhase;
  if (phase === MAP_OCCURRENCE_PHASE.COMPLETED && endTick !== null) {
    throw new RangeError(`${name} completed occurrence 不能包含 endTick。`);
  }
  if (
    (phase === MAP_OCCURRENCE_PHASE.ACTIVE || phase === MAP_OCCURRENCE_PHASE.ENDED)
    && endTick === null
  ) {
    throw new RangeError(`${name} ${phase} occurrence 必须包含 endTick。`);
  }
  const revision = assertIntegerAtLeast(value.revision, 0, `${name}.revision`);
  if (revision > snapshotRevision) {
    throw new RangeError(`${name}.revision 不能超过 MapRuntime snapshot.revision。`);
  }
  const common = {
    occurrenceId,
    eventId: assertNonEmptyString(value.eventId, `${name}.eventId`),
    kind: assertNonEmptyString(value.kind, `${name}.kind`),
    warningTick,
    startTick,
    endTick,
    phase,
    publicPayload: cloneFrozenData(value.publicPayload, `${name}.publicPayload`),
    revision,
  };
  if (!includeInternal) return Object.freeze(common);
  if (!Object.prototype.hasOwnProperty.call(value, 'privatePlan')) {
    throw new TypeError(`${name} 缺少 privatePlan。`);
  }
  return Object.freeze({
    ...common,
    privatePlan: cloneFrozenData(value.privatePlan, `${name}.privatePlan`),
  });
}

export function serializeMapRuntimeSnapshot(
  snapshot: unknown,
  options: Readonly<{ includeInternal: true }>,
): MapRuntimeInternalSnapshot;
export function serializeMapRuntimeSnapshot(
  snapshot: unknown,
  options?: Readonly<{ includeInternal?: false }>,
): ArenaMapSnapshot;
export function serializeMapRuntimeSnapshot(
  snapshot: unknown,
  options: Readonly<{ includeInternal: boolean }>,
): ArenaMapSnapshot | MapRuntimeInternalSnapshot;
export function serializeMapRuntimeSnapshot(
  snapshot: unknown,
  options: unknown = {},
): ArenaMapSnapshot | MapRuntimeInternalSnapshot {
  const includeInternal = readIncludeInternal(options);
  assertKnownKeys(snapshot, SNAPSHOT_KEYS, 'MapRuntime snapshot');
  if (snapshot.schemaVersion !== MAP_RUNTIME_SCHEMA_VERSION) {
    throw new RangeError(`MapRuntime snapshot schema 必须是 ${MAP_RUNTIME_SCHEMA_VERSION}。`);
  }
  if (!Array.isArray(snapshot.surfaces)) {
    throw new TypeError('MapRuntime snapshot.surfaces 必须是数组。');
  }
  if (!Array.isArray(snapshot.occurrences)) {
    throw new TypeError('MapRuntime snapshot.occurrences 必须是数组。');
  }
  const definitionId = assertNonEmptyString(
    snapshot.definitionId,
    'MapRuntime snapshot.definitionId',
  );
  const nextActiveTick = assertIntegerAtLeast(
    snapshot.nextActiveTick,
    0,
    'MapRuntime snapshot.nextActiveTick',
  );
  const revision = assertIntegerAtLeast(snapshot.revision, 0, 'MapRuntime snapshot.revision');
  const surfaceIds = new Set<string>();
  const surfaces = snapshot.surfaces
    .map((surface, index) => cloneSurface(surface, index, revision, surfaceIds))
    .sort((left, right) => compareText(left.id, right.id));
  const occurrenceIds = new Set<string>();
  const occurrences = snapshot.occurrences
    .map((occurrence, index) => cloneOccurrence(
      occurrence,
      index,
      revision,
      includeInternal,
      occurrenceIds,
    ))
    .sort((left, right) => compareText(left.occurrenceId, right.occurrenceId));
  return Object.freeze({
    schemaVersion: MAP_RUNTIME_SCHEMA_VERSION,
    definitionId,
    nextActiveTick,
    revision,
    surfaces: Object.freeze(surfaces),
    occurrences: Object.freeze(occurrences),
  }) as ArenaMapSnapshot | MapRuntimeInternalSnapshot;
}
