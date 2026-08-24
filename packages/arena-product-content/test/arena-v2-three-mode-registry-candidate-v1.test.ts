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
  type TimelinePolicyDefinitionV2,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from '../src/arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from '../src/arena-v2-kz-switchback-map-candidate-v1.js';
import {
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
} from '../src/arena-v2-learning-profile-definition-candidate-v1.js';
import {
  ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
} from '../src/arena-v2-race-finish-capability-id-v1.js';
import {
  ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1,
  resolveArenaV2RaceRespawnFallbackAnchorCandidateV1,
} from '../src/arena-v2-race-respawn-tuning-candidate-v1.js';
import {
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1,
} from '../src/arena-v2-survival-baseline-weapon-tiers-candidate-v1.js';
import {
  ARENA_V2_SURVIVAL_ENEMY_SLOT_IDS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1,
} from '../src/arena-v2-survival-pressure-candidate-v1.js';
import {
  ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1,
  resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1,
} from '../src/arena-v2-survival-first-respawn-tuning-candidate-v1.js';
import {
  ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1,
} from '../src/arena-v2-three-mode-timeline-product-proposal-candidate-v1.js';
import {
  ARENA_V2_THREE_MODE_REGISTRY_ASSEMBLY_CANDIDATE_V1,
  ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION,
  createArenaV2ThreeModeRegistryCandidateV1,
} from '../src/arena-v2-three-mode-registry-candidate-v1.js';

type DataRecord = Record<string, unknown>;
type TestModeKind = 'duel' | 'race' | 'survival';

const BASE_ROUTE = ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2;
const RACE_FINISH_CAPABILITY_ID = ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1;

function policyId(kind: TestModeKind, type: string): string {
  return `arena-v2.mode-policy.${kind}.${type}.fixture.candidate.v1`;
}

function envelope(kind: TestModeKind, type: string): DataRecord {
  return {
    schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
    id: policyId(kind, type),
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
        finishGateCapabilityId: RACE_FINISH_CAPABILITY_ID,
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
        delayTicks: ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.delayTicks,
        maximumRespawns: ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.maximumRespawns,
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
  return {
    ...envelope(kind, 'relationship'),
    selfTargeting: 'forbidden',
    relations,
  };
}

function resultPolicy(kind: TestModeKind): DataRecord {
  const values = kind === MODE_KIND.DUEL
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
  return { ...envelope(kind, 'result'), resultKind: kind, ...values };
}

function basePolicies(): DataRecord[] {
  return [MODE_KIND.DUEL, MODE_KIND.RACE, MODE_KIND.SURVIVAL].flatMap((kind) => [
    participantPolicy(kind),
    timelinePolicy(kind),
    objectivePolicy(kind),
    eliminationPolicy(kind),
    respawnPolicy(kind),
    relationshipPolicy(kind),
    resultPolicy(kind),
  ]);
}

function options(): DataRecord {
  return {
    schemaVersion: ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable',
    hardGate: false,
    policyDefinitions: basePolicies().map((definition) => ({
      status: 'production-unreachable',
      definition,
    })),
  };
}

function policyDefinitions(source: DataRecord): DataRecord[] {
  return source.policyDefinitions as DataRecord[];
}

function definitionAt(source: DataRecord, index: number): DataRecord {
  return policyDefinitions(source)[index]!.definition as DataRecord;
}

describe('Arena V2 three-mode ModeRegistry candidate V1', () => {
  it('binds stable mode IDs, both map capability catalogs and frozen respawn content', () => {
    const candidate = createArenaV2ThreeModeRegistryCandidateV1(options());
    expect(candidate.status).toBe('production-unreachable');
    expect(candidate.hardGate).toBe(false);
    expect(candidate.defaultRegistryWired).toBe(false);
    expect(candidate.defaultCompositionWired).toBe(false);
    expect(candidate.defaultEntryWired).toBe(false);
    expect(candidate.requiredBasePolicyDefinitionCount).toBe(21);
    expect(candidate.registeredPolicyDefinitionCount).toBe(23);
    expect(candidate.raceRespawnTuningContentHash).toBe(
      ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.contentHash,
    );
    expect(candidate.survivalFirstRespawnTuningContentHash).toBe(
      ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.contentHash,
    );
    expect(candidate.timelineProductProposalContentHash).toBe(
      ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1.contentHash,
    );
    expect(candidate.timelineProposalStatus).toBe('proposed-not-approved');
    expect(candidate.timelineBalanceApprovalStatus).toBe('not-run');
    expect(candidate.registry.size).toBe(3);
    expect(candidate.registry.list().map(({ id }) => id)).toEqual([
      ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.duel,
      ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.race,
      ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.survival,
    ]);
    expect(candidate.mapDefinitionIds).toEqual([
      ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
      ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
    ]);
    expect(ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.mapBindings).toEqual([
      expect.objectContaining({
        mapDefinitionId: ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
        anchorSurfaceId: BASE_ROUTE.segments[0]!.surfaceIds[0],
        safeSegmentId: BASE_ROUTE.segments[0]!.id,
      }),
      expect.objectContaining({
        mapDefinitionId: ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
        anchorSurfaceId:
          ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.segments[0]!.surfaceIds[0],
        safeSegmentId:
          ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.segments[0]!.id,
      }),
    ]);
    for (const mapDefinitionId of candidate.mapDefinitionIds) {
      expect(resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1(mapDefinitionId)).toBe(
        ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId,
      );
    }
    expect(() => resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1(
      'arena-v2-map.unknown.candidate.v1',
    )).toThrow(/不支持地图/);
    expect(ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.mapBindings).toEqual([
      expect.objectContaining({
        mapDefinitionId: ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
        anchorSurfaceId: BASE_ROUTE.segments[0]!.surfaceIds[0],
        safeSegmentId: BASE_ROUTE.segments[0]!.id,
      }),
      expect.objectContaining({
        mapDefinitionId: ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
        anchorSurfaceId:
          ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.segments[0]!.surfaceIds[0],
        safeSegmentId:
          ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.segments[0]!.id,
      }),
    ]);
    for (const mapDefinitionId of candidate.mapDefinitionIds) {
      expect(resolveArenaV2RaceRespawnFallbackAnchorCandidateV1(mapDefinitionId)).toBe(
        ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId,
      );
    }

    const race = candidate.registry.resolve(
      ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.race,
    );
    expect(race.mode.requiredMapCapabilities).toContain(
      ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
    );
    expect(race.mode.requiredMapCapabilities).not.toContain(BASE_ROUTE.finishAnchorId);
    expect(race.mode.requiredMapCapabilities).not.toContain(
      ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.finishAnchorId,
    );
    expect(ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.raceFinishCapability).toEqual({
      capabilityId: ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
      anchorId: BASE_ROUTE.finishAnchorId,
    });
    expect(ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1.raceFinishCapability).toEqual({
      capabilityId: ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
      anchorId: ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.finishAnchorId,
    });
    expect(race.respawn).toEqual(
      ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.respawnPolicyDefinition,
    );

    const survival = candidate.registry.resolve(
      ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.survival,
    );
    expect(survival.survivalPressure?.id).toBe(
      ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1.id,
    );
    expect(survival.survivalEquipmentTier?.id).toBe(
      ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1.tierPolicyDefinition.id,
    );
    expect(survival.mode.equipmentSupplyDefinitionId).toBe(
      ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1.supplyDefinition.id,
    );
    expect(survival.respawn.rolePolicies.find(({ modeRole }) => modeRole === MODE_ROLE.PLAYER))
      .toMatchObject({
        delayTicks: ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.delayTicks,
        maximumRespawns: 1,
        protectionTicks:
          ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks,
        anchorPolicy: {
          kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.FIXED_ANCHOR,
          anchorCapabilityId:
            ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId,
        },
      });
    expect(survival.respawn.id).toBe(
      ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.respawnPolicyDefinition.id,
    );
    expect(candidate.registryContentHash).toMatch(/^[0-9a-f]+$/);
    expect(Object.isFrozen(candidate)).toBe(true);
    expect(ARENA_V2_THREE_MODE_REGISTRY_ASSEMBLY_CANDIDATE_V1
      .createsDefaultRegistryInstance).toBe(false);
  });

  it('requires every explicit production-unreachable base Policy field and type', () => {
    const missingField = options();
    delete policyDefinitions(missingField)[0]!.definition;
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(missingField)).toThrow(/definition/);

    const missingPolicy = options();
    policyDefinitions(missingPolicy).pop();
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(missingPolicy)).toThrow(/21项/);

    const wrongStatus = options();
    policyDefinitions(wrongStatus)[0]!.status = 'ready';
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(wrongStatus)).toThrow(
      /production-unreachable/,
    );

    const future = options();
    future.future = true;
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(future)).toThrow(/future/);
  });

  it('rejects .test. identities, identity drift and map reference drift before publication', () => {
    const testIdentity = options();
    definitionAt(testIdentity, 0).id = 'arena-v2.mode-policy.duel.participant.test.v1';
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(testIdentity)).toThrow(/非.test/);

    const wrongModePrefix = options();
    definitionAt(wrongModePrefix, 0).id = policyId(MODE_KIND.RACE, 'participant');
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(wrongModePrefix)).toThrow(/具名candidate/);

    const mapDrift = options();
    const raceObjective = definitionAt(mapDrift, 9).objective as DataRecord;
    raceObjective.finishGateCapabilityId = 'arena-v2-map-capability.unknown.candidate.v1';
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(mapDrift)).toThrow(/统一终点能力/);

    const concreteFinishDrift = options();
    const concreteRaceObjective = definitionAt(concreteFinishDrift, 9).objective as DataRecord;
    concreteRaceObjective.finishGateCapabilityId = BASE_ROUTE.finishAnchorId;
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(concreteFinishDrift)).toThrow(
      /统一终点能力/,
    );

    const respawnDrift = options();
    const survivalRespawn = definitionAt(respawnDrift, 18);
    const playerPolicy = (survivalRespawn.rolePolicies as DataRecord[]).find(
      ({ modeRole }) => modeRole === MODE_ROLE.PLAYER,
    )!;
    playerPolicy.delayTicks =
      ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.delayTicks + 1;
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(respawnDrift)).toThrow(
      /首次复活候选调优/,
    );

    const raceRespawnDrift = options();
    const raceRespawn = definitionAt(raceRespawnDrift, 11);
    const competitorPolicy = (raceRespawn.rolePolicies as DataRecord[])[0]!;
    competitorPolicy.protectionTicks =
      ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks + 1;
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(raceRespawnDrift)).toThrow(
      /Race Respawn Policy必须绑定统一重生候选调优/,
    );

    const timelineDrift = options();
    const duelTimeline = definitionAt(timelineDrift, 1);
    (duelTimeline.variants as DataRecord[])[0]!.hardLimitActiveTicks = 3_601;
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(timelineDrift)).toThrow(
      /唯一未批准产品提案/,
    );
  });

  it('closes all references deterministically and detaches caller-owned input', () => {
    const firstInput = options();
    const first = createArenaV2ThreeModeRegistryCandidateV1(firstInput);
    const reordered = options();
    policyDefinitions(reordered).reverse();
    const second = createArenaV2ThreeModeRegistryCandidateV1(reordered);
    expect(second.registryContentHash).toBe(first.registryContentHash);

    (definitionAt(firstInput, 1).variants as DataRecord[])[0]!.hardLimitActiveTicks = 9_999_999;
    const detachedTimeline = first.registry.resolve(
      ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.duel,
    ).timeline;
    expect(detachedTimeline.contentVersion).toBe(2);
    expect(Object.hasOwn(detachedTimeline, 'variants')).toBe(true);
    expect((detachedTimeline as TimelinePolicyDefinitionV2)
      .variants[0]!.hardLimitActiveTicks).toBe(3_600);

    let getterCalls = 0;
    const hostile = options();
    Object.defineProperty(hostile, 'hardGate', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return false;
      },
    });
    expect(() => createArenaV2ThreeModeRegistryCandidateV1(hostile)).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);
  });

});
