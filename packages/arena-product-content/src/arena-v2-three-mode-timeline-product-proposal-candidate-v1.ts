import {
  MODE_KIND,
  TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2,
  createTimelinePolicyDefinition,
  resolveTimelinePolicyRuntimeVariantV2,
  type ModeKind,
  type TimelinePolicyDefinitionV2,
  type TimelinePolicyRuntimeVariantV2,
  type TimelinePolicyVariantSelectorV2,
} from '@number-strategy-jump/arena-definitions';
import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const SOURCE = 'preserved-current-runtime-values' as const;

function timeline(value: unknown): TimelinePolicyDefinitionV2 {
  const definition = createTimelinePolicyDefinition(value);
  if (!Object.hasOwn(definition, 'variants')) {
    throw new RangeError('Arena V2 Timeline product proposal必须是contentVersion=2。');
  }
  return definition as TimelinePolicyDefinitionV2;
}

const DUEL = timeline({
  schemaVersion: 1,
  id: 'arena-v2.mode-policy.duel.timeline.preserved-current-runtime-values.candidate.v2',
  contentVersion: 2,
  modeKind: MODE_KIND.DUEL,
  variants: [{
    selector: { kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.DEFAULT },
    preparingTicks: 30,
    hardLimitActiveTicks: 3_600,
    suddenDeathStartActiveTick: 1_800,
  }],
});

const RACE = timeline({
  schemaVersion: 1,
  id: 'arena-v2.mode-policy.race.timeline.preserved-current-runtime-values.candidate.v2',
  contentVersion: 2,
  modeKind: MODE_KIND.RACE,
  variants: [{
    selector: { kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.DEFAULT },
    preparingTicks: 60,
    hardLimitActiveTicks: 5_940,
    suddenDeathStartActiveTick: null,
  }],
});

const SURVIVAL = timeline({
  schemaVersion: 1,
  id: 'arena-v2.mode-policy.survival.timeline.preserved-current-runtime-values.candidate.v2',
  contentVersion: 2,
  modeKind: MODE_KIND.SURVIVAL,
  variants: [
    {
      selector: {
        kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT,
        enemyCount: 1,
      },
      preparingTicks: 0,
      hardLimitActiveTicks: 4_930,
      suddenDeathStartActiveTick: null,
    },
    {
      selector: {
        kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT,
        enemyCount: 4,
      },
      preparingTicks: 0,
      hardLimitActiveTicks: 6_130,
      suddenDeathStartActiveTick: null,
    },
    {
      selector: {
        kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT,
        enemyCount: 8,
      },
      preparingTicks: 0,
      hardLimitActiveTicks: 9_730,
      suddenDeathStartActiveTick: null,
    },
    {
      selector: {
        kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT,
        enemyCount: 12,
      },
      preparingTicks: 0,
      hardLimitActiveTicks: 12_130,
      suddenDeathStartActiveTick: null,
    },
    {
      selector: {
        kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT,
        enemyCount: 16,
      },
      preparingTicks: 0,
      hardLimitActiveTicks: 13_330,
      suddenDeathStartActiveTick: null,
    },
  ],
});

const POLICY_DEFINITIONS = Object.freeze({
  duel: DUEL,
  race: RACE,
  survival: SURVIVAL,
});

const POLICY_CONTENT_HASHES = Object.freeze({
  duel: createDeterministicDataHash(DUEL, 'Arena V2 Duel Timeline product proposal'),
  race: createDeterministicDataHash(RACE, 'Arena V2 Race Timeline product proposal'),
  survival: createDeterministicDataHash(SURVIVAL, 'Arena V2 Survival Timeline product proposal'),
});

const BODY = Object.freeze({
  schemaVersion: ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  validationStatus: 'not-run' as const,
  proposalStatus: 'proposed-not-approved' as const,
  balanceApprovalStatus: 'not-run' as const,
  source: SOURCE,
  timelineRuntimePolicyConsumptionWired: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  policyDefinitions: POLICY_DEFINITIONS,
  policyContentHashes: POLICY_CONTENT_HASHES,
});

export const ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1 = Object.freeze({
  ...BODY,
  contentHash: createDeterministicDataHash(
    BODY,
    'Arena V2 three-mode Timeline product proposal candidate V1',
  ),
});

export const ARENA_V2_DUEL_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2 = DUEL;
export const ARENA_V2_RACE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2 = RACE;
export const ARENA_V2_SURVIVAL_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2 = SURVIVAL;

export function resolveArenaV2ThreeModeTimelineProductProposalVariantCandidateV1(
  modeKind: ModeKind,
  selector: TimelinePolicyVariantSelectorV2,
): TimelinePolicyRuntimeVariantV2 {
  return resolveTimelinePolicyRuntimeVariantV2(POLICY_DEFINITIONS[modeKind], selector);
}
