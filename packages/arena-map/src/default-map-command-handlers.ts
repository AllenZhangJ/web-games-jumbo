import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import type { Vector3Definition } from '@number-strategy-jump/arena-definitions';
import {
  MapCommandRegistry,
  type MapCommandHandler,
  type MapRuleCommand,
} from './map-command-registry.js';
import { MAP_RULE_COMMAND } from './map-event-types.js';

const METADATA_KEYS = Object.freeze([
  'occurrenceId',
  'mapEventId',
  'mapEventKind',
  'phase',
  'sequence',
]);
const COMMAND_PHASES: ReadonlySet<string> = new Set(['start', 'tick', 'end']);
const VECTOR_AXES = ['x', 'y', 'z'] as const;
const VECTOR_KEYS = new Set(VECTOR_AXES);
const APPLY_IMPULSE_KEYS = new Set([
  'kind',
  'participantId',
  'impulse',
  ...METADATA_KEYS,
]);
const SET_SURFACE_ENABLED_KEYS = new Set([
  'kind',
  'surfaceId',
  'enabled',
  ...METADATA_KEYS,
]);
const SPAWN_EQUIPMENT_KEYS = new Set([
  'kind',
  'instanceId',
  'definitionId',
  'spawnId',
  'position',
  ...METADATA_KEYS,
]);

function validateVector(value: unknown, name: string): Vector3Definition {
  assertKnownKeys(value, VECTOR_KEYS, name);
  const vector = { x: 0, y: 0, z: 0 };
  for (const axis of VECTOR_AXES) {
    const component = value[axis];
    if (!Number.isFinite(component)) throw new TypeError(`${name}.${axis} 必须是有限数。`);
    vector[axis] = component as number;
  }
  return Object.freeze(vector);
}

function validateMetadata(
  command: unknown,
  allowedKeys: ReadonlySet<string>,
  name: string,
): asserts command is MapRuleCommand {
  assertKnownKeys(command, allowedKeys, name);
  assertNonEmptyString(command.kind, `${name}.kind`);
  assertNonEmptyString(command.occurrenceId, `${name}.occurrenceId`);
  assertNonEmptyString(command.mapEventId, `${name}.mapEventId`);
  assertNonEmptyString(command.mapEventKind, `${name}.mapEventKind`);
  if (typeof command.phase !== 'string' || !COMMAND_PHASES.has(command.phase)) {
    throw new RangeError(`${name}.phase 无效。`);
  }
  assertIntegerAtLeast(command.sequence, 0, `${name}.sequence`);
}

function readString(command: MapRuleCommand, key: string): string {
  return command[key] as string;
}

export function createDefaultMapCommandRegistry(): MapCommandRegistry {
  const handlers: readonly MapCommandHandler[] = [
    {
      kind: MAP_RULE_COMMAND.APPLY_IMPULSE,
      validate(command, name) {
        validateMetadata(command, APPLY_IMPULSE_KEYS, name);
        assertNonEmptyString(command.participantId, `${name}.participantId`);
        validateVector(command.impulse, `${name}.impulse`);
      },
      execute(command, { ports }) {
        ports.applyImpulse(
          readString(command, 'participantId'),
          validateVector(command.impulse, 'map apply impulse command.impulse'),
        );
      },
    },
    {
      kind: MAP_RULE_COMMAND.SET_SURFACE_ENABLED,
      validate(command, name) {
        validateMetadata(command, SET_SURFACE_ENABLED_KEYS, name);
        assertNonEmptyString(command.surfaceId, `${name}.surfaceId`);
        if (typeof command.enabled !== 'boolean') {
          throw new TypeError(`${name}.enabled 必须是布尔值。`);
        }
      },
      execute(command, { ports }) {
        ports.setSurfaceEnabled(
          readString(command, 'surfaceId'),
          command.enabled as boolean,
        );
      },
    },
    {
      kind: MAP_RULE_COMMAND.SPAWN_EQUIPMENT,
      validate(command, name) {
        validateMetadata(command, SPAWN_EQUIPMENT_KEYS, name);
        assertNonEmptyString(command.instanceId, `${name}.instanceId`);
        assertNonEmptyString(command.definitionId, `${name}.definitionId`);
        assertNonEmptyString(command.spawnId, `${name}.spawnId`);
        validateVector(command.position, `${name}.position`);
      },
      execute(command, { ports }) {
        ports.spawnEquipment(Object.freeze({
          instanceId: readString(command, 'instanceId'),
          definitionId: readString(command, 'definitionId'),
          spawnId: readString(command, 'spawnId'),
          position: validateVector(command.position, 'map spawn equipment command.position'),
        }));
      },
    },
  ];
  return new MapCommandRegistry(handlers);
}
