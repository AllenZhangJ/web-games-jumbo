import {
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  createCharacterDefinition,
} from '../character/character-definition.js';
import { CharacterRegistry } from '../character/character-registry.js';
import { ARENA_V1_CHARACTER_ID } from './arena-v1-character-ids.js';

function character(value) {
  return createCharacterDefinition({
    schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
    collision: { radius: 0.45, halfHeight: 0.55, mass: 1 },
    movement: {
      walkSpeed: 3.2,
      runSpeed: 6,
      runInputThreshold: 0.65,
      groundAcceleration: 42,
      airAcceleration: 14,
      maximumHorizontalSpeed: 18,
      automaticStepHeight: 0.35,
    },
    jump: {
      groundImpulse: 7.5,
      crouchImpulse: 9.5,
      airImpulse: 7,
      downSmashSpeed: 16,
      coyoteTicks: 6,
      bufferTicks: 6,
      maximumAirJumps: 1,
      maximumCrouchChargeTicks: 24,
    },
    tags: ['arena-v1', 'balanced'],
    ...value,
  });
}

export const ARENA_V1_CHARACTER_DEFINITIONS = Object.freeze([
  character({
    id: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
  }),
  character({
    id: ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
  }),
]);

export function createArenaV1CharacterRegistry() {
  return new CharacterRegistry(ARENA_V1_CHARACTER_DEFINITIONS);
}
