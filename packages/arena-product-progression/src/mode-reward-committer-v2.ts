import {
  assertNonEmptyString,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createPlayerProfile,
  createPlayerProfileDefinition,
  type PlayerProfile,
  type PlayerProfileDefinition,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  createModeProgressionRegistryV2,
  type ModeProgressionRegistryV2,
  type RewardGrant,
} from '@number-strategy-jump/arena-progression';
import { readExactOptions } from './options.js';
import { resolveModeMatchRewardV2 } from './mode-reward-resolver-v2.js';
import {
  assertSynchronousRewardPortResult,
  captureSynchronousRewardDataMethod,
  type SynchronousRewardPortMethod,
} from './synchronous-reward-port-boundary.js';

export interface ModeRewardCommitterV2Options {
  readonly registry: unknown;
  readonly profileDefinition: unknown;
  readonly profileService: unknown;
  readonly recipientParticipantId: unknown;
}

export interface ModeRewardCommitOutcomeV2 {
  readonly grant: RewardGrant;
  readonly committed: boolean;
  readonly duplicate: boolean;
  readonly profile: PlayerProfile;
}

type PortMethod = SynchronousRewardPortMethod;

const OPTION_KEYS = new Set([
  'registry', 'profileDefinition', 'profileService', 'recipientParticipantId',
]);
const COMMIT_KEYS = new Set(['committed', 'duplicate', 'profile']);
const UNLOCK_KEYS = [
  'characterIds', 'appearanceIds', 'equipmentIds', 'mapIds',
] as const satisfies readonly (keyof PlayerProfile['unlocks'])[];

type ModeRewardCommitterOperationV2 = 'prepare' | 'commit';

export const MODE_REWARD_COMMITTER_OPERATION_GUARD_V2 = Object.freeze({
  operationGuardPrecedesFailureAndInputValidation: true,
  profileReadPortCheckedBeforeRewardResolution: true,
  swallowedReadReentryFailsClosedBeforePreparedGrantCommit: true,
  durableCommitOutcomeWatermarkPrecedesReentryRejection: true,
  preparedGrantPublicationChecksStickyReentryFact: true,
  duplicatePublicationChecksStickyReentryFact: true,
  validationStatus: 'not-run',
} as const);

function assertSynchronous<T>(value: T, name: string): T {
  return assertSynchronousRewardPortResult(value, name);
}

function createProfilePort(value: unknown): Readonly<{
  getSnapshot: PortMethod;
  commitProgressionGrant: PortMethod;
}> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('ModeRewardCommitterV2需要ProfileService。');
  }
  return Object.freeze({
    getSnapshot: captureSynchronousRewardDataMethod(
      value,
      'getSnapshot',
      'ModeRewardCommitterV2 ProfileService',
    ),
    commitProgressionGrant: captureSynchronousRewardDataMethod(
      value,
      'commitProgressionGrant',
      'ModeRewardCommitterV2 ProfileService',
    ),
  });
}

function recoverable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'recoverable');
    return Boolean(descriptor && 'value' in descriptor && descriptor.value === true);
  } catch {
    return false;
  }
}

function sameProfile(left: PlayerProfile, right: PlayerProfile): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function containsUnlocks(profile: PlayerProfile, grant: RewardGrant): boolean {
  return UNLOCK_KEYS.every((key) => (
    grant.unlocks[key].every((id) => profile.unlocks[key].includes(id))
  ));
}

function normalizeOutcome(
  value: unknown,
  definition: PlayerProfileDefinition,
  before: PlayerProfile,
  grant: RewardGrant,
): ModeRewardCommitOutcomeV2 {
  const source = assertPlainRecord(value, 'ModeRewardCommitterV2 commit result');
  const options = readExactOptions(source, COMMIT_KEYS, 'ModeRewardCommitterV2 commit result');
  if (typeof options.committed !== 'boolean' || typeof options.duplicate !== 'boolean') {
    throw new TypeError('ModeRewardCommitterV2 commit result状态必须是布尔值。');
  }
  if (options.committed === options.duplicate) {
    throw new RangeError('ModeRewardCommitterV2必须且只能返回committed或duplicate。');
  }
  const profile = createPlayerProfile(definition, options.profile);
  if (!profile.progression.committedGrantIds.includes(grant.grantId)) {
    throw new RangeError('ModeRewardCommitterV2结果未记录当前grant。');
  }
  if (!containsUnlocks(profile, grant)) {
    throw new RangeError('ModeRewardCommitterV2结果缺少已授予解锁。');
  }
  if (options.committed) {
    if (
      profile.revision !== before.revision + 1
      || profile.progression.experience !== before.progression.experience + grant.experienceDelta
    ) {
      throw new RangeError('ModeRewardCommitterV2结果与本次奖励变更不一致。');
    }
  } else if (
    profile.revision < before.revision
    || profile.progression.experience < before.progression.experience
  ) {
    throw new RangeError('ModeRewardCommitterV2 duplicate不得让Profile倒退。');
  }
  return Object.freeze({
    grant,
    committed: options.committed,
    duplicate: options.duplicate,
    profile,
  });
}

export class ModeRewardCommitterV2 {
  readonly #registry: ModeProgressionRegistryV2;
  readonly #profileDefinition: PlayerProfileDefinition;
  readonly #profilePort: Readonly<{
    getSnapshot: PortMethod;
    commitProgressionGrant: PortMethod;
  }>;
  readonly #recipientParticipantId: string;
  #operation: ModeRewardCommitterOperationV2 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #failed = false;
  #lastGrantId: string | null = null;
  #lastOutcome: ModeRewardCommitOutcomeV2 | null = null;
  #preparedGrant: RewardGrant | null = null;
  #preparedProfile: PlayerProfile | null = null;

  constructor(options: ModeRewardCommitterV2Options);
  constructor(value: unknown) {
    const options = readExactOptions(value, OPTION_KEYS, 'ModeRewardCommitterV2 options');
    this.#registry = createModeProgressionRegistryV2(options.registry);
    this.#profileDefinition = createPlayerProfileDefinition(options.profileDefinition);
    this.#profilePort = createProfilePort(options.profileService);
    this.#recipientParticipantId = assertNonEmptyString(
      options.recipientParticipantId,
      'ModeRewardCommitterV2.recipientParticipantId',
    );
    Object.freeze(this);
  }

  #recordReentry(requestedOperation: ModeRewardCommitterOperationV2): Error {
    this.#reentrySequence += 1;
    if (this.#reentryError === null) {
      this.#reentryError = new Error(
        `ModeRewardCommitterV2 ${String(this.#operation)}期间不可重入${requestedOperation}。`,
      );
    }
    return this.#reentryError;
  }

  #assertReentryFree(sequence: number, operation: string, failClosed = false): void {
    if (this.#reentrySequence === sequence) return;
    if (failClosed) this.#failed = true;
    throw this.#reentryError ?? new Error(`ModeRewardCommitterV2 ${operation}期间发生重入。`);
  }

  #runOperation<T>(operation: ModeRewardCommitterOperationV2, callback: () => T): T {
    if (this.#operation !== null) throw this.#recordReentry(operation);
    this.#operation = operation;
    const sequence = this.#reentrySequence;
    try {
      if (this.#failed) throw new Error('ModeRewardCommitterV2已失败关闭。');
      try {
        const result = callback();
        this.#assertReentryFree(sequence, operation, true);
        return result;
      } catch (error) {
        if (this.#reentrySequence !== sequence) this.#failed = true;
        throw error;
      }
    } finally {
      this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertOperationOwnership(operation: ModeRewardCommitterOperationV2): void {
    if (this.#operation !== operation) {
      throw new Error(`ModeRewardCommitterV2 ${operation}缺少权威操作所有权。`);
    }
  }

  #assertAuthorityCommitReady(operation: ModeRewardCommitterOperationV2): void {
    if (this.#reentryError !== null) {
      this.#failed = true;
      throw this.#reentryError;
    }
    this.#assertOperationOwnership(operation);
  }

  #readProfileChecked(operation: string): PlayerProfile {
    const sequence = this.#reentrySequence;
    try {
      const profile = createPlayerProfile(
        this.#profileDefinition,
        assertSynchronous(
          this.#profilePort.getSnapshot(),
          'ModeRewardCommitterV2 ProfileService.getSnapshot',
        ),
      );
      this.#assertReentryFree(sequence, operation, true);
      return profile;
    } catch (error) {
      this.#assertReentryFree(sequence, operation, true);
      throw error;
    }
  }

  #resolve(result: unknown): Readonly<{
    profile: PlayerProfile;
    grant: RewardGrant;
  }> {
    const profile = this.#readProfileChecked('Profile读取');
    const grant = resolveModeMatchRewardV2({
      registry: this.#registry,
      profileDefinition: this.#profileDefinition,
      profile,
      result,
      recipientParticipantId: this.#recipientParticipantId,
    });
    return Object.freeze({ profile, grant });
  }

  prepare(result: unknown): RewardGrant {
    return this.#runOperation('prepare', () => {
      const prepared = this.#resolve(result);
      if (this.#preparedGrant !== null) {
        if (!sameProfile(prepared.profile, this.#preparedProfile!)
          || JSON.stringify(prepared.grant) !== JSON.stringify(this.#preparedGrant)) {
          this.#failed = true;
          throw new RangeError('ModeRewardCommitterV2已准备奖励与当前结果或Profile漂移。');
        }
        return this.#preparedGrant;
      }
      this.#assertAuthorityCommitReady('prepare');
      this.#preparedProfile = prepared.profile;
      this.#preparedGrant = prepared.grant;
      return prepared.grant;
    });
  }

  commit(result: unknown): ModeRewardCommitOutcomeV2 {
    return this.#runOperation('commit', () => {
      const profile = this.#readProfileChecked('提交前Profile读取');
      const grant = this.#preparedGrant === null
        ? resolveModeMatchRewardV2({
          registry: this.#registry,
          profileDefinition: this.#profileDefinition,
          profile,
          result,
          recipientParticipantId: this.#recipientParticipantId,
        })
        : (() => {
          const verified = resolveModeMatchRewardV2({
            registry: this.#registry,
            profileDefinition: this.#profileDefinition,
            profile: this.#preparedProfile!,
            result,
            recipientParticipantId: this.#recipientParticipantId,
          });
          if (JSON.stringify(verified) !== JSON.stringify(this.#preparedGrant)) {
            this.#failed = true;
            throw new RangeError('ModeRewardCommitterV2提交Result与已准备奖励漂移。');
          }
          return this.#preparedGrant;
        })();
      if (this.#lastOutcome !== null && this.#lastGrantId === grant.grantId) {
        return this.#lastOutcome;
      }
      if (profile.progression.committedGrantIds.includes(grant.grantId)) {
        if (!containsUnlocks(profile, grant)) {
          this.#failed = true;
          throw new RangeError('ModeRewardCommitterV2已提交Grant缺少对应解锁。');
        }
        const duplicate = Object.freeze({
          grant,
          committed: false,
          duplicate: true,
          profile,
        });
        this.#assertAuthorityCommitReady('commit');
        this.#lastGrantId = grant.grantId;
        this.#lastOutcome = duplicate;
        this.#preparedGrant = null;
        this.#preparedProfile = null;
        return duplicate;
      }
      this.#assertAuthorityCommitReady('commit');
      const commitSequence = this.#reentrySequence;
      let rawOutcome: unknown;
      try {
        rawOutcome = assertSynchronous(
          this.#profilePort.commitProgressionGrant({
            grantId: grant.grantId,
            experienceDelta: grant.experienceDelta,
            unlocks: grant.unlocks,
          }),
          'ModeRewardCommitterV2 ProfileService.commitProgressionGrant',
        );
      } catch (error) {
        this.#assertReentryFree(commitSequence, 'Profile奖励提交', true);
        if (!recoverable(error)) this.#failed = true;
        throw error;
      }
      let outcome: ModeRewardCommitOutcomeV2;
      try {
        outcome = normalizeOutcome(
          rawOutcome,
          this.#profileDefinition,
          profile,
          grant,
        );
      } catch (error) {
        this.#failed = true;
        throw error;
      }
      if (this.#reentrySequence === commitSequence) {
        this.#assertAuthorityCommitReady('commit');
      } else {
        this.#assertOperationOwnership('commit');
      }
      this.#lastGrantId = grant.grantId;
      this.#lastOutcome = outcome;
      this.#preparedGrant = null;
      this.#preparedProfile = null;
      this.#assertReentryFree(commitSequence, 'Profile奖励提交终态发布', true);
      return outcome;
    });
  }
}
