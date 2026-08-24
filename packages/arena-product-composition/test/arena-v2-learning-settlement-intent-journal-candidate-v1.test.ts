import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1,
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
  ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  advanceArenaV2LearningProfileV1,
  ArenaV2LearningProfileIndeterminateWriteError,
  ArenaV2LearningProfileRepositoryBusyError,
  ArenaV2LearningProfileSaveConflictError,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ArenaV2LearningProfileServiceV1,
} from '@number-strategy-jump/arena-profile-service';
import {
  ArenaV2LearningSettlementIntentJournalCandidateV1,
  ArenaV2ProfileServicesOwnerCandidateV1,
} from '../src/index.js';

function storageHarness(hooks: Readonly<{
  onWrite?: (key: string, value: unknown) => void;
  onDelete?: (key: string) => void;
}> = {}) {
  const values = new Map<string, unknown>();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return {
    storageRead(key: string) {
      return values.has(key)
        ? { ok: true, found: true, value: clone(values.get(key)) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key: string, value: unknown) {
      values.set(key, clone(value));
      hooks.onWrite?.(key, value);
      return true;
    },
    storageDelete(key: string) {
      values.delete(key);
      hooks.onDelete?.(key);
      return true;
    },
  };
}

function grants(authorityHash = 'deadbeef') {
  const learningDefinition = ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1;
  const modeDefinitionId = learningDefinition.modeDefinitions[0]!.modeDefinitionId;
  const mapDefinitionId = learningDefinition.mapDefinitions[0]!.mapDefinitionId;
  return Object.freeze({
    rewardGrant: Object.freeze({
      schemaVersion: 1 as const,
      grantId: `reward:${authorityHash}`,
      rewardDefinitionId: 'arena-v2.reward.intent-journal.test.v1',
      resultAuthorityHash: authorityHash,
      experienceDelta: 10,
      unlocks: Object.freeze({
        characterIds: Object.freeze([]),
        appearanceIds: Object.freeze([]),
        equipmentIds: Object.freeze([]),
        mapIds: Object.freeze([]),
      }),
    }),
    learningGrant: Object.freeze({
      schemaVersion: 1 as const,
      grantId: `arena-learning:v1:${authorityHash}`,
      resultAuthorityHash: authorityHash,
      recipientParticipantId: 'player-local',
      sourceModeDefinitionId: modeDefinitionId,
      sourceMapDefinitionIds: Object.freeze([mapDefinitionId]),
      collectedWeaponDefinitionIds: Object.freeze([]),
      collectedMapDefinitionIds: Object.freeze([mapDefinitionId]),
      weaponDeltas: Object.freeze([]),
      mapSegmentDeltas: Object.freeze([]),
      modeDelta: Object.freeze({
        modeDefinitionId,
        playCountDelta: 1 as const,
        completionCountDelta: 1 as const,
        winCountDelta: 0 as const,
        bestPerformanceTicksCandidate: null,
      }),
      challengeDeltas: Object.freeze([]),
    }),
  });
}

function multiWeaponGrants(authorityHash = 'feedbeef') {
  const intent = grants(authorityHash);
  const [featured, supporting] = ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1;
  if (featured === undefined || supporting === undefined) {
    throw new Error('Arena Learning settlement intent test需要至少两把正式目录武器。');
  }
  return Object.freeze({
    rewardGrant: intent.rewardGrant,
    learningGrant: Object.freeze({
      ...intent.learningGrant,
      collectedWeaponDefinitionIds: Object.freeze([featured.equipment.id]),
      weaponDeltas: Object.freeze([{
        weaponDefinitionId: featured.equipment.id,
        useCountDelta: 1 as const,
        contextEvidence: Object.freeze([{
          context: 'ground' as const,
          evidenceDelta: 1 as const,
        }]),
      }, {
        weaponDefinitionId: supporting.equipment.id,
        useCountDelta: 0 as const,
        contextEvidence: Object.freeze([{
          context: 'ground' as const,
          evidenceDelta: 1 as const,
        }]),
      }]),
    }),
  });
}

function harness() {
  const storage = storageHarness();
  const wallNow = () => 1_000;
  const profiles = new ArenaV2ProfileServicesOwnerCandidateV1({
    rewardProfileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
    learningProfileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
    storage,
    ownerId: 'arena.intent-journal.test',
    wallNow,
    keyPrefix: 'arena.intent-journal.test',
  });
  const journal = new ArenaV2LearningSettlementIntentJournalCandidateV1({
    profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
    storage,
    ownerId: 'arena.intent-journal.test.settlement',
    wallNow,
    keyPrefix: 'arena.intent-journal.test.settlement',
  });
  journal.open();
  return { profiles, journal };
}

function learningServiceWithCommitFailures(
  initialProfile: unknown,
  failures: readonly unknown[],
) {
  let current = initialProfile;
  let commitAttempt = 0;
  const service = new ArenaV2LearningProfileServiceV1({
    definition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
    repository: {
      open() { return current; },
      getSnapshot() { return current; },
      renewLease() { return true; },
      compareAndSet(next: unknown) {
        const failure = failures[commitAttempt];
        commitAttempt += 1;
        if (failure !== undefined) throw failure;
        current = next;
        return { committed: true, reason: null, headUpdated: true };
      },
      destroy() {},
    },
  });
  service.open();
  return service;
}

describe('Arena V2 Reward/Learning settlement intent journal candidate V1', () => {
  it('discards a baseline that never reached terminal preparation', () => {
    const { profiles, journal } = harness();
    journal.captureMatchStartBaseline(profiles.learningProfileService.getSnapshot());
    expect(journal.recoverPending(
      profiles.rewardProfileService,
      profiles.learningProfileService,
    )).toMatchObject({ status: 'discarded-before-reward', reason: 'baseline-only' });
    expect(journal.getSnapshot().pendingBaselineCaptured).toBe(false);
    journal.destroy();
    profiles.destroy();
  });

  it('discards both prepared grants when Reward was never committed', () => {
    const { profiles, journal } = harness();
    const intent = grants();
    journal.captureMatchStartBaseline(profiles.learningProfileService.getSnapshot());
    journal.capturePreparedSettlementIntent(intent);
    expect(journal.recoverPending(
      profiles.rewardProfileService,
      profiles.learningProfileService,
    )).toMatchObject({
      status: 'discarded-before-reward',
      reason: 'reward-not-committed',
    });
    expect(profiles.learningProfileService.getSnapshot().revision).toBe(0);
    journal.destroy();
    profiles.destroy();
  });

  it('commits Learning exactly after the matching Reward is already durable', () => {
    const { profiles, journal } = harness();
    const intent = grants();
    journal.captureMatchStartBaseline(profiles.learningProfileService.getSnapshot());
    journal.capturePreparedSettlementIntent(intent);
    profiles.rewardProfileService.commitProgressionGrant({
      grantId: intent.rewardGrant.grantId,
      experienceDelta: intent.rewardGrant.experienceDelta,
      unlocks: intent.rewardGrant.unlocks,
    });
    const recovered = journal.recoverPending(
      profiles.rewardProfileService,
      profiles.learningProfileService,
    );
    expect(recovered).toMatchObject({
      status: 'recovered-after-reward',
      settlement: { status: 'committed', grantId: intent.learningGrant.grantId },
    });
    expect(profiles.learningProfileService.getSnapshot().committedGrantIds)
      .toContain(intent.learningGrant.grantId);
    if (recovered?.status !== 'recovered-after-reward') {
      throw new Error('expected recovered settlement intent');
    }
    expect(recovered.settlement.modeCompletionDeltas).toEqual([{
      modeDefinitionId: intent.learningGrant.sourceModeDefinitionId,
      completionCountDelta: 1,
    }]);
    journal.acknowledge({
      rewardGrantId: recovered.rewardGrant.grantId,
      learningGrantId: recovered.learningGrant.grantId,
    });
    journal.destroy();
    profiles.destroy();
  });

  it('rejects Reward/Learning terminal authority drift before any Profile write', () => {
    const { profiles, journal } = harness();
    journal.captureMatchStartBaseline(profiles.learningProfileService.getSnapshot());
    expect(() => journal.capturePreparedSettlementIntent({
      rewardGrant: grants('deadbeef').rewardGrant,
      learningGrant: grants('c0ffee00').learningGrant,
    })).toThrow(/权威身份漂移/u);
    expect(profiles.rewardProfileService.getSnapshot().revision).toBe(0);
    expect(profiles.learningProfileService.getSnapshot().revision).toBe(0);
    journal.destroy();
    profiles.destroy();
  });

  it('rejects a different Replay binding for an already committed Result before Reward writes', () => {
    const { profiles, journal } = harness();
    const intent = grants('deadbeef');
    const previouslyBoundGrant = Object.freeze({
      ...intent.learningGrant,
      grantId: 'l1:deadbeef:11111111:22222222',
    });
    const conflictingGrant = Object.freeze({
      ...intent.learningGrant,
      grantId: 'l1:deadbeef:33333333:44444444',
    });
    const baseline = advanceArenaV2LearningProfileV1(
      ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      profiles.learningProfileService.getSnapshot(),
      previouslyBoundGrant,
      0,
    ).profile;
    journal.captureMatchStartBaseline(baseline);

    expect(() => journal.capturePreparedSettlementIntent({
      rewardGrant: intent.rewardGrant,
      learningGrant: conflictingGrant,
    })).toThrow(/同一Result已绑定不同Replay结算身份/u);
    expect(profiles.rewardProfileService.getSnapshot().revision).toBe(0);
    expect(journal.getSnapshot()).toMatchObject({
      lifecycle: 'failed',
      pendingBaselineCaptured: true,
      pendingRewardGrantCaptured: false,
      pendingLearningGrantCaptured: false,
    });
    journal.destroy();
    profiles.destroy();
  });

  it('keeps the journal open and exposes explicit retry when startup Learning storage is busy', () => {
    const { profiles, journal } = harness();
    const intent = multiWeaponGrants('feedbeef');
    const baseline = profiles.learningProfileService.getSnapshot();
    journal.captureMatchStartBaseline(baseline);
    journal.capturePreparedSettlementIntent(intent);
    profiles.rewardProfileService.commitProgressionGrant({
      grantId: intent.rewardGrant.grantId,
      experienceDelta: intent.rewardGrant.experienceDelta,
      unlocks: intent.rewardGrant.unlocks,
    });
    const learning = learningServiceWithCommitFailures(baseline, [
      new ArenaV2LearningProfileRepositoryBusyError('startup lease busy'),
    ]);
    expect(journal.recoverPending(
      profiles.rewardProfileService,
      learning,
    )).toMatchObject({
      status: 'recovery-retry-required',
      reason: 'learning-profile-recovery-temporarily-unavailable',
      rewardGrantId: intent.rewardGrant.grantId,
      learningGrantId: intent.learningGrant.grantId,
    });
    expect(journal.getSnapshot().lifecycle).toBe('open');
    const recovered = journal.recoverPending(
      profiles.rewardProfileService,
      learning,
    );
    expect(recovered).toMatchObject({
      status: 'recovered-after-reward',
      settlement: { status: 'committed', grantId: intent.learningGrant.grantId },
    });
    const committedProfile = learning.getSnapshot();
    expect(committedProfile.weaponMastery.map(({ weaponDefinitionId }) => weaponDefinitionId))
      .toEqual(intent.learningGrant.weaponDeltas
        .map(({ weaponDefinitionId }) => weaponDefinitionId).sort());
    expect(committedProfile.weaponMastery.map(({ useCount }) => useCount).sort())
      .toEqual([0, 1]);
    expect(committedProfile.committedGrantIds.filter((id) => (
      id === intent.learningGrant.grantId
    ))).toHaveLength(1);
    const replayed = journal.recoverPending(
      profiles.rewardProfileService,
      learning,
    );
    expect(replayed).toMatchObject({
      status: 'recovered-after-reward',
      settlement: { status: 'committed', grantId: intent.learningGrant.grantId },
    });
    expect(learning.getSnapshot()).toEqual(committedProfile);
    if (recovered?.status !== 'recovered-after-reward') {
      throw new Error('expected recovered multi-weapon settlement intent');
    }
    journal.acknowledge({
      rewardGrantId: recovered.rewardGrant.grantId,
      learningGrantId: recovered.learningGrant.grantId,
    });
    learning.destroy();
    journal.destroy();
    profiles.destroy();
  });

  it('requires restart and keeps the complete intent after an indeterminate startup write', () => {
    const { profiles, journal } = harness();
    const intent = grants('facefeed');
    const baseline = profiles.learningProfileService.getSnapshot();
    journal.captureMatchStartBaseline(baseline);
    journal.capturePreparedSettlementIntent(intent);
    profiles.rewardProfileService.commitProgressionGrant({
      grantId: intent.rewardGrant.grantId,
      experienceDelta: intent.rewardGrant.experienceDelta,
      unlocks: intent.rewardGrant.unlocks,
    });
    const learning = learningServiceWithCommitFailures(baseline, [
      new ArenaV2LearningProfileIndeterminateWriteError('startup write indeterminate'),
    ]);
    expect(journal.recoverPending(
      profiles.rewardProfileService,
      learning,
    )).toMatchObject({
      status: 'recovery-restart-required',
      reason: 'learning-profile-recovery-indeterminate',
      rewardGrant: { grantId: intent.rewardGrant.grantId },
      learningGrant: { grantId: intent.learningGrant.grantId },
      baselineProfile: { revision: baseline.revision },
    });
    expect(journal.getSnapshot()).toMatchObject({
      lifecycle: 'failed',
      pendingRewardGrantId: intent.rewardGrant.grantId,
      pendingLearningGrantId: intent.learningGrant.grantId,
    });
    learning.destroy();
    journal.destroy();
    profiles.destroy();
  });

  it('fails closed instead of creating a restart loop for startup save conflict', () => {
    const { profiles, journal } = harness();
    const intent = grants('c001d00d');
    const baseline = profiles.learningProfileService.getSnapshot();
    journal.captureMatchStartBaseline(baseline);
    journal.capturePreparedSettlementIntent(intent);
    profiles.rewardProfileService.commitProgressionGrant({
      grantId: intent.rewardGrant.grantId,
      experienceDelta: intent.rewardGrant.experienceDelta,
      unlocks: intent.rewardGrant.unlocks,
    });
    const learning = learningServiceWithCommitFailures(baseline, [
      new ArenaV2LearningProfileSaveConflictError('startup save identity drift'),
    ]);
    expect(() => journal.recoverPending(
      profiles.rewardProfileService,
      learning,
    )).toThrow(/存档身份冲突|identity drift/u);
    expect(journal.getSnapshot().lifecycle).toBe('failed');
    learning.destroy();
    journal.destroy();
    profiles.destroy();
  });

  it('commits the durable pending watermark before rejecting swallowed storage reentry', () => {
    const profileStorage = storageHarness();
    const wallNow = () => 1_000;
    const profiles = new ArenaV2ProfileServicesOwnerCandidateV1({
      rewardProfileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
      learningProfileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      storage: profileStorage,
      ownerId: 'arena.intent-journal.reentry-profile',
      wallNow,
      keyPrefix: 'arena.intent-journal.reentry-profile',
    });
    let journal: ArenaV2LearningSettlementIntentJournalCandidateV1 | null = null;
    let triggerReentry = false;
    let swallowedReentry: unknown = null;
    const journalStorage = storageHarness({
      onWrite(key) {
        if (!triggerReentry || !key.endsWith('.intent')) return;
        const current = journal;
        if (current === null) throw new Error('journal尚未构造。');
        try { current.getSnapshot(); } catch (error) { swallowedReentry = error; }
      },
    });
    journal = new ArenaV2LearningSettlementIntentJournalCandidateV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      storage: journalStorage,
      ownerId: 'arena.intent-journal.reentry',
      wallNow,
      keyPrefix: 'arena.intent-journal.reentry',
    });
    journal.open();
    triggerReentry = true;

    expect(() => journal?.captureMatchStartBaseline(
      profiles.learningProfileService.getSnapshot(),
    )).toThrow(/重入/u);
    expect(swallowedReentry).toBeInstanceOf(Error);
    expect(journal.getSnapshot()).toMatchObject({
      lifecycle: 'failed',
      pendingBaselineCaptured: true,
    });
    journal.destroy();
    profiles.destroy();
  });
});
