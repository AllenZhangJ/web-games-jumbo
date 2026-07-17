import { MAP_RULE_COMMAND } from './map-event-types.js';
import { MapCommandRegistry } from './map-command-registry.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '../rules/definition-utils.js';

const METADATA_KEYS = Object.freeze([
  'occurrenceId',
  'mapEventId',
  'mapEventKind',
  'phase',
  'sequence',
]);
const COMMAND_PHASES = new Set(['start', 'tick', 'end']);
const POSITION_KEYS = new Set(['x', 'y', 'z']);
const IMPULSE_KEYS = new Set(['x', 'y', 'z']);
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

function validateVector(value, allowedKeys, name) {
  assertKnownKeys(value, allowedKeys, name);
  for (const axis of allowedKeys) {
    if (!Number.isFinite(value[axis])) throw new TypeError(`${name}.${axis} 必须是有限数。`);
  }
}

function validateMetadata(command, allowedKeys, name) {
  assertKnownKeys(command, allowedKeys, name);
  assertNonEmptyString(command.kind, `${name}.kind`);
  assertNonEmptyString(command.occurrenceId, `${name}.occurrenceId`);
  assertNonEmptyString(command.mapEventId, `${name}.mapEventId`);
  assertNonEmptyString(command.mapEventKind, `${name}.mapEventKind`);
  if (!COMMAND_PHASES.has(command.phase)) throw new RangeError(`${name}.phase 无效。`);
  assertIntegerAtLeast(command.sequence, 0, `${name}.sequence`);
}

export function createDefaultMapCommandRegistry() {
  return new MapCommandRegistry([
    {
      kind: MAP_RULE_COMMAND.APPLY_IMPULSE,
      validate(command, name) {
        validateMetadata(command, APPLY_IMPULSE_KEYS, name);
        assertNonEmptyString(command.participantId, `${name}.participantId`);
        validateVector(command.impulse, IMPULSE_KEYS, `${name}.impulse`);
      },
      execute(command, { ports }) {
        ports.applyImpulse(command.participantId, command.impulse);
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
        ports.setSurfaceEnabled(command.surfaceId, command.enabled);
      },
    },
    {
      kind: MAP_RULE_COMMAND.SPAWN_EQUIPMENT,
      validate(command, name) {
        validateMetadata(command, SPAWN_EQUIPMENT_KEYS, name);
        assertNonEmptyString(command.instanceId, `${name}.instanceId`);
        assertNonEmptyString(command.definitionId, `${name}.definitionId`);
        assertNonEmptyString(command.spawnId, `${name}.spawnId`);
        validateVector(command.position, POSITION_KEYS, `${name}.position`);
      },
      execute(command, { ports }) {
        ports.spawnEquipment({
          instanceId: command.instanceId,
          definitionId: command.definitionId,
          spawnId: command.spawnId,
          position: command.position,
        });
      },
    },
  ]);
}
