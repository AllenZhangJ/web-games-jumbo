import {
  assertKnownKeys,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import type { MapDefinition } from '@number-strategy-jump/arena-definitions';
import type {
  MapEventExecutionContext,
  MapEventExecutionResult,
  MapEventPlanResult,
  MapEventStrategy,
  MapEventValidationContext,
} from '../map-event-strategy-registry.js';
import {
  MAP_DOMAIN_EVENT,
  MAP_EVENT_KIND,
  MAP_RULE_COMMAND,
} from '../map-event-types.js';

const COLLAPSE_KEYS = new Set(['surfaceIds']);

function readSurfaceIds(value: unknown, name: string): readonly string[] {
  assertKnownKeys(value, COLLAPSE_KEYS, name);
  const checked = cloneFrozenStringSet(value.surfaceIds as readonly unknown[], `${name}.surfaceIds`);
  if (checked.length === 0) throw new RangeError(`${name}.surfaceIds 不能为空。`);
  return Object.freeze([...(value.surfaceIds as readonly string[])]);
}

function validate({ event, mapDefinition }: MapEventValidationContext): void {
  const surfaceIds = readSurfaceIds(event.parameters, `${event.id}.parameters`);
  const known = new Set(mapDefinition.arena.surfaces.map(({ id }) => id));
  for (const surfaceId of surfaceIds) {
    if (!known.has(surfaceId)) throw new RangeError(`${event.id} 引用未知 surface ${surfaceId}。`);
  }
  if (event.schedule.durationTicks !== 0) {
    throw new RangeError(`${event.id} collapse-surfaces 必须是瞬时持久变更。`);
  }
}

function plan({ occurrence }: MapEventExecutionContext): MapEventPlanResult {
  const surfaceIds = readSurfaceIds(
    occurrence.event.parameters,
    `${occurrence.eventId}.parameters`,
  );
  return {
    privatePlan: { surfaceIds },
    publicPayload: { surfaceIds },
  };
}

function readPrivatePlan(value: unknown): readonly string[] {
  return readSurfaceIds(value, 'collapse-surfaces privatePlan');
}

function start({ privatePlan }: MapEventExecutionContext): MapEventExecutionResult {
  const surfaceIds = readPrivatePlan(privatePlan);
  return {
    commands: surfaceIds.map((surfaceId) => ({
      kind: MAP_RULE_COMMAND.SET_SURFACE_ENABLED,
      surfaceId,
      enabled: false,
    })),
    events: surfaceIds.map((surfaceId) => ({
      type: MAP_DOMAIN_EVENT.SURFACE_COLLAPSED,
      surfaceId,
    })),
  };
}

function emptyResult(): MapEventExecutionResult {
  return { commands: [], events: [] };
}

export function createCollapseSurfacesStrategy(): Readonly<MapEventStrategy> {
  return Object.freeze({
    kind: MAP_EVENT_KIND.COLLAPSE_SURFACES,
    validate,
    plan,
    start,
    tick: emptyResult,
    end: emptyResult,
  });
}

export function listCollapsedSurfaceIdsBefore(
  mapDefinition: MapDefinition,
  inclusiveTick: number,
): ReadonlySet<string> {
  const result = new Set<string>();
  for (const event of mapDefinition.events) {
    if (event.kind !== MAP_EVENT_KIND.COLLAPSE_SURFACES) continue;
    const surfaceIds = readSurfaceIds(event.parameters, `${event.id}.parameters`);
    for (let index = 0; index < event.schedule.repeatCount; index += 1) {
      const collapseTick = event.schedule.startTick + event.schedule.repeatEveryTicks * index;
      if (collapseTick > inclusiveTick) continue;
      for (const surfaceId of surfaceIds) result.add(surfaceId);
    }
  }
  return result;
}
