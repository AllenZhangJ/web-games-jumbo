import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createModeDefinition,
  MODE_DEFINITION_SCHEMA_VERSION,
  MODE_KIND,
} from '../src/mode-definition.js';
import {
  createModePolicyDefinition,
  MODE_CONTROLLER_KIND,
  MODE_FALL_DISPOSITION,
  MODE_POLICY_DEFINITION_SCHEMA_VERSION,
  MODE_POLICY_TEST_MAXIMUM_ENEMY_SLOTS,
  MODE_RELATIONSHIP,
  MODE_RESPAWN_ANCHOR_POLICY_KIND,
  MODE_ROLE,
  MODE_SLOT_RULE_KIND,
  MODE_TEAM_RULE_KIND,
} from '../src/mode-policy-definition.js';
import { ModePolicyRegistry, ModeRegistry } from '../src/mode-registry.js';

type DataRecord = Record<string, unknown>;

const TEST_CONTENT_VERSION = 1;
const SURVIVAL_SUPPLY_ID = 'arena.supply.survival.test.v1';
const COLLECTION_IDS = Object.freeze(['chain.collection.test', 'hammer.collection.test']);
const RUNTIME_IDS = Object.freeze([
  'chain.runtime.level-1.test',
  'chain.runtime.level-2.test',
  'hammer.runtime.level-1.test',
  'hammer.runtime.level-2.test',
]);

function policyId(kind: string, type: string): string {
  return `arena.mode.${kind}.policy.${type}.test.v1`;
}

function policyEnvelope(kind: string, type: string): DataRecord {
  return {
    schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
    id: policyId(kind, type),
    contentVersion: TEST_CONTENT_VERSION,
    modeKind: kind,
  };
}

function participantPolicy(kind: 'duel' | 'race' | 'survival'): DataRecord {
  if (kind === MODE_KIND.SURVIVAL) {
    return {
      ...policyEnvelope(kind, 'participant'),
      minimumParticipants: 2,
      maximumParticipants: 5,
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
        maximumCount: 4,
        allowedControllerKinds: [MODE_CONTROLLER_KIND.BOT],
        teamRule: { kind: MODE_TEAM_RULE_KIND.NONE },
        slotRule: {
          kind: MODE_SLOT_RULE_KIND.FIXED,
          slotIds: ['enemy-slot-4.test', 'enemy-slot-2.test', 'enemy-slot-1.test', 'enemy-slot-3.test'],
        },
      }],
      controllerKindBounds: [{
        controllerKind: MODE_CONTROLLER_KIND.BOT,
        minimumCount: 1,
        maximumCount: 4,
      }, {
        controllerKind: MODE_CONTROLLER_KIND.HUMAN,
        minimumCount: 1,
        maximumCount: 1,
      }],
    };
  }
  const maximumParticipants = kind === MODE_KIND.DUEL ? 2 : 4;
  return {
    ...policyEnvelope(kind, 'participant'),
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
      controllerKind: MODE_CONTROLLER_KIND.BOT,
      minimumCount: 0,
      maximumCount: kind === MODE_KIND.DUEL ? 2 : 3,
    }, {
      controllerKind: MODE_CONTROLLER_KIND.HUMAN,
      minimumCount: kind === MODE_KIND.RACE ? 1 : 0,
      maximumCount: maximumParticipants,
    }],
  };
}

function timelinePolicy(kind: 'duel' | 'race' | 'survival'): DataRecord {
  return {
    ...policyEnvelope(kind, 'timeline'),
    preparingTicks: kind === MODE_KIND.SURVIVAL ? 0 : 60,
    hardLimitTicks: 2_500,
    suddenDeathStartActiveTick: kind === MODE_KIND.DUEL ? 1_200 : null,
  };
}

function objectivePolicy(kind: 'duel' | 'race' | 'survival'): DataRecord {
  const objective = kind === MODE_KIND.DUEL
    ? { kind, timeoutPolicy: 'score-or-draw' }
    : kind === MODE_KIND.RACE
      ? {
        kind,
        finishGateCapabilityId: 'race-finish-gate.test',
        validClaimEndPolicy: 'claim-tick',
        sameTickRankPolicy: 'shared-rank-1',
        hardLimitPolicy: 'no-finisher',
      }
      : { kind, terminalPlayerFallCount: 2, hardLimitPolicy: 'survival-time-cap' };
  return { ...policyEnvelope(kind, 'objective'), objective };
}

function eliminationPolicy(kind: 'duel' | 'race' | 'survival'): DataRecord {
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
  return { ...policyEnvelope(kind, 'elimination'), roleDispositions };
}

function respawnPolicy(kind: 'duel' | 'race' | 'survival'): DataRecord {
  if (kind === MODE_KIND.DUEL) {
    return {
      ...policyEnvelope(kind, 'respawn'),
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
      ...policyEnvelope(kind, 'respawn'),
      rolePolicies: [{
        modeRole: MODE_ROLE.COMPETITOR,
        enabled: true,
        delayTicks: 180,
        maximumRespawns: null,
        anchorPolicy: {
          kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.LATEST_VALID_SAFE_ANCHOR,
          fallbackAnchorCapabilityId: 'race-start-safe-anchor.test',
        },
        protectionTicks: 12,
      }],
    };
  }
  return {
    ...policyEnvelope(kind, 'respawn'),
    rolePolicies: [{
      modeRole: MODE_ROLE.ENEMY,
      enabled: false,
      delayTicks: 0,
      maximumRespawns: 0,
      anchorPolicy: { kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.DISABLED },
      protectionTicks: 0,
    }, {
      modeRole: MODE_ROLE.PLAYER,
      enabled: true,
      delayTicks: 30,
      maximumRespawns: 1,
      anchorPolicy: {
        kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.FIXED_ANCHOR,
        anchorCapabilityId: 'survival-player-respawn-anchor.test',
      },
      protectionTicks: 10,
    }],
  };
}

function relationshipPolicy(kind: 'duel' | 'race' | 'survival'): DataRecord {
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
    ...policyEnvelope(kind, 'relationship'),
    selfTargeting: 'forbidden',
    relations,
  };
}

function resultPolicy(kind: 'duel' | 'race' | 'survival'): DataRecord {
  const byMode = {
    [MODE_KIND.DUEL]: {
      allowedReasons: [
        'timeout-score',
        'last-participant-standing',
        'timeout-draw',
        'simultaneous-elimination',
      ],
      projectionPolicy: 'winner-ids-draw',
    },
    [MODE_KIND.RACE]: {
      allowedReasons: ['no-finisher', 'finish-claimed'],
      projectionPolicy: 'finish-then-progress-with-ties',
    },
    [MODE_KIND.SURVIVAL]: {
      allowedReasons: ['terminal-player-fall', 'survival-time-cap'],
      projectionPolicy: 'ticks-stage-falls',
    },
  } as const;
  return {
    ...policyEnvelope(kind, 'result'),
    resultKind: kind,
    ...byMode[kind],
  };
}

function survivalPressurePolicy(): DataRecord {
  return {
    ...policyEnvelope(MODE_KIND.SURVIVAL, 'pressure'),
    slotActivationOrder: [
      'enemy-slot-1.test',
      'enemy-slot-2.test',
      'enemy-slot-3.test',
      'enemy-slot-4.test',
    ],
    slotEntries: [1, 2, 3, 4].map((index) => ({
      slotId: `enemy-slot-${index}.test`,
      anchorCapabilityId: `survival-enemy-anchor-${index}.test`,
    })),
    stages: [{
      stage: 0,
      startActiveTick: 0,
      desiredActiveEnemySlots: 1,
      reactivationDelayTicks: 30,
    }, {
      stage: 1,
      startActiveTick: 600,
      desiredActiveEnemySlots: 2,
      reactivationDelayTicks: 24,
    }, {
      stage: 2,
      startActiveTick: 1_200,
      desiredActiveEnemySlots: 4,
      reactivationDelayTicks: 18,
    }],
  };
}

function survivalTierPolicy(): DataRecord {
  return {
    ...policyEnvelope(MODE_KIND.SURVIVAL, 'tier'),
    supplyDefinitionId: SURVIVAL_SUPPLY_ID,
    tiers: [{
      minimumWaveIndex: 0,
      survivalLevel: 1,
      variants: [{
        collectionEquipmentDefinitionId: 'hammer.collection.test',
        runtimeEquipmentDefinitionId: 'hammer.runtime.level-1.test',
      }, {
        collectionEquipmentDefinitionId: 'chain.collection.test',
        runtimeEquipmentDefinitionId: 'chain.runtime.level-1.test',
      }],
    }, {
      minimumWaveIndex: 5,
      survivalLevel: 2,
      variants: [{
        collectionEquipmentDefinitionId: 'chain.collection.test',
        runtimeEquipmentDefinitionId: 'chain.runtime.level-2.test',
      }, {
        collectionEquipmentDefinitionId: 'hammer.collection.test',
        runtimeEquipmentDefinitionId: 'hammer.runtime.level-2.test',
      }],
    }],
  };
}

function modeDefinition(kind: 'duel' | 'race' | 'survival'): DataRecord {
  const requiredMapCapabilities = kind === MODE_KIND.RACE
    ? ['race-start-safe-anchor.test', 'race-finish-gate.test']
    : kind === MODE_KIND.SURVIVAL
      ? [
        'survival-player-respawn-anchor.test',
        'survival-enemy-anchor-1.test',
        'survival-enemy-anchor-2.test',
        'survival-enemy-anchor-3.test',
        'survival-enemy-anchor-4.test',
      ]
      : [];
  return {
    schemaVersion: MODE_DEFINITION_SCHEMA_VERSION,
    id: `arena.mode.${kind}.test.v1`,
    kind,
    participantPolicyDefinitionId: policyId(kind, 'participant'),
    timelinePolicyDefinitionId: policyId(kind, 'timeline'),
    objectivePolicyDefinitionId: policyId(kind, 'objective'),
    eliminationPolicyDefinitionId: policyId(kind, 'elimination'),
    respawnPolicyDefinitionId: policyId(kind, 'respawn'),
    relationshipPolicyDefinitionId: policyId(kind, 'relationship'),
    resultPolicyDefinitionId: policyId(kind, 'result'),
    requiredMapCapabilities,
    equipmentSupplyDefinitionId: kind === MODE_KIND.SURVIVAL ? SURVIVAL_SUPPLY_ID : null,
    survivalPressurePolicyDefinitionId: kind === MODE_KIND.SURVIVAL
      ? policyId(kind, 'pressure')
      : null,
    survivalEquipmentTierPolicyDefinitionId: kind === MODE_KIND.SURVIVAL
      ? policyId(kind, 'tier')
      : null,
  };
}

function allPolicies(): DataRecord[] {
  const common = [MODE_KIND.DUEL, MODE_KIND.RACE, MODE_KIND.SURVIVAL].flatMap((kind) => [
    participantPolicy(kind),
    timelinePolicy(kind),
    objectivePolicy(kind),
    eliminationPolicy(kind),
    respawnPolicy(kind),
    relationshipPolicy(kind),
    resultPolicy(kind),
  ]);
  return [...common, survivalPressurePolicy(), survivalTierPolicy()];
}

function registrySource(): DataRecord {
  return {
    modeDefinitions: [
      modeDefinition(MODE_KIND.SURVIVAL),
      modeDefinition(MODE_KIND.DUEL),
      modeDefinition(MODE_KIND.RACE),
    ],
    policyDefinitions: allPolicies().reverse(),
    mapCapabilityIds: [
      'race-finish-gate.test',
      'race-start-safe-anchor.test',
      'survival-player-respawn-anchor.test',
      'survival-enemy-anchor-1.test',
      'survival-enemy-anchor-2.test',
      'survival-enemy-anchor-3.test',
      'survival-enemy-anchor-4.test',
    ],
    equipmentSupplyDefinitionIds: [SURVIVAL_SUPPLY_ID],
    equipmentDefinitionIds: [...COLLECTION_IDS, ...RUNTIME_IDS],
  };
}

function mutableCopy<T>(value: T): T {
  return structuredClone(value);
}

function findPolicy(source: DataRecord, id: string): DataRecord {
  const policies = source.policyDefinitions as DataRecord[];
  const policy = policies.find((candidate) => candidate.id === id);
  if (!policy) throw new Error(`missing fixture policy ${id}`);
  return policy;
}

describe('P2.0a Mode Definition and Policy contracts', () => {
  it('normalizes three test-only mode bundles, closes references and freezes caller-owned data', () => {
    const source = registrySource();
    const registry = new ModeRegistry(source);
    expect(registry.size).toBe(3);
    expect(registry.contentHash).toMatch(/^[0-9a-f]+$/);
    expect(registry.has('arena.mode.race.test.v1')).toBe(true);
    expect(registry.get('arena.mode.missing.test')).toBeUndefined();
    expect(() => registry.require('arena.mode.missing.test')).toThrow(/未知 ModeDefinition/);
    expect(registry.list().map((definition) => definition.id)).toEqual([
      'arena.mode.duel.test.v1',
      'arena.mode.race.test.v1',
      'arena.mode.survival.test.v1',
    ]);
    expect(Object.isFrozen(registry.list())).toBe(true);
    const reordered = mutableCopy(registrySource());
    (reordered.modeDefinitions as DataRecord[]).reverse();
    (reordered.policyDefinitions as DataRecord[]).reverse();
    (reordered.mapCapabilityIds as string[]).reverse();
    (reordered.equipmentDefinitionIds as string[]).reverse();
    expect(new ModeRegistry(reordered).contentHash).toBe(registry.contentHash);
    const survival = registry.resolve('arena.mode.survival.test.v1');
    expect(survival.contentVersion).toBe(TEST_CONTENT_VERSION);
    expect(survival.survivalPressure?.slotActivationOrder).toEqual([
      'enemy-slot-1.test',
      'enemy-slot-2.test',
      'enemy-slot-3.test',
      'enemy-slot-4.test',
    ]);
    expect(survival.survivalEquipmentTier?.tiers[0]?.variants.map(
      (variant) => variant.collectionEquipmentDefinitionId,
    )).toEqual(['chain.collection.test', 'hammer.collection.test']);
    expect(Object.isFrozen(survival)).toBe(true);
    expect(Object.isFrozen(survival.participant.roles)).toBe(true);
    expect(Object.isFrozen(survival.survivalPressure?.stages)).toBe(true);

    (source.modeDefinitions as DataRecord[])[0]!.id = 'mutated-after-construction';
    ((source.policyDefinitions as DataRecord[])[0]!.tiers as DataRecord[])[0]!.survivalLevel = 999;
    expect(registry.require('arena.mode.survival.test.v1').id).toBe(
      'arena.mode.survival.test.v1',
    );
    expect(survival.survivalEquipmentTier?.tiers[0]?.survivalLevel).toBe(1);
  });

  it('rejects hostile registry lookup ids without coercing caller values', () => {
    const registry = new ModeRegistry(registrySource());
    const policies = new ModePolicyRegistry(allPolicies());
    let coercions = 0;
    const hostile = Object.defineProperty(Object.create(null), Symbol.toPrimitive, {
      value() {
        coercions += 1;
        throw new Error('must-not-coerce');
      },
    });
    expect(() => registry.require(hostile as never)).toThrow(/id/);
    expect(() => registry.resolve(hostile as never)).toThrow(/id/);
    expect(() => policies.require(hostile as never)).toThrow(/id/);
    expect(coercions).toBe(0);
  });

  it('rejects ModeDefinition missing/extra/future fields and invalid Survival references', () => {
    const valid = modeDefinition(MODE_KIND.SURVIVAL);
    expect(createModeDefinition(valid).requiredMapCapabilities).toEqual([
      'survival-enemy-anchor-1.test',
      'survival-enemy-anchor-2.test',
      'survival-enemy-anchor-3.test',
      'survival-enemy-anchor-4.test',
      'survival-player-respawn-anchor.test',
    ]);
    const missing = mutableCopy(valid);
    delete missing.resultPolicyDefinitionId;
    expect(() => createModeDefinition(missing)).toThrow(/resultPolicyDefinitionId/);
    expect(() => createModeDefinition({ ...valid, schemaVersion: 2 })).toThrow(/schemaVersion/);
    expect(() => createModeDefinition({ ...valid, future: true })).toThrow(/future/);
    expect(() => createModeDefinition({
      ...valid,
      survivalPressurePolicyDefinitionId: null,
    })).toThrow(/Survival/);
    expect(() => createModeDefinition({
      ...modeDefinition(MODE_KIND.DUEL),
      survivalPressurePolicyDefinitionId: 'unexpected.test',
    })).toThrow(/非 Survival/);
    expect(() => createModeDefinition({
      ...valid,
      requiredMapCapabilities: ['duplicate.test', 'duplicate.test'],
    })).toThrow(/重复/);
  });

  it('recognizes all nine exact-key Policy variants without adding a free-form discriminator', () => {
    const policies = [
      participantPolicy(MODE_KIND.SURVIVAL),
      timelinePolicy(MODE_KIND.SURVIVAL),
      objectivePolicy(MODE_KIND.SURVIVAL),
      eliminationPolicy(MODE_KIND.SURVIVAL),
      respawnPolicy(MODE_KIND.SURVIVAL),
      relationshipPolicy(MODE_KIND.SURVIVAL),
      resultPolicy(MODE_KIND.SURVIVAL),
      survivalPressurePolicy(),
      survivalTierPolicy(),
    ];
    for (const policy of policies) {
      const normalized = createModePolicyDefinition(policy);
      expect(normalized.schemaVersion).toBe(MODE_POLICY_DEFINITION_SCHEMA_VERSION);
      expect(Object.isFrozen(normalized)).toBe(true);
    }
    expect(() => createModePolicyDefinition({
      ...participantPolicy(MODE_KIND.SURVIVAL),
      objective: { kind: MODE_KIND.SURVIVAL },
    })).toThrow(/九类 Policy/);
    expect(() => createModePolicyDefinition({
      schemaVersion: 1,
      id: 'unknown.policy.test',
      contentVersion: 1,
      modeKind: MODE_KIND.DUEL,
    })).toThrow(/九类 Policy/);
    expect(() => createModePolicyDefinition({
      ...timelinePolicy(MODE_KIND.DUEL),
      schemaVersion: 2,
    })).toThrow(/schemaVersion/);
  });

  it('fails closed on participant ranges, controller closure, slots, sparse arrays and unsafe integers', () => {
    const invalidRace = participantPolicy(MODE_KIND.RACE);
    (invalidRace.controllerKindBounds as DataRecord[])
      .find((bound) => bound.controllerKind === MODE_CONTROLLER_KIND.HUMAN)!.minimumCount = 0;
    expect(() => createModePolicyDefinition(invalidRace)).toThrow(/至少 1 human/);

    const invalidSurvival = participantPolicy(MODE_KIND.SURVIVAL);
    const enemy = (invalidSurvival.roles as DataRecord[])
      .find((role) => role.modeRole === MODE_ROLE.ENEMY)!;
    enemy.maximumCount = MODE_POLICY_TEST_MAXIMUM_ENEMY_SLOTS + 1;
    expect(() => createModePolicyDefinition(invalidSurvival)).toThrow(/1 human player/);

    const wrongSlots = participantPolicy(MODE_KIND.SURVIVAL);
    const wrongEnemy = (wrongSlots.roles as DataRecord[])
      .find((role) => role.modeRole === MODE_ROLE.ENEMY)!;
    (wrongEnemy.slotRule as DataRecord).slotIds = ['only-one-slot.test'];
    expect(() => createModePolicyDefinition(wrongSlots)).toThrow(/enemy Bot slot/);

    const sparse = participantPolicy(MODE_KIND.DUEL);
    const sparseRoles = new Array(1);
    sparse.roles = sparseRoles;
    expect(() => createModePolicyDefinition(sparse)).toThrow(/空槽|访问器/);
    expect(() => createModePolicyDefinition({
      ...timelinePolicy(MODE_KIND.DUEL),
      hardLimitTicks: Number.MAX_SAFE_INTEGER + 1,
    })).toThrow(/安全整数/);
    expect(() => createModePolicyDefinition({
      ...timelinePolicy(MODE_KIND.DUEL),
      hardLimitTicks: Number.NaN,
    })).toThrow(/安全整数/);

    const oversizedController = participantPolicy(MODE_KIND.DUEL);
    (oversizedController.controllerKindBounds as DataRecord[])[0]!.maximumCount = 3;
    expect(() => createModePolicyDefinition(oversizedController)).toThrow(/controller count/);

    const implicitTeam = participantPolicy(MODE_KIND.RACE);
    ((implicitTeam.roles as DataRecord[])[0]!.teamRule as DataRecord).kind =
      MODE_TEAM_RULE_KIND.FIXED;
    ((implicitTeam.roles as DataRecord[])[0]!.teamRule as DataRecord).teamId =
      'hidden-team.test';
    expect(() => createModePolicyDefinition(implicitTeam)).toThrow(/teamRule 必须为 none/);
  });

  it('locks mode-specific timeline, objective, elimination, respawn, relationship and result semantics', () => {
    expect(() => createModePolicyDefinition({
      ...timelinePolicy(MODE_KIND.RACE),
      preparingTicks: 59,
    })).toThrow(/60/);
    expect(() => createModePolicyDefinition({
      ...timelinePolicy(MODE_KIND.SURVIVAL),
      suddenDeathStartActiveTick: 1,
    })).toThrow(/null/);
    expect(() => createModePolicyDefinition({
      ...objectivePolicy(MODE_KIND.RACE),
      objective: {
        ...(objectivePolicy(MODE_KIND.RACE).objective as DataRecord),
        sameTickRankPolicy: 'participant-id-wins',
      },
    })).toThrow(/shared-rank-1/);
    expect(() => createModePolicyDefinition({
      ...eliminationPolicy(MODE_KIND.SURVIVAL),
      roleDispositions: [{
        modeRole: MODE_ROLE.ENEMY,
        fallDisposition: MODE_FALL_DISPOSITION.ELIMINATE,
      }, {
        modeRole: MODE_ROLE.PLAYER,
        fallDisposition: MODE_FALL_DISPOSITION.COUNT_FOR_OBJECTIVE,
      }],
    })).toThrow(/fall disposition/);
    const raceRespawn = respawnPolicy(MODE_KIND.RACE);
    (raceRespawn.rolePolicies as DataRecord[])[0]!.delayTicks = 179;
    expect(() => createModePolicyDefinition(raceRespawn)).toThrow(/180 tick/);
    const missingRelation = relationshipPolicy(MODE_KIND.SURVIVAL);
    (missingRelation.relations as DataRecord[]).pop();
    expect(() => createModePolicyDefinition(missingRelation)).toThrow(/完整覆盖|冻结集合/);
    expect(() => createModePolicyDefinition({
      ...resultPolicy(MODE_KIND.SURVIVAL),
      allowedReasons: ['terminal-player-fall'],
    })).toThrow(/冻结集合/);
  });

  it('bounds Survival pressure slots/stages and tier collection/runtime identity', () => {
    const duplicateSlot = survivalPressurePolicy();
    (duplicateSlot.slotActivationOrder as string[])[1] = 'enemy-slot-1.test';
    expect(() => createModePolicyDefinition(duplicateSlot)).toThrow(/重复/);

    const discontinuousStage = survivalPressurePolicy();
    (discontinuousStage.stages as DataRecord[])[1]!.stage = 2;
    expect(() => createModePolicyDefinition(discontinuousStage)).toThrow(/连续/);
    expect(() => createModePolicyDefinition({
      ...survivalPressurePolicy(),
      modeKind: MODE_KIND.RACE,
    })).toThrow(/只允许 survival/);
    const emptyPressure = survivalPressurePolicy();
    (emptyPressure.stages as DataRecord[])[0]!.desiredActiveEnemySlots = 0;
    expect(() => createModePolicyDefinition(emptyPressure)).toThrow(/大于等于 1/);

    const missingWaveZero = survivalTierPolicy();
    (missingWaveZero.tiers as DataRecord[])[0]!.minimumWaveIndex = 1;
    expect(() => createModePolicyDefinition(missingWaveZero)).toThrow(/wave 0/);
    const reusedRuntime = survivalTierPolicy();
    const tiers = reusedRuntime.tiers as DataRecord[];
    const firstRuntime = ((tiers[0]!.variants as DataRecord[])[0]!).runtimeEquipmentDefinitionId;
    ((tiers[1]!.variants as DataRecord[])[0]!).runtimeEquipmentDefinitionId = firstRuntime;
    expect(() => createModePolicyDefinition(reusedRuntime)).toThrow(/复用 runtime ID|多个 collection/);
    const missingCollection = survivalTierPolicy();
    (missingCollection.tiers as DataRecord[])[1]!.variants = [
      ((missingCollection.tiers as DataRecord[])[1]!.variants as DataRecord[])[0]!,
    ];
    expect(() => createModePolicyDefinition(missingCollection)).toThrow(/collection closure/);
  });

  it('rejects duplicate Policy IDs and every broken Mode reference closure', () => {
    const duplicatePolicies = allPolicies();
    duplicatePolicies.push(mutableCopy(duplicatePolicies[0]!));
    expect(() => new ModePolicyRegistry(duplicatePolicies)).toThrow(/重复 id/);

    const duplicateModes = registrySource();
    (duplicateModes.modeDefinitions as DataRecord[]).push(
      mutableCopy((duplicateModes.modeDefinitions as DataRecord[])[0]!),
    );
    expect(() => new ModeRegistry(duplicateModes)).toThrow(/重复 id/);

    const unusedPolicy = registrySource();
    (unusedPolicy.policyDefinitions as DataRecord[]).push({
      ...timelinePolicy(MODE_KIND.DUEL),
      id: 'arena.mode.duel.policy.unused-timeline.test.v1',
    });
    expect(() => new ModeRegistry(unusedPolicy)).toThrow(/未被任何Mode引用/);

    const orphanPolicy = registrySource();
    (orphanPolicy.policyDefinitions as DataRecord[]).push({
      ...timelinePolicy(MODE_KIND.DUEL),
      id: 'arena.mode.duel.policy.timeline.orphan.test.v1',
    });
    expect(() => new ModeRegistry(orphanPolicy)).toThrow(/未被任何Mode引用/);

    const missingPolicy = registrySource();
    missingPolicy.policyDefinitions = (missingPolicy.policyDefinitions as DataRecord[])
      .filter((policy) => policy.id !== policyId(MODE_KIND.RACE, 'result'));
    expect(() => new ModeRegistry(missingPolicy)).toThrow(/未知 ModePolicyDefinition/);

    const wrongType = registrySource();
    const raceMode = (wrongType.modeDefinitions as DataRecord[])
      .find((definition) => definition.kind === MODE_KIND.RACE)!;
    raceMode.resultPolicyDefinitionId = policyId(MODE_KIND.RACE, 'timeline');
    expect(() => new ModeRegistry(wrongType)).toThrow(/未引用 result Policy/);

    const versionDrift = registrySource();
    findPolicy(versionDrift, policyId(MODE_KIND.DUEL, 'result')).contentVersion = 2;
    expect(() => new ModeRegistry(versionDrift)).toThrow(/contentVersion/);

    const mapDrift = registrySource();
    mapDrift.mapCapabilityIds = (mapDrift.mapCapabilityIds as string[])
      .filter((id) => id !== 'race-finish-gate.test');
    expect(() => new ModeRegistry(mapDrift)).toThrow(/未注册 ID/);

    const supplyDrift = registrySource();
    findPolicy(supplyDrift, policyId(MODE_KIND.SURVIVAL, 'tier')).supplyDefinitionId =
      'foreign-supply.test';
    expect(() => new ModeRegistry(supplyDrift)).toThrow(/supply/);

    const equipmentDrift = registrySource();
    equipmentDrift.equipmentDefinitionIds = (equipmentDrift.equipmentDefinitionIds as string[])
      .filter((id) => id !== 'hammer.runtime.level-2.test');
    expect(() => new ModeRegistry(equipmentDrift)).toThrow(/未注册 ID/);

    const slotDrift = registrySource();
    const pressure = findPolicy(slotDrift, policyId(MODE_KIND.SURVIVAL, 'pressure'));
    (pressure.slotActivationOrder as string[])[3] = 'foreign-enemy-slot.test';
    (pressure.slotEntries as DataRecord[])[3]!.slotId = 'foreign-enemy-slot.test';
    expect(() => new ModeRegistry(slotDrift)).toThrow(/slots/);
  });

  it('rejects getters, Proxy substitution, Symbols, cycles and future fields without reading getters', () => {
    let getterCalls = 0;
    const accessor = modeDefinition(MODE_KIND.DUEL);
    Object.defineProperty(accessor, 'kind', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return MODE_KIND.DUEL;
      },
    });
    expect(() => createModeDefinition(accessor)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);

    let proxyGetCalls = 0;
    const proxy = new Proxy(modeDefinition(MODE_KIND.DUEL), {
      get() {
        proxyGetCalls += 1;
        throw new Error('must not execute get trap');
      },
      ownKeys() {
        throw new Error('hostile ownKeys');
      },
    });
    expect(() => createModeDefinition(proxy)).toThrow();
    expect(proxyGetCalls).toBe(0);

    const symbol = participantPolicy(MODE_KIND.DUEL);
    Object.defineProperty(symbol, Symbol('hostile'), { enumerable: true, value: true });
    expect(() => createModePolicyDefinition(symbol)).toThrow(/Symbol/);

    const cycle = participantPolicy(MODE_KIND.DUEL);
    (cycle.roles as DataRecord[])[0]!.cycle = cycle;
    expect(() => createModePolicyDefinition(cycle)).toThrow(/循环引用/);

    expect(() => new ModeRegistry({ ...registrySource(), future: true })).toThrow(/future/);
    expect(() => new ModeRegistry({
      ...registrySource(),
      modeDefinitions: new Map(),
    })).toThrow(/可序列化数据|普通对象/);

    const policyAccessor = participantPolicy(MODE_KIND.DUEL);
    Object.defineProperty(policyAccessor, 'minimumParticipants', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 2;
      },
    });
    expect(() => createModePolicyDefinition(policyAccessor)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);
  });

  it('publishes only versioned P2 contracts while fixtures remain explicit .test. identities', () => {
    const source = registrySource();
    for (const definition of source.modeDefinitions as DataRecord[]) {
      expect(definition.id).toContain('.test.');
    }
    for (const definition of source.policyDefinitions as DataRecord[]) {
      expect(definition.id).toContain('.test.');
    }
    const publicIndex = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
    expect(publicIndex).toMatch(/mode-definition/);
    expect(publicIndex).toMatch(/mode-policy-definition/);
    expect(publicIndex).toMatch(/mode-registry/);
  });

  it('hashes normalized closed content independently from caller ordering', () => {
    const baseline = registrySource();
    const reordered = registrySource();
    (reordered.modeDefinitions as DataRecord[]).reverse();
    (reordered.policyDefinitions as DataRecord[]).reverse();
    (reordered.mapCapabilityIds as string[]).reverse();
    (reordered.equipmentDefinitionIds as string[]).reverse();
    expect(new ModeRegistry(reordered).contentHash).toBe(new ModeRegistry(baseline).contentHash);

    const changed = registrySource();
    findPolicy(changed, policyId(MODE_KIND.SURVIVAL, 'timeline')).hardLimitTicks = 2_501;
    expect(new ModeRegistry(changed).contentHash).not.toBe(
      new ModeRegistry(baseline).contentHash,
    );
  });
});
