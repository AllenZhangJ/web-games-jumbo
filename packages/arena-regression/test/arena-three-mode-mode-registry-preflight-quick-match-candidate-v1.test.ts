import { describe, expect, it } from 'vitest';
import {
  MODE_CONTROLLER_KIND,
  MODE_FALL_DISPOSITION,
  MODE_KIND,
  MODE_POLICY_DEFINITION_SCHEMA_VERSION,
  MODE_RELATIONSHIP,
  MODE_RESPAWN_ANCHOR_POLICY_KIND,
  MODE_ROLE,
  MODE_SLOT_RULE_KIND,
  MODE_TEAM_RULE_KIND,
  ModeRegistry,
  resolveTimelinePolicyRuntimeVariantV2,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
  ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
  ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
  ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_ENEMY_SLOT_IDS_CANDIDATE_V1,
  ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1,
  createArenaV2ThreeModeRegistryCandidateV1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
  ArenaV2LearningSettlementIntentJournalCandidateV1,
  ArenaV2LearningSettlementRecoveryOwnerCandidateV1,
  ArenaV2ModeLearningSessionFactoryCandidateV1,
  ArenaV2ProfileServicesOwnerCandidateV1,
  ArenaV2QuickMatchBundleFactoryCandidateV1,
} from '@number-strategy-jump/arena-product-composition';
import {
  ArenaV2OfflineRetentionObservationJournalCandidateV1,
  createArenaV2ThreeModeRewardRegistryCandidateV1,
  type ArenaV2RetentionObservationV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_THREE_MODE_AUTHORITATIVE_QUICK_MATCH_COMPOSITION_CANDIDATE_V1,
  ARENA_THREE_MODE_MODE_REGISTRY_PREFLIGHT_QUICK_MATCH_FACTORY_CANDIDATE_V1,
  ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1,
  ArenaThreeModeAuthoritativeInformationHostCandidateV1,
  ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
  ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1,
  ArenaThreeModeAuthoritativePlayableHostConstructionCleanupFailureCandidateV1,
  ArenaThreeModeAuthoritativePlayableHostCandidateV1,
  ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1,
  createArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1,
  preflightArenaThreeModeModeRegistryCandidateV1,
} from '../src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.js';
import {
  createArenaThreeModeRuntimePolicyBindingCandidateV1,
  projectArenaRuntimeTimelinePolicyResolverBundleCandidateV1,
  projectArenaRuntimeTimelinePolicyResolverBundleCandidateV2,
} from '../src/arena-three-mode-runtime-policy-binding-candidate-v1.js';
import {
  createArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1,
} from '../src/arena-three-mode-timeline-runtime-wiring-eligibility-candidate-v1.js';

type DataRecord = Record<string, unknown>;
type TestModeKind = 'duel' | 'race' | 'survival';

const ROUTE = ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2;

function envelope(kind: TestModeKind, type: string): DataRecord {
  return {
    schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
    id: `arena-v2.mode-policy.${kind}.${type}.preflight-fixture.candidate.v1`,
    contentVersion: 1,
    modeKind: kind,
  };
}

function participantPolicy(kind: TestModeKind): DataRecord {
  if (kind === MODE_KIND.SURVIVAL) {
    return {
      ...envelope(kind, 'participant'),
      minimumParticipants: 2,
      maximumParticipants: 17,
      roles: [{
        modeRole: MODE_ROLE.PLAYER,
        minimumCount: 1,
        maximumCount: 1,
        allowedControllerKinds: [MODE_CONTROLLER_KIND.HUMAN],
        teamRule: { kind: MODE_TEAM_RULE_KIND.NONE },
        slotRule: { kind: MODE_SLOT_RULE_KIND.NONE },
      }, {
        modeRole: MODE_ROLE.ENEMY,
        minimumCount: 1,
        maximumCount: 16,
        allowedControllerKinds: [MODE_CONTROLLER_KIND.BOT],
        teamRule: { kind: MODE_TEAM_RULE_KIND.NONE },
        slotRule: {
          kind: MODE_SLOT_RULE_KIND.FIXED,
          slotIds: ARENA_V2_SURVIVAL_ENEMY_SLOT_IDS_CANDIDATE_V1,
        },
      }],
      controllerKindBounds: [{
        controllerKind: MODE_CONTROLLER_KIND.HUMAN,
        minimumCount: 1,
        maximumCount: 1,
      }, {
        controllerKind: MODE_CONTROLLER_KIND.BOT,
        minimumCount: 1,
        maximumCount: 16,
      }],
    };
  }
  const maximumParticipants = kind === MODE_KIND.DUEL ? 2 : 4;
  return {
    ...envelope(kind, 'participant'),
    minimumParticipants: 2,
    maximumParticipants,
    roles: [{
      modeRole: MODE_ROLE.COMPETITOR,
      minimumCount: 2,
      maximumCount: maximumParticipants,
      allowedControllerKinds: [MODE_CONTROLLER_KIND.HUMAN, MODE_CONTROLLER_KIND.BOT],
      teamRule: { kind: MODE_TEAM_RULE_KIND.NONE },
      slotRule: { kind: MODE_SLOT_RULE_KIND.NONE },
    }],
    controllerKindBounds: [{
      controllerKind: MODE_CONTROLLER_KIND.HUMAN,
      minimumCount: 1,
      maximumCount: maximumParticipants,
    }, {
      controllerKind: MODE_CONTROLLER_KIND.BOT,
      minimumCount: 0,
      maximumCount: kind === MODE_KIND.DUEL ? 1 : 3,
    }],
  };
}

function timelinePolicy(kind: TestModeKind): DataRecord {
  return structuredClone(
    ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1.policyDefinitions[kind],
  ) as unknown as DataRecord;
}

function objectivePolicy(kind: TestModeKind): DataRecord {
  const objective = kind === MODE_KIND.DUEL
    ? { kind, timeoutPolicy: 'score-or-draw' }
    : kind === MODE_KIND.RACE
      ? {
        kind,
        finishGateCapabilityId: ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
        validClaimEndPolicy: 'claim-tick',
        sameTickRankPolicy: 'shared-rank-1',
        hardLimitPolicy: 'no-finisher',
      }
      : { kind, terminalPlayerFallCount: 2, hardLimitPolicy: 'survival-time-cap' };
  return { ...envelope(kind, 'objective'), objective };
}

function eliminationPolicy(kind: TestModeKind): DataRecord {
  const roleDispositions = kind === MODE_KIND.DUEL
    ? [{ modeRole: MODE_ROLE.COMPETITOR, fallDisposition: MODE_FALL_DISPOSITION.ELIMINATE }]
    : kind === MODE_KIND.RACE
      ? [{
        modeRole: MODE_ROLE.COMPETITOR,
        fallDisposition: MODE_FALL_DISPOSITION.SCHEDULE_RESPAWN,
      }]
      : [{
        modeRole: MODE_ROLE.PLAYER,
        fallDisposition: MODE_FALL_DISPOSITION.COUNT_FOR_OBJECTIVE,
      }, {
        modeRole: MODE_ROLE.ENEMY,
        fallDisposition: MODE_FALL_DISPOSITION.DEACTIVATE_SLOT,
      }];
  return { ...envelope(kind, 'elimination'), roleDispositions };
}

function respawnPolicy(kind: TestModeKind): DataRecord {
  if (kind === MODE_KIND.DUEL) {
    return {
      ...envelope(kind, 'respawn'),
      rolePolicies: [{
        modeRole: MODE_ROLE.COMPETITOR,
        enabled: false,
        delayTicks: 0,
        maximumRespawns: 0,
        anchorPolicy: { kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.DISABLED },
        protectionTicks: 0,
      }],
    };
  }
  if (kind === MODE_KIND.RACE) {
    return {
      ...envelope(kind, 'respawn'),
      id: ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.respawnPolicyDefinition.id,
      rolePolicies: [{
        modeRole: MODE_ROLE.COMPETITOR,
        enabled: true,
        delayTicks: 180,
        maximumRespawns: null,
        anchorPolicy: {
          kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.LATEST_VALID_SAFE_ANCHOR,
          fallbackAnchorCapabilityId:
            ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId,
        },
        protectionTicks: ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks,
      }],
    };
  }
  return {
    ...envelope(kind, 'respawn'),
    id: ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1
      .respawnPolicyDefinition.id,
    rolePolicies: [{
      modeRole: MODE_ROLE.PLAYER,
      enabled: true,
      delayTicks: ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.delayTicks,
      maximumRespawns: 1,
      anchorPolicy: {
        kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.FIXED_ANCHOR,
        anchorCapabilityId:
          ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId,
      },
      protectionTicks:
        ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks,
    }, {
      modeRole: MODE_ROLE.ENEMY,
      enabled: false,
      delayTicks: 0,
      maximumRespawns: 0,
      anchorPolicy: { kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.DISABLED },
      protectionTicks: 0,
    }],
  };
}

function relationshipPolicy(kind: TestModeKind): DataRecord {
  const relations = kind === MODE_KIND.SURVIVAL
    ? [{
      sourceRole: MODE_ROLE.PLAYER,
      targetRole: MODE_ROLE.PLAYER,
      relationship: MODE_RELATIONSHIP.NEUTRAL,
    }, {
      sourceRole: MODE_ROLE.PLAYER,
      targetRole: MODE_ROLE.ENEMY,
      relationship: MODE_RELATIONSHIP.HOSTILE,
    }, {
      sourceRole: MODE_ROLE.ENEMY,
      targetRole: MODE_ROLE.PLAYER,
      relationship: MODE_RELATIONSHIP.HOSTILE,
    }, {
      sourceRole: MODE_ROLE.ENEMY,
      targetRole: MODE_ROLE.ENEMY,
      relationship: MODE_RELATIONSHIP.NEUTRAL,
    }]
    : [{
      sourceRole: MODE_ROLE.COMPETITOR,
      targetRole: MODE_ROLE.COMPETITOR,
      relationship: MODE_RELATIONSHIP.HOSTILE,
    }];
  return { ...envelope(kind, 'relationship'), selfTargeting: 'forbidden', relations };
}

function resultPolicy(kind: TestModeKind): DataRecord {
  const result = kind === MODE_KIND.DUEL
    ? {
      allowedReasons: [
        'last-participant-standing',
        'simultaneous-elimination',
        'timeout-draw',
        'timeout-score',
      ],
      projectionPolicy: 'winner-ids-draw',
    }
    : kind === MODE_KIND.RACE
      ? {
        allowedReasons: ['finish-claimed', 'no-finisher'],
        projectionPolicy: 'finish-then-progress-with-ties',
      }
      : {
        allowedReasons: ['survival-time-cap', 'terminal-player-fall'],
        projectionPolicy: 'ticks-stage-falls',
      };
  return { ...envelope(kind, 'result'), resultKind: kind, ...result };
}

function modeRegistryCandidate(identitySuffix = '') {
  const definitions = [MODE_KIND.DUEL, MODE_KIND.RACE, MODE_KIND.SURVIVAL].flatMap((kind) => [
    participantPolicy(kind),
    timelinePolicy(kind),
    objectivePolicy(kind),
    eliminationPolicy(kind),
    respawnPolicy(kind),
    relationshipPolicy(kind),
    resultPolicy(kind),
  ]);
  if (identitySuffix.length > 0) {
    definitions[0]!.id =
      `arena-v2.mode-policy.duel.participant.${identitySuffix}.candidate.v1`;
  }
  return createArenaV2ThreeModeRegistryCandidateV1({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    policyDefinitions: definitions.map((definition) => ({
      status: 'production-unreachable',
      definition,
    })),
  });
}

function options(candidate: ReturnType<typeof modeRegistryCandidate>) {
  return {
    seedSource: Object.freeze({ nextSeed: () => 11 }),
    modeRegistryCandidate: candidate,
    raceParticipantCount: 4,
    survivalEnemyCount: 16,
  };
}

function profileServicesOwner(ownerSuffix: string) {
  const values = new Map<string, unknown>();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return new ArenaV2ProfileServicesOwnerCandidateV1({
    rewardProfileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
    learningProfileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
    storage: Object.freeze({
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
        values.delete(key);
        return true;
      },
    }),
    ownerId: `owner.mode-registry-information-host.${ownerSuffix}`,
    wallNow: () => 1_000,
    keyPrefix: `arena.mode-registry-information-host.${ownerSuffix}`,
  });
}

function informationHostOptions(
  profiles: ArenaV2ProfileServicesOwnerCandidateV1,
  candidate: ReturnType<typeof modeRegistryCandidate> | null,
) {
  return {
    seedSource: Object.freeze({ nextSeed: () => 41 }),
    progressionRegistry: createArenaV2ThreeModeRewardRegistryCandidateV1({
      duelModeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.duel,
      raceModeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.race,
      survivalModeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.survival,
    }),
    rewardProfileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
    rewardProfileService: profiles.rewardProfileService,
    learningProfileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
    learningEvidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
    learningProfileService: profiles.learningProfileService,
    maxEventCount: 200_000,
    ...(candidate === null
      ? {}
      : {
        modeRegistryCandidate: candidate,
        raceParticipantCount: 4 as const,
        survivalEnemyCount: 16 as const,
      }),
  };
}

function startInformationHostMode(
  owner: ArenaThreeModeAuthoritativeInformationHostCandidateV1,
  modeKind: TestModeKind,
) {
  const host = owner.host;
  host.start({ initialScreenId: 'home' });
  host.dispatchPrimaryIntent({
    expectedRevision: host.getSnapshot().navigation.revision,
    screenId: 'home',
    intentId: 'open-mode-select',
    selectedModeKind: null,
    resultDecision: null,
    resultTargetScreenId: null,
  });
  return host.dispatchPrimaryIntent({
    expectedRevision: host.getSnapshot().navigation.revision,
    screenId: 'mode-select',
    intentId: 'start-selected-mode',
    selectedModeKind: modeKind,
    resultDecision: null,
    resultTargetScreenId: null,
  });
}

function localPlayableOptions(
  ownerSuffix: string,
  candidate: ReturnType<typeof modeRegistryCandidate> | null,
) {
  const values = new Map<string, unknown>();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return {
    seedSource: Object.freeze({ nextSeed: () => 71 }),
    storage: Object.freeze({
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
        values.delete(key);
        return true;
      },
    }),
    ownerId: `owner.mode-registry-local-host.${ownerSuffix}`,
    wallNow: () => 1_000,
    keyPrefix: `arena.mode-registry-local-host.${ownerSuffix}`,
    audio: Object.freeze({ play() {}, stopAll() {} }),
    visual: Object.freeze({ present() {}, remove() {}, clear() {} }),
    maxEventCount: 200_000,
    qualityTier: 'high' as const,
    preferences: Object.freeze({ soundEnabled: true, reducedMotion: false }),
    ...(candidate === null
      ? {}
      : {
        modeRegistryCandidate: candidate,
        raceParticipantCount: 4 as const,
        survivalEnemyCount: 16 as const,
      }),
  };
}

function activeWeaponRegistryReference(
  onRead: () => void = () => {},
) {
  const read = Object.freeze({
    revision: 20,
    snapshotHash: 'a6203920',
    collectionWeaponIds: Object.freeze(
      ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ id }) => id),
    ),
  });
  return Object.freeze({
    read() {
      onRead();
      return read;
    },
  });
}

function startLocalHostMode(
  owner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
  modeKind: TestModeKind,
) {
  owner.start({ initialScreenId: 'home' });
  owner.dispatchPrimaryIntent({
    expectedRevision: owner.getInformationSnapshot().navigation.revision,
    screenId: 'home',
    intentId: 'open-mode-select',
    selectedModeKind: null,
    resultDecision: null,
  });
  return owner.dispatchPrimaryIntent({
    expectedRevision: owner.getInformationSnapshot().navigation.revision,
    screenId: 'mode-select',
    intentId: 'start-selected-mode',
    selectedModeKind: modeKind,
    resultDecision: null,
  });
}

function finishLocalHostDuel(
  owner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
  usePrimary = false,
): void {
  startLocalHostMode(owner, 'duel');
  let tick = 0;
  while (owner.getInformationSnapshot().state === 'match-running') {
    if (tick > 7_200) throw new Error('Duel延期测试未在正式hard limit内进入结算。');
    owner.stepMatch({
      tick,
      participantId: 'arena-duel-player-01',
      moveX: 0,
      moveZ: 0,
      primaryPressed: usePrimary && tick % 120 === 0,
      primaryHeld: false,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    });
    tick += 1;
  }
  expect(owner.getInformationSnapshot().state).toBe('match-settlement-pending');
  owner.settleMatch();
  expect(owner.getInformationSnapshot().state).toBe('result');
}

describe('Arena three-mode Mode Registry preflight QuickMatch candidate V1', () => {
  it('projects explicit Timeline resolver bundles without enabling runtime wiring', () => {
    const candidate = modeRegistryCandidate();
    const matchPolicyContentHash = 'a11ce001';
    for (const modeKind of [MODE_KIND.DUEL, MODE_KIND.RACE, MODE_KIND.SURVIVAL] as const) {
      const modeDefinitionId = candidate.modeDefinitionIds[modeKind];
      const resolved = candidate.registry.resolve(modeDefinitionId);
      const binding = createArenaThreeModeRuntimePolicyBindingCandidateV1(
        candidate.registryContentHash,
        resolved,
      );
      const selector = modeKind === MODE_KIND.SURVIVAL
        ? { kind: 'survival-enemy-count' as const, enemyCount: 16 as const }
        : { kind: 'default' as const };
      const selected = resolveTimelinePolicyRuntimeVariantV2(resolved.timeline, selector);
      const projected = projectArenaRuntimeTimelinePolicyResolverBundleCandidateV2(
        binding,
        modeDefinitionId,
        modeKind,
        matchPolicyContentHash,
        selector,
      );
      expect(projected).toMatchObject({
        schemaVersion: 1,
        modeDefinitionId,
        modeKind,
        matchPolicyContentHash,
        timeline: {
          definitionId: resolved.timeline.id,
          preparingTicks: selected.preparingTicks,
          hardLimitActiveTicks: selected.hardLimitActiveTicks,
          suddenDeathStartActiveTick: selected.suddenDeathStartActiveTick,
        },
      });
      expect(projected.contentHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(Object.isFrozen(projected)).toBe(true);
      expect(Object.isFrozen(projected.timeline)).toBe(true);
    }

    const duelModeDefinitionId = candidate.modeDefinitionIds.duel;
    const duelBinding = createArenaThreeModeRuntimePolicyBindingCandidateV1(
      candidate.registryContentHash,
      candidate.registry.resolve(duelModeDefinitionId),
    );
    expect(() => projectArenaRuntimeTimelinePolicyResolverBundleCandidateV1(
      duelBinding,
      duelModeDefinitionId,
      MODE_KIND.DUEL,
      matchPolicyContentHash,
    )).toThrow(/V1.*V2/);
    expect(() => projectArenaRuntimeTimelinePolicyResolverBundleCandidateV1(
      duelBinding,
      duelModeDefinitionId,
      MODE_KIND.RACE,
      matchPolicyContentHash,
    )).toThrow(/Mode身份/);
    expect(() => projectArenaRuntimeTimelinePolicyResolverBundleCandidateV1(
      duelBinding,
      duelModeDefinitionId,
      MODE_KIND.DUEL,
      'not-a-hash',
    )).toThrow(/8位小写hash/);

    const duelResolved = structuredClone(
      candidate.registry.resolve(duelModeDefinitionId),
    ) as unknown as DataRecord;
    for (const key of [
      'participant',
      'objective',
      'elimination',
      'respawn',
      'relationship',
      'result',
    ] as const) {
      (duelResolved[key] as DataRecord).contentVersion = 2;
    }
    duelResolved.contentVersion = 2;
    expect(() => createArenaThreeModeRuntimePolicyBindingCandidateV1(
      candidate.registryContentHash,
      duelResolved as never,
    )).toThrow(/版本组合/);

    const legacyTimelineV2Bundle = structuredClone(duelResolved) as DataRecord;
    const selectedDuel = resolveTimelinePolicyRuntimeVariantV2(
      candidate.registry.resolve(duelModeDefinitionId).timeline,
      { kind: 'default' },
    );
    legacyTimelineV2Bundle.timeline = {
      schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
      id: candidate.registry.resolve(duelModeDefinitionId).timeline.id,
      contentVersion: 2,
      modeKind: MODE_KIND.DUEL,
      preparingTicks: selectedDuel.preparingTicks,
      hardLimitTicks: selectedDuel.hardLimitActiveTicks,
      suddenDeathStartActiveTick: selectedDuel.suddenDeathStartActiveTick,
    };
    expect(createArenaThreeModeRuntimePolicyBindingCandidateV1(
      candidate.registryContentHash,
      legacyTimelineV2Bundle as never,
    ).bundle.contentVersion).toBe(2);
  });

  it('publishes a stable deeply frozen identity summary without an authorization token', () => {
    const candidate = modeRegistryCandidate();
    const input = {
      modeRegistryCandidate: candidate,
      raceParticipantCount: 4,
      survivalEnemyCount: 16,
    };
    const first = preflightArenaThreeModeModeRegistryCandidateV1(input);
    const second = preflightArenaThreeModeModeRegistryCandidateV1(input);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(first).toMatchObject({
      schemaVersion: 1,
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      registryContentHash: candidate.registryContentHash,
      raceParticipantCount: 4,
      survivalEnemyCount: 16,
      timelineRuntimeWiringEligibility: {
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        balanceApprovalStatus: 'not-run',
        registryContentHash: candidate.registryContentHash,
        runtimeMirrorsAligned: true,
        alignmentStatus: 'awaiting-balance-approval',
        mayWireRuntimeTimelinePolicy: false,
      },
      modePolicyIdentities: {
        duel: {
          modeKind: 'duel',
          modeDefinitionId: candidate.modeDefinitionIds.duel,
        },
        race: {
          modeKind: 'race',
          modeDefinitionId: candidate.modeDefinitionIds.race,
        },
        survival: {
          modeKind: 'survival',
          modeDefinitionId: candidate.modeDefinitionIds.survival,
        },
      },
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.modePolicyIdentities)).toBe(true);
    expect(Object.isFrozen(first.timelineRuntimeWiringEligibility)).toBe(true);
    expect(first.timelineRuntimeWiringEligibility.modes).toHaveLength(3);
    expect(first.timelineRuntimeWiringEligibility.modes
      .find(({ modeKind }) => modeKind === MODE_KIND.SURVIVAL)?.variants).toHaveLength(5);
    expect(first.timelineRuntimeWiringEligibility.modes.flatMap(
      ({ variants }) => variants,
    ).every(({ mismatchedFields }) => mismatchedFields.length === 0)).toBe(true);
    expect(Object.values(first.modePolicyIdentities).every(
      (identity) => Object.isFrozen(identity),
    )).toBe(true);
    expect(first).not.toHaveProperty('modeRegistryCandidate');
    expect(first).not.toHaveProperty('registry');
    expect(first).not.toHaveProperty('authorizationToken');
    expect(ARENA_THREE_MODE_MODE_REGISTRY_PREFLIGHT_QUICK_MATCH_FACTORY_CANDIDATE_V1)
      .toMatchObject({
        reusablePurePreflightBoundaryWired: true,
        purePreflightSummaryIsAuthorizationToken: false,
        downstreamCandidateRevalidationRequired: true,
        topLevelConsumerWired: true,
        runtimePolicyConsumptionWired: false,
        resolvedFrozenRuntimePolicyConsumptionWired: true,
        timelineRuntimePolicyConsumptionWired: false,
        timelineRuntimeWiringEligibilityReported: true,
        explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
        explicitTimelinePolicyRuntimeMirrorWired: false,
        raceEliminationAndRelationshipPolicyConsumedByRuntime: true,
        survivalEliminationAndRelationshipPolicyConsumedByRuntime: true,
        objectiveAndResultExistingSemanticsIdentityBound: true,
        threeModeObjectivePolicyAssertedAtTerminal: true,
        threeModeResultPolicyAssertedAtTerminal: true,
        defaultRegistryWired: false,
        defaultCompositionWired: false,
        defaultEntryWired: false,
      });
  });

  it('reports exact aligned runtime variants while balance approval keeps wiring closed', () => {
    const candidate = modeRegistryCandidate();
    const bindings = Object.freeze({
      duel: createArenaThreeModeRuntimePolicyBindingCandidateV1(
        candidate.registryContentHash,
        candidate.registry.resolve(candidate.modeDefinitionIds.duel),
      ),
      race: createArenaThreeModeRuntimePolicyBindingCandidateV1(
        candidate.registryContentHash,
        candidate.registry.resolve(candidate.modeDefinitionIds.race),
      ),
      survival: createArenaThreeModeRuntimePolicyBindingCandidateV1(
        candidate.registryContentHash,
        candidate.registry.resolve(candidate.modeDefinitionIds.survival),
      ),
    });
    const report = createArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1(bindings);
    expect(report).toMatchObject({
      registryContentHash: candidate.registryContentHash,
      runtimeMirrorsAligned: true,
      alignmentStatus: 'awaiting-balance-approval',
      mayWireRuntimeTimelinePolicy: false,
    });
    expect(report.modes.find(({ modeKind }) => modeKind === MODE_KIND.DUEL)?.variants[0])
      .toMatchObject({
        mismatchedFields: [],
        aligned: true,
      });
    expect(report.modes.find(({ modeKind }) => modeKind === MODE_KIND.RACE)?.variants[0])
      .toMatchObject({
        mismatchedFields: [],
        aligned: true,
      });
    expect(report.modes.find(({ modeKind }) => modeKind === MODE_KIND.SURVIVAL)?.variants)
      .toHaveLength(5);
    expect(report.modes.find(({ modeKind }) => modeKind === MODE_KIND.SURVIVAL)?.variants
      .every(({ mismatchedFields, aligned }) => mismatchedFields.length === 0 && aligned)).toBe(true);

    const otherCandidate = modeRegistryCandidate('changed-policy-identity');
    const mixed = {
      ...bindings,
      race: createArenaThreeModeRuntimePolicyBindingCandidateV1(
        otherCandidate.registryContentHash,
        otherCandidate.registry.resolve(otherCandidate.modeDefinitionIds.race),
      ),
    };
    expect(() => createArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1(mixed))
      .toThrow(/同一Registry/);
    expect(() => createArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1({
      ...bindings,
      runtimeMirror: {},
    })).toThrow(/不支持字段 runtimeMirror/);
  });

  it('fails the pure preflight closed for hostile shape, candidate and count drift', () => {
    const candidate = modeRegistryCandidate();
    const valid = {
      modeRegistryCandidate: candidate,
      raceParticipantCount: 4,
      survivalEnemyCount: 16,
    };
    for (const missingKey of [
      'modeRegistryCandidate',
      'raceParticipantCount',
      'survivalEnemyCount',
    ] as const) {
      const missing = { ...valid } as DataRecord;
      delete missing[missingKey];
      expect(() => preflightArenaThreeModeModeRegistryCandidateV1(
        missing as never,
      )).toThrow(/数据字段/);
    }
    expect(() => preflightArenaThreeModeModeRegistryCandidateV1({
      ...valid,
      future: true,
    } as never)).toThrow(/future/);
    expect(() => preflightArenaThreeModeModeRegistryCandidateV1(Object.defineProperty(
      { ...valid },
      'raceParticipantCount',
      { enumerable: true, get: () => 4 },
    ) as never)).toThrow(/数据字段/);
    expect(() => preflightArenaThreeModeModeRegistryCandidateV1(Object.defineProperty(
      { ...valid },
      Symbol('hostile'),
      { enumerable: true, value: true },
    ) as never)).toThrow(/Symbol/);
    expect(() => preflightArenaThreeModeModeRegistryCandidateV1(Object.assign(
      Object.create({ inherited: true }) as DataRecord,
      valid,
    ) as never)).toThrow(/普通对象/);
    expect(() => preflightArenaThreeModeModeRegistryCandidateV1({
      ...valid,
      modeRegistryCandidate: Object.freeze({ ...candidate, then() {} }),
    })).toThrow(/then|字段/);
    expect(() => preflightArenaThreeModeModeRegistryCandidateV1({
      ...valid,
      modeRegistryCandidate: Object.freeze({
        ...candidate,
        modeDefinitionIds: Object.freeze({
          ...candidate.modeDefinitionIds,
          race: 'arena.mode.race.drift',
        }),
      }),
    })).toThrow(/稳定身份漂移/);
    expect(() => preflightArenaThreeModeModeRegistryCandidateV1({
      ...valid,
      modeRegistryCandidate: Object.freeze({
        ...candidate,
        registryContentHash: '00000000',
      }),
    })).toThrow(/contentHash/);
    expect(() => preflightArenaThreeModeModeRegistryCandidateV1({
      ...valid,
      modeRegistryCandidate: Object.freeze({
        ...candidate,
        timelineProposalStatus: 'approved',
      }),
    })).toThrow(/Timeline产品提案/);
    expect(() => preflightArenaThreeModeModeRegistryCandidateV1({
      ...valid,
      modeRegistryCandidate: Object.freeze({
        ...candidate,
        registry: Object.freeze({}),
      }),
    })).toThrow(/真实冻结ModeRegistry/);
    for (const [key, value] of [
      ['raceParticipantCount', 5],
      ['survivalEnemyCount', 2],
      ['raceParticipantCount', Number.NaN],
    ] as const) {
      expect(() => preflightArenaThreeModeModeRegistryCandidateV1({
        ...valid,
        [key]: value,
      })).toThrow(/Policy|runtime支持目录|安全整数|大于等于/);
    }
  });

  it('rejects ModeRegistry prototype drift through the pure preflight boundary', () => {
    const listDescriptor = Object.getOwnPropertyDescriptor(ModeRegistry.prototype, 'list');
    expect(listDescriptor).toBeDefined();
    if (listDescriptor === undefined) return;
    const candidate = modeRegistryCandidate();
    Object.defineProperty(ModeRegistry.prototype, 'list', {
      ...listDescriptor,
      value() {
        throw new Error('pure preflight must reject descriptor drift before invocation');
      },
    });
    try {
      expect(() => preflightArenaThreeModeModeRegistryCandidateV1({
        modeRegistryCandidate: candidate,
        raceParticipantCount: 4,
        survivalEnemyCount: 16,
      })).toThrow(/原型成员.*漂移/);
    } finally {
      Object.defineProperty(ModeRegistry.prototype, 'list', listDescriptor);
    }
  });

  it('creates all three real bundles only after explicit policy/count preflight', () => {
    const candidate = modeRegistryCandidate();
    let seed = 20;
    const factory = new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...options(candidate),
      seedSource: Object.freeze({ nextSeed: () => seed++ }),
    });
    for (const [index, modeKind] of (['duel', 'race', 'survival'] as const).entries()) {
      const bundle = factory.createMatchBundle({
        schemaVersion: 1,
        generation: index + 1,
        modeKind,
      });
      expect(bundle.modeDefinitionId).toBe(
        ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1[modeKind],
      );
      (bundle.matchSession as { destroy(): void }).destroy();
    }
    expect(ARENA_THREE_MODE_MODE_REGISTRY_PREFLIGHT_QUICK_MATCH_FACTORY_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        modeRegistryOptionName: 'modeRegistryCandidate',
        weaponRegistryOptionName: 'weaponRegistryReference',
        preflightRunsBeforeSeedRosterContentAndRuntime: true,
        contentIdentityWired: true,
        contentIdentityBindingField: 'MatchContentSelectionV2.contentDefinitionId',
        bundleContentIdentityPostconditionWired: true,
        runtimePolicyConsumptionWired: false,
        resolvedFrozenRuntimePolicyConsumptionWired: true,
        timelineRuntimePolicyConsumptionWired: false,
        explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
        explicitTimelinePolicyRuntimeMirrorWired: false,
        raceEliminationAndRelationshipPolicyConsumedByRuntime: true,
        survivalEliminationAndRelationshipPolicyConsumedByRuntime: true,
        objectiveAndResultExistingSemanticsIdentityBound: true,
        threeModeObjectivePolicyAssertedAtTerminal: true,
        threeModeResultPolicyAssertedAtTerminal: true,
        presentationConsumesModeRegistry: false,
        defaultRegistryWired: false,
        defaultCompositionWired: false,
        defaultEntryWired: false,
      });
    factory.destroy();
  });

  it('wires the explicit preflight factory through the existing Information Host owner', () => {
    const createDescriptor = Object.getOwnPropertyDescriptor(
      ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1.prototype,
      'createMatchBundle',
    );
    const delegateCreateDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2QuickMatchBundleFactoryCandidateV1.prototype,
      'createMatchBundle',
    );
    expect(createDescriptor).toBeDefined();
    expect(delegateCreateDescriptor).toBeDefined();
    if (createDescriptor === undefined
      || typeof createDescriptor.value !== 'function'
      || delegateCreateDescriptor === undefined
      || typeof delegateCreateDescriptor.value !== 'function') return;
    let preflightBundleCalls = 0;
    const observedContentDefinitionIds: string[] = [];
    Object.defineProperty(ArenaV2QuickMatchBundleFactoryCandidateV1.prototype, 'createMatchBundle', {
      ...delegateCreateDescriptor,
      value(this: ArenaV2QuickMatchBundleFactoryCandidateV1, value: unknown) {
        const bundle = Reflect.apply(
          delegateCreateDescriptor.value as (...args: unknown[]) => unknown,
          this,
          [value],
        ) as Readonly<{
          publicMatchInfo: Readonly<{
            content: Readonly<{ contentDefinitionId: string }>;
          }>;
        }>;
        observedContentDefinitionIds.push(bundle.publicMatchInfo.content.contentDefinitionId);
        return bundle;
      },
    });
    Object.defineProperty(
      ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1.prototype,
      'createMatchBundle',
      {
        ...createDescriptor,
        value(this: ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1, value: unknown) {
          preflightBundleCalls += 1;
          return Reflect.apply(
            createDescriptor.value as (...args: unknown[]) => unknown,
            this,
            [value],
          );
        },
      },
    );
    const legacyProfiles = profileServicesOwner('legacy');
    const explicitProfiles = profileServicesOwner('explicit');
    let legacyOwner: ArenaThreeModeAuthoritativeInformationHostCandidateV1 | null = null;
    let explicitOwner: ArenaThreeModeAuthoritativeInformationHostCandidateV1 | null = null;
    try {
      legacyOwner = new ArenaThreeModeAuthoritativeInformationHostCandidateV1(
        informationHostOptions(legacyProfiles, null),
      );
      expect(startInformationHostMode(legacyOwner, 'duel')).toMatchObject({
        navigation: { command: 'start-match', selectedModeKind: 'duel' },
        snapshot: { state: 'match-running', generation: 1 },
      });
      expect(preflightBundleCalls).toBe(0);
      expect(observedContentDefinitionIds).toHaveLength(1);
      expect(observedContentDefinitionIds[0]).not.toContain('.mode-registry-');

      const explicitCandidate = modeRegistryCandidate();
      explicitOwner = new ArenaThreeModeAuthoritativeInformationHostCandidateV1(
        informationHostOptions(explicitProfiles, explicitCandidate),
      );
      expect(startInformationHostMode(explicitOwner, 'race')).toMatchObject({
        navigation: { command: 'start-match', selectedModeKind: 'race' },
        snapshot: { state: 'match-running', generation: 1 },
      });
      expect(preflightBundleCalls).toBe(1);
      expect(observedContentDefinitionIds).toHaveLength(2);
      expect(observedContentDefinitionIds[1]?.endsWith(
        `.mode-registry-${explicitCandidate.registryContentHash}`,
      )).toBe(true);
      expect(ARENA_THREE_MODE_AUTHORITATIVE_QUICK_MATCH_COMPOSITION_CANDIDATE_V1)
        .toMatchObject({
          modeRegistryPreflightInformationHostWired: true,
          runtimePolicyConsumptionWired: false,
          resolvedFrozenRuntimePolicyConsumptionWired: true,
          timelineRuntimePolicyConsumptionWired: false,
          explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
          explicitTimelinePolicyRuntimeMirrorWired: false,
          raceEliminationAndRelationshipPolicyConsumedByRuntime: true,
          survivalEliminationAndRelationshipPolicyConsumedByRuntime: true,
          objectiveAndResultExistingSemanticsIdentityBound: true,
          threeModeObjectivePolicyAssertedAtTerminal: true,
          threeModeResultPolicyAssertedAtTerminal: true,
          defaultRegistryWired: false,
          defaultCompositionWired: false,
          defaultEntryWired: false,
        });
    } finally {
      Object.defineProperty(
        ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1.prototype,
        'createMatchBundle',
        createDescriptor,
      );
      Object.defineProperty(
        ArenaV2QuickMatchBundleFactoryCandidateV1.prototype,
        'createMatchBundle',
        delegateCreateDescriptor,
      );
      explicitOwner?.destroy();
      legacyOwner?.destroy();
      explicitProfiles.destroy();
      legacyProfiles.destroy();
    }
  });

  it('rejects missing explicit counts before profile access or seed consumption', () => {
    const candidate = modeRegistryCandidate();
    let profileOptionReads = 0;
    let profileSnapshotCalls = 0;
    let seedCalls = 0;
    const base: DataRecord = {
      seedSource: Object.freeze({
        nextSeed() {
          seedCalls += 1;
          return 42;
        },
      }),
      modeRegistryCandidate: candidate,
      raceParticipantCount: 4,
      survivalEnemyCount: 16,
      progressionRegistry: Object.freeze({}),
      rewardProfileDefinition: Object.freeze({}),
      rewardProfileService: Object.freeze({
        getSnapshot() {
          profileSnapshotCalls += 1;
          return Object.freeze({});
        },
      }),
      learningProfileDefinition: Object.freeze({}),
      learningEvidenceDefinition: Object.freeze({}),
      learningProfileService: Object.freeze({}),
      maxEventCount: 1,
    };
    Object.defineProperty(base, 'learningProfileService', {
      enumerable: true,
      get() {
        profileOptionReads += 1;
        return Object.freeze({});
      },
    });
    for (const missingKey of ['raceParticipantCount', 'survivalEnemyCount'] as const) {
      const invalid = Object.defineProperties(
        {},
        Object.getOwnPropertyDescriptors(base),
      ) as DataRecord;
      delete invalid[missingKey];
      expect(() => new ArenaThreeModeAuthoritativeInformationHostCandidateV1(
        invalid as never,
      )).toThrow(new RegExp(`${missingKey}.*必填`, 'u'));
    }
    expect(profileOptionReads).toBe(0);
    expect(profileSnapshotCalls).toBe(0);
    expect(seedCalls).toBe(0);

    const accessorCount = Object.defineProperties(
      {},
      Object.getOwnPropertyDescriptors(base),
    ) as DataRecord;
    Object.defineProperty(accessorCount, 'raceParticipantCount', {
      enumerable: true,
      get() {
        return 4;
      },
    });
    expect(() => new ArenaThreeModeAuthoritativeInformationHostCandidateV1(
      accessorCount as never,
    )).toThrow(/raceParticipantCount.*数据字段/);
  });

  it('rejects fake Registry and ModeRegistry prototype drift at the Host preflight boundary', () => {
    const candidate = modeRegistryCandidate();
    let seedCalls = 0;
    let profileCalls = 0;
    const inertOptions = {
      seedSource: Object.freeze({ nextSeed: () => { seedCalls += 1; return 43; } }),
      modeRegistryCandidate: candidate,
      raceParticipantCount: 4 as const,
      survivalEnemyCount: 16 as const,
      progressionRegistry: Object.freeze({}),
      rewardProfileDefinition: Object.freeze({}),
      rewardProfileService: Object.freeze({
        getSnapshot() { profileCalls += 1; return Object.freeze({}); },
      }),
      learningProfileDefinition: Object.freeze({}),
      learningEvidenceDefinition: Object.freeze({}),
      learningProfileService: Object.freeze({}),
      maxEventCount: 1,
    };
    expect(() => new ArenaThreeModeAuthoritativeInformationHostCandidateV1({
      ...inertOptions,
      modeRegistryCandidate: Object.freeze({ ...candidate, registry: Object.freeze({}) }),
    } as never)).toThrow(/真实冻结ModeRegistry/);

    const listDescriptor = Object.getOwnPropertyDescriptor(ModeRegistry.prototype, 'list');
    expect(listDescriptor).toBeDefined();
    if (listDescriptor === undefined) return;
    Object.defineProperty(ModeRegistry.prototype, 'list', {
      ...listDescriptor,
      value() {
        throw new Error('hostile list must not execute');
      },
    });
    try {
      expect(() => new ArenaThreeModeAuthoritativeInformationHostCandidateV1(
        inertOptions,
      )).toThrow(/原型成员.*漂移/);
    } finally {
      Object.defineProperty(ModeRegistry.prototype, 'list', listDescriptor);
    }
    expect(seedCalls).toBe(0);
    expect(profileCalls).toBe(0);
  });

  it('reverses the owned bundle factory when Host construction fails after preflight', () => {
    const destroyDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2QuickMatchBundleFactoryCandidateV1.prototype,
      'destroy',
    );
    expect(destroyDescriptor).toBeDefined();
    if (destroyDescriptor === undefined || typeof destroyDescriptor.value !== 'function') return;
    let destroyCalls = 0;
    Object.defineProperty(ArenaV2QuickMatchBundleFactoryCandidateV1.prototype, 'destroy', {
      ...destroyDescriptor,
      value(this: ArenaV2QuickMatchBundleFactoryCandidateV1) {
        destroyCalls += 1;
        return Reflect.apply(destroyDescriptor.value as (...args: unknown[]) => unknown, this, []);
      },
    });
    const profiles = profileServicesOwner('construction-rollback');
    try {
      expect(() => new ArenaThreeModeAuthoritativeInformationHostCandidateV1({
        ...informationHostOptions(profiles, modeRegistryCandidate()),
        maxEventCount: 0,
      })).toThrow(/maxEventCount/);
      expect(destroyCalls).toBe(1);
    } finally {
      Object.defineProperty(
        ArenaV2QuickMatchBundleFactoryCandidateV1.prototype,
        'destroy',
        destroyDescriptor,
      );
      profiles.destroy();
    }
  });

  it('rejects invalid Playable preferences before invoking child-owner ports', () => {
    let seedCalls = 0;
    let profileSnapshotCalls = 0;
    let hudEffectCalls = 0;
    const source: DataRecord = {
      seedSource: Object.freeze({ nextSeed() { seedCalls += 1; return 91; } }),
      progressionRegistry: Object.freeze({}),
      rewardProfileDefinition: Object.freeze({}),
      rewardProfileService: Object.freeze({
        getSnapshot() {
          profileSnapshotCalls += 1;
          return Object.freeze({});
        },
      }),
      learningProfileDefinition: Object.freeze({}),
      learningEvidenceDefinition: Object.freeze({}),
      learningProfileService: Object.freeze({
        getSnapshot() {
          profileSnapshotCalls += 1;
          return Object.freeze({});
        },
      }),
      maxEventCount: 1,
      audio: Object.freeze({
        play() { hudEffectCalls += 1; },
        stopAll() { hudEffectCalls += 1; },
      }),
      visual: Object.freeze({
        present() { hudEffectCalls += 1; },
        remove() { hudEffectCalls += 1; },
        clear() { hudEffectCalls += 1; },
      }),
      qualityTier: 'high',
      preferences: Object.freeze({ soundEnabled: true, reducedMotion: 'future' }),
    };
    expect(() => new ArenaThreeModeAuthoritativePlayableHostCandidateV1(
      source as never,
    )).toThrow(/preferences.*boolean/);
    expect(seedCalls).toBe(0);
    expect(profileSnapshotCalls).toBe(0);
    expect(hudEffectCalls).toBe(0);
  });

  it('rejects child-port destroy reentry before mutating Playable cleanup state', () => {
    const startDescriptor = Object.getOwnPropertyDescriptor(
      ArenaThreeModeAuthoritativeInformationHostCandidateV1.prototype,
      'start',
    );
    expect(startDescriptor).toBeDefined();
    if (startDescriptor === undefined || typeof startDescriptor.value !== 'function') return;
    let owner: ArenaThreeModeAuthoritativePlayableHostCandidateV1 | null = null;
    let reentryError: unknown = null;
    Object.defineProperty(
      ArenaThreeModeAuthoritativeInformationHostCandidateV1.prototype,
      'start',
      {
        ...startDescriptor,
        value(
          this: ArenaThreeModeAuthoritativeInformationHostCandidateV1,
          ...args: unknown[]
        ) {
          try {
            owner?.destroy();
          } catch (error) {
            reentryError = error;
          }
          return Reflect.apply(
            startDescriptor.value as (...values: unknown[]) => unknown,
            this,
            args,
          );
        },
      },
    );
    const profiles = profileServicesOwner('playable-operation-lock');
    try {
      owner = new ArenaThreeModeAuthoritativePlayableHostCandidateV1({
        ...informationHostOptions(profiles, modeRegistryCandidate()),
        audio: Object.freeze({ play() {}, stopAll() {} }),
        visual: Object.freeze({ present() {}, remove() {}, clear() {} }),
        qualityTier: 'high',
        preferences: Object.freeze({ soundEnabled: true, reducedMotion: false }),
      });
      owner.start({ initialScreenId: 'home' });
      expect(String(reentryError)).toMatch(/start期间同步重入destroy/);
      expect(owner.getSnapshot()).toMatchObject({
        information: { state: 'information' },
        hud: { state: 'created' },
        consumerEpochId: null,
      });
    } finally {
      Object.defineProperty(
        ArenaThreeModeAuthoritativeInformationHostCandidateV1.prototype,
        'start',
        startDescriptor,
      );
      owner?.destroy();
      profiles.destroy();
    }
  });

  it('rejects nested Playable destroy reentry before mutating Local Playable cleanup state', () => {
    const startDescriptor = Object.getOwnPropertyDescriptor(
      ArenaThreeModeAuthoritativePlayableHostCandidateV1.prototype,
      'start',
    );
    expect(startDescriptor).toBeDefined();
    if (startDescriptor === undefined || typeof startDescriptor.value !== 'function') return;
    let owner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null = null;
    let reentryError: unknown = null;
    Object.defineProperty(
      ArenaThreeModeAuthoritativePlayableHostCandidateV1.prototype,
      'start',
      {
        ...startDescriptor,
        value(
          this: ArenaThreeModeAuthoritativePlayableHostCandidateV1,
          ...args: unknown[]
        ) {
          try {
            owner?.destroy();
          } catch (error) {
            reentryError = error;
          }
          return Reflect.apply(
            startDescriptor.value as (...values: unknown[]) => unknown,
            this,
            args,
          );
        },
      },
    );
    try {
      owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1(
        localPlayableOptions('local-playable-operation-lock', modeRegistryCandidate()),
      );
      owner.start({ initialScreenId: 'home' });
      expect(String(reentryError)).toMatch(/start期间同步重入destroy/);
      expect(owner.getInformationSnapshot()).toMatchObject({
        state: 'information',
        navigation: { currentScreenId: 'home' },
      });
    } finally {
      Object.defineProperty(
        ArenaThreeModeAuthoritativePlayableHostCandidateV1.prototype,
        'start',
        startDescriptor,
      );
      owner?.destroy();
    }
  });

  it('retains the Playable HUD when downstream Information construction cleanup fails', () => {
    const hudDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1.prototype,
      'dispose',
    );
    expect(hudDescriptor).toBeDefined();
    if (hudDescriptor === undefined || typeof hudDescriptor.value !== 'function') return;
    let hudDisposeCalls = 0;
    Object.defineProperty(
      ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1.prototype,
      'dispose',
      {
        ...hudDescriptor,
        value(this: ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1) {
          hudDisposeCalls += 1;
          if (hudDisposeCalls === 1) throw new Error('injected HUD construction cleanup failure');
          return Reflect.apply(hudDescriptor.value as (...args: unknown[]) => unknown, this, []);
        },
      },
    );
    const profiles = profileServicesOwner('playable-construction-cleanup-debt');
    try {
      let constructionDebt: unknown;
      try {
        new ArenaThreeModeAuthoritativePlayableHostCandidateV1({
          ...informationHostOptions(profiles, modeRegistryCandidate()),
          maxEventCount: 0,
          audio: Object.freeze({ play() {}, stopAll() {} }),
          visual: Object.freeze({ present() {}, remove() {}, clear() {} }),
          qualityTier: 'high',
          preferences: Object.freeze({ soundEnabled: true, reducedMotion: false }),
        });
      } catch (error) {
        constructionDebt = error;
      }
      expect(constructionDebt).toBeInstanceOf(
        ArenaThreeModeAuthoritativePlayableHostConstructionCleanupFailureCandidateV1,
      );
      const debt = (
        constructionDebt as ArenaThreeModeAuthoritativePlayableHostConstructionCleanupFailureCandidateV1
      );
      expect(debt.cleanupComplete).toBe(false);
      expect(hudDisposeCalls).toBe(1);
      debt.retryCleanup();
      expect(debt.cleanupComplete).toBe(true);
      expect(hudDisposeCalls).toBe(2);
      debt.retryCleanup();
      expect(hudDisposeCalls).toBe(2);
    } finally {
      Object.defineProperty(
        ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1.prototype,
        'dispose',
        hudDescriptor,
      );
      profiles.destroy();
    }
  });

  it('requires Local explicit counts before storage, wall clock, profile or seed access', () => {
    const candidate = modeRegistryCandidate();
    let storageCalls = 0;
    let wallNowCalls = 0;
    let seedCalls = 0;
    const base = localPlayableOptions('missing-count', candidate) as DataRecord;
    const invalid = Object.defineProperties(
      {},
      Object.getOwnPropertyDescriptors(base),
    ) as DataRecord;
    delete invalid.survivalEnemyCount;
    invalid.storage = Object.freeze({
      storageRead() { storageCalls += 1; return { ok: true, found: false }; },
      storageWrite() { storageCalls += 1; return true; },
      storageDelete() { storageCalls += 1; return true; },
    });
    invalid.wallNow = () => { wallNowCalls += 1; return 1_000; };
    invalid.seedSource = Object.freeze({
      nextSeed() { seedCalls += 1; return 92; },
    });
    expect(() => new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1(
      invalid as never,
    )).toThrow(/survivalEnemyCount.*必填/);
    expect(storageCalls).toBe(0);
    expect(wallNowCalls).toBe(0);
    expect(seedCalls).toBe(0);
  });

  it('routes explicit and legacy Local hosts through distinct content identities', () => {
    const delegateCreateDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2QuickMatchBundleFactoryCandidateV1.prototype,
      'createMatchBundle',
    );
    expect(delegateCreateDescriptor).toBeDefined();
    if (delegateCreateDescriptor === undefined
      || typeof delegateCreateDescriptor.value !== 'function') return;
    const observedContentDefinitionIds: string[] = [];
    Object.defineProperty(ArenaV2QuickMatchBundleFactoryCandidateV1.prototype, 'createMatchBundle', {
      ...delegateCreateDescriptor,
      value(this: ArenaV2QuickMatchBundleFactoryCandidateV1, value: unknown) {
        const bundle = Reflect.apply(
          delegateCreateDescriptor.value as (...args: unknown[]) => unknown,
          this,
          [value],
        ) as Readonly<{
          publicMatchInfo: Readonly<{ content: Readonly<{ contentDefinitionId: string }> }>;
        }>;
        observedContentDefinitionIds.push(bundle.publicMatchInfo.content.contentDefinitionId);
        return bundle;
      },
    });
    const candidate = modeRegistryCandidate();
    let legacyOwner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null = null;
    let explicitOwner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null = null;
    try {
      legacyOwner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1(
        localPlayableOptions('legacy', null),
      );
      expect(startLocalHostMode(legacyOwner, 'duel')).toMatchObject({
        information: { snapshot: { state: 'match-running', generation: 1 } },
      });
      expect(observedContentDefinitionIds[0]).not.toContain('.mode-registry-');

      explicitOwner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1(
        localPlayableOptions('explicit', candidate),
      );
      expect(startLocalHostMode(explicitOwner, 'race')).toMatchObject({
        information: { snapshot: { state: 'match-running', generation: 1 } },
      });
      expect(observedContentDefinitionIds[1]?.endsWith(
        `.mode-registry-${candidate.registryContentHash}`,
      )).toBe(true);
      expect(ARENA_THREE_MODE_AUTHORITATIVE_QUICK_MATCH_COMPOSITION_CANDIDATE_V1)
        .toMatchObject({
          modeRegistryPreflightInformationHostWired: true,
          modeRegistryPreflightLocalPlayableHostWired: true,
          runtimePolicyConsumptionWired: false,
          resolvedFrozenRuntimePolicyConsumptionWired: true,
          timelineRuntimePolicyConsumptionWired: false,
          explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
          explicitTimelinePolicyRuntimeMirrorWired: false,
          raceEliminationAndRelationshipPolicyConsumedByRuntime: true,
          survivalEliminationAndRelationshipPolicyConsumedByRuntime: true,
          objectiveAndResultExistingSemanticsIdentityBound: true,
          threeModeObjectivePolicyAssertedAtTerminal: true,
          threeModeResultPolicyAssertedAtTerminal: true,
          defaultRegistryWired: false,
          defaultCompositionWired: false,
          defaultEntryWired: false,
        });
    } finally {
      Object.defineProperty(
        ArenaV2QuickMatchBundleFactoryCandidateV1.prototype,
        'createMatchBundle',
        delegateCreateDescriptor,
      );
      explicitOwner?.destroy();
      legacyOwner?.destroy();
    }
  });

  it('accepts the rendered home continuation only after identity revalidation', () => {
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1(
      localPlayableOptions('home-continuation', modeRegistryCandidate()),
    );
    try {
      owner.start({ initialScreenId: 'home' });
      const continuation = owner.getInformationHomeNextGoalContinuationRouteRead();
      expect(continuation).toMatchObject({
        goalKind: 'collect-map',
        continuationKind: 'map-route-practice',
        recommendedModeKind: 'race',
        requiresTargetMapSelection: true,
        requiresTargetWeaponSelection: false,
      });
      const intent = {
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        screenId: 'home',
        intentId: 'open-mode-select',
        selectedModeKind: null,
        resultDecision: null,
        expectedHomeContinuationGoalId: continuation.goalId,
        expectedHomeContinuationKind: continuation.continuationKind,
        expectedHomeContinuationModeDefinitionId:
          continuation.recommendedModeDefinitionId,
        expectedHomeContinuationModeKind: continuation.recommendedModeKind,
        expectedHomeContinuationTargetWeaponDefinitionId:
          continuation.targetWeaponDefinitionId,
        expectedHomeContinuationTargetMapDefinitionId:
          continuation.targetMapDefinitionId,
      } as const;
      expect(() => owner.dispatchPrimaryIntent({
        ...intent,
        expectedHomeContinuationGoalId: 'collect-map:forged',
      })).toThrow(/已渲染.*漂移/);
      expect(owner.getInformationSnapshot().navigation.currentScreenId).toBe('home');

      owner.dispatchPrimaryIntent(intent);
      expect(owner.getInformationSnapshot()).toMatchObject({
        state: 'information',
        navigation: { currentScreenId: 'mode-select' },
      });
      const modeSelectionRecord = owner.getInformationCurrentScreenComposition()
        ?.fieldSources.flatMap(({ fieldValues }) => fieldValues)
        .find(({ fieldId }) => fieldId === 'record-type');
      expect(modeSelectionRecord?.valueText).toContain('竞速熟练0/5·整体0/15');
      expect(owner.getInformationProductSessionProjection().selectedModeKind).toBe('race');
      expect(owner.getInformationProfileProjection().selectedMapDefinitionId)
        .toBe(continuation.targetMapDefinitionId);
      const prepared = owner.getInformationModeContentProjection().screens.find(
        ({ screenId }) => screenId === 'mode-select',
      )!.fieldSource.fieldValues.find(({ fieldId }) => fieldId === 'preparation-entry');
      expect(prepared?.valueText).toMatch(/^目标已准备｜/u);
      expect(owner.getSnapshot()).toMatchObject({
        homeContinuationPreparation: { goalId: continuation.goalId },
        retentionObservation: { collectorConnected: false },
      });

      const alternateMap = ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1
        .mapDefinitions.find(({ mapDefinitionId }) => (
          mapDefinitionId !== continuation.targetMapDefinitionId
        ))!.mapDefinitionId;
      owner.selectInformationMap(alternateMap);
      const adjusted = owner.getInformationModeContentProjection().screens.find(
        ({ screenId }) => screenId === 'mode-select',
      )!.fieldSource.fieldValues.find(({ fieldId }) => fieldId === 'preparation-entry');
      expect(adjusted?.valueText).toMatch(/^已改选｜/u);
      expect(owner.getInformationSnapshot().navigation.currentScreenId).toBe('mode-select');

      owner.openDeclaredLink({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        targetScreenId: 'character-select',
      });
      expect(owner.getSnapshot()).toMatchObject({
        homeContinuationPreparation: { source: 'home', goalId: continuation.goalId },
      });
      owner.dispatchPrimaryIntent({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        screenId: 'character-select',
        intentId: 'save-character',
        selectedModeKind: null,
        resultDecision: null,
      });
      expect(owner.getInformationSnapshot().navigation.currentScreenId).toBe('mode-select');
      expect(owner.getSnapshot()).toMatchObject({
        homeContinuationPreparation: { source: 'home', goalId: continuation.goalId },
      });

      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'weapons',
      });
      expect(owner.getInformationSnapshot().navigation.currentScreenId).toBe('weapon-index');
      expect(owner.getSnapshot().homeContinuationPreparation).toBeNull();
    } finally {
      owner.destroy();
    }
  });

  it('projects the authoritative long-term learning summary through the existing home record field', () => {
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1(
      localPlayableOptions('home-long-term-summary', modeRegistryCandidate()),
    );
    try {
      owner.start({ initialScreenId: 'home' });
      const composition = owner.getInformationCurrentScreenComposition();
      const recentRecords = composition?.fieldSources
        .flatMap(({ fieldValues }) => fieldValues)
        .find(({ fieldId }) => fieldId === 'recent-records');
      expect(recentRecords?.valueText).toContain('模式熟练0/15');
      expect(recentRecords?.valueText).toContain('武器0/20·主研究0/2400');
      expect(recentRecords?.valueText).toContain('情境0/100·情境研究0/300');
      expect(recentRecords?.valueText).toContain('地图0/2·路线0/20·路线研究0/60');
      expect(recentRecords?.valueText).toContain('挑战0/16·挑战进度0/48');
      expect(recentRecords?.accessibilityText).toContain('每局最多一把主研究武器增加1点');
    } finally {
      owner.destroy();
    }
  });

  it('treats an explicit invalid or accessor collectBatch as failure instead of no-batch fallback', () => {
    const baseCollector = {
      schemaVersion: 1 as const,
      status: 'offline-only' as const,
      cohortSubjectId: 'invalid-atomic-collector-subject',
      sessionSequence: 1,
      collect() {},
    };
    expect(() => new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('invalid-atomic-collector-null', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        ...baseCollector,
        collectBatch: null,
      }),
    })).toThrow(/collectBatch必须是同步函数/u);

    let getterCalls = 0;
    const accessorCollector: DataRecord = { ...baseCollector };
    Object.defineProperty(accessorCollector, 'collectBatch', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return () => undefined;
      },
    });
    Object.freeze(accessorCollector);
    expect(() => new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('invalid-atomic-collector-accessor', modeRegistryCandidate()),
      retentionObservationCollector: accessorCollector,
    })).toThrow(/collectBatch.*数据字段/u);
    expect(getterCalls).toBe(0);
  });

  it('closes only the home continuation observation when the goal flow is abandoned', () => {
    const observations: DataRecord[] = [];
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('home-continuation-exit', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'home-continuation-exit-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          observations.push(value as DataRecord);
        },
      }),
    });
    try {
      owner.start({ initialScreenId: 'home' });
      const continuation = owner.getInformationHomeNextGoalContinuationRouteRead();
      owner.dispatchPrimaryIntent({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        screenId: 'home',
        intentId: 'open-mode-select',
        selectedModeKind: null,
        resultDecision: null,
        expectedHomeContinuationGoalId: continuation.goalId,
        expectedHomeContinuationKind: continuation.continuationKind,
        expectedHomeContinuationModeDefinitionId:
          continuation.recommendedModeDefinitionId,
        expectedHomeContinuationModeKind: continuation.recommendedModeKind,
        expectedHomeContinuationTargetWeaponDefinitionId:
          continuation.targetWeaponDefinitionId,
        expectedHomeContinuationTargetMapDefinitionId:
          continuation.targetMapDefinitionId,
      });
      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'maps',
      });
      expect(owner.getSnapshot()).toMatchObject({
        homeContinuationPreparation: null,
        retentionObservation: { pendingHomeContinuationFollow: null },
      });
      expect(observations.filter(({ kind }) => kind === 'home-continuation-followed'))
        .toEqual([expect.objectContaining({
          goalId: continuation.goalId,
          goalSelected: false,
          authorityTick: null,
        })]);
    } finally {
      owner.destroy();
    }
  });

  it('retains the home continuation opportunity until the collector confirms it', () => {
    const attempts: DataRecord[] = [];
    const committed: DataRecord[] = [];
    let rejectOnce = true;
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('home-continuation-collector-retry', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'home-continuation-collector-retry-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          const observation = value as DataRecord;
          if (observation.kind !== 'home-continuation-followed') return;
          attempts.push(observation);
          if (rejectOnce) {
            rejectOnce = false;
            throw new Error('retention collector temporarily unavailable');
          }
          committed.push(observation);
        },
      }),
    });
    try {
      owner.start({ initialScreenId: 'home' });
      const continuation = owner.getInformationHomeNextGoalContinuationRouteRead();
      owner.dispatchPrimaryIntent({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        screenId: 'home',
        intentId: 'open-mode-select',
        selectedModeKind: null,
        resultDecision: null,
        expectedHomeContinuationGoalId: continuation.goalId,
        expectedHomeContinuationKind: continuation.continuationKind,
        expectedHomeContinuationModeDefinitionId:
          continuation.recommendedModeDefinitionId,
        expectedHomeContinuationModeKind: continuation.recommendedModeKind,
        expectedHomeContinuationTargetWeaponDefinitionId:
          continuation.targetWeaponDefinitionId,
        expectedHomeContinuationTargetMapDefinitionId:
          continuation.targetMapDefinitionId,
      });

      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'maps',
      });
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingHomeContinuationFollow: { goalId: continuation.goalId },
          pendingActionRetryKind: 'home-continuation-followed',
          pendingActionRetryEventId: attempts[0]!.eventId,
          lastError: expect.any(Error),
        },
      });
      expect(attempts).toHaveLength(1);
      expect(committed).toHaveLength(0);

      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'weapons',
      });
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingHomeContinuationFollow: null,
          pendingActionRetryKind: null,
          pendingActionRetryEventId: null,
          lastError: null,
        },
      });
      expect(attempts).toHaveLength(2);
      expect(committed).toHaveLength(1);
      expect(Object.isFrozen(attempts[0])).toBe(true);
      expect(attempts[1]).toBe(attempts[0]);
      expect(attempts[1]).toMatchObject({
        eventId: attempts[0]!.eventId,
        eventSequence: attempts[0]!.eventSequence,
        goalId: continuation.goalId,
        goalSelected: false,
      });
    } finally {
      owner.destroy();
    }
  });

  it('retries the same frozen next-goal selection before the next business action', () => {
    const attempts: DataRecord[] = [];
    let rejectOnce = true;
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('next-goal-selection-collector-retry', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'next-goal-selection-collector-retry-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          const observation = value as DataRecord;
          if (observation.kind !== 'next-goal-selected') return;
          attempts.push(observation);
          if (rejectOnce) {
            rejectOnce = false;
            throw new Error('next-goal collector temporarily unavailable');
          }
        },
      }),
    });
    try {
      finishLocalHostDuel(owner);
      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'maps',
      });
      expect(attempts).toHaveLength(1);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingNextGoalImpression: expect.any(Object),
          pendingActionRetryKind: 'next-goal-selected',
          pendingActionRetryEventId: attempts[0]!.eventId,
        },
      });

      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'weapons',
      });
      expect(attempts).toHaveLength(2);
      expect(attempts[1]).toBe(attempts[0]);
      expect(attempts[1]).toMatchObject({
        eventId: attempts[0]!.eventId,
        eventSequence: attempts[0]!.eventSequence,
        goalId: attempts[0]!.goalId,
        goalSelected: false,
        authorityTick: attempts[0]!.authorityTick,
      });
      expect(attempts[0]!.authorityTick).not.toBeNull();
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingNextGoalImpression: null,
          pendingActionRetryKind: null,
          pendingActionRetryEventId: null,
          lastError: null,
        },
      });
    } finally {
      owner.destroy();
    }
  });

  it('retries a settled retention work batch from the exact frozen cursor before business', () => {
    const attempts: DataRecord[] = [];
    let rejectContentOnce = true;
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('settled-retention-work-cursor', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'settled-retention-work-cursor-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          const observation = value as DataRecord;
          attempts.push(observation);
          if (observation.kind === 'content-repeat-entry' && rejectContentOnce) {
            rejectContentOnce = false;
            throw new Error('settled retention cursor temporarily unavailable');
          }
        },
      }),
    });
    try {
      finishLocalHostDuel(owner);
      const failedContent = attempts.find(({ kind }) => kind === 'content-repeat-entry');
      expect(failedContent).toBeDefined();
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingNextGoalImpression: null,
          pendingSettlementWork: {
            cursor: 1,
            currentEventId: failedContent!.eventId,
          },
        },
      });

      owner.updatePreferences({ soundEnabled: true, reducedMotion: false });
      const retriedContent = attempts.filter(
        ({ eventId }) => eventId === failedContent!.eventId,
      );
      expect(retriedContent).toHaveLength(2);
      expect(retriedContent[1]).toBe(retriedContent[0]);
      expect(retriedContent[1]).toMatchObject({
        eventId: failedContent!.eventId,
        eventSequence: failedContent!.eventSequence,
        repeatOrdinal: failedContent!.repeatOrdinal,
      });
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingSettlementWork: null,
          pendingNextGoalImpression: expect.any(Object),
          lastError: null,
        },
      });
    } finally {
      owner.destroy();
    }
  });

  it('retains a failed settlement work cursor across blocked business and destroy retry', () => {
    const contentAttempts: DataRecord[] = [];
    let rejectContent = true;
    let destroyed = false;
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('settled-retention-work-destroy', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'settled-retention-work-destroy-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          const observation = value as DataRecord;
          if (observation.kind !== 'content-repeat-entry') return;
          contentAttempts.push(observation);
          if (rejectContent) throw new Error('settled work remains unavailable');
        },
      }),
    });
    try {
      finishLocalHostDuel(owner);
      const pendingBefore = owner.getSnapshot().retentionObservation.pendingSettlementWork;
      const resultRevision = owner.getInformationSnapshot().navigation.revision;
      expect(() => owner.openBottomNavigation({
        expectedRevision: resultRevision,
        itemId: 'maps',
      })).toThrow('settled work remains unavailable');
      expect(owner.getInformationSnapshot()).toMatchObject({
        state: 'result',
        navigation: { revision: resultRevision },
      });
      expect(() => owner.destroy()).toThrow('settled work remains unavailable');
      expect(owner.getSnapshot().retentionObservation.pendingSettlementWork)
        .toEqual(pendingBefore);
      expect(contentAttempts).toHaveLength(3);
      expect(contentAttempts[1]).toBe(contentAttempts[0]);
      expect(contentAttempts[2]).toBe(contentAttempts[0]);

      rejectContent = false;
      owner.destroy();
      destroyed = true;
      expect(contentAttempts[3]).toBe(contentAttempts[0]);
    } finally {
      rejectContent = false;
      if (!destroyed) owner.destroy();
    }
  });

  it('orders the complete settled retention batch and captures next-goal only at its tail', () => {
    const observations: DataRecord[] = [];
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('settled-retention-work-order', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'settled-retention-work-order-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          observations.push(value as DataRecord);
        },
      }),
    });
    try {
      finishLocalHostDuel(owner, true);
      const unique = observations.filter((observation, index) => (
        observations.findIndex(({ eventId }) => eventId === observation.eventId) === index
      ));
      const effectiveIndex = unique.findIndex(
        ({ kind }) => kind === 'effective-learning-completed',
      );
      const content = unique.filter(({ kind }) => kind === 'content-repeat-entry');
      const weaponContent = content.filter(({ weaponDefinitionIds }) => (
        (weaponDefinitionIds as readonly string[]).length === 1
      ));
      const mapContent = content.filter(({ mapDefinitionIds }) => (
        (mapDefinitionIds as readonly string[]).length === 1
      ));
      const crossIndex = unique.findIndex(({ kind }) => kind === 'cross-content-used');
      const weaponFocusIndex = unique.findIndex(
        ({ kind }) => kind === 'weapon-research-focus-continued',
      );
      const mapFocusIndex = unique.findIndex(
        ({ kind }) => kind === 'map-learning-focus-continued',
      );
      expect(effectiveIndex).toBe(0);
      expect(weaponContent.length).toBeGreaterThan(0);
      expect(weaponContent.map(({ weaponDefinitionIds }) => (
        (weaponDefinitionIds as readonly string[])[0]
      ))).toEqual(weaponContent.map(({ weaponDefinitionIds }) => (
        (weaponDefinitionIds as readonly string[])[0]!
      )).sort());
      expect(mapContent).toHaveLength(1);
      expect(unique.indexOf(mapContent[0]!)).toBe(
        effectiveIndex + weaponContent.length + 1,
      );
      expect(crossIndex).toBe(unique.indexOf(mapContent[0]!) + 1);
      if (weaponFocusIndex >= 0) expect(weaponFocusIndex).toBe(crossIndex + 1);
      if (mapFocusIndex >= 0) {
        expect(mapFocusIndex).toBe(
          weaponFocusIndex >= 0 ? weaponFocusIndex + 1 : crossIndex + 1,
        );
      }
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingSettlementWork: null,
          pendingNextGoalImpression: expect.any(Object),
        },
      });
    } finally {
      owner.destroy();
    }
  });

  it('commits cross-content and focus post-state only after each exact retry succeeds', () => {
    const attempts: DataRecord[] = [];
    let rejectCrossOnce = true;
    let rejectMapFocusOnce = true;
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('settled-retention-post-commit', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'settled-retention-post-commit-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          const observation = value as DataRecord;
          attempts.push(observation);
          if (observation.kind === 'cross-content-used' && rejectCrossOnce) {
            rejectCrossOnce = false;
            throw new Error('cross-content post-commit temporarily unavailable');
          }
          if (observation.kind === 'map-learning-focus-continued' && rejectMapFocusOnce) {
            rejectMapFocusOnce = false;
            throw new Error('map focus post-commit temporarily unavailable');
          }
        },
      }),
    });
    try {
      finishLocalHostDuel(owner, true);
      const failedCross = attempts.find(({ kind }) => kind === 'cross-content-used')!;
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingMapLearningFocus: expect.any(Object),
          pendingNextGoalImpression: null,
          usedWeaponDefinitionIds: [],
          usedMapDefinitionIds: [],
          pendingSettlementWork: { currentEventId: failedCross.eventId },
        },
      });

      expect(() => owner.updatePreferences({
        soundEnabled: true,
        reducedMotion: false,
      })).toThrow('map focus post-commit temporarily unavailable');
      const crossAttempts = attempts.filter(({ eventId }) => eventId === failedCross.eventId);
      const failedMapFocus = attempts.find(
        ({ kind }) => kind === 'map-learning-focus-continued',
      )!;
      expect(crossAttempts).toHaveLength(2);
      expect(crossAttempts[1]).toBe(crossAttempts[0]);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingMapLearningFocus: expect.any(Object),
          pendingNextGoalImpression: null,
          usedMapDefinitionIds: expect.arrayContaining([
            ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.mapDefinitions[0]!
              .mapDefinitionId,
          ]),
          pendingSettlementWork: { currentEventId: failedMapFocus.eventId },
        },
      });

      owner.updatePreferences({ soundEnabled: true, reducedMotion: false });
      const mapFocusAttempts = attempts.filter(
        ({ eventId }) => eventId === failedMapFocus.eventId,
      );
      expect(mapFocusAttempts).toHaveLength(2);
      expect(mapFocusAttempts[1]).toBe(mapFocusAttempts[0]);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingMapLearningFocus: null,
          pendingSettlementWork: null,
          pendingNextGoalImpression: expect.any(Object),
          lastError: null,
        },
      });
    } finally {
      owner.destroy();
    }
  });

  it('commits a pending action before catching up the same catalog opportunity', () => {
    const attempts: DataRecord[] = [];
    let rejectHomeOnce = true;
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('retention-action-catalog-order', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'retention-action-catalog-order-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          const observation = value as DataRecord;
          attempts.push(observation);
          if (observation.kind === 'home-continuation-followed' && rejectHomeOnce) {
            rejectHomeOnce = false;
            throw new Error('home action remains pending before catalog capture');
          }
        },
      }),
    });
    try {
      owner.start({ initialScreenId: 'home' });
      const continuation = owner.getInformationHomeNextGoalContinuationRouteRead();
      owner.dispatchPrimaryIntent({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        screenId: 'home',
        intentId: 'open-mode-select',
        selectedModeKind: null,
        resultDecision: null,
        expectedHomeContinuationGoalId: continuation.goalId,
        expectedHomeContinuationKind: continuation.continuationKind,
        expectedHomeContinuationModeDefinitionId:
          continuation.recommendedModeDefinitionId,
        expectedHomeContinuationModeKind: continuation.recommendedModeKind,
        expectedHomeContinuationTargetWeaponDefinitionId:
          continuation.targetWeaponDefinitionId,
        expectedHomeContinuationTargetMapDefinitionId:
          continuation.targetMapDefinitionId,
      });
      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'maps',
      });
      expect(attempts.map(({ kind }) => kind)).toEqual(['home-continuation-followed']);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingActionRetryKind: 'home-continuation-followed',
          pendingCatalogWork: null,
        },
      });

      owner.selectInformationMode('race');
      expect(attempts.map(({ kind }) => kind)).toEqual([
        'home-continuation-followed',
        'home-continuation-followed',
        'catalog-first-seen',
      ]);
      expect(attempts[1]).toBe(attempts[0]);
      expect(attempts[2]).toMatchObject({
        eventSequence: (attempts[0]!.eventSequence as number) + 1,
        mapDefinitionIds: expect.arrayContaining([
          ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.mapDefinitions[0]!
            .mapDefinitionId,
        ]),
      });
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingActionRetryKind: null,
          pendingCatalogWork: null,
          lastError: null,
        },
      });
    } finally {
      owner.destroy();
    }
  });

  it('retries the same frozen catalog observation before the next business action', () => {
    const catalogAttempts: DataRecord[] = [];
    let rejectCatalogOnce = true;
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('catalog-retention-work-retry', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'catalog-retention-work-retry-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          const observation = value as DataRecord;
          if (observation.kind !== 'catalog-first-seen') return;
          catalogAttempts.push(observation);
          if (rejectCatalogOnce) {
            rejectCatalogOnce = false;
            throw new Error('catalog observation temporarily unavailable');
          }
        },
      }),
    });
    try {
      owner.start({ initialScreenId: 'home' });
      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'maps',
      });
      expect(catalogAttempts).toHaveLength(1);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingCatalogWork: { currentEventId: catalogAttempts[0]!.eventId },
          catalogImpressionOrdinals: {},
        },
      });

      owner.selectInformationMode('race');
      expect(catalogAttempts).toHaveLength(2);
      expect(catalogAttempts[1]).toBe(catalogAttempts[0]);
      expect(catalogAttempts[1]).toMatchObject({
        eventId: catalogAttempts[0]!.eventId,
        eventSequence: catalogAttempts[0]!.eventSequence,
        repeatOrdinal: catalogAttempts[0]!.repeatOrdinal,
        mapDefinitionIds: catalogAttempts[0]!.mapDefinitionIds,
      });
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingCatalogWork: null,
          catalogImpressionOrdinals: { maps: 1 },
          lastError: null,
        },
      });
    } finally {
      owner.destroy();
    }
  });

  it('reconciles a Host catalog cursor after durable Journal acknowledgement loss', () => {
    const keyPrefix = 'arena.retention.host-journal-acknowledgement.test';
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let journalWrites = 0;
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage: Object.freeze({
        storageRead(key: string) {
          return values.has(key)
            ? { ok: true, found: true, value: clone(values.get(key)) }
            : { ok: true, found: false, value: undefined };
        },
        storageWrite(key: string, value: unknown) {
          if (key === `${keyPrefix}.journal`) journalWrites += 1;
          values.set(key, clone(value));
          return true;
        },
        storageDelete(key: string) {
          values.delete(key);
          return true;
        },
      }),
      ownerId: 'retention-host-journal-acknowledgement-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'retention-host-journal-acknowledgement-subject',
      capacity: 32,
      keyPrefix,
    });
    journal.open();
    const durableCollector = journal.getCollector();
    const attempts: DataRecord[] = [];
    let rejectAcknowledgementOnce = true;
    let owner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null = null;
    try {
      owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
        ...localPlayableOptions('host-journal-acknowledgement', modeRegistryCandidate()),
        retentionObservationCollector: Object.freeze({
          schemaVersion: durableCollector.schemaVersion,
          status: durableCollector.status,
          cohortSubjectId: durableCollector.cohortSubjectId,
          sessionSequence: durableCollector.sessionSequence,
          collect(value: unknown) {
            const observation = value as ArenaV2RetentionObservationV1;
            if (observation.kind !== 'catalog-first-seen') return;
            attempts.push(observation as unknown as DataRecord);
            durableCollector.collect(observation);
            if (rejectAcknowledgementOnce) {
              rejectAcknowledgementOnce = false;
              throw new Error('collector acknowledgement lost after durable Journal commit');
            }
          },
        }),
      });
      owner.start({ initialScreenId: 'home' });
      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'maps',
      });
      const writesAfterDurableCommit = journalWrites;
      expect(attempts).toHaveLength(1);
      expect(journal.getSnapshot()).toMatchObject({
        revision: 1,
        observationCount: 1,
      });
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingCatalogWork: { currentEventId: attempts[0]!.eventId },
          catalogImpressionOrdinals: {},
        },
      });

      owner.selectInformationMode('race');

      expect(attempts).toHaveLength(2);
      expect(attempts[1]).toBe(attempts[0]);
      expect(journalWrites).toBe(writesAfterDurableCommit);
      expect(journal.getSnapshot()).toMatchObject({
        revision: 1,
        observationCount: 1,
        retainedObservationCount: 1,
      });
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingCatalogWork: null,
          catalogImpressionOrdinals: { maps: 1 },
          lastError: null,
        },
      });
    } finally {
      try {
        owner?.destroy();
      } finally {
        journal.destroy();
      }
    }
  });

  it('keeps a real Journal settlement batch at cursor zero until one atomic retry commits', () => {
    const keyPrefix = 'arena.retention.host-journal-atomic-retry.test';
    const journalKey = `${keyPrefix}.journal`;
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let allowSettlementBatchWrite = false;
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage: Object.freeze({
        storageRead(key: string) {
          return values.has(key)
            ? { ok: true, found: true, value: clone(values.get(key)) }
            : { ok: true, found: false, value: undefined };
        },
        storageWrite(key: string, value: unknown) {
          if (key === journalKey
            && (value as { readonly revision?: unknown }).revision !== 0
            && !allowSettlementBatchWrite) return false;
          values.set(key, clone(value));
          return true;
        },
        storageDelete(key: string) {
          values.delete(key);
          return true;
        },
      }),
      ownerId: 'retention-host-journal-atomic-retry-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'retention-host-journal-atomic-retry-subject',
      capacity: 32,
      keyPrefix,
    });
    journal.open();
    const durableCollector = journal.getCollector();
    const batchAttempts: Array<readonly ArenaV2RetentionObservationV1[]> = [];
    let owner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null = null;
    try {
      owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
        ...localPlayableOptions('host-journal-atomic-retry', modeRegistryCandidate()),
        retentionObservationCollector: Object.freeze({
          schemaVersion: durableCollector.schemaVersion,
          status: durableCollector.status,
          cohortSubjectId: durableCollector.cohortSubjectId,
          sessionSequence: durableCollector.sessionSequence,
          collect: durableCollector.collect,
          collectBatch(observations: readonly ArenaV2RetentionObservationV1[]) {
            batchAttempts.push(observations);
            durableCollector.collectBatch!(observations);
          },
        }),
      });
      finishLocalHostDuel(owner, true);
      expect(batchAttempts).toHaveLength(1);
      expect(Object.isFrozen(batchAttempts[0])).toBe(true);
      expect(() => journal.getSnapshot()).toThrow(/未决collect/u);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          eventSequence: 0,
          contentEntryOrdinals: {},
          usedWeaponDefinitionIds: [],
          usedMapDefinitionIds: [],
          pendingSettlementWork: {
            cursor: 0,
            itemCount: batchAttempts[0]!.length,
          },
          pendingNextGoalImpression: null,
        },
      });

      allowSettlementBatchWrite = true;
      owner.updatePreferences({ soundEnabled: true, reducedMotion: false });

      expect(batchAttempts).toHaveLength(2);
      expect(batchAttempts[1]).toBe(batchAttempts[0]);
      expect(journal.getSnapshot()).toMatchObject({
        revision: batchAttempts[0]!.length,
        observationCount: batchAttempts[0]!.length,
      });
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          eventSequence: batchAttempts[0]!.length,
          pendingSettlementWork: null,
          pendingNextGoalImpression: expect.any(Object),
          lastError: null,
        },
      });
    } finally {
      allowSettlementBatchWrite = true;
      try {
        owner?.destroy();
      } finally {
        journal.destroy();
      }
    }
  });

  it('uses Journal batch acknowledgement after Host loses the first atomic confirmation', () => {
    const keyPrefix = 'arena.retention.host-journal-atomic-ack.test';
    const journalKey = `${keyPrefix}.journal`;
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let journalWrites = 0;
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage: Object.freeze({
        storageRead(key: string) {
          return values.has(key)
            ? { ok: true, found: true, value: clone(values.get(key)) }
            : { ok: true, found: false, value: undefined };
        },
        storageWrite(key: string, value: unknown) {
          if (key === journalKey) journalWrites += 1;
          values.set(key, clone(value));
          return true;
        },
        storageDelete(key: string) {
          values.delete(key);
          return true;
        },
      }),
      ownerId: 'retention-host-journal-atomic-ack-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'retention-host-journal-atomic-ack-subject',
      capacity: 32,
      keyPrefix,
    });
    journal.open();
    const durableCollector = journal.getCollector();
    const batchAttempts: Array<readonly ArenaV2RetentionObservationV1[]> = [];
    let loseHostConfirmation = true;
    let owner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null = null;
    try {
      owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
        ...localPlayableOptions('host-journal-atomic-ack', modeRegistryCandidate()),
        retentionObservationCollector: Object.freeze({
          schemaVersion: durableCollector.schemaVersion,
          status: durableCollector.status,
          cohortSubjectId: durableCollector.cohortSubjectId,
          sessionSequence: durableCollector.sessionSequence,
          collect: durableCollector.collect,
          collectBatch(observations: readonly ArenaV2RetentionObservationV1[]) {
            batchAttempts.push(observations);
            durableCollector.collectBatch!(observations);
            if (loseHostConfirmation) {
              loseHostConfirmation = false;
              throw new Error('Host lost atomic Journal acknowledgement');
            }
          },
        }),
      });
      finishLocalHostDuel(owner, true);
      const writesAfterDurableBatch = journalWrites;
      const durableAfterFirstAttempt = journal.getSnapshot();
      expect(durableAfterFirstAttempt.revision).toBe(batchAttempts[0]!.length);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          eventSequence: 0,
          pendingSettlementWork: { cursor: 0 },
          pendingNextGoalImpression: null,
        },
      });

      owner.updatePreferences({ soundEnabled: true, reducedMotion: false });

      expect(batchAttempts).toHaveLength(2);
      expect(batchAttempts[1]).toBe(batchAttempts[0]);
      expect(journalWrites).toBe(writesAfterDurableBatch);
      expect(journal.getSnapshot()).toEqual(durableAfterFirstAttempt);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          eventSequence: batchAttempts[0]!.length,
          pendingSettlementWork: null,
          pendingNextGoalImpression: expect.any(Object),
          lastError: null,
        },
      });
    } finally {
      try {
        owner?.destroy();
      } finally {
        journal.destroy();
      }
    }
  });

  it('retains a frozen next-goal capture debt after the settlement batch commits', () => {
    const keyPrefix = 'arena.retention.next-goal-capture-debt.test';
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage: Object.freeze({
        storageRead(key: string) {
          return values.has(key)
            ? { ok: true, found: true, value: clone(values.get(key)) }
            : { ok: true, found: false, value: undefined };
        },
        storageWrite(key: string, value: unknown) {
          values.set(key, clone(value));
          return true;
        },
        storageDelete(key: string) {
          values.delete(key);
          return true;
        },
      }),
      ownerId: 'retention-next-goal-capture-debt-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'retention-next-goal-capture-debt-subject',
      capacity: 32,
      keyPrefix,
    });
    journal.open();
    const durableCollector = journal.getCollector();
    let failNextRegistryRead = false;
    let settlementBatchCalls = 0;
    const registryReference = activeWeaponRegistryReference(() => {
      if (!failNextRegistryRead) return;
      failNextRegistryRead = false;
      throw new Error('next-goal registry scope temporarily unavailable');
    });
    let owner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null = null;
    try {
      owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
        ...localPlayableOptions('next-goal-capture-debt', modeRegistryCandidate()),
        registryReference,
        retentionObservationCollector: Object.freeze({
          schemaVersion: durableCollector.schemaVersion,
          status: durableCollector.status,
          cohortSubjectId: durableCollector.cohortSubjectId,
          sessionSequence: durableCollector.sessionSequence,
          collect: durableCollector.collect,
          collectBatch(observations: readonly ArenaV2RetentionObservationV1[]) {
            settlementBatchCalls += 1;
            durableCollector.collectBatch!(observations);
            failNextRegistryRead = true;
          },
        }),
      });
      finishLocalHostDuel(owner, true);
      const durableAfterSettlement = journal.getSnapshot();
      const failedCapture = owner.getSnapshot().retentionObservation;
      expect(failedCapture).toMatchObject({
        pendingSettlementWork: null,
        pendingNextGoalImpression: null,
        pendingNextGoalCapture: {
          expectedProfileRevision: 1,
          authorityTick: expect.any(Number),
          registryScopeStatus: 'pending',
          registryScopeIdentityHash: null,
          attemptState: 'retry-required',
        },
        lastError: expect.any(Error),
      });
      expect(Object.isFrozen(failedCapture.pendingNextGoalCapture)).toBe(true);
      expect(settlementBatchCalls).toBe(1);

      owner.updatePreferences({ soundEnabled: true, reducedMotion: false });

      expect(settlementBatchCalls).toBe(1);
      expect(journal.getSnapshot()).toEqual(durableAfterSettlement);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingSettlementWork: null,
          pendingNextGoalCapture: null,
          pendingNextGoalImpression: {
            profileRevision: 1,
            authorityTick: failedCapture.pendingNextGoalCapture.authorityTick,
          },
          lastError: null,
        },
      });
    } finally {
      try {
        owner?.destroy();
      } finally {
        journal.destroy();
      }
    }
  });

  it('freezes the active Registry scope once before retrying the same goal generation', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      ArenaV2ProfileServicesOwnerCandidateV1.prototype,
      'learningProfileService',
    );
    expect(descriptor?.get).toBeTypeOf('function');
    if (descriptor === undefined || typeof descriptor.get !== 'function') return;
    const originalGet = descriptor.get;
    let failNextProfileSnapshot = false;
    let registryReadCount = 0;
    Object.defineProperty(
      ArenaV2ProfileServicesOwnerCandidateV1.prototype,
      'learningProfileService',
      {
        ...descriptor,
        get(this: ArenaV2ProfileServicesOwnerCandidateV1) {
          const service = Reflect.apply(originalGet, this, []);
          if (!failNextProfileSnapshot) return service;
          return Object.freeze({
            getSnapshot() {
              failNextProfileSnapshot = false;
              throw new Error('next-goal profile snapshot temporarily unavailable');
            },
          });
        },
      },
    );
    let owner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null = null;
    try {
      owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
        ...localPlayableOptions('next-goal-frozen-registry-scope', modeRegistryCandidate()),
        registryReference: activeWeaponRegistryReference(() => {
          registryReadCount += 1;
        }),
        retentionObservationCollector: Object.freeze({
          schemaVersion: 1 as const,
          status: 'offline-only' as const,
          cohortSubjectId: 'next-goal-frozen-registry-scope-subject',
          sessionSequence: 1,
          collect() {},
          collectBatch() {
            failNextProfileSnapshot = true;
          },
        }),
      });
      finishLocalHostDuel(owner, true);
      const failedCapture = owner.getSnapshot().retentionObservation;
      expect(failedCapture).toMatchObject({
        pendingSettlementWork: null,
        pendingNextGoalImpression: null,
        pendingNextGoalCapture: {
          registryScopeStatus: 'frozen',
          registryScopeIdentityHash: expect.stringMatching(/^[0-9a-f]{8}$/u),
          registryScope: {
            kind: 'active-registry',
            revision: 20,
            snapshotHash: 'a6203920',
            collectionEquipmentDefinitionCount:
              ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.length,
          },
          attemptState: 'retry-required',
        },
      });
      const readsBeforeRetry = registryReadCount;

      owner.updatePreferences({ soundEnabled: true, reducedMotion: false });

      expect(registryReadCount).toBe(readsBeforeRetry);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingNextGoalCapture: null,
          pendingNextGoalImpression: expect.any(Object),
          lastError: null,
        },
      });
    } finally {
      Object.defineProperty(
        ArenaV2ProfileServicesOwnerCandidateV1.prototype,
        'learningProfileService',
        descriptor,
      );
      owner?.destroy();
    }
  });

  it('blocks navigation and match start while next-goal capture keeps failing', () => {
    let rejectRegistryScope = false;
    let destroyed = false;
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('next-goal-capture-business-block', modeRegistryCandidate()),
      registryReference: activeWeaponRegistryReference(() => {
        if (rejectRegistryScope) {
          throw new Error('next-goal capture remains unavailable');
        }
      }),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'next-goal-capture-business-block-subject',
        sessionSequence: 1,
        collect() {},
        collectBatch() {
          rejectRegistryScope = true;
        },
      }),
    });
    try {
      finishLocalHostDuel(owner, true);
      const result = owner.getInformationSnapshot();
      const recoveryBefore = owner.getLearningSettlementRecoveryRead();
      expect(() => owner.openBottomNavigation({
        expectedRevision: result.navigation.revision,
        itemId: 'maps',
      })).toThrow('next-goal capture remains unavailable');
      expect(() => owner.dispatchPrimaryIntent({
        expectedRevision: result.navigation.revision,
        screenId: 'result-reward',
        intentId: 'play-again-or-next',
        selectedModeKind: 'duel',
        resultDecision: 'play-again',
      })).toThrow('next-goal capture remains unavailable');
      expect(owner.getInformationSnapshot()).toMatchObject({
        state: 'result',
        navigation: { revision: result.navigation.revision },
      });
      expect(owner.getLearningSettlementRecoveryRead()).toMatchObject({
        persistentIntentPending: recoveryBefore.persistentIntentPending,
      });
      expect(() => owner.destroy()).toThrow('next-goal capture remains unavailable');

      rejectRegistryScope = false;
      owner.destroy();
      destroyed = true;
    } finally {
      rejectRegistryScope = false;
      if (!destroyed) owner.destroy();
    }
  });

  it('does not create next-goal capture debt when no retention collector is wired', () => {
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('next-goal-capture-no-collector', modeRegistryCandidate()),
    });
    try {
      finishLocalHostDuel(owner, true);
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          collectorConnected: false,
          pendingSettlementWork: null,
          pendingNextGoalCapture: null,
          pendingNextGoalImpression: null,
        },
      });
    } finally {
      owner.destroy();
    }
  });

  it('blocks business and match-start dispatch while a frozen retention action still fails', () => {
    let rejectHome = true;
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('retention-action-business-block', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'retention-action-business-block-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          const observation = value as DataRecord;
          if (observation.kind === 'home-continuation-followed' && rejectHome) {
            throw new Error('home action remains unavailable');
          }
        },
      }),
    });
    try {
      owner.start({ initialScreenId: 'home' });
      const continuation = owner.getInformationHomeNextGoalContinuationRouteRead();
      owner.dispatchPrimaryIntent({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        screenId: 'home',
        intentId: 'open-mode-select',
        selectedModeKind: null,
        resultDecision: null,
        expectedHomeContinuationGoalId: continuation.goalId,
        expectedHomeContinuationKind: continuation.continuationKind,
        expectedHomeContinuationModeDefinitionId:
          continuation.recommendedModeDefinitionId,
        expectedHomeContinuationModeKind: continuation.recommendedModeKind,
        expectedHomeContinuationTargetWeaponDefinitionId:
          continuation.targetWeaponDefinitionId,
        expectedHomeContinuationTargetMapDefinitionId:
          continuation.targetMapDefinitionId,
      });
      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'maps',
      });
      const blockedRevision = owner.getInformationSnapshot().navigation.revision;
      expect(() => owner.dispatchPrimaryIntent({
        expectedRevision: blockedRevision,
        screenId: 'maps',
        intentId: 'start-selected-mode',
        selectedModeKind: 'race',
        resultDecision: null,
      })).toThrow('home action remains unavailable');
      expect(owner.getInformationSnapshot()).toMatchObject({
        state: 'information',
        navigation: { revision: blockedRevision, currentScreenId: 'map-index' },
      });
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingActionRetryKind: 'home-continuation-followed',
          pendingCatalogWork: null,
        },
      });
      rejectHome = false;
      owner.selectInformationMode('race');
    } finally {
      rejectHome = false;
      owner.destroy();
    }
  });

  it('keeps the frozen retention action uncommitted when the collector swallows Host reentry', () => {
    const attempts: DataRecord[] = [];
    let reenterOnce = true;
    let owner: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null = null;
    owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('home-continuation-collector-reentry', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'home-continuation-collector-reentry-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          const observation = value as DataRecord;
          if (observation.kind !== 'home-continuation-followed') return;
          attempts.push(observation);
          if (!reenterOnce) return;
          reenterOnce = false;
          try {
            owner?.getSnapshot();
          } catch {
            // The hostile collector deliberately swallows the public reentry rejection.
          }
        },
      }),
    });
    try {
      owner.start({ initialScreenId: 'home' });
      const continuation = owner.getInformationHomeNextGoalContinuationRouteRead();
      owner.dispatchPrimaryIntent({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        screenId: 'home',
        intentId: 'open-mode-select',
        selectedModeKind: null,
        resultDecision: null,
        expectedHomeContinuationGoalId: continuation.goalId,
        expectedHomeContinuationKind: continuation.continuationKind,
        expectedHomeContinuationModeDefinitionId:
          continuation.recommendedModeDefinitionId,
        expectedHomeContinuationModeKind: continuation.recommendedModeKind,
        expectedHomeContinuationTargetWeaponDefinitionId:
          continuation.targetWeaponDefinitionId,
        expectedHomeContinuationTargetMapDefinitionId:
          continuation.targetMapDefinitionId,
      });
      expect(() => owner!.openBottomNavigation({
        expectedRevision: owner!.getInformationSnapshot().navigation.revision,
        itemId: 'maps',
      })).toThrow(AggregateError);
      expect(attempts).toHaveLength(1);
      expect(Object.isFrozen(attempts[0])).toBe(true);
    } finally {
      owner.destroy();
    }
  });

  it('retries the frozen retention action before starting destroy cleanup', () => {
    const attempts: DataRecord[] = [];
    let failuresRemaining = 2;
    let destroyed = false;
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('home-continuation-destroy-retry', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'home-continuation-destroy-retry-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          const observation = value as DataRecord;
          if (observation.kind !== 'home-continuation-followed') return;
          attempts.push(observation);
          if (failuresRemaining > 0) {
            failuresRemaining -= 1;
            throw new Error('retention collector remains temporarily unavailable');
          }
        },
      }),
    });
    try {
      owner.start({ initialScreenId: 'home' });
      const continuation = owner.getInformationHomeNextGoalContinuationRouteRead();
      owner.dispatchPrimaryIntent({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        screenId: 'home',
        intentId: 'open-mode-select',
        selectedModeKind: null,
        resultDecision: null,
        expectedHomeContinuationGoalId: continuation.goalId,
        expectedHomeContinuationKind: continuation.continuationKind,
        expectedHomeContinuationModeDefinitionId:
          continuation.recommendedModeDefinitionId,
        expectedHomeContinuationModeKind: continuation.recommendedModeKind,
        expectedHomeContinuationTargetWeaponDefinitionId:
          continuation.targetWeaponDefinitionId,
        expectedHomeContinuationTargetMapDefinitionId:
          continuation.targetMapDefinitionId,
      });
      owner.openBottomNavigation({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        itemId: 'maps',
      });
      expect(() => owner.destroy()).toThrow(
        'retention collector remains temporarily unavailable',
      );
      expect(owner.getSnapshot()).toMatchObject({
        retentionObservation: {
          pendingActionRetryEventId: attempts[0]!.eventId,
          pendingHomeContinuationFollow: { goalId: continuation.goalId },
        },
      });
      owner.destroy();
      destroyed = true;
      owner.destroy();
      expect(attempts).toHaveLength(3);
      expect(attempts[1]).toBe(attempts[0]);
      expect(attempts[2]).toBe(attempts[0]);
    } finally {
      if (!destroyed) owner.destroy();
    }
  });

  it('records whether an accepted home continuation reaches the frozen next-match start', () => {
    const observations: DataRecord[] = [];
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
      ...localPlayableOptions('home-continuation-follow', modeRegistryCandidate()),
      retentionObservationCollector: Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId: 'home-continuation-follow-subject',
        sessionSequence: 1,
        collect(value: unknown) {
          observations.push(value as DataRecord);
        },
      }),
    });
    try {
      owner.start({ initialScreenId: 'home' });
      const continuation = owner.getInformationHomeNextGoalContinuationRouteRead();
      owner.dispatchPrimaryIntent({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        screenId: 'home',
        intentId: 'open-mode-select',
        selectedModeKind: null,
        resultDecision: null,
        expectedHomeContinuationGoalId: continuation.goalId,
        expectedHomeContinuationKind: continuation.continuationKind,
        expectedHomeContinuationModeDefinitionId:
          continuation.recommendedModeDefinitionId,
        expectedHomeContinuationModeKind: continuation.recommendedModeKind,
        expectedHomeContinuationTargetWeaponDefinitionId:
          continuation.targetWeaponDefinitionId,
        expectedHomeContinuationTargetMapDefinitionId:
          continuation.targetMapDefinitionId,
      });
      owner.dispatchPrimaryIntent({
        expectedRevision: owner.getInformationSnapshot().navigation.revision,
        screenId: 'mode-select',
        intentId: 'start-selected-mode',
        selectedModeKind: continuation.recommendedModeKind,
        resultDecision: null,
      });
      expect(observations.find(({ kind }) => kind === 'home-continuation-followed'))
        .toMatchObject({
          denominatorKey: 'home-continuation-accepted',
          numeratorIncrement: 1,
          goalId: continuation.goalId,
          modeDefinitionIds: [continuation.recommendedModeDefinitionId],
          mapDefinitionIds: [continuation.targetMapDefinitionId],
          authorityTick: 0,
        });
      expect(owner.getSnapshot().retentionObservation.pendingHomeContinuationFollow)
        .toBeNull();
    } finally {
      owner.destroy();
    }
  });

  it('reverses Local profile ownership when downstream Playable construction fails', () => {
    const recoveryDestroyDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2LearningSettlementRecoveryOwnerCandidateV1.prototype,
      'destroy',
    );
    const destroyDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2ProfileServicesOwnerCandidateV1.prototype,
      'destroy',
    );
    expect(recoveryDestroyDescriptor).toBeDefined();
    expect(destroyDescriptor).toBeDefined();
    if (recoveryDestroyDescriptor === undefined
      || typeof recoveryDestroyDescriptor.value !== 'function'
      || destroyDescriptor === undefined
      || typeof destroyDescriptor.value !== 'function') return;
    const cleanupOrder: string[] = [];
    Object.defineProperty(
      ArenaV2LearningSettlementRecoveryOwnerCandidateV1.prototype,
      'destroy',
      {
        ...recoveryDestroyDescriptor,
        value(this: ArenaV2LearningSettlementRecoveryOwnerCandidateV1) {
          cleanupOrder.push('learning-settlement-recovery');
          return Reflect.apply(
            recoveryDestroyDescriptor.value as (...args: unknown[]) => unknown,
            this,
            [],
          );
        },
      },
    );
    Object.defineProperty(ArenaV2ProfileServicesOwnerCandidateV1.prototype, 'destroy', {
      ...destroyDescriptor,
      value(this: ArenaV2ProfileServicesOwnerCandidateV1) {
        cleanupOrder.push('profile-services');
        return Reflect.apply(destroyDescriptor.value as (...args: unknown[]) => unknown, this, []);
      },
    });
    try {
      expect(() => new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
        ...localPlayableOptions('rollback', modeRegistryCandidate()),
        visual: Object.freeze({ present() {}, remove() {} }),
      })).toThrow(/visual.*clear|缺少clear/);
      expect(cleanupOrder).toEqual(['learning-settlement-recovery', 'profile-services']);
    } finally {
      Object.defineProperty(
        ArenaV2LearningSettlementRecoveryOwnerCandidateV1.prototype,
        'destroy',
        recoveryDestroyDescriptor,
      );
      Object.defineProperty(
        ArenaV2ProfileServicesOwnerCandidateV1.prototype,
        'destroy',
        destroyDescriptor,
      );
    }
  });

  it('retains Information construction dependencies when Session Factory cleanup fails', () => {
    const createSessionDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
      'createSession',
    );
    const sessionDestroyDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
      'destroy',
    );
    const bundleDestroyDescriptor = Object.getOwnPropertyDescriptor(
      ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1.prototype,
      'destroy',
    );
    expect(createSessionDescriptor).toBeDefined();
    expect(sessionDestroyDescriptor).toBeDefined();
    expect(bundleDestroyDescriptor).toBeDefined();
    if (createSessionDescriptor === undefined
      || sessionDestroyDescriptor === undefined
      || typeof sessionDestroyDescriptor.value !== 'function'
      || bundleDestroyDescriptor === undefined
      || typeof bundleDestroyDescriptor.value !== 'function') return;
    let sessionDestroyCalls = 0;
    let bundleDestroyCalls = 0;
    Object.defineProperty(
      ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
      'createSession',
      {
        configurable: createSessionDescriptor.configurable,
        enumerable: createSessionDescriptor.enumerable,
        get() { return undefined; },
      },
    );
    Object.defineProperty(ArenaV2ModeLearningSessionFactoryCandidateV1.prototype, 'destroy', {
      ...sessionDestroyDescriptor,
      value(this: ArenaV2ModeLearningSessionFactoryCandidateV1) {
        sessionDestroyCalls += 1;
        if (sessionDestroyCalls === 1) throw new Error('injected session factory cleanup failure');
        return Reflect.apply(
          sessionDestroyDescriptor.value as (...args: unknown[]) => unknown,
          this,
          [],
        );
      },
    });
    Object.defineProperty(
      ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1.prototype,
      'destroy',
      {
        ...bundleDestroyDescriptor,
        value(this: ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1) {
          bundleDestroyCalls += 1;
          return Reflect.apply(
            bundleDestroyDescriptor.value as (...args: unknown[]) => unknown,
            this,
            [],
          );
        },
      },
    );
    const profiles = profileServicesOwner('information-construction-cleanup-debt');
    try {
      let constructionDebt: unknown;
      try {
        new ArenaThreeModeAuthoritativeInformationHostCandidateV1(
          informationHostOptions(profiles, modeRegistryCandidate()),
        );
      } catch (error) {
        constructionDebt = error;
      }
      expect(constructionDebt).toBeInstanceOf(
        ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1,
      );
      const debt = (
        constructionDebt as ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1
      );
      expect(debt.cleanupComplete).toBe(false);
      expect(sessionDestroyCalls).toBe(1);
      expect(bundleDestroyCalls).toBe(0);
      debt.retryCleanup();
      expect(debt.cleanupComplete).toBe(true);
      expect(sessionDestroyCalls).toBe(2);
      expect(bundleDestroyCalls).toBe(1);
      debt.retryCleanup();
      expect(sessionDestroyCalls).toBe(2);
      expect(bundleDestroyCalls).toBe(1);
    } finally {
      Object.defineProperty(
        ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
        'createSession',
        createSessionDescriptor,
      );
      Object.defineProperty(
        ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
        'destroy',
        sessionDestroyDescriptor,
      );
      Object.defineProperty(
        ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1.prototype,
        'destroy',
        bundleDestroyDescriptor,
      );
      profiles.destroy();
    }
  });

  it('retains Local dependencies until the Playable consumer is truly destroyed', () => {
    const playableDescriptor = Object.getOwnPropertyDescriptor(
      ArenaThreeModeAuthoritativePlayableHostCandidateV1.prototype,
      'destroy',
    );
    const recoveryDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2LearningSettlementRecoveryOwnerCandidateV1.prototype,
      'destroy',
    );
    const journalDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2LearningSettlementIntentJournalCandidateV1.prototype,
      'destroy',
    );
    const profileDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2ProfileServicesOwnerCandidateV1.prototype,
      'destroy',
    );
    expect(playableDescriptor).toBeDefined();
    expect(recoveryDescriptor).toBeDefined();
    expect(journalDescriptor).toBeDefined();
    expect(profileDescriptor).toBeDefined();
    if (playableDescriptor === undefined || typeof playableDescriptor.value !== 'function'
      || recoveryDescriptor === undefined || typeof recoveryDescriptor.value !== 'function'
      || journalDescriptor === undefined || typeof journalDescriptor.value !== 'function'
      || profileDescriptor === undefined || typeof profileDescriptor.value !== 'function') return;
    const cleanupOrder: string[] = [];
    let playableAttempt = 0;
    Object.defineProperty(ArenaThreeModeAuthoritativePlayableHostCandidateV1.prototype, 'destroy', {
      ...playableDescriptor,
      value(this: ArenaThreeModeAuthoritativePlayableHostCandidateV1) {
        cleanupOrder.push('playable');
        playableAttempt += 1;
        if (playableAttempt === 1) throw new Error('injected playable cleanup failure');
        return Reflect.apply(playableDescriptor.value as (...args: unknown[]) => unknown, this, []);
      },
    });
    Object.defineProperty(
      ArenaV2LearningSettlementRecoveryOwnerCandidateV1.prototype,
      'destroy',
      {
        ...recoveryDescriptor,
        value(this: ArenaV2LearningSettlementRecoveryOwnerCandidateV1) {
          cleanupOrder.push('learning-settlement-recovery');
          return Reflect.apply(recoveryDescriptor.value as (...args: unknown[]) => unknown, this, []);
        },
      },
    );
    Object.defineProperty(
      ArenaV2LearningSettlementIntentJournalCandidateV1.prototype,
      'destroy',
      {
        ...journalDescriptor,
        value(this: ArenaV2LearningSettlementIntentJournalCandidateV1) {
          cleanupOrder.push('learning-settlement-intent-journal');
          return Reflect.apply(journalDescriptor.value as (...args: unknown[]) => unknown, this, []);
        },
      },
    );
    Object.defineProperty(ArenaV2ProfileServicesOwnerCandidateV1.prototype, 'destroy', {
      ...profileDescriptor,
      value(this: ArenaV2ProfileServicesOwnerCandidateV1) {
        cleanupOrder.push('profile-services');
        return Reflect.apply(profileDescriptor.value as (...args: unknown[]) => unknown, this, []);
      },
    });
    const owner = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1(
      localPlayableOptions('dependency-ordered-cleanup', modeRegistryCandidate()),
    );
    try {
      expect(() => owner.destroy()).toThrow(/清理不完整/);
      expect(cleanupOrder).toEqual(['playable']);
      owner.destroy();
      expect(cleanupOrder).toEqual([
        'playable',
        'playable',
        'learning-settlement-recovery',
        'learning-settlement-intent-journal',
        'profile-services',
      ]);
      expect(() => owner.getSnapshot()).toThrow(/已销毁/);
    } finally {
      Object.defineProperty(
        ArenaThreeModeAuthoritativePlayableHostCandidateV1.prototype,
        'destroy',
        playableDescriptor,
      );
      Object.defineProperty(
        ArenaV2LearningSettlementRecoveryOwnerCandidateV1.prototype,
        'destroy',
        recoveryDescriptor,
      );
      Object.defineProperty(
        ArenaV2LearningSettlementIntentJournalCandidateV1.prototype,
        'destroy',
        journalDescriptor,
      );
      Object.defineProperty(
        ArenaV2ProfileServicesOwnerCandidateV1.prototype,
        'destroy',
        profileDescriptor,
      );
    }
  });

  it('retains Local construction cleanup debt until every created owner is released', () => {
    const recoveryDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2LearningSettlementRecoveryOwnerCandidateV1.prototype,
      'destroy',
    );
    const profileDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2ProfileServicesOwnerCandidateV1.prototype,
      'destroy',
    );
    expect(recoveryDescriptor).toBeDefined();
    expect(profileDescriptor).toBeDefined();
    if (recoveryDescriptor === undefined || typeof recoveryDescriptor.value !== 'function'
      || profileDescriptor === undefined || typeof profileDescriptor.value !== 'function') return;
    let recoveryDestroyCalls = 0;
    let profileDestroyCalls = 0;
    Object.defineProperty(
      ArenaV2LearningSettlementRecoveryOwnerCandidateV1.prototype,
      'destroy',
      {
        ...recoveryDescriptor,
        value(this: ArenaV2LearningSettlementRecoveryOwnerCandidateV1) {
          recoveryDestroyCalls += 1;
          return Reflect.apply(recoveryDescriptor.value as (...args: unknown[]) => unknown, this, []);
        },
      },
    );
    Object.defineProperty(ArenaV2ProfileServicesOwnerCandidateV1.prototype, 'destroy', {
      ...profileDescriptor,
      value(this: ArenaV2ProfileServicesOwnerCandidateV1) {
        profileDestroyCalls += 1;
        if (profileDestroyCalls === 1) throw new Error('injected profile cleanup failure');
        return Reflect.apply(profileDescriptor.value as (...args: unknown[]) => unknown, this, []);
      },
    });
    try {
      let constructionDebt: unknown;
      try {
        new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
          ...localPlayableOptions('construction-cleanup-debt', modeRegistryCandidate()),
          visual: Object.freeze({ present() {}, remove() {} }),
        });
      } catch (error) {
        constructionDebt = error;
      }
      expect(constructionDebt).toBeInstanceOf(
        ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1,
      );
      const debt = (
        constructionDebt as ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1
      );
      expect(debt.cleanupComplete).toBe(false);
      expect(recoveryDestroyCalls).toBe(1);
      expect(profileDestroyCalls).toBe(1);
      debt.retryCleanup();
      expect(debt.cleanupComplete).toBe(true);
      expect(recoveryDestroyCalls).toBe(1);
      expect(profileDestroyCalls).toBe(2);
      debt.retryCleanup();
      expect(profileDestroyCalls).toBe(2);
    } finally {
      Object.defineProperty(
        ArenaV2LearningSettlementRecoveryOwnerCandidateV1.prototype,
        'destroy',
        recoveryDescriptor,
      );
      Object.defineProperty(
        ArenaV2ProfileServicesOwnerCandidateV1.prototype,
        'destroy',
        profileDescriptor,
      );
    }
  });

  it('does not release Local Profile dependencies before nested Playable debt is complete', () => {
    const createSessionDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
      'createSession',
    );
    const sessionDestroyDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
      'destroy',
    );
    const hudDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1.prototype,
      'dispose',
    );
    const profileDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2ProfileServicesOwnerCandidateV1.prototype,
      'destroy',
    );
    expect(createSessionDescriptor).toBeDefined();
    expect(sessionDestroyDescriptor).toBeDefined();
    expect(hudDescriptor).toBeDefined();
    expect(profileDescriptor).toBeDefined();
    if (createSessionDescriptor === undefined
      || sessionDestroyDescriptor === undefined
      || typeof sessionDestroyDescriptor.value !== 'function'
      || hudDescriptor === undefined || typeof hudDescriptor.value !== 'function'
      || profileDescriptor === undefined || typeof profileDescriptor.value !== 'function') return;
    let sessionDestroyCalls = 0;
    let hudDisposeCalls = 0;
    let profileDestroyCalls = 0;
    Object.defineProperty(
      ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
      'createSession',
      {
        configurable: createSessionDescriptor.configurable,
        enumerable: createSessionDescriptor.enumerable,
        get() { return undefined; },
      },
    );
    Object.defineProperty(
      ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
      'destroy',
      {
        ...sessionDestroyDescriptor,
        value(this: ArenaV2ModeLearningSessionFactoryCandidateV1) {
          sessionDestroyCalls += 1;
          if (sessionDestroyCalls <= 2) {
            throw new Error('injected nested Session Factory cleanup failure');
          }
          return Reflect.apply(
            sessionDestroyDescriptor.value as (...args: unknown[]) => unknown,
            this,
            [],
          );
        },
      },
    );
    Object.defineProperty(
      ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1.prototype,
      'dispose',
      {
        ...hudDescriptor,
        value(this: ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1) {
          hudDisposeCalls += 1;
          throw new Error('injected HUD cleanup failure');
        },
      },
    );
    Object.defineProperty(ArenaV2ProfileServicesOwnerCandidateV1.prototype, 'destroy', {
      ...profileDescriptor,
      value(this: ArenaV2ProfileServicesOwnerCandidateV1) {
        profileDestroyCalls += 1;
        return Reflect.apply(profileDescriptor.value as (...args: unknown[]) => unknown, this, []);
      },
    });
    try {
      let constructionDebt: unknown;
      try {
        new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1({
          ...localPlayableOptions('nested-construction-cleanup-debt', modeRegistryCandidate()),
        });
      } catch (error) {
        constructionDebt = error;
      }
      expect(constructionDebt).toBeInstanceOf(
        ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1,
      );
      const debt = (
        constructionDebt as ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1
      );
      expect(debt.cleanupComplete).toBe(false);
      expect(profileDestroyCalls).toBe(0);
      expect(sessionDestroyCalls).toBe(1);
      expect(hudDisposeCalls).toBeGreaterThan(0);
      Object.defineProperty(
        ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1.prototype,
        'dispose',
        hudDescriptor,
      );
      expect(() => debt.retryCleanup()).toThrow(/构造资源清理不完整/);
      expect(profileDestroyCalls).toBe(0);
      expect(sessionDestroyCalls).toBe(2);
      debt.retryCleanup();
      expect(debt.cleanupComplete).toBe(true);
      expect(profileDestroyCalls).toBe(1);
      expect(sessionDestroyCalls).toBe(3);
    } finally {
      Object.defineProperty(
        ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
        'createSession',
        createSessionDescriptor,
      );
      Object.defineProperty(
        ArenaV2ModeLearningSessionFactoryCandidateV1.prototype,
        'destroy',
        sessionDestroyDescriptor,
      );
      Object.defineProperty(
        ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1.prototype,
        'dispose',
        hudDescriptor,
      );
      Object.defineProperty(
        ArenaV2ProfileServicesOwnerCandidateV1.prototype,
        'destroy',
        profileDescriptor,
      );
    }
  });

  it('retains the Information producer until the HUD consumer is truly disposed', () => {
    const hudDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1.prototype,
      'dispose',
    );
    const informationDescriptor = Object.getOwnPropertyDescriptor(
      ArenaThreeModeAuthoritativeInformationHostCandidateV1.prototype,
      'destroy',
    );
    expect(hudDescriptor).toBeDefined();
    expect(informationDescriptor).toBeDefined();
    if (hudDescriptor === undefined || typeof hudDescriptor.value !== 'function'
      || informationDescriptor === undefined || typeof informationDescriptor.value !== 'function') {
      return;
    }
    const cleanupOrder: string[] = [];
    let hudAttempt = 0;
    Object.defineProperty(
      ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1.prototype,
      'dispose',
      {
        ...hudDescriptor,
        value(this: ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1) {
          cleanupOrder.push('hud');
          hudAttempt += 1;
          if (hudAttempt === 1) throw new Error('injected HUD cleanup failure');
          return Reflect.apply(hudDescriptor.value as (...args: unknown[]) => unknown, this, []);
        },
      },
    );
    Object.defineProperty(
      ArenaThreeModeAuthoritativeInformationHostCandidateV1.prototype,
      'destroy',
      {
        ...informationDescriptor,
        value(this: ArenaThreeModeAuthoritativeInformationHostCandidateV1) {
          cleanupOrder.push('information');
          return Reflect.apply(
            informationDescriptor.value as (...args: unknown[]) => unknown,
            this,
            [],
          );
        },
      },
    );
    const profiles = profileServicesOwner('playable-dependency-ordered-cleanup');
    const owner = new ArenaThreeModeAuthoritativePlayableHostCandidateV1({
      ...informationHostOptions(profiles, modeRegistryCandidate()),
      audio: Object.freeze({ play() {}, stopAll() {} }),
      visual: Object.freeze({ present() {}, remove() {}, clear() {} }),
      qualityTier: 'high',
      preferences: Object.freeze({ soundEnabled: true, reducedMotion: false }),
    });
    try {
      expect(() => owner.destroy()).toThrow(/清理不完整/);
      expect(cleanupOrder).toEqual(['hud']);
      owner.destroy();
      expect(cleanupOrder).toEqual(['hud', 'hud', 'information']);
      expect(() => owner.getSnapshot()).toThrow(/已开始清理/);
    } finally {
      Object.defineProperty(
        ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1.prototype,
        'dispose',
        hudDescriptor,
      );
      Object.defineProperty(
        ArenaThreeModeAuthoritativeInformationHostCandidateV1.prototype,
        'destroy',
        informationDescriptor,
      );
      profiles.destroy();
    }
  });

  it('binds only the verified Mode Registry hash into stable content identity', () => {
    const firstCandidate = modeRegistryCandidate();
    const sameContentCandidate = modeRegistryCandidate();
    const changedPolicyCandidate = modeRegistryCandidate('changed-policy-identity');
    expect(sameContentCandidate.registryContentHash).toBe(firstCandidate.registryContentHash);
    expect(changedPolicyCandidate.registryContentHash).not.toBe(
      firstCandidate.registryContentHash,
    );

    const identities = [firstCandidate, sameContentCandidate, changedPolicyCandidate].map(
      (candidate) => {
        const factory = new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1(
          options(candidate),
        );
        const bundle = factory.createMatchBundle({
          schemaVersion: 1,
          generation: 1,
          modeKind: 'race',
        });
        const publicMatchInfo = bundle.publicMatchInfo as Readonly<{
          content: Readonly<{ contentDefinitionId: string; contentHash: string }>;
        }>;
        const authorityAdmission = bundle.authorityAdmission as Readonly<{
          modeDriverContentHash: string;
        }>;
        const identity = Object.freeze({
          contentDefinitionId: publicMatchInfo.content.contentDefinitionId,
          contentHash: publicMatchInfo.content.contentHash,
          modeDriverContentHash: authorityAdmission.modeDriverContentHash,
        });
        expect(identity.contentDefinitionId.endsWith(
          `.mode-registry-${candidate.registryContentHash}`,
        )).toBe(true);
        expect(publicMatchInfo).not.toHaveProperty('modeRegistryCandidate');
        expect(publicMatchInfo).not.toHaveProperty('modeRegistry');
        (bundle.matchSession as { destroy(): void }).destroy();
        factory.destroy();
        return identity;
      },
    );

    expect(identities[1]).toEqual(identities[0]);
    expect(identities[2]).not.toEqual(identities[0]);
    expect(identities[2]!.modeDriverContentHash).not.toBe(
      identities[0]!.modeDriverContentHash,
    );

    const legacyIsolatedFactory = createArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1({
      seedSource: Object.freeze({ nextSeed: () => 33 }),
    });
    const legacyIsolatedBundle = legacyIsolatedFactory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    });
    const legacyPublicMatchInfo = legacyIsolatedBundle.publicMatchInfo as Readonly<{
      content: Readonly<{ contentDefinitionId: string }>;
    }>;
    expect(legacyPublicMatchInfo.content.contentDefinitionId).not.toContain('.mode-registry-');
    (legacyIsolatedBundle.matchSession as { destroy(): void }).destroy();
    legacyIsolatedFactory.destroy();

    expect(ARENA_THREE_MODE_MODE_REGISTRY_PREFLIGHT_QUICK_MATCH_FACTORY_CANDIDATE_V1)
      .toMatchObject({
        contentIdentityWired: true,
        bundleContentIdentityPostconditionWired: true,
        runtimePolicyConsumptionWired: false,
        resolvedFrozenRuntimePolicyConsumptionWired: true,
        timelineRuntimePolicyConsumptionWired: false,
        explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
        explicitTimelinePolicyRuntimeMirrorWired: false,
        raceEliminationAndRelationshipPolicyConsumedByRuntime: true,
        survivalEliminationAndRelationshipPolicyConsumedByRuntime: true,
        objectiveAndResultExistingSemanticsIdentityBound: true,
        threeModeObjectivePolicyAssertedAtTerminal: true,
        threeModeResultPolicyAssertedAtTerminal: true,
        presentationConsumesModeRegistry: false,
      });
  });

  it('destroys and rejects a delegated bundle whose PublicInfo lost registry identity', () => {
    const createDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2QuickMatchBundleFactoryCandidateV1.prototype,
      'createMatchBundle',
    );
    expect(createDescriptor).toBeDefined();
    if (createDescriptor === undefined) return;

    const candidate = modeRegistryCandidate();
    const factory = new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1(
      options(candidate),
    );
    let sessionDestroyCalls = 0;
    const rejectedBundle = Object.freeze({
      schemaVersion: 1 as const,
      generation: 1,
      modeKind: 'duel' as const,
      modeDefinitionId: candidate.modeDefinitionIds.duel,
      matchSession: Object.freeze({
        destroy() {
          sessionDestroyCalls += 1;
        },
      }),
      publicMatchInfo: Object.freeze({
        content: Object.freeze({
          contentDefinitionId: 'arena-v2.content.duel-authoritative.candidate.v1',
        }),
      }),
      authorityIdentity: Object.freeze({}),
      authorityRegistry: null,
      authorityAdmission: null,
      recipientParticipantId: 'arena-duel-player-01',
    });
    Object.defineProperty(
      ArenaV2QuickMatchBundleFactoryCandidateV1.prototype,
      'createMatchBundle',
      {
        ...createDescriptor,
        value() {
          return rejectedBundle;
        },
      },
    );
    try {
      expect(() => factory.createMatchBundle({
        schemaVersion: 1,
        generation: 1,
        modeKind: 'duel',
      })).toThrow(/contentDefinitionId.*Registry hash/);
      expect(sessionDestroyCalls).toBe(1);
    } finally {
      Object.defineProperty(
        ArenaV2QuickMatchBundleFactoryCandidateV1.prototype,
        'createMatchBundle',
        createDescriptor,
      );
      try {
        expect(() => factory.createMatchBundle({
          schemaVersion: 1,
          generation: 2,
          modeKind: 'race',
        })).toThrow(/失败关闭/);
      } finally {
        factory.destroy();
      }
    }
  });

  it('rejects a declared then field from the first selection provider before later reads', () => {
    const candidate = modeRegistryCandidate();
    let characterReads = 0;
    let weaponReads = 0;
    let mapReads = 0;
    const factory = new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...options(candidate),
      selectedCharacterDefinitionIdProvider() {
        characterReads += 1;
        return { then: null };
      },
      selectedWeaponDefinitionIdProvider() {
        weaponReads += 1;
        return 'must-not-read';
      },
      selectedMapDefinitionIdProvider() {
        mapReads += 1;
        return 'must-not-read';
      },
    });

    try {
      expect(() => factory.createMatchBundle({
        schemaVersion: 1,
        generation: 1,
        modeKind: 'duel',
      })).toThrow(/then字段.*同步完成/);
      expect([characterReads, weaponReads, mapReads]).toEqual([1, 0, 0]);
    } finally {
      factory.destroy();
    }
  });

  it('rejects ModeRegistry prototype drift before delegation and after bundle creation', () => {
    const listDescriptor = Object.getOwnPropertyDescriptor(ModeRegistry.prototype, 'list');
    const resolveDescriptor = Object.getOwnPropertyDescriptor(ModeRegistry.prototype, 'resolve');
    expect(listDescriptor).toBeDefined();
    expect(resolveDescriptor).toBeDefined();
    if (listDescriptor === undefined || resolveDescriptor === undefined) return;

    const candidate = modeRegistryCandidate();
    let seedCalls = 0;
    const beforeFactory = new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...options(candidate),
      seedSource: Object.freeze({ nextSeed: () => { seedCalls += 1; return 31; } }),
    });
    let hostileListCalls = 0;
    Object.defineProperty(ModeRegistry.prototype, 'list', {
      ...listDescriptor,
      value(this: ModeRegistry) {
        hostileListCalls += 1;
        try {
          beforeFactory.destroy();
        } catch {}
        return (listDescriptor.value as (this: ModeRegistry) => readonly unknown[]).call(this);
      },
    });
    try {
      expect(() => beforeFactory.createMatchBundle({
        schemaVersion: 1,
        generation: 1,
        modeKind: 'duel',
      })).toThrow(/原型成员.*漂移/);
      expect(seedCalls).toBe(0);
      expect(hostileListCalls).toBe(0);
    } finally {
      Object.defineProperty(ModeRegistry.prototype, 'list', listDescriptor);
      beforeFactory.destroy();
    }

    let afterFactory!: ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1;
    let hostileResolveCalls = 0;
    afterFactory = new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...options(candidate),
      seedSource: Object.freeze({
        nextSeed() {
          Object.defineProperty(ModeRegistry.prototype, 'resolve', {
            ...resolveDescriptor,
            value(this: ModeRegistry, id: string) {
              hostileResolveCalls += 1;
              try {
                afterFactory.createMatchBundle({
                  schemaVersion: 1,
                  generation: 2,
                  modeKind: 'race',
                });
              } catch {}
              return (resolveDescriptor.value as (
                this: ModeRegistry,
                definitionId: string,
              ) => unknown).call(this, id);
            },
          });
          return 32;
        },
      }),
    });
    try {
      expect(() => afterFactory.createMatchBundle({
        schemaVersion: 1,
        generation: 1,
        modeKind: 'duel',
      })).toThrow(/原型成员.*漂移/);
      expect(hostileResolveCalls).toBe(0);
    } finally {
      Object.defineProperty(ModeRegistry.prototype, 'resolve', resolveDescriptor);
      try {
        expect(() => afterFactory.createMatchBundle({
          schemaVersion: 1,
          generation: 2,
          modeKind: 'race',
        })).toThrow(/失败关闭/);
      } finally {
        afterFactory.destroy();
      }
    }
  });

  it('requires explicit counts and closes Policy, runtime and pre-registered slot boundaries', () => {
    const candidate = modeRegistryCandidate();
    const base = options(candidate);
    const missingRace = { ...base } as DataRecord;
    delete missingRace.raceParticipantCount;
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1(
      missingRace as never,
    )).toThrow(/raceParticipantCount.*必填/);
    const missingSurvival = { ...base } as DataRecord;
    delete missingSurvival.survivalEnemyCount;
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1(
      missingSurvival as never,
    )).toThrow(/survivalEnemyCount.*必填/);
    for (const raceParticipantCount of [1, 5]) {
      expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
        ...base,
        raceParticipantCount,
      })).toThrow(/race|Policy/i);
    }
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...base,
      survivalEnemyCount: 17,
    })).toThrow(/survival|Policy|slot/i);
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...base,
      survivalEnemyCount: 2,
    })).toThrow(/runtime支持目录/);
  });

  it('rejects ID, kind, hash, fake Registry, future fields, getters and thenables', () => {
    const candidate = modeRegistryCandidate();
    const base = options(candidate);
    const idDrift = Object.freeze({
      ...candidate,
      modeDefinitionIds: Object.freeze({
        ...candidate.modeDefinitionIds,
        race: 'arena.mode.race.drift',
      }),
    });
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...base,
      modeRegistryCandidate: idDrift,
    })).toThrow(/稳定身份漂移/);

    const resolved = Object.values(candidate.modeDefinitionIds).map((id) => (
      candidate.registry.resolve(id)
    ));
    const policiesById = new Map(resolved.flatMap((bundle) => [
      bundle.participant,
      bundle.timeline,
      bundle.objective,
      bundle.elimination,
      bundle.respawn,
      bundle.relationship,
      bundle.result,
      ...(bundle.survivalPressure === null ? [] : [bundle.survivalPressure]),
      ...(bundle.survivalEquipmentTier === null ? [] : [bundle.survivalEquipmentTier]),
    ]).map((definition) => [definition.id, definition] as const));
    const kindDriftRegistry = new ModeRegistry({
      modeDefinitions: candidate.registry.list().map((definition) => ({
        ...definition,
        id: definition.id === candidate.modeDefinitionIds.duel
          ? candidate.modeDefinitionIds.race
          : definition.id === candidate.modeDefinitionIds.race
            ? candidate.modeDefinitionIds.duel
            : definition.id,
      })),
      policyDefinitions: [...policiesById.values()],
      mapCapabilityIds: [...new Set(candidate.registry.list().flatMap(
        ({ requiredMapCapabilities }) => requiredMapCapabilities,
      ))],
      equipmentSupplyDefinitionIds: resolved.flatMap(({ mode }) => (
        mode.equipmentSupplyDefinitionId === null ? [] : [mode.equipmentSupplyDefinitionId]
      )),
      equipmentDefinitionIds: [...new Set(resolved.flatMap(({ survivalEquipmentTier }) => (
        survivalEquipmentTier === null
          ? []
          : survivalEquipmentTier.tiers.flatMap(({ variants }) => variants.flatMap((variant) => [
            variant.collectionEquipmentDefinitionId,
            variant.runtimeEquipmentDefinitionId,
          ]))
      )))],
    });
    const kindDrift = Object.freeze({
      ...candidate,
      registryContentHash: kindDriftRegistry.contentHash,
      registry: kindDriftRegistry,
    });
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...base,
      modeRegistryCandidate: kindDrift,
    })).toThrow(/Mode kind漂移/);
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...base,
      modeRegistryCandidate: Object.freeze({
        ...candidate,
        registryContentHash: '00000000',
      }),
    })).toThrow(/contentHash/);
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...base,
      modeRegistryCandidate: Object.freeze({ ...candidate, registry: Object.freeze({}) }),
    })).toThrow(/真实冻结ModeRegistry/);

    let getterCalls = 0;
    const getterCandidate = { ...candidate } as DataRecord;
    Object.defineProperty(getterCandidate, 'status', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'production-unreachable';
      },
    });
    Object.freeze(getterCandidate);
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...base,
      modeRegistryCandidate: getterCandidate,
    })).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    const thenable = Object.freeze({
      ...candidate,
      then() {
        thenCalls += 1;
      },
    });
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...base,
      modeRegistryCandidate: thenable,
    })).toThrow(/then|字段/);
    expect(thenCalls).toBe(0);
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...base,
      modeRegistryCandidate: Object.freeze({ ...candidate, future: true }),
    })).toThrow(/future/);
    expect(() => new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...base,
      future: true,
    } as never)).toThrow(/future/);
  });

  it('fails closed when seed callbacks swallow nested create or destroy attempts', () => {
    const candidate = modeRegistryCandidate();
    let nestedCreate!: ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1;
    nestedCreate = new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...options(candidate),
      seedSource: Object.freeze({
        nextSeed() {
          try {
            nestedCreate.createMatchBundle({
              schemaVersion: 1,
              generation: 1,
              modeKind: 'duel',
            });
          } catch {}
          return 21;
        },
      }),
    });
    expect(() => nestedCreate.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    })).toThrow(/重入|destroy尝试/);
    expect(() => nestedCreate.createMatchBundle({
      schemaVersion: 1,
      generation: 2,
      modeKind: 'race',
    })).toThrow(/失败关闭/);
    nestedCreate.destroy();

    let nestedDestroy!: ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1;
    nestedDestroy = new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({
      ...options(candidate),
      seedSource: Object.freeze({
        nextSeed() {
          try {
            nestedDestroy.destroy();
          } catch {}
          return 22;
        },
      }),
    });
    expect(() => nestedDestroy.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    })).toThrow(/重入|destroy尝试/);
    expect(() => nestedDestroy.createMatchBundle({
      schemaVersion: 1,
      generation: 2,
      modeKind: 'race',
    })).toThrow(/失败关闭/);
    nestedDestroy.destroy();
  });
});
