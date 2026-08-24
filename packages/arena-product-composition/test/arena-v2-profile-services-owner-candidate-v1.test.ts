import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
  ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ArenaV2LearningProfileServiceV1,
  PlayerProfileService,
} from '@number-strategy-jump/arena-profile-service';
import {
  ArenaV2ProfileServicesOwnerConstructionCleanupFailureCandidateV1,
  ArenaV2ProfileServicesOwnerCandidateV1,
} from '../src/index.js';

function storageHarness() {
  const values = new Map<string, unknown>();
  return Object.freeze({
    storageRead(key: string) {
      return values.has(key)
        ? { ok: true, found: true, value: values.get(key) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key: string, value: unknown) {
      values.set(key, value);
      return true;
    },
    storageDelete(key: string) {
      values.delete(key);
      return true;
    },
  });
}

describe('Arena V2 profile services owner candidate V1 (not run)', () => {
  it('retains failed construction cleanup owners for an explicit retry', () => {
    const learningOpenDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2LearningProfileServiceV1.prototype,
      'open',
    );
    const rewardDestroyDescriptor = Object.getOwnPropertyDescriptor(
      PlayerProfileService.prototype,
      'destroy',
    );
    expect(learningOpenDescriptor).toBeDefined();
    expect(rewardDestroyDescriptor).toBeDefined();
    if (learningOpenDescriptor === undefined || typeof learningOpenDescriptor.value !== 'function'
      || rewardDestroyDescriptor === undefined
      || typeof rewardDestroyDescriptor.value !== 'function') return;
    let rewardDestroyAttempts = 0;
    Object.defineProperty(ArenaV2LearningProfileServiceV1.prototype, 'open', {
      ...learningOpenDescriptor,
      value() { throw new Error('injected learning open failure'); },
    });
    Object.defineProperty(PlayerProfileService.prototype, 'destroy', {
      ...rewardDestroyDescriptor,
      value(this: PlayerProfileService) {
        rewardDestroyAttempts += 1;
        if (rewardDestroyAttempts === 1) {
          throw new Error('injected reward cleanup failure');
        }
        return Reflect.apply(
          rewardDestroyDescriptor.value as (...args: unknown[]) => unknown,
          this,
          [],
        );
      },
    });
    try {
      let constructionDebt: unknown;
      try {
        new ArenaV2ProfileServicesOwnerCandidateV1({
          rewardProfileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
          learningProfileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
          storage: storageHarness(),
          ownerId: 'arena.profile-services-construction-cleanup.test',
          wallNow: () => 1_000,
          keyPrefix: 'arena.profile-services-construction-cleanup.test',
        });
      } catch (error) {
        constructionDebt = error;
      }
      expect(constructionDebt).toBeInstanceOf(
        ArenaV2ProfileServicesOwnerConstructionCleanupFailureCandidateV1,
      );
      const debt = constructionDebt as ArenaV2ProfileServicesOwnerConstructionCleanupFailureCandidateV1;
      expect(debt.cleanupComplete).toBe(false);
      expect(rewardDestroyAttempts).toBe(1);
      debt.retryCleanup();
      expect(debt.cleanupComplete).toBe(true);
      expect(rewardDestroyAttempts).toBe(2);
      debt.retryCleanup();
      expect(rewardDestroyAttempts).toBe(2);
    } finally {
      Object.defineProperty(
        ArenaV2LearningProfileServiceV1.prototype,
        'open',
        learningOpenDescriptor,
      );
      Object.defineProperty(
        PlayerProfileService.prototype,
        'destroy',
        rewardDestroyDescriptor,
      );
    }
  });

  it('keeps cross-profile reads and cleanup callback reentry sticky', () => {
    const snapshotOwner = new ArenaV2ProfileServicesOwnerCandidateV1({
      rewardProfileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
      learningProfileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      storage: storageHarness(),
      ownerId: 'arena.profile-services-read-reentry.test',
      wallNow: () => 1_000,
      keyPrefix: 'arena.profile-services-read-reentry.test',
    });
    const rewardSnapshotDescriptor = Object.getOwnPropertyDescriptor(
      PlayerProfileService.prototype,
      'getSnapshot',
    );
    expect(rewardSnapshotDescriptor).toBeDefined();
    if (rewardSnapshotDescriptor === undefined
      || typeof rewardSnapshotDescriptor.value !== 'function') return;
    Object.defineProperty(PlayerProfileService.prototype, 'getSnapshot', {
      ...rewardSnapshotDescriptor,
      value(this: PlayerProfileService) {
        try {
          snapshotOwner.learningProfileService;
        } catch { /* Child swallows the owner reentry rejection. */ }
        return Reflect.apply(
          rewardSnapshotDescriptor.value as (...args: unknown[]) => unknown,
          this,
          [],
        );
      },
    });
    try {
      expect(() => snapshotOwner.getSnapshot()).toThrow(/回调重入/u);
      expect(() => snapshotOwner.rewardProfileService).toThrow(/失败关闭/u);
    } finally {
      Object.defineProperty(
        PlayerProfileService.prototype,
        'getSnapshot',
        rewardSnapshotDescriptor,
      );
      snapshotOwner.destroy();
    }

    const destroyOwner = new ArenaV2ProfileServicesOwnerCandidateV1({
      rewardProfileDefinition: ARENA_V2_MODE_REWARD_PROFILE_DEFINITION_CANDIDATE_V1,
      learningProfileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      storage: storageHarness(),
      ownerId: 'arena.profile-services-destroy-reentry.test',
      wallNow: () => 1_000,
      keyPrefix: 'arena.profile-services-destroy-reentry.test',
    });
    const learningDestroyDescriptor = Object.getOwnPropertyDescriptor(
      ArenaV2LearningProfileServiceV1.prototype,
      'destroy',
    );
    const rewardDestroyDescriptor = Object.getOwnPropertyDescriptor(
      PlayerProfileService.prototype,
      'destroy',
    );
    expect(learningDestroyDescriptor).toBeDefined();
    expect(rewardDestroyDescriptor).toBeDefined();
    if (learningDestroyDescriptor === undefined
      || typeof learningDestroyDescriptor.value !== 'function'
      || rewardDestroyDescriptor === undefined
      || typeof rewardDestroyDescriptor.value !== 'function') return;
    let learningDestroyCalls = 0;
    let rewardDestroyCalls = 0;
    Object.defineProperty(ArenaV2LearningProfileServiceV1.prototype, 'destroy', {
      ...learningDestroyDescriptor,
      value(this: ArenaV2LearningProfileServiceV1) {
        learningDestroyCalls += 1;
        try {
          destroyOwner.rewardProfileService;
        } catch { /* Child swallows the owner reentry rejection. */ }
        return Reflect.apply(
          learningDestroyDescriptor.value as (...args: unknown[]) => unknown,
          this,
          [],
        );
      },
    });
    Object.defineProperty(PlayerProfileService.prototype, 'destroy', {
      ...rewardDestroyDescriptor,
      value(this: PlayerProfileService) {
        rewardDestroyCalls += 1;
        return Reflect.apply(
          rewardDestroyDescriptor.value as (...args: unknown[]) => unknown,
          this,
          [],
        );
      },
    });
    try {
      expect(() => destroyOwner.destroy()).toThrow(/回调重入/u);
      expect(learningDestroyCalls).toBe(1);
      expect(rewardDestroyCalls).toBe(0);
      Object.defineProperty(
        ArenaV2LearningProfileServiceV1.prototype,
        'destroy',
        learningDestroyDescriptor,
      );
      destroyOwner.destroy();
      destroyOwner.destroy();
      expect(learningDestroyCalls).toBe(1);
      expect(rewardDestroyCalls).toBe(1);
    } finally {
      Object.defineProperty(
        ArenaV2LearningProfileServiceV1.prototype,
        'destroy',
        learningDestroyDescriptor,
      );
      Object.defineProperty(
        PlayerProfileService.prototype,
        'destroy',
        rewardDestroyDescriptor,
      );
    }
  });
});
