import { describe, expect, it } from 'vitest';
import {
  PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
  PLAYER_PROFILE_QUALITY,
  PLAYER_PROFILE_SCHEMA_VERSION,
  PlayerProfileIndeterminateWriteError,
  createPlayerProfile,
  createPlayerProfileDefinition,
  type PlayerProfile,
  type PlayerProfileDefinition,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  PLAYER_PROFILE_SERVICE_STATE,
  PlayerProfilePersistenceError,
  PlayerProfileService,
} from '../src/index.js';

function definition(): PlayerProfileDefinition {
  return createPlayerProfileDefinition({
    schemaVersion: PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
    id: 'profile-service-test',
    contentVersion: 1,
    currentProfileSchemaVersion: PLAYER_PROFILE_SCHEMA_VERSION,
    limits: {
      maxUnlockedPerKind: 16,
      maxCommittedGrantIds: 1,
      maxExperience: 1_000,
      maxIdentifierLength: 64,
    },
    defaults: {
      profileId: 'local-player',
      progression: { experience: 0, committedGrantIds: [] },
      unlocks: {
        characterIds: ['hero', 'hero-b'],
        appearanceIds: [],
        equipmentIds: [],
        mapIds: ['arena'],
      },
      selection: { characterId: 'hero', appearanceId: null },
      settings: {
        soundEnabled: true,
        reducedMotion: false,
        qualityProfile: PLAYER_PROFILE_QUALITY.AUTO,
      },
    },
  });
}

interface RepositoryHarness {
  readonly port: {
    open(): PlayerProfile;
    getSnapshot(): PlayerProfile;
    renewLease(): boolean;
    compareAndSet(next: unknown, expectedRevision: unknown): unknown;
    destroy(): void;
  };
  getProfile(): PlayerProfile;
  publish(profile: PlayerProfile): void;
  setCompare(compare: (next: PlayerProfile, expectedRevision: number) => unknown): void;
  setHook(name: 'open' | 'snapshot' | 'renew' | 'compare' | 'destroy', hook: () => void): void;
  setDestroyFailures(count: number): void;
}

function repositoryHarness(profileDefinition: PlayerProfileDefinition): RepositoryHarness {
  let profile = createPlayerProfile(profileDefinition);
  let destroyFailures = 0;
  let compare = (next: PlayerProfile, expectedRevision: number): unknown => {
    if (expectedRevision !== profile.revision) {
      return { committed: false, reason: 'memory-revision-mismatch', headUpdated: false };
    }
    profile = next;
    return { committed: true, reason: null, headUpdated: true };
  };
  const hooks = new Map<string, () => void>();
  return {
    port: {
      open() { hooks.get('open')?.(); return profile; },
      getSnapshot() { hooks.get('snapshot')?.(); return profile; },
      renewLease() { hooks.get('renew')?.(); return true; },
      compareAndSet(next, expectedRevision) {
        hooks.get('compare')?.();
        return compare(next as PlayerProfile, expectedRevision as number);
      },
      destroy() {
        hooks.get('destroy')?.();
        if (destroyFailures > 0) {
          destroyFailures -= 1;
          throw new Error('cleanup failed');
        }
      },
    },
    getProfile: () => profile,
    publish(value) { profile = value; },
    setCompare(value) { compare = value; },
    setHook(name, hook) { hooks.set(name, hook); },
    setDestroyFailures(count) { destroyFailures = count; },
  };
}

function captureFailure(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('Expected action to fail.');
}

describe('PlayerProfileService', () => {
  it('commits selection and one reward through a verified profile read-back', () => {
    const profileDefinition = definition();
    const repository = repositoryHarness(profileDefinition);
    const service = new PlayerProfileService({
      definition: profileDefinition,
      repository: repository.port,
    });
    expect(service.open().revision).toBe(0);
    expect(service.selectCharacter('hero-b').revision).toBe(1);
    const outcome = service.commitProgressionGrant({
      grantId: 'grant-1',
      experienceDelta: 25,
      unlocks: {
        characterIds: [], appearanceIds: ['appearance-a'], equipmentIds: [], mapIds: [],
      },
    });
    expect(outcome.committed).toBe(true);
    expect(outcome.profile.revision).toBe(2);
    expect(outcome.profile.progression.experience).toBe(25);
    expect(service.commitProgressionGrant({
      grantId: 'grant-1',
      experienceDelta: 25,
      unlocks: {
        characterIds: [], appearanceIds: ['appearance-a'], equipmentIds: [], mapIds: [],
      },
    }).duplicate).toBe(true);
  });

  it('rejects option and repository accessors without executing them', () => {
    const profileDefinition = definition();
    const repository = repositoryHarness(profileDefinition);
    let calls = 0;
    const options = Object.defineProperty({ repository: repository.port }, 'definition', {
      enumerable: true,
      get() { calls += 1; return profileDefinition; },
    });
    expect(() => new PlayerProfileService(options as never)).toThrow(/数据字段/);
    const accessorRepository = Object.defineProperty({}, 'open', {
      enumerable: true,
      get() { calls += 1; return () => createPlayerProfile(profileDefinition); },
    });
    for (const name of ['getSnapshot', 'renewLease', 'compareAndSet', 'destroy']) {
      Object.defineProperty(accessorRepository, name, { value: () => undefined, enumerable: true });
    }
    expect(() => new PlayerProfileService({
      definition: profileDefinition,
      repository: accessorRepository,
    })).toThrow(/数据方法/);
    expect(calls).toBe(0);
  });

  it('snapshots repository methods and blocks every callback reentry', () => {
    const profileDefinition = definition();
    const repository = repositoryHarness(profileDefinition);
    const service = new PlayerProfileService({
      definition: profileDefinition,
      repository: repository.port,
    });
    let reentries = 0;
    repository.setHook('open', () => {
      expect(() => service.open()).toThrow(/不可重入/);
      reentries += 1;
    });
    service.open();
    repository.setHook('renew', () => {
      expect(() => service.getSnapshot()).toThrow(/不可重入/);
      expect(() => service.destroy()).toThrow(/不能销毁/);
      reentries += 2;
    });
    repository.setHook('compare', () => {
      expect(() => service.selectCharacter('hero')).toThrow(/不可重入/);
      reentries += 1;
    });
    repository.setHook('snapshot', () => {
      expect(() => service.renewLease()).toThrow(/不可重入/);
      reentries += 1;
    });
    repository.port.compareAndSet = () => {
      throw new Error('replacement must not run');
    };
    expect(service.selectCharacter('hero-b').revision).toBe(1);
    repository.setHook('destroy', () => {
      expect(() => service.destroy()).toThrow(/不能销毁/);
      reentries += 1;
    });
    service.destroy();
    expect(reentries).toBe(6);
  });

  it('contains transient failures and fails closed after ambiguous or malformed commits', () => {
    const profileDefinition = definition();
    const transientRepository = repositoryHarness(profileDefinition);
    const transient = new PlayerProfileService({
      definition: profileDefinition,
      repository: transientRepository.port,
    });
    transient.open();
    transientRepository.setCompare(() => { throw new Error('write rejected'); });
    const transientError = captureFailure(() => transient.selectCharacter('hero-b'));
    expect(transientError).toBeInstanceOf(PlayerProfilePersistenceError);
    expect((transientError as PlayerProfilePersistenceError).recoverable).toBe(true);
    expect(transient.state).toBe(PLAYER_PROFILE_SERVICE_STATE.OPEN);

    const ambiguousRepository = repositoryHarness(profileDefinition);
    const ambiguous = new PlayerProfileService({
      definition: profileDefinition,
      repository: ambiguousRepository.port,
    });
    ambiguous.open();
    ambiguousRepository.setCompare((next) => {
      ambiguousRepository.publish(next);
      throw new Error('throw after mutation');
    });
    const ambiguousError = captureFailure(() => ambiguous.selectCharacter('hero-b'));
    expect(ambiguousError).toBeInstanceOf(PlayerProfilePersistenceError);
    expect((ambiguousError as PlayerProfilePersistenceError).recoverable).toBe(false);
    expect(ambiguous.state).toBe(PLAYER_PROFILE_SERVICE_STATE.FAILED);

    const malformedRepository = repositoryHarness(profileDefinition);
    const malformed = new PlayerProfileService({
      definition: profileDefinition,
      repository: malformedRepository.port,
    });
    malformed.open();
    let getterCalls = 0;
    malformedRepository.setCompare(() => Object.defineProperty({
      reason: null,
      headUpdated: true,
    }, 'committed', {
      enumerable: true,
      get() { getterCalls += 1; return true; },
    }));
    expect(() => malformed.selectCharacter('hero-b')).toThrow(PlayerProfilePersistenceError);
    expect(getterCalls).toBe(0);
    expect(malformed.state).toBe(PLAYER_PROFILE_SERVICE_STATE.FAILED);
  });

  it('fails closed on confirmed lease loss and keeps failed cleanup retryable', () => {
    const profileDefinition = definition();
    const lostRepository = repositoryHarness(profileDefinition);
    lostRepository.port.renewLease = () => {
      throw new PlayerProfileIndeterminateWriteError('lost');
    };
    const lost = new PlayerProfileService({
      definition: profileDefinition,
      repository: lostRepository.port,
    });
    lost.open();
    const lostError = captureFailure(() => lost.renewLease());
    expect(lostError).toBeInstanceOf(PlayerProfilePersistenceError);
    expect((lostError as PlayerProfilePersistenceError).recoverable).toBe(false);
    expect(lost.state).toBe(PLAYER_PROFILE_SERVICE_STATE.FAILED);

    const retryRepository = repositoryHarness(profileDefinition);
    const retry = new PlayerProfileService({
      definition: profileDefinition,
      repository: retryRepository.port,
    });
    retry.open();
    retryRepository.setDestroyFailures(1);
    expect(() => retry.destroy()).toThrow(/cleanup failed/);
    expect(retry.state).toBe(PLAYER_PROFILE_SERVICE_STATE.OPEN);
    retry.destroy();
    retry.destroy();
    expect(retry.state).toBe(PLAYER_PROFILE_SERVICE_STATE.DESTROYED);
  });
});
