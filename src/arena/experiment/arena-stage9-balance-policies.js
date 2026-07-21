import {
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_ID,
} from '../content/stage4-equipment.js';
import { assertIntegerAtLeast } from '@number-strategy-jump/arena-contracts';
import {
  createArenaBotCapabilityGatePolicyDefinition,
} from './arena-bot-capability-metrics.js';
import {
  ARENA_BALANCE_POLICY_SCHEMA_VERSION,
  createArenaBalancePolicy,
} from './arena-balance-policy.js';

export const ARENA_STAGE9_BALANCE_BASELINE_CASE_COUNT = 300;

const POLICY_TEMPLATE = Object.freeze({
  schemaVersion: ARENA_BALANCE_POLICY_SCHEMA_VERSION,
  duration: Object.freeze({
    targetMinimumTicks: 7_200,
    targetMaximumTicks: 10_800,
    minimumTargetShare: 0.6,
    ultraShortMaximumTicks: 2_700,
    maximumUltraShortShare: 0.1,
    maximumTimeoutShare: 0.65,
  }),
  equipment: Object.freeze({
    actionBindings: Object.freeze([
      Object.freeze({
        equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
        actionDefinitionId: STAGE4_ACTION_ID.CHAIN_PULL,
      }),
      Object.freeze({
        equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
        actionDefinitionId: STAGE4_ACTION_ID.HAMMER_SMASH,
      }),
      Object.freeze({
        equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
        actionDefinitionId: STAGE4_ACTION_ID.SHIELD_CHARGE,
      }),
    ]),
    minimumPickupsPerDefinition: 100,
    minimumActionsPerDefinition: 100,
    minimumHitsPerDefinition: 10,
    minimumPickupSharePerDefinition: 0.15,
    maximumPickupSharePerDefinition: 0.5,
    minimumActionSharePerDefinition: 0.05,
    maximumActionSharePerDefinition: 0.75,
    minimumHitSharePerDefinition: 0.01,
    maximumHitSharePerDefinition: 0.85,
  }),
  elimination: Object.freeze({
    minimumCreditedShare: 0.4,
    minimumEquipmentAttributedShare: 0.05,
    maximumEquipmentAttributedShare: 0.8,
    minimumEnvironmentShare: 0.05,
  }),
});

const BOT_GATE_TEMPLATE = Object.freeze({
  maximumAverageUncreditedDeaths: 0.5,
  minimumCapabilityIndexDelta: 0.25,
  minimumLifePressureDelta: 0.05,
  scoreRateToleranceScale: 0.5,
});

function scaledMinimum(baselineValue, completedPairedCases) {
  return Math.max(
    1,
    Math.ceil(
      baselineValue * completedPairedCases / ARENA_STAGE9_BALANCE_BASELINE_CASE_COUNT,
    ),
  );
}

export function createArenaStage9BalancePolicy(completedPairedCasesValue) {
  const completedPairedCases = assertIntegerAtLeast(
    completedPairedCasesValue,
    1,
    'Arena Stage 9 balance completedPairedCases',
  );
  return createArenaBalancePolicy({
    ...POLICY_TEMPLATE,
    minimumCompletedPairedCases: completedPairedCases,
    equipment: {
      ...POLICY_TEMPLATE.equipment,
      minimumPickupsPerDefinition: scaledMinimum(100, completedPairedCases),
      minimumActionsPerDefinition: scaledMinimum(100, completedPairedCases),
      minimumHitsPerDefinition: scaledMinimum(10, completedPairedCases),
    },
  });
}

export function createArenaStage9BalanceBotGatePolicy(completedPairedCasesValue) {
  const completedPairedCases = assertIntegerAtLeast(
    completedPairedCasesValue,
    1,
    'Arena Stage 9 balance Bot completedPairedCases',
  );
  return createArenaBotCapabilityGatePolicyDefinition({
    ...BOT_GATE_TEMPLATE,
    minimumCompletedPairedCases: completedPairedCases,
  });
}

export const ARENA_STAGE9_BALANCE_POLICY_V1 =
  createArenaStage9BalancePolicy(ARENA_STAGE9_BALANCE_BASELINE_CASE_COUNT);

export const ARENA_STAGE9_BALANCE_BOT_GATE_POLICY_V1 =
  createArenaStage9BalanceBotGatePolicy(ARENA_STAGE9_BALANCE_BASELINE_CASE_COUNT);
