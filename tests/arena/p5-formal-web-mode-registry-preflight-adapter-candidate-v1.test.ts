import test from 'node:test';
import assert from 'node:assert/strict';
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
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
  ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_ENEMY_SLOT_IDS_CANDIDATE_V1,
  ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1,
  createArenaV2ThreeModeRegistryCandidateV1,
} from '@number-strategy-jump/arena-product-content';
import {
  preflightArenaThreeModeModeRegistryCandidateV1,
} from '@number-strategy-jump/arena-regression';
import {
  ARENA_V2_FORMAL_WEB_MODE_REGISTRY_PREFLIGHT_ADAPTER_CANDIDATE_V1,
  adaptArenaV2FormalWebModeRegistryPreflightCandidateV1,
} from '../../src/entry/arena-v2-formal-web-mode-registry-preflight-adapter-candidate-v1.js';

type DataRecord = Record<string, unknown>;
type TestModeKind = 'duel' | 'race' | 'survival';

function envelope(kind: TestModeKind, type: string): DataRecord {
  return {
    schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
    id: `arena-v2.mode-policy.${kind}.${type}.formal-web-preflight-fixture.candidate.v1`,
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

function modeRegistryCandidate() {
  const definitions = [MODE_KIND.DUEL, MODE_KIND.RACE, MODE_KIND.SURVIVAL].flatMap((kind) => [
    participantPolicy(kind),
    timelinePolicy(kind),
    objectivePolicy(kind),
    eliminationPolicy(kind),
    respawnPolicy(kind),
    relationshipPolicy(kind),
    resultPolicy(kind),
  ]);
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

function input(candidate = modeRegistryCandidate()): DataRecord {
  return {
    modeRegistryCandidate: candidate,
    raceParticipantCount: 4,
    survivalEnemyCount: 16,
  };
}

test('Formal Web adapter delegates the exact three-field enemy-count contract', () => {
  const source = input();
  const expected = preflightArenaThreeModeModeRegistryCandidateV1(source as never);
  const actual = adaptArenaV2FormalWebModeRegistryPreflightCandidateV1(source as never);

  assert.deepEqual(actual, expected);
  assert.equal(actual.raceParticipantCount, 4);
  assert.equal(actual.survivalEnemyCount, 16);
  assert.equal(Object.isFrozen(actual), true);
  assert.equal(Object.isFrozen(actual.modePolicyIdentities), true);
  assert.equal(Object.isFrozen(actual.modePolicyIdentities.survival), true);
  assert.equal(Object.isFrozen(actual.timelineRuntimeWiringEligibility), true);
  assert.equal(actual.timelineRuntimeWiringEligibility.mayWireRuntimeTimelinePolicy, false);
  assert.deepEqual(Object.keys(actual), [
    'schemaVersion',
    'status',
    'implementationStatus',
    'validationStatus',
    'registryContentHash',
    'raceParticipantCount',
    'survivalEnemyCount',
    'timelineRuntimeWiringEligibility',
    'modePolicyIdentities',
  ]);
  assert.equal('modeRegistryCandidate' in actual, false);
  assert.equal('registry' in actual, false);
  assert.equal('authorizationToken' in actual, false);

  assert.deepEqual(
    adaptArenaV2FormalWebModeRegistryPreflightCandidateV1(source as never),
    actual,
  );
});

test('Formal Web adapter metadata wires only the explicit top-level consumer', () => {
  assert.deepEqual(
    ARENA_V2_FORMAL_WEB_MODE_REGISTRY_PREFLIGHT_ADAPTER_CANDIDATE_V1,
    {
      schemaVersion: 1,
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      adapterWired: true,
      topLevelConsumerWired: true,
      defaultRegistryWired: false,
      defaultCompositionWired: false,
      defaultEntryWired: false,
      runtimePolicyConsumptionWired: false,
      timelineRuntimePolicyConsumptionWired: false,
      timelineRuntimeWiringEligibilityReported: true,
      timelineWiringEligibilityIsAuthorizationToken: false,
      createsResources: false,
      hasExternalCallbacks: false,
      preflightSummaryIsAuthorizationToken: false,
      downstreamCandidateRevalidationRequired: true,
      validationStatus: 'not-run',
    },
  );
  assert.equal(
    Object.isFrozen(ARENA_V2_FORMAL_WEB_MODE_REGISTRY_PREFLIGHT_ADAPTER_CANDIDATE_V1),
    true,
  );
});

test('Formal Web adapter rejects missing, extra, symbol and non-plain inputs', () => {
  const valid = input();
  const missingEnemyCount = { ...valid };
  delete missingEnemyCount.survivalEnemyCount;
  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1(missingEnemyCount as never),
    /survivalEnemyCount.*数据字段/,
  );
  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1({
      ...valid,
      future: true,
    } as never),
    /future|未知字段/,
  );
  const symbolInput = { ...valid } as DataRecord;
  Object.defineProperty(symbolInput, Symbol('future'), { value: true, enumerable: true });
  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1(symbolInput as never),
    /Symbol|符号/,
  );
  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1(
      Object.assign(Object.create({ inherited: true }), valid) as never,
    ),
    /普通对象|原型/,
  );
});

test('Formal Web adapter never executes hostile accessors or then methods', () => {
  let getterCalls = 0;
  let thenCalls = 0;
  const valid = input();
  const accessorInput = {
    raceParticipantCount: valid.raceParticipantCount,
    survivalEnemyCount: valid.survivalEnemyCount,
  } as DataRecord;
  Object.defineProperty(accessorInput, 'modeRegistryCandidate', {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error('must not execute');
    },
  });
  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1(accessorInput as never),
    /访问器|数据字段/,
  );
  assert.equal(getterCalls, 0);

  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1({
      ...valid,
      then() {
        thenCalls += 1;
        throw new Error('must not execute');
      },
    } as never),
    /then|未知字段/,
  );
  assert.equal(thenCalls, 0);

  const hostileCandidate = Object.freeze({
    ...(valid.modeRegistryCandidate as DataRecord),
    then() {
      thenCalls += 1;
      throw new Error('must not execute');
    },
  });
  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1({
      ...valid,
      modeRegistryCandidate: hostileCandidate,
    } as never),
    /then|未知字段/,
  );
  assert.equal(thenCalls, 0);
});

test('Formal Web adapter rejects registry identity and explicit count drift', () => {
  const valid = input();
  const driftedCandidate = Object.freeze({
    ...(valid.modeRegistryCandidate as DataRecord),
    registryContentHash: 'deadbeef',
  });
  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1({
      ...valid,
      modeRegistryCandidate: driftedCandidate,
    } as never),
    /contentHash|漂移/,
  );
  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1({
      ...valid,
      raceParticipantCount: 5,
    } as never),
    /人数|支持目录|边界/,
  );
  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1({
      ...valid,
      survivalEnemyCount: 2,
    } as never),
    /人数|支持目录|边界/,
  );
  assert.throws(
    () => adaptArenaV2FormalWebModeRegistryPreflightCandidateV1({
      ...valid,
      survivalEnemyCount: 17,
    } as never),
    /人数|slot|支持目录|边界/,
  );
});
