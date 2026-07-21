import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

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
const OCCURRENCE_PHASES = new Set(['warning', 'active', 'completed', 'ended']);
const SERIALIZE_OPTIONS_KEYS = new Set(['includeInternal']);

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function serializeMapRuntimeSnapshot(snapshot, options = {}) {
  assertKnownKeys(options, SERIALIZE_OPTIONS_KEYS, 'MapRuntime serializer options');
  const includeInternal = options.includeInternal ?? false;
  if (typeof includeInternal !== 'boolean') {
    throw new TypeError('MapRuntime serializer includeInternal 必须是布尔值。');
  }
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
  const surfaceIds = new Set();
  const surfaces = snapshot.surfaces.map((surface, index) => {
    const name = `MapRuntime snapshot.surfaces[${index}]`;
    assertKnownKeys(surface, SURFACE_KEYS, name);
    const id = assertNonEmptyString(surface.id, `${name}.id`);
    if (surfaceIds.has(id)) throw new RangeError(`重复 map runtime surface ${id}。`);
    surfaceIds.add(id);
    if (typeof surface.enabled !== 'boolean') {
      throw new TypeError(`${name}.enabled 必须是布尔值。`);
    }
    return Object.freeze({
      id,
      enabled: surface.enabled,
      revision: assertIntegerAtLeast(surface.revision, 0, `${name}.revision`),
    });
  }).sort((left, right) => compareText(left.id, right.id));

  const occurrenceIds = new Set();
  const occurrences = snapshot.occurrences.map((occurrence, index) => {
    const name = `MapRuntime snapshot.occurrences[${index}]`;
    assertKnownKeys(
      occurrence,
      includeInternal ? INTERNAL_OCCURRENCE_KEYS : PUBLIC_OCCURRENCE_KEYS,
      name,
    );
    const occurrenceId = assertNonEmptyString(occurrence.occurrenceId, `${name}.occurrenceId`);
    if (occurrenceIds.has(occurrenceId)) {
      throw new RangeError(`重复 map runtime occurrence ${occurrenceId}。`);
    }
    occurrenceIds.add(occurrenceId);
    const warningTick = assertIntegerAtLeast(occurrence.warningTick, 0, `${name}.warningTick`);
    const startTick = assertIntegerAtLeast(occurrence.startTick, 0, `${name}.startTick`);
    const endTick = occurrence.endTick === null
      ? null
      : assertIntegerAtLeast(occurrence.endTick, 0, `${name}.endTick`);
    if (warningTick > startTick || (endTick !== null && endTick <= startTick)) {
      throw new RangeError(`${name} 的 warning/start/end tick 顺序无效。`);
    }
    if (!OCCURRENCE_PHASES.has(occurrence.phase)) {
      throw new RangeError(`${name}.phase 无效。`);
    }
    const result = {
      occurrenceId,
      eventId: assertNonEmptyString(occurrence.eventId, `${name}.eventId`),
      kind: assertNonEmptyString(occurrence.kind, `${name}.kind`),
      warningTick,
      startTick,
      endTick,
      phase: occurrence.phase,
      publicPayload: cloneFrozenData(occurrence.publicPayload, `${name}.publicPayload`),
      revision: assertIntegerAtLeast(occurrence.revision, 0, `${name}.revision`),
    };
    if (includeInternal) {
      if (!Object.prototype.hasOwnProperty.call(occurrence, 'privatePlan')) {
        throw new TypeError(`${name} 缺少 privatePlan。`);
      }
      result.privatePlan = cloneFrozenData(occurrence.privatePlan, `${name}.privatePlan`);
    }
    return Object.freeze(result);
  }).sort((left, right) => compareText(left.occurrenceId, right.occurrenceId));

  return Object.freeze({
    schemaVersion: MAP_RUNTIME_SCHEMA_VERSION,
    definitionId: assertNonEmptyString(snapshot.definitionId, 'MapRuntime snapshot.definitionId'),
    nextActiveTick: assertIntegerAtLeast(
      snapshot.nextActiveTick,
      0,
      'MapRuntime snapshot.nextActiveTick',
    ),
    revision: assertIntegerAtLeast(snapshot.revision, 0, 'MapRuntime snapshot.revision'),
    surfaces: Object.freeze(surfaces),
    occurrences: Object.freeze(occurrences),
  });
}
