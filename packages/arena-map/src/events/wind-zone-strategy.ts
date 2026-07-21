import {
  assertKnownKeys,
  assertPositiveFinite,
} from '@number-strategy-jump/arena-contracts';
import type { Vector3Definition } from '@number-strategy-jump/arena-definitions';
import type {
  MapEventExecutionContext,
  MapEventExecutionResult,
  MapEventPlanResult,
  MapEventStrategy,
  MapEventValidationContext,
} from '../map-event-strategy-registry.js';
import { MAP_EVENT_KIND, MAP_RULE_COMMAND } from '../map-event-types.js';

const WIND_KEYS = new Set(['region', 'impulsePerTick']);
const REGION_KEYS = new Set(['center', 'halfExtents']);
const VECTOR_AXES = ['x', 'y', 'z'] as const;
const VECTOR_KEYS = new Set(VECTOR_AXES);
const MINIMUM_NONZERO_IMPULSE = 1e-9;

interface WindRegion {
  readonly center: Vector3Definition;
  readonly halfExtents: Vector3Definition;
}

interface WindPlan {
  readonly region: WindRegion;
  readonly impulsePerTick: Vector3Definition;
}

function cloneVector(
  value: unknown,
  name: string,
  { positive = false }: { readonly positive?: boolean } = {},
): Vector3Definition {
  assertKnownKeys(value, VECTOR_KEYS, name);
  const result = { x: 0, y: 0, z: 0 };
  for (const axis of VECTOR_AXES) {
    const component = value[axis];
    if (!Number.isFinite(component)) throw new TypeError(`${name}.${axis} 必须是有限数。`);
    if (positive) assertPositiveFinite(component, `${name}.${axis}`);
    result[axis] = component as number;
  }
  return Object.freeze(result);
}

function readWindPlan(value: unknown, name: string): WindPlan {
  assertKnownKeys(value, WIND_KEYS, name);
  assertKnownKeys(value.region, REGION_KEYS, `${name}.region`);
  return Object.freeze({
    region: Object.freeze({
      center: cloneVector(value.region.center, `${name}.region.center`),
      halfExtents: cloneVector(
        value.region.halfExtents,
        `${name}.region.halfExtents`,
        { positive: true },
      ),
    }),
    impulsePerTick: cloneVector(value.impulsePerTick, `${name}.impulsePerTick`),
  });
}

function validate({ event }: MapEventValidationContext): void {
  const plan = readWindPlan(event.parameters, `${event.id}.parameters`);
  const { x, y, z } = plan.impulsePerTick;
  if (Math.hypot(x, y, z) <= MINIMUM_NONZERO_IMPULSE) {
    throw new RangeError(`${event.id}.impulsePerTick 不能为零。`);
  }
  if (event.schedule.durationTicks === 0) {
    throw new RangeError(`${event.id} wind-zone 必须有正 durationTicks。`);
  }
}

function plan({ occurrence }: MapEventExecutionContext): MapEventPlanResult {
  const wind = readWindPlan(occurrence.event.parameters, `${occurrence.eventId}.parameters`);
  return {
    privatePlan: wind,
    publicPayload: {
      region: wind.region,
      impulseDirection: wind.impulsePerTick,
    },
  };
}

function tick({ privatePlan, actors }: MapEventExecutionContext): MapEventExecutionResult {
  const wind = readWindPlan(privatePlan, 'wind-zone privatePlan');
  const commands = [];
  for (const actor of actors) {
    if (!actor.eligible) continue;
    const { center, halfExtents } = wind.region;
    if (
      Math.abs(actor.position.x - center.x) <= halfExtents.x
      && Math.abs(actor.position.y - center.y) <= halfExtents.y
      && Math.abs(actor.position.z - center.z) <= halfExtents.z
    ) {
      commands.push({
        kind: MAP_RULE_COMMAND.APPLY_IMPULSE,
        participantId: actor.id,
        impulse: wind.impulsePerTick,
      });
    }
  }
  return { commands, events: [] };
}

function emptyResult(): MapEventExecutionResult {
  return { commands: [], events: [] };
}

export function createWindZoneStrategy(): Readonly<MapEventStrategy> {
  return Object.freeze({
    kind: MAP_EVENT_KIND.WIND_ZONE,
    validate,
    plan,
    start: emptyResult,
    tick,
    end: emptyResult,
  });
}
