import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  advanceArenaV2LearningProfileV1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ArenaV2LearningSettlementRecoveryOwnerCandidateV1,
} from '../src/arena-v2-learning-settlement-recovery-owner-candidate-v1.js';

const DEFINITION = createArenaV2LearningProfileDefinitionV1({
  schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  id: 'learning-settlement-recovery-owner.test.v1',
  contentVersion: 1,
  currentProfileSchemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  status: 'production-unreachable',
  hardGate: false,
  defaultProfileServiceWired: false,
  limits: {
    maxIdentifierLength: 96,
    maxCommittedGrantIds: 8,
    maxCounterValue: 100,
    maxCollectedWeaponIds: 2,
    maxCollectedMapIds: 2,
    maxWeaponMasteryRecords: 2,
    maxMapSegmentMasteryRecords: 2,
    maxModeRecords: 3,
    maxChallengeRecords: 2,
  },
  masteryRequirements: {
    weaponCollectionUseEvidence: 2,
    weaponContextEvidence: {
      ground: 1,
      aerial: 1,
      edge: 1,
      'duel-counterplay': 1,
      survival: 1,
    },
    mapSegmentCompletionEvidence: 1,
    modeCompletionEvidence: 2,
  },
  defaultProfileId: 'local',
  initiallyCollectedWeaponDefinitionIds: [],
  initiallyCollectedMapDefinitionIds: [],
  weaponDefinitionIds: ['weapon.a'],
  mapDefinitions: [{
    mapDefinitionId: 'map.a',
    segmentDefinitionIds: ['segment.a'],
  }],
  modeDefinitions: [
    { modeDefinitionId: 'mode.duel', kind: 'duel' },
    { modeDefinitionId: 'mode.race', kind: 'race' },
    { modeDefinitionId: 'mode.survival', kind: 'survival' },
  ],
  challengeDefinitions: [],
});

function grant() {
  return {
    schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
    grantId: 'grant.recovery.1',
    resultAuthorityHash: 'deadbeef',
    recipientParticipantId: 'p1',
    sourceModeDefinitionId: 'mode.duel',
    sourceMapDefinitionIds: ['map.a'],
    collectedWeaponDefinitionIds: ['weapon.a'],
    collectedMapDefinitionIds: ['map.a'],
    weaponDeltas: [{
      weaponDefinitionId: 'weapon.a',
      useCountDelta: 1,
      contextEvidence: [{ context: 'ground', evidenceDelta: 1 }],
    }],
    mapSegmentDeltas: [{
      mapDefinitionId: 'map.a',
      segmentDefinitionId: 'segment.a',
      completionEvidenceDelta: 1,
      raceFinishTicksCandidate: null,
      survivalTicksCandidate: null,
    }],
    modeDelta: {
      modeDefinitionId: 'mode.duel',
      playCountDelta: 1,
      completionCountDelta: 1,
      winCountDelta: 1,
      bestPerformanceTicksCandidate: 300,
    },
    challengeDeltas: [],
  };
}

function settlementFixture() {
  const baseline = createArenaV2LearningProfileV1(DEFINITION);
  const committed = advanceArenaV2LearningProfileV1(DEFINITION, baseline, grant(), 0);
  const projection = (status: 'committed' | 'duplicate') => {
    const appliesProgress = status === 'committed';
    return Object.freeze({
      status,
      grantId: committed.grant.grantId,
      profileRevision: committed.profile.revision,
      sourceModeDefinitionId: committed.grant.sourceModeDefinitionId,
      effectiveLearningProgress: appliesProgress && committed.effectiveLearningProgress,
      progressKinds: appliesProgress ? committed.progressKinds : Object.freeze([]),
      researchedWeaponDefinitionId: appliesProgress
        ? committed.researchedWeaponDefinitionId
        : null,
      weaponContextEvidenceDeltas: appliesProgress
        ? committed.weaponContextEvidenceDeltas
        : Object.freeze([]),
      mapSegmentEvidenceDeltas: appliesProgress
        ? committed.mapSegmentEvidenceDeltas
        : Object.freeze([]),
      mapRouteEvidenceDeltas: appliesProgress
        ? committed.mapRouteEvidenceDeltas
        : Object.freeze([]),
      modeCompletionDeltas: appliesProgress
        ? committed.modeCompletionDeltas
        : Object.freeze([]),
      challengeProgressDeltas: appliesProgress
        ? committed.challengeProgressDeltas
        : Object.freeze([]),
      newlyCollectedWeaponDefinitionIds: appliesProgress
        ? committed.newlyCollectedWeaponDefinitionIds
        : Object.freeze([]),
      newlyCollectedMapDefinitionIds: appliesProgress
        ? committed.newlyCollectedMapDefinitionIds
        : Object.freeze([]),
    });
  };
  return { baseline, committed, projection };
}

function ownerHarness(options: Readonly<{
  throwDuringPostProcessing?: boolean;
}> = {}) {
  const fixture = settlementFixture();
  let currentProfile: unknown = fixture.baseline;
  const finalized: string[] = [];
  const owner = new ArenaV2LearningSettlementRecoveryOwnerCandidateV1({
    profileDefinition: DEFINITION,
    readCurrentProfile: () => currentProfile,
    onSettlementFinalized: (settlement) => {
      finalized.push(settlement.grantId);
      if (options.throwDuringPostProcessing === true) {
        throw new Error('non-authoritative observer unavailable');
      }
    },
  });
  return {
    ...fixture,
    owner,
    finalized,
    setCurrentProfile(value: unknown) { currentProfile = value; },
  };
}

describe('Arena V2 Learning settlement recovery owner candidate V1', () => {
  it('keeps immutable baseline and Grant evidence across a failed duplicate recovery', () => {
    const value = ownerHarness();
    const mutableGrant = JSON.parse(JSON.stringify(value.committed.grant));
    value.owner.captureMatchStartBaseline(value.baseline);

    expect(value.owner.completeSettlement(
      value.projection('duplicate'),
      mutableGrant,
    )).toMatchObject({
      status: 'duplicate',
      grantId: 'grant.recovery.1',
      modeCompletionDeltas: [],
    });
    expect(value.owner.getRead()).toMatchObject({
      pendingBaselineCaptured: true,
      pendingGrantCaptured: true,
      retryRequired: true,
      postProcessed: false,
    });
    expect(value.owner.getSnapshot()).toMatchObject({
      read: {
        pendingBaselineCaptured: true,
        pendingGrantCaptured: true,
        retryRequired: true,
        postProcessed: false,
      },
      settlement: {
        status: 'duplicate',
        grantId: 'grant.recovery.1',
      },
    });
    expect(() => value.owner.assertCanStartMatch()).toThrow(/不能覆盖证据/u);

    mutableGrant.grantId = 'mutated-after-capture';
    mutableGrant.modeDelta.modeDefinitionId = 'mode.race';
    value.setCurrentProfile(value.committed.profile);
    expect(value.owner.retry()).toMatchObject({
      status: 'committed',
      grantId: 'grant.recovery.1',
      profileRevision: 1,
      modeCompletionDeltas: [{
        modeDefinitionId: 'mode.duel',
        completionCountDelta: 1,
      }],
    });
    expect(value.finalized).toEqual(['grant.recovery.1']);
    expect(value.owner.getRead()).toMatchObject({
      pendingBaselineCaptured: false,
      pendingGrantCaptured: false,
      retryRequired: false,
      postProcessed: true,
      lastError: null,
    });
  });

  it('finalizes a committed settlement once and never repeats post-processing', () => {
    const value = ownerHarness();
    value.owner.captureMatchStartBaseline(value.baseline);
    value.setCurrentProfile(value.committed.profile);
    expect(value.owner.completeSettlement(
      value.projection('committed'),
      value.committed.grant,
    )).toMatchObject({ status: 'committed' });
    expect(value.owner.completeSettlement(
      value.projection('duplicate'),
      value.committed.grant,
    )).toMatchObject({ status: 'committed' });
    expect(value.finalized).toEqual(['grant.recovery.1']);
    expect(() => value.owner.retry()).toThrow(/没有可重试/u);
    expect(() => value.owner.assertCanStartMatch()).not.toThrow();
  });

  it('rejects a committed projection that does not equal the canonical baseline plus Grant replay', () => {
    const value = ownerHarness();
    value.owner.captureMatchStartBaseline(value.baseline);
    value.setCurrentProfile(value.committed.profile);
    const driftedProjection = {
      ...value.projection('committed'),
      effectiveLearningProgress: !value.committed.effectiveLearningProgress,
    };

    expect(() => value.owner.completeSettlement(
      driftedProjection,
      value.committed.grant,
    )).toThrow(/结算投影与规范重放身份漂移/u);
    expect(value.finalized).toEqual([]);
    expect(value.owner.getRead()).toMatchObject({
      pendingBaselineCaptured: true,
      pendingGrantCaptured: true,
      retryRequired: true,
      postProcessed: false,
      lastError: expect.any(Error),
    });
    expect(value.owner.retry()).toEqual(value.projection('committed'));
    expect(value.finalized).toEqual(['grant.recovery.1']);
  });

  it('rejects same-ID Grant drift after finalization without repeating post-processing', () => {
    const value = ownerHarness();
    value.owner.captureMatchStartBaseline(value.baseline);
    value.setCurrentProfile(value.committed.profile);
    value.owner.completeSettlement(
      value.projection('committed'),
      value.committed.grant,
    );

    const driftedGrant = {
      ...value.committed.grant,
      weaponDeltas: value.committed.grant.weaponDeltas.map((entry) => ({
        ...entry,
        useCountDelta: entry.useCountDelta + 1,
      })),
    };
    expect(() => value.owner.completeSettlement(
      value.projection('duplicate'),
      driftedGrant,
    )).toThrow(/最终Grant身份漂移/u);
    expect(value.finalized).toEqual(['grant.recovery.1']);
    expect(value.owner.getRead()).toMatchObject({
      pendingBaselineCaptured: false,
      pendingGrantCaptured: false,
      retryRequired: false,
      postProcessed: true,
    });
    expect(value.owner.completeSettlement(
      value.projection('duplicate'),
      value.committed.grant,
    )).toMatchObject({ status: 'committed' });
    expect(value.finalized).toEqual(['grant.recovery.1']);
  });

  it('does not turn a non-authoritative post-processing failure into another Profile retry', () => {
    const value = ownerHarness({ throwDuringPostProcessing: true });
    value.owner.captureMatchStartBaseline(value.baseline);
    value.setCurrentProfile(value.committed.profile);
    expect(value.owner.completeSettlement(
      value.projection('committed'),
      value.committed.grant,
    )).toMatchObject({ status: 'committed' });
    expect(value.owner.getRead()).toMatchObject({
      retryRequired: false,
      postProcessed: true,
      lastError: null,
      lastPostProcessingError: expect.any(Error),
    });
    value.owner.completeSettlement(
      value.projection('duplicate'),
      value.committed.grant,
    );
    expect(value.finalized).toEqual(['grant.recovery.1']);
  });

  it('rejects callback reentry before another generation or settlement can mutate evidence', () => {
    const fixture = settlementFixture();
    let owner: ArenaV2LearningSettlementRecoveryOwnerCandidateV1 | null = null;
    const reentryErrors: unknown[] = [];
    owner = new ArenaV2LearningSettlementRecoveryOwnerCandidateV1({
      profileDefinition: DEFINITION,
      readCurrentProfile: () => fixture.committed.profile,
      onSettlementFinalized: (_settlement, committedGrant) => {
        const currentOwner = owner;
        if (currentOwner === null) throw new Error('owner尚未完成构造。');
        for (const operation of [
          () => currentOwner.captureMatchStartBaseline(fixture.committed.profile),
          () => currentOwner.completeSettlement(fixture.projection('duplicate'), committedGrant),
          () => currentOwner.getRead(),
          () => currentOwner.destroy(),
        ]) {
          try { operation(); } catch (error) { reentryErrors.push(error); }
        }
      },
    });
    owner.captureMatchStartBaseline(fixture.baseline);
    owner.completeSettlement(fixture.projection('committed'), fixture.committed.grant);
    expect(reentryErrors).toHaveLength(4);
    expect(reentryErrors.every((error) => (
      error instanceof Error && /重入/u.test(error.message)
    ))).toBe(true);
    expect(owner.getRead()).toMatchObject({
      retryRequired: false,
      postProcessed: true,
      lastPostProcessingError: expect.any(Error),
    });
  });

  it('stops recovery before commit when current Profile reading swallows owner reentry', () => {
    const fixture = settlementFixture();
    let owner: ArenaV2LearningSettlementRecoveryOwnerCandidateV1 | null = null;
    let swallowedReentry: unknown = null;
    owner = new ArenaV2LearningSettlementRecoveryOwnerCandidateV1({
      profileDefinition: DEFINITION,
      readCurrentProfile: () => {
        const currentOwner = owner;
        if (currentOwner === null) throw new Error('owner尚未完成构造。');
        try { currentOwner.getSnapshot(); } catch (error) { swallowedReentry = error; }
        return fixture.committed.profile;
      },
      onSettlementFinalized: () => undefined,
    });
    owner.captureMatchStartBaseline(fixture.baseline);

    expect(() => owner?.completeSettlement(
      fixture.projection('committed'),
      fixture.committed.grant,
    )).toThrow(/重入/u);
    expect(swallowedReentry).toBeInstanceOf(Error);
    expect(owner.getRead()).toMatchObject({
      pendingBaselineCaptured: true,
      pendingGrantCaptured: true,
      retryRequired: true,
      postProcessed: false,
      lastError: expect.any(Error),
    });
  });

  it('blocks baseline overwrite, rejects an ungrounded duplicate and clears only on destroy', () => {
    const pending = ownerHarness();
    const indeterminate = new Error('match start outcome indeterminate');
    pending.owner.retainIndeterminateMatchStartBaseline(pending.baseline, indeterminate);
    expect(pending.owner.getRead()).toMatchObject({
      pendingBaselineCaptured: true,
      pendingGrantCaptured: false,
      retryRequired: false,
      lastError: indeterminate,
    });
    expect(() => pending.owner.captureMatchStartBaseline(pending.baseline)).toThrow(
      /不能覆盖证据/u,
    );

    const ungrounded = ownerHarness();
    expect(() => ungrounded.owner.completeSettlement(
      ungrounded.projection('duplicate'),
      ungrounded.committed.grant,
    )).toThrow(/缺少开局前Profile基线/u);
    expect(() => ungrounded.owner.completeSettlement(
      ungrounded.projection('committed'),
      ungrounded.committed.grant,
    )).toThrow(/缺少开局前Profile基线/u);

    pending.owner.destroy();
    pending.owner.destroy();
    expect(() => pending.owner.getRead()).toThrow(/已销毁/u);
    expect(() => pending.owner.getSnapshot()).toThrow(/已销毁/u);
    expect(() => pending.owner.assertCanStartMatch()).toThrow(/已销毁/u);
  });

  it('rejects accessor, future-field and Grant identity drift before mutating evidence', () => {
    const value = ownerHarness();
    value.owner.captureMatchStartBaseline(value.baseline);
    let statusGetterCalls = 0;
    const accessor = { ...value.projection('committed') };
    Object.defineProperty(accessor, 'status', {
      enumerable: true,
      get() {
        statusGetterCalls += 1;
        return 'committed';
      },
    });
    expect(() => value.owner.completeSettlement(accessor, value.committed.grant)).toThrow();
    expect(statusGetterCalls).toBe(0);
    expect(() => value.owner.completeSettlement({
      ...value.projection('committed'),
      future: true,
    }, value.committed.grant)).toThrow(/未知字段|future/u);
    expect(() => value.owner.completeSettlement(
      value.projection('committed'),
      { ...value.committed.grant, grantId: 'grant.drift' },
    )).toThrow(/身份漂移/u);
    expect(value.owner.getRead()).toMatchObject({
      pendingBaselineCaptured: true,
      pendingGrantCaptured: false,
      postProcessed: false,
    });
  });
});
