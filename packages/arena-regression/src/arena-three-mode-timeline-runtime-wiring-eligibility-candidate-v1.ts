import {
  assertKnownKeys,
  assertPlainRecord,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import type {
  ModeKind,
} from '@number-strategy-jump/arena-definitions';
import {
  TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2,
  resolveTimelinePolicyRuntimeVariantV2,
  type TimelinePolicyVariantSelectorV2,
} from '@number-strategy-jump/arena-definitions';
import type {
  MatchModeTimelineRuntimeMirrorV1,
} from '@number-strategy-jump/arena-match';
import {
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_DUEL_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1,
} from './arena-duel-authoritative-runtime-candidate-v1.js';
import {
  ARENA_RACE_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1,
} from './arena-race-vertical-integration-verification-v1.js';
import {
  ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1,
  createArenaSurvivalTimelineRuntimeMirrorCandidateV1,
} from './arena-survival-shared-world-authority-verification-v1.js';
import {
  validateArenaThreeModeRuntimePolicyBindingCandidateV1,
  type ArenaThreeModeRuntimePolicyBindingCandidateV1,
} from './arena-three-mode-runtime-policy-binding-candidate-v1.js';

export type ArenaTimelineRuntimeMirrorFieldCandidateV1 =
  | 'preparingTicks'
  | 'hardLimitActiveTicks'
  | 'suddenDeathStartActiveTick';

export interface ArenaTimelineRuntimeVariantWiringEligibilityCandidateV1 {
  readonly variantId: string;
  readonly enemyCount: number | null;
  readonly selector: TimelinePolicyVariantSelectorV2;
  readonly policyMirror: MatchModeTimelineRuntimeMirrorV1;
  readonly runtimeMirror: MatchModeTimelineRuntimeMirrorV1;
  readonly mismatchedFields: readonly ArenaTimelineRuntimeMirrorFieldCandidateV1[];
  readonly aligned: boolean;
}

export interface ArenaModeTimelineRuntimeWiringEligibilityCandidateV1 {
  readonly modeKind: ModeKind;
  readonly modeDefinitionId: string;
  readonly timelinePolicyDefinitionId: string;
  readonly timelinePolicyContentVersion: 2;
  readonly variants: readonly ArenaTimelineRuntimeVariantWiringEligibilityCandidateV1[];
  readonly aligned: boolean;
}

export interface ArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly hardGate: false;
  readonly validationStatus: 'not-run';
  readonly balanceApprovalStatus: 'not-run';
  readonly registryContentHash: string;
  readonly runtimeMirrorsAligned: boolean;
  readonly alignmentStatus:
    | 'blocked-by-runtime-policy-mismatch'
    | 'awaiting-balance-approval';
  readonly mayWireRuntimeTimelinePolicy: false;
  readonly modes: readonly ArenaModeTimelineRuntimeWiringEligibilityCandidateV1[];
  readonly contentHash: string;
}

export interface ArenaThreeModeTimelineRuntimeWiringEligibilityOptionsCandidateV1 {
  readonly duel: unknown;
  readonly race: unknown;
  readonly survival: unknown;
}

const TIMELINE_FIELDS = Object.freeze([
  'preparingTicks',
  'hardLimitActiveTicks',
  'suddenDeathStartActiveTick',
] as const);
const OPTIONS_KEYS = new Set(['duel', 'race', 'survival']);

function options(
  value: unknown,
): ArenaThreeModeTimelineRuntimeWiringEligibilityOptionsCandidateV1 {
  const source = assertPlainRecord(
    value,
    'Arena three-mode timeline runtime wiring eligibility options',
  );
  assertKnownKeys(
    source,
    OPTIONS_KEYS,
    'Arena three-mode timeline runtime wiring eligibility options',
  );
  for (const key of OPTIONS_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(
        `Arena three-mode timeline runtime wiring eligibility options.${key}`
          + '必须是可枚举自有数据字段。',
      );
    }
  }
  return source as unknown as ArenaThreeModeTimelineRuntimeWiringEligibilityOptionsCandidateV1;
}

function policyMirror(
  binding: ArenaThreeModeRuntimePolicyBindingCandidateV1,
  selector: TimelinePolicyVariantSelectorV2,
): MatchModeTimelineRuntimeMirrorV1 {
  if (!Object.hasOwn(binding.bundle.timeline, 'variants')) {
    throw new RangeError('Arena Timeline接线资格必须消费Timeline Policy V2。');
  }
  const selected = resolveTimelinePolicyRuntimeVariantV2(
    binding.bundle.timeline,
    selector,
  );
  return Object.freeze({
    preparingTicks: selected.preparingTicks,
    hardLimitActiveTicks: selected.hardLimitActiveTicks,
    suddenDeathStartActiveTick: selected.suddenDeathStartActiveTick,
  });
}

function variant(
  variantId: string,
  enemyCount: number | null,
  selector: TimelinePolicyVariantSelectorV2,
  expected: MatchModeTimelineRuntimeMirrorV1,
  runtimeMirror: MatchModeTimelineRuntimeMirrorV1,
): ArenaTimelineRuntimeVariantWiringEligibilityCandidateV1 {
  const mismatchedFields = Object.freeze(TIMELINE_FIELDS.filter(
    (field) => runtimeMirror[field] !== expected[field],
  ));
  return Object.freeze({
    variantId,
    enemyCount,
    selector,
    policyMirror: expected,
    runtimeMirror: Object.freeze({ ...runtimeMirror }),
    mismatchedFields,
    aligned: mismatchedFields.length === 0,
  });
}

function mode(
  binding: ArenaThreeModeRuntimePolicyBindingCandidateV1,
  variants: readonly Readonly<{
    readonly variantId: string;
    readonly enemyCount: number | null;
    readonly selector: TimelinePolicyVariantSelectorV2;
    readonly runtimeMirror: MatchModeTimelineRuntimeMirrorV1;
  }>[],
): ArenaModeTimelineRuntimeWiringEligibilityCandidateV1 {
  const reports = Object.freeze(variants.map((candidate) => variant(
    candidate.variantId,
    candidate.enemyCount,
    candidate.selector,
    policyMirror(binding, candidate.selector),
    candidate.runtimeMirror,
  )));
  return Object.freeze({
    modeKind: binding.bundle.mode.kind,
    modeDefinitionId: binding.bundle.mode.id,
    timelinePolicyDefinitionId: binding.bundle.timeline.id,
    timelinePolicyContentVersion: 2,
    variants: reports,
    aligned: reports.every(({ aligned }) => aligned),
  });
}

/**
 * Reports whether the resolved Timeline Policies exactly mirror the values
 * consumed by every real three-mode runtime variant. This capability never
 * authorizes wiring by itself: balance approval remains an independent gate.
 */
export function createArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1(
  value: unknown,
): ArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1 {
  const source = options(value);
  const duel = validateArenaThreeModeRuntimePolicyBindingCandidateV1(
    source.duel,
    ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.duel,
    'duel',
  );
  const race = validateArenaThreeModeRuntimePolicyBindingCandidateV1(
    source.race,
    ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.race,
    'race',
  );
  const survival = validateArenaThreeModeRuntimePolicyBindingCandidateV1(
    source.survival,
    ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.survival,
    'survival',
  );
  if (duel.registryContentHash !== race.registryContentHash
    || duel.registryContentHash !== survival.registryContentHash) {
    throw new RangeError('Arena Timeline接线资格的三模式绑定必须来自同一Registry。');
  }
  const survivalPressure = survival.bundle.survivalPressure;
  if (survivalPressure === null) {
    throw new RangeError('Arena Survival timeline接线判定缺少resolved压力Policy。');
  }
  const modes = Object.freeze([
    mode(duel, Object.freeze([Object.freeze({
      variantId: 'duel-authoritative',
      enemyCount: null,
      selector: Object.freeze({
        kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.DEFAULT,
      }),
      runtimeMirror: ARENA_DUEL_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1,
    })])),
    mode(race, Object.freeze([Object.freeze({
      variantId: 'race-authoritative',
      enemyCount: null,
      selector: Object.freeze({
        kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.DEFAULT,
      }),
      runtimeMirror: ARENA_RACE_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1,
    })])),
    mode(survival, Object.freeze(
      ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1.map((enemyCount) => Object.freeze({
        variantId: `survival-authoritative-enemy-${enemyCount}`,
        enemyCount,
        selector: Object.freeze({
          kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT,
          enemyCount,
        }),
        runtimeMirror: createArenaSurvivalTimelineRuntimeMirrorCandidateV1(enemyCount),
      })),
    )),
  ]);
  const runtimeMirrorsAligned = modes.every(({ aligned }) => aligned);
  const body = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    validationStatus: 'not-run' as const,
    balanceApprovalStatus: 'not-run' as const,
    registryContentHash: duel.registryContentHash,
    runtimeMirrorsAligned,
    alignmentStatus: runtimeMirrorsAligned
      ? 'awaiting-balance-approval' as const
      : 'blocked-by-runtime-policy-mismatch' as const,
    mayWireRuntimeTimelinePolicy: false as const,
    modes,
  });
  return Object.freeze({
    ...body,
    contentHash: createDeterministicDataHash(
      body,
      'Arena three-mode timeline runtime wiring eligibility candidate V1',
    ),
  });
}

export const ARENA_THREE_MODE_TIMELINE_RUNTIME_WIRING_ELIGIBILITY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    validationStatus: 'not-run' as const,
    balanceApprovalStatus: 'not-run' as const,
    readsOnlyAuthoritativeRuntimeMirrors: true as const,
    callerCannotSubmitRuntimeMirrors: true as const,
    coversEverySupportedSurvivalEnemyCount: true as const,
    exactMismatchFieldsReported: true as const,
    requiresSingleRegistryIdentity: true as const,
    mayWireRuntimeTimelinePolicy: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
  });
