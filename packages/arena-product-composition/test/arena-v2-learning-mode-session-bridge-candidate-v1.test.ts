import { describe, expect, it } from 'vitest';
import {
  ArenaV2LearningProfileIndeterminateWriteError,
  ArenaV2LearningProfileRepositoryBusyError,
  ArenaV2LearningProfileSaveConflictError,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ArenaV2LearningProfileServiceErrorV1,
  PlayerProfilePersistenceError,
} from '@number-strategy-jump/arena-profile-service';
import {
  ArenaV2LearningModeSessionBridgeCandidateV1,
  resolveArenaV2ProfilePersistenceDispositionCandidateV1,
} from '../src/index.js';

function harness(options: Readonly<{
  recoverLearningOnce?: boolean;
  rejectTerminalEvidence?: boolean;
  omitSupplyFacts?: boolean;
  omitReadFrameAudit?: boolean;
  omitWeaponFeedbackDirectionFactsV2?: boolean;
  omitStartLocalJumpAvailability?: boolean;
  omitStepLocalJumpAvailability?: boolean;
}> = {}) {
  const calls = {
    sessionDestroy: 0,
    handoffDestroy: 0,
    rewards: 0,
    learning: 0,
    runtimeEvidenceReads: 0,
    evidenceBindings: 0,
    appended: [] as unknown[],
  };
  let sessionState = 'created';
  let handoffState = 'collecting';
  let terminal = false;
  let learningFailed = false;
  const result = Object.freeze({ authorityHash: 'result-hash', modeResult: { kind: 'duel' } });
  const runtimeEvidence = Object.freeze({ terminalEvidenceHash: 'runtime-evidence-hash' });
  const preparedRewardGrant = Object.freeze({ grantId: 'reward-grant.prepared.1' });
  const preparedGrant = Object.freeze({ grantId: 'learning-grant.prepared.1' });
  const session = {
    start() {
      sessionState = 'running';
      return {
        readFrame: {},
        readFrameAudit: { activeSupplyProjection: null },
        supplyCadence: null,
        ...(options.omitStartLocalJumpAvailability === true
          ? {}
          : { localJumpAvailability: { state: 'ready' } }),
      };
    },
    step() {
      if (!terminal) {
        terminal = true;
        sessionState = 'reward-pending';
        return {
          matchStep: {
            events: [{ id: 'match-ended' }],
            ...(options.omitSupplyFacts === true ? {} : { supplyFacts: [] }),
            supplyCadence: null,
            readFrame: {},
            ...(options.omitReadFrameAudit === true
              ? {}
              : { readFrameAudit: { activeSupplyProjection: null } }),
            inputs: [],
            ...(options.omitWeaponFeedbackDirectionFactsV2 === true
              ? {}
              : { weaponFeedbackDirectionFactsV2: [] }),
            ...(options.omitStepLocalJumpAvailability === true
              ? {}
              : { localJumpAvailability: { state: 'blocked' } }),
            result: result.modeResult,
          },
          snapshot: {
            schemaVersion: 2,
            modeDefinitionId: 'arena.mode.duel.v1',
            state: sessionState,
            result,
            reward: null,
          },
        };
      }
      throw new Error('already terminal');
    },
    pause() { sessionState = 'paused'; },
    resume() { sessionState = 'running'; },
    prepareReward() { return preparedRewardGrant; },
    settleReward() {
      calls.rewards += 1;
      sessionState = 'settled';
      return { committed: true };
    },
    getTerminalRuntimeEvidenceV2() {
      calls.runtimeEvidenceReads += 1;
      return runtimeEvidence;
    },
    getSnapshot() {
      return {
        schemaVersion: 2,
        modeDefinitionId: 'arena.mode.duel.v1',
        state: sessionState,
        result: terminal ? result : null,
        reward: calls.rewards > 0 ? { committed: true } : null,
      };
    },
    destroy() { calls.sessionDestroy += 1; sessionState = 'destroyed'; },
  };
  const learningHandoff = {
    appendEvents(events: unknown) {
      calls.appended.push(events);
      handoffState = 'ready-to-settle';
    },
    bindRuntimeTerminalEvidenceV3(receivedResult: unknown, receivedEvidence: unknown) {
      calls.evidenceBindings += 1;
      if (receivedResult !== result || receivedEvidence !== runtimeEvidence) {
        throw new Error('terminal evidence identity drift');
      }
      if (options.rejectTerminalEvidence === true) {
        throw new Error('terminal runtime evidence rejected');
      }
    },
    prepareBound() { return preparedGrant; },
    settleBound() {
      calls.learning += 1;
      if (options.recoverLearningOnce === true && !learningFailed) {
        learningFailed = true;
        throw new ArenaV2LearningProfileServiceErrorV1('lease busy', {
          reason: 'lease-busy',
          recoverable: true,
        });
      }
      handoffState = 'settled';
      return { committed: true };
    },
    getSnapshot() {
      return {
        schemaVersion: 1,
        status: 'production-unreachable',
        state: handoffState,
        eventCount: calls.appended.length,
        firstSequence: calls.appended.length > 0 ? 0 : null,
        lastSequence: calls.appended.length > 0 ? 0 : null,
        terminalTick: calls.appended.length > 0 ? 1 : null,
        settlementCommitted: calls.learning > 0 && handoffState === 'settled' ? true : null,
        settlementDuplicate: calls.learning > 0 && handoffState === 'settled' ? false : null,
      };
    },
    destroy() { calls.handoffDestroy += 1; handoffState = 'destroyed'; },
  };
  return {
    calls,
    result,
    runtimeEvidence,
    preparedRewardGrant,
    preparedGrant,
    session,
    learningHandoff,
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

describe('Arena V2 learning mode session bridge candidate V1', () => {
  it('hands events over before settling reward and learning in explicit order', () => {
    const value = harness();
    const prepared: unknown[] = [];
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: value.learningHandoff,
      onSettlementIntentPrepared(intent: unknown) { prepared.push(intent); },
    });
    expect(bridge.start()).toMatchObject({
      supplyCadence: null,
      localJumpAvailability: { state: 'ready' },
    });
    bridge.pause();
    bridge.resume();
    bridge.step({ primaryPressed: false });
    expect(bridge.getSnapshot()).toMatchObject({
      state: 'reward-pending',
      sessionState: 'reward-pending',
      learningHandoffState: 'ready-to-settle',
      terminalResultCaptured: true,
    });
    const outcome = bridge.settle();
    expect(outcome).toMatchObject({
      reward: { committed: true },
      learning: { committed: true },
      snapshot: { state: 'settled' },
    });
    expect(value.calls.appended).toHaveLength(1);
    expect(value.calls.runtimeEvidenceReads).toBe(1);
    expect(value.calls.evidenceBindings).toBe(1);
    expect(prepared).toEqual([{
      rewardGrant: value.preparedRewardGrant,
      learningGrant: value.preparedGrant,
    }]);
    expect(value.calls.rewards).toBe(1);
    expect(value.calls.learning).toBe(1);
    bridge.destroy();
  });

  it('retries recoverable learning settlement without committing reward twice', () => {
    const value = harness({ recoverLearningOnce: true });
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: value.learningHandoff,
    });
    bridge.start();
    bridge.step(null);
    expect(captureFailure(() => bridge.settle())).toMatchObject({
      recoverable: true,
      restartRequired: false,
      phase: 'post-reward-learning',
      cause: { message: 'lease busy' },
    });
    expect(bridge.state).toBe('learning-pending');
    expect(value.calls.rewards).toBe(1);
    expect(value.calls.learning).toBe(1);
    expect(bridge.settle().snapshot.state).toBe('settled');
    expect(value.calls.rewards).toBe(1);
    expect(value.calls.learning).toBe(2);
    bridge.destroy();
  });

  it('retains learning-pending state and requires restart for indeterminate Learning failure', () => {
    const value = harness();
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: {
        ...value.learningHandoff,
        settleBound() {
          value.calls.learning += 1;
          throw new ArenaV2LearningProfileIndeterminateWriteError(
            'indeterminate Learning write',
          );
        },
      },
    });
    bridge.start();
    bridge.step(null);
    let captured: unknown;
    try {
      bridge.settle();
    } catch (error) {
      captured = error;
    }
    expect(captured).toMatchObject({
      recoverable: false,
      restartRequired: true,
      phase: 'post-reward-learning',
    });
    expect(bridge.state).toBe('learning-pending');
    expect(value.calls.rewards).toBe(1);
    expect(value.calls.learning).toBe(1);
    expect(value.calls.sessionDestroy).toBe(0);
    expect(value.calls.handoffDestroy).toBe(0);
    bridge.destroy();
  });

  it('retains reward-pending state only for an explicit recoverable Reward persistence error', () => {
    const value = harness();
    let rejected = false;
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: {
        ...value.session,
        settleReward() {
          value.calls.rewards += 1;
          if (!rejected) {
            rejected = true;
            throw new PlayerProfilePersistenceError('reward lease busy', {
              reason: 'lease-busy',
              recoverable: true,
            });
          }
          return { committed: true };
        },
      },
      learningHandoff: value.learningHandoff,
    });
    bridge.start();
    bridge.step(null);
    expect(captureFailure(() => bridge.settle())).toMatchObject({
      recoverable: true,
      restartRequired: false,
      phase: 'reward-write',
      cause: { message: 'reward lease busy' },
    });
    expect(bridge.state).toBe('reward-pending');
    expect(value.calls.rewards).toBe(1);
    expect(value.calls.learning).toBe(0);
    expect(bridge.settle().snapshot.state).toBe('settled');
    expect(value.calls.rewards).toBe(2);
    expect(value.calls.learning).toBe(1);
    bridge.destroy();
  });

  it('requires restart only when the Profile Service explicitly marks Reward indeterminate', () => {
    const value = harness();
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: {
        ...value.session,
        settleReward() {
          value.calls.rewards += 1;
          throw new PlayerProfilePersistenceError('reward write indeterminate', {
            reason: 'write-indeterminate',
            restartRequired: true,
          });
        },
      },
      learningHandoff: value.learningHandoff,
    });
    bridge.start();
    bridge.step(null);
    const captured = captureFailure(() => bridge.settle());
    expect(captured).toMatchObject({
      recoverable: false,
      restartRequired: true,
      phase: 'reward-write',
    });
    expect(bridge.state).toBe('reward-pending');
    expect(value.calls.sessionDestroy).toBe(0);
    expect(value.calls.handoffDestroy).toBe(0);
    bridge.destroy();
  });

  it('fails closed when a generic error only impersonates the recoverable field', () => {
    const value = harness();
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: {
        ...value.learningHandoff,
        settleBound() {
          value.calls.learning += 1;
          const error = new Error('fake recoverable') as Error & { recoverable: boolean };
          error.recoverable = true;
          throw error;
        },
      },
    });
    bridge.start();
    bridge.step(null);
    expect(() => bridge.settle()).toThrow(/失败关闭/u);
    expect(bridge.state).toBe('failed');
    expect(value.calls.sessionDestroy).toBe(1);
    expect(value.calls.handoffDestroy).toBe(1);
  });

  it('fails closed on Profile save-conflict integrity errors instead of offering retry', () => {
    const value = harness();
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: {
        ...value.learningHandoff,
        settleBound() {
          value.calls.learning += 1;
          throw new ArenaV2LearningProfileSaveConflictError('same generation drift');
        },
      },
    });
    bridge.start();
    bridge.step(null);
    expect(() => bridge.settle()).toThrow(/失败关闭/u);
    expect(bridge.state).toBe('failed');
    expect(value.calls.sessionDestroy).toBe(1);
    expect(value.calls.handoffDestroy).toBe(1);
  });

  it('fails closed and destroys both owners when the step contract drifts', () => {
    const value = harness();
    const session = {
      ...value.session,
      step() { return { future: true }; },
    };
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session,
      learningHandoff: value.learningHandoff,
    });
    bridge.start();
    expect(() => bridge.step(null)).toThrow(/失败关闭/);
    expect(bridge.state).toBe('failed');
    expect(value.calls.sessionDestroy).toBe(1);
    expect(value.calls.handoffDestroy).toBe(1);
  });

  it('requires explicit supply facts before handing any events to Learning', () => {
    const value = harness({ omitSupplyFacts: true });
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: value.learningHandoff,
    });
    bridge.start();
    expect(() => bridge.step(null)).toThrow(/失败关闭/u);
    expect(value.calls.appended).toHaveLength(0);
    expect(value.calls.runtimeEvidenceReads).toBe(0);
    expect(value.calls.sessionDestroy).toBe(1);
    expect(value.calls.handoffDestroy).toBe(1);
  });

  it('requires explicit authority audit before handing any events to Learning', () => {
    const value = harness({ omitReadFrameAudit: true });
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: value.learningHandoff,
    });
    bridge.start();
    expect(() => bridge.step(null)).toThrow(/失败关闭/u);
    expect(value.calls.appended).toHaveLength(0);
    expect(value.calls.runtimeEvidenceReads).toBe(0);
    expect(value.calls.sessionDestroy).toBe(1);
    expect(value.calls.handoffDestroy).toBe(1);
  });

  it('requires explicit weapon direction facts before handing events to Learning', () => {
    const value = harness({ omitWeaponFeedbackDirectionFactsV2: true });
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: value.learningHandoff,
    });
    bridge.start();
    expect(() => bridge.step(null)).toThrow(/失败关闭/u);
    expect(value.calls.appended).toHaveLength(0);
    expect(value.calls.runtimeEvidenceReads).toBe(0);
    expect(value.calls.sessionDestroy).toBe(1);
    expect(value.calls.handoffDestroy).toBe(1);
  });

  it('requires explicit local jump availability before start or Learning event handoff', () => {
    const missingStart = harness({ omitStartLocalJumpAvailability: true });
    const startBridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: missingStart.session,
      learningHandoff: missingStart.learningHandoff,
    });
    expect(() => startBridge.start()).toThrow(/失败关闭/u);
    expect(missingStart.calls.appended).toHaveLength(0);
    expect(missingStart.calls.sessionDestroy).toBe(1);
    expect(missingStart.calls.handoffDestroy).toBe(1);

    const missingStep = harness({ omitStepLocalJumpAvailability: true });
    const stepBridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: missingStep.session,
      learningHandoff: missingStep.learningHandoff,
    });
    stepBridge.start();
    expect(() => stepBridge.step(null)).toThrow(/失败关闭/u);
    expect(missingStep.calls.appended).toHaveLength(0);
    expect(missingStep.calls.runtimeEvidenceReads).toBe(0);
    expect(missingStep.calls.sessionDestroy).toBe(1);
    expect(missingStep.calls.handoffDestroy).toBe(1);
  });

  it('rejects terminal Runtime evidence before reward can commit', () => {
    const value = harness({ rejectTerminalEvidence: true });
    const bridge = new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: value.learningHandoff,
    });
    bridge.start();
    expect(() => bridge.step(null)).toThrow(/失败关闭/u);
    expect(value.calls.runtimeEvidenceReads).toBe(1);
    expect(value.calls.evidenceBindings).toBe(1);
    expect(value.calls.rewards).toBe(0);
    expect(value.calls.learning).toBe(0);
    expect(value.calls.sessionDestroy).toBe(1);
    expect(value.calls.handoffDestroy).toBe(1);
  });

  it('rejects future options and accessor ports without invoking getters', () => {
    const value = harness();
    expect(() => new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: value.learningHandoff,
      future: true,
    })).toThrow();
    let getterCalls = 0;
    const options = { learningHandoff: value.learningHandoff } as Record<string, unknown>;
    Object.defineProperty(options, 'session', {
      enumerable: true,
      get() { getterCalls += 1; return value.session; },
    });
    expect(() => new ArenaV2LearningModeSessionBridgeCandidateV1(options)).toThrow();
    expect(getterCalls).toBe(0);
  });

  it('leaves both raw child owners with the caller when constructor port capture fails', () => {
    const value = harness();
    const invalidHandoff = { ...value.learningHandoff } as Record<string, unknown>;
    delete invalidHandoff.settleBound;
    expect(() => new ArenaV2LearningModeSessionBridgeCandidateV1({
      session: value.session,
      learningHandoff: invalidHandoff,
    })).toThrow(/settleBound/u);
    expect(value.calls.sessionDestroy).toBe(0);
    expect(value.calls.handoffDestroy).toBe(0);
    value.session.destroy();
    value.learningHandoff.destroy();
  });

  it('shares one known-error-only persistence disposition contract', () => {
    expect(resolveArenaV2ProfilePersistenceDispositionCandidateV1(
      new ArenaV2LearningProfileRepositoryBusyError(),
    )).toBe('retry');
    expect(resolveArenaV2ProfilePersistenceDispositionCandidateV1(
      new PlayerProfilePersistenceError('reward busy', {
        reason: 'lease-busy',
        recoverable: true,
      }),
    )).toBe('retry');
    expect(resolveArenaV2ProfilePersistenceDispositionCandidateV1(
      new ArenaV2LearningProfileIndeterminateWriteError(),
    )).toBe('restart');
    expect(resolveArenaV2ProfilePersistenceDispositionCandidateV1(
      new PlayerProfilePersistenceError('reward indeterminate', {
        reason: 'write-indeterminate',
        restartRequired: true,
      }),
    )).toBe('restart');
    expect(resolveArenaV2ProfilePersistenceDispositionCandidateV1(
      new ArenaV2LearningProfileSaveConflictError(),
    )).toBe('fail-closed');
  });

  it('walks bounded own-data causes but rejects duck typing and hostile accessors', () => {
    const wrappedBusy = new Error('wrapped busy', {
      cause: new ArenaV2LearningProfileRepositoryBusyError(),
    });
    expect(resolveArenaV2ProfilePersistenceDispositionCandidateV1(wrappedBusy)).toBe('retry');

    const fake = new Error('fake recoverable') as Error & { recoverable: boolean };
    fake.recoverable = true;
    expect(resolveArenaV2ProfilePersistenceDispositionCandidateV1(fake)).toBe('fail-closed');

    let getterCalls = 0;
    const hostile = {};
    Object.defineProperty(hostile, 'cause', {
      get() {
        getterCalls += 1;
        return new ArenaV2LearningProfileRepositoryBusyError();
      },
    });
    expect(resolveArenaV2ProfilePersistenceDispositionCandidateV1(hostile)).toBe('fail-closed');
    expect(getterCalls).toBe(0);

    const loop: { cause?: unknown } = {};
    loop.cause = loop;
    expect(resolveArenaV2ProfilePersistenceDispositionCandidateV1(loop)).toBe('fail-closed');
  });
});
