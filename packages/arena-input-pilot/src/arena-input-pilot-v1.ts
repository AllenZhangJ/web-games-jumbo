import { ARENA_INPUT_MAPPER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import {
  INPUT_PILOT_DEFINITION_SCHEMA_VERSION,
  createInputPilotDefinition,
} from './input-pilot-definition.js';

export const ARENA_INPUT_PILOT_V1_ID = 'arena.input-mapper-pilot.v1';

export const ARENA_INPUT_PILOT_VARIANT_ID = Object.freeze({
  GESTURE_MOBILITY: 'variant-a',
  CONTEXT_PRIMARY: 'variant-b',
} as const);

export function createArenaInputPilotV1Definition() {
  return createInputPilotDefinition({
    schemaVersion: INPUT_PILOT_DEFINITION_SCHEMA_VERSION,
    id: ARENA_INPUT_PILOT_V1_ID,
    taskPrompt: '移动并把对手击出平台',
    assignmentSeed: 0x66060001,
    variants: [
      {
        id: ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY,
        mapperId: ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY,
      },
      {
        id: ARENA_INPUT_PILOT_VARIANT_ID.CONTEXT_PRIMARY,
        mapperId: ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY,
      },
    ],
    environment: {
      platform: 'web',
      formFactor: 'phone',
      orientation: 'portrait',
      inputMode: 'touch',
    },
    thresholds: {
      minimumEligibleSamplesPerVariant: 5,
      successWindowMs: 10_000,
      maximumTrialDurationMs: 180_000,
      effectiveMovementDistance: 0.05,
      targetSuccessRate: 0.8,
      winnerMarginRate: 0.1,
    },
  });
}
