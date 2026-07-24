import {
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  createCharacterDefinition,
} from '@number-strategy-jump/arena-definitions';
import { CharacterRegistry } from '@number-strategy-jump/arena-definitions';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  compileJumpImpulseFromHeight,
} from '@number-strategy-jump/arena-definitions';

const CHARACTER_TUNING = ARENA_GAMEPLAY_V2_TUNING.character;

function character(value: Readonly<{ id: string }>) {
  return createCharacterDefinition({
    schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
    collision: {
      ...CHARACTER_TUNING.collision,
    },
    movement: {
      ...CHARACTER_TUNING.movement,
    },
    jump: {
      groundImpulse: compileJumpImpulseFromHeight(
        CHARACTER_TUNING.jump.targetGroundHeight,
      ),
      crouchImpulse: compileJumpImpulseFromHeight(
        CHARACTER_TUNING.jump.targetChargedHeight,
      ),
      airImpulse: compileJumpImpulseFromHeight(
        CHARACTER_TUNING.jump.targetAirHeight,
      ),
      downSmashSpeed: CHARACTER_TUNING.jump.downAttackStartSpeed,
      downSmashAccelerationPerTick: CHARACTER_TUNING.jump.downAttackAccelerationPerTick,
      maximumDownSmashSpeed: CHARACTER_TUNING.jump.maximumDownAttackSpeed,
      coyoteTicks: CHARACTER_TUNING.jump.coyoteTicks,
      bufferTicks: CHARACTER_TUNING.jump.bufferTicks,
      maximumAirJumps: CHARACTER_TUNING.jump.maximumAirJumps,
      maximumCrouchChargeTicks: CHARACTER_TUNING.jump.maximumCrouchChargeTicks,
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
