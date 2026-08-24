import {
  ARENA_GAMEPLAY_V2_TUNING,
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  compileJumpImpulseFromHeight,
  createCharacterDefinition,
} from '@number-strategy-jump/arena-definitions';

export const ARENA_V2_KZ_VERIFICATION_CHARACTER_CANDIDATE_ID =
  'arena-v2-kz-verification-character.candidate.v1';

const CHARACTER_TUNING = ARENA_GAMEPLAY_V2_TUNING.character;

export const ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1 =
  createCharacterDefinition({
    schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
    id: ARENA_V2_KZ_VERIFICATION_CHARACTER_CANDIDATE_ID,
    collision: CHARACTER_TUNING.collision,
    movement: CHARACTER_TUNING.movement,
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
      downSmashAccelerationPerTick:
        CHARACTER_TUNING.jump.downAttackAccelerationPerTick,
      maximumDownSmashSpeed: CHARACTER_TUNING.jump.maximumDownAttackSpeed,
      coyoteTicks: CHARACTER_TUNING.jump.coyoteTicks,
      bufferTicks: CHARACTER_TUNING.jump.bufferTicks,
      maximumAirJumps: CHARACTER_TUNING.jump.maximumAirJumps,
      maximumCrouchChargeTicks:
        CHARACTER_TUNING.jump.maximumCrouchChargeTicks,
    },
    tags: ['arena-v2', 'kz', 'verification-candidate'],
  });

export const ARENA_V2_KZ_VERIFICATION_CHARACTER_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  definition: ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
});
