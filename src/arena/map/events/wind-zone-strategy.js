import {
  assertKnownKeys,
  assertPositiveFinite,
} from '../../rules/definition-utils.js';
import { MAP_EVENT_KIND, MAP_RULE_COMMAND } from '../map-event-types.js';

const WIND_KEYS = new Set(['region', 'impulsePerTick']);
const REGION_KEYS = new Set(['center', 'halfExtents']);
const VECTOR_KEYS = new Set(['x', 'y', 'z']);

function cloneVector(value, name, { positive = false } = {}) {
  assertKnownKeys(value, VECTOR_KEYS, name);
  const result = {};
  for (const axis of VECTOR_KEYS) {
    if (!Number.isFinite(value[axis])) throw new TypeError(`${name}.${axis} 必须是有限数。`);
    if (positive) assertPositiveFinite(value[axis], `${name}.${axis}`);
    result[axis] = value[axis];
  }
  return Object.freeze(result);
}

function validate({ event }) {
  assertKnownKeys(event.parameters, WIND_KEYS, `${event.id}.parameters`);
  assertKnownKeys(event.parameters.region, REGION_KEYS, `${event.id}.parameters.region`);
  cloneVector(event.parameters.region.center, `${event.id}.parameters.region.center`);
  cloneVector(
    event.parameters.region.halfExtents,
    `${event.id}.parameters.region.halfExtents`,
    { positive: true },
  );
  const impulse = cloneVector(event.parameters.impulsePerTick, `${event.id}.impulsePerTick`);
  if (Math.hypot(impulse.x, impulse.y, impulse.z) <= 1e-9) {
    throw new RangeError(`${event.id}.impulsePerTick 不能为零。`);
  }
  if (event.schedule.durationTicks === 0) {
    throw new RangeError(`${event.id} wind-zone 必须有正 durationTicks。`);
  }
}

function plan({ occurrence }) {
  const { region, impulsePerTick } = occurrence.event.parameters;
  return {
    privatePlan: { region, impulsePerTick },
    publicPayload: { region, impulseDirection: impulsePerTick },
  };
}

function tick({ privatePlan, actors }) {
  const commands = [];
  for (const actor of actors) {
    if (!actor.eligible) continue;
    const { center, halfExtents } = privatePlan.region;
    if (
      Math.abs(actor.position.x - center.x) <= halfExtents.x
      && Math.abs(actor.position.y - center.y) <= halfExtents.y
      && Math.abs(actor.position.z - center.z) <= halfExtents.z
    ) {
      commands.push({
        kind: MAP_RULE_COMMAND.APPLY_IMPULSE,
        participantId: actor.id,
        impulse: privatePlan.impulsePerTick,
      });
    }
  }
  return { commands, events: [] };
}

function emptyResult() {
  return { commands: [], events: [] };
}

export function createWindZoneStrategy() {
  return Object.freeze({
    kind: MAP_EVENT_KIND.WIND_ZONE,
    validate,
    plan,
    start: emptyResult,
    tick,
    end: emptyResult,
  });
}
