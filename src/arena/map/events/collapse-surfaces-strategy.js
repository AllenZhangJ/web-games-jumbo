import {
  assertKnownKeys,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import {
  MAP_DOMAIN_EVENT,
  MAP_EVENT_KIND,
  MAP_RULE_COMMAND,
} from '../map-event-types.js';

const COLLAPSE_KEYS = new Set(['surfaceIds']);

function validate({ event, mapDefinition }) {
  assertKnownKeys(event.parameters, COLLAPSE_KEYS, `${event.id}.parameters`);
  const surfaceIds = cloneFrozenStringSet(event.parameters.surfaceIds, `${event.id}.surfaceIds`);
  if (surfaceIds.length === 0) throw new RangeError(`${event.id}.surfaceIds 不能为空。`);
  const known = new Set(mapDefinition.arena.surfaces.map(({ id }) => id));
  for (const surfaceId of surfaceIds) {
    if (!known.has(surfaceId)) throw new RangeError(`${event.id} 引用未知 surface ${surfaceId}。`);
  }
  if (event.schedule.durationTicks !== 0) {
    throw new RangeError(`${event.id} collapse-surfaces 必须是瞬时持久变更。`);
  }
}

function plan({ occurrence }) {
  return {
    privatePlan: { surfaceIds: occurrence.event.parameters.surfaceIds },
    publicPayload: { surfaceIds: occurrence.event.parameters.surfaceIds },
  };
}

function start({ privatePlan }) {
  return {
    commands: privatePlan.surfaceIds.map((surfaceId) => ({
      kind: MAP_RULE_COMMAND.SET_SURFACE_ENABLED,
      surfaceId,
      enabled: false,
    })),
    events: privatePlan.surfaceIds.map((surfaceId) => ({
      type: MAP_DOMAIN_EVENT.SURFACE_COLLAPSED,
      surfaceId,
    })),
  };
}

function emptyResult() {
  return { commands: [], events: [] };
}

export function createCollapseSurfacesStrategy() {
  return Object.freeze({
    kind: MAP_EVENT_KIND.COLLAPSE_SURFACES,
    validate,
    plan,
    start,
    tick: emptyResult,
    end: emptyResult,
  });
}
