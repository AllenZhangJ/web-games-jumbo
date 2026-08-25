import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_SCREEN_ID_V1 as SCREEN,
  ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
  ARENA_V2_INFORMATION_UI_INTENT_V1 as INTENT,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_INFORMATION_MODE_SESSION_HOST_CANDIDATE_V1,
  ArenaV2InformationModeSessionHostCandidateV1,
} from '../src/arena-v2-information-mode-session-host-candidate-v1.js';
import {
  ArenaV2LearningSettlementPendingErrorCandidateV1,
  ArenaV2SettlementRestartRequiredErrorCandidateV1,
} from '../src/arena-v2-learning-mode-session-bridge-candidate-v1.js';

type ModeKind = 'duel' | 'race' | 'survival';

function harness(options: Readonly<{
  recoverSettlementOnce?: boolean;
  restartSettlementOnce?: boolean;
  failCreate?: boolean;
  failStep?: boolean;
  destroyFailures?: number;
  destroyThenableOnce?: boolean;
  destroyAccessor?: boolean;
  missingStep?: boolean;
  swallowDestroyReentry?: boolean;
}> = {}) {
  const calls = {
    requests: [] as Readonly<{ schemaVersion: 1; generation: number; modeKind: ModeKind }>[],
    starts: 0,
    steps: 0,
    settlements: 0,
    destroys: 0,
    destroyedSessionIds: [] as string[],
    destroyThenCalls: 0,
    destroyGetterCalls: 0,
  };
  let recoveryUsed = false;
  let remainingDestroyFailures = options.destroyFailures ?? 0;
  let hostReference: ArenaV2InformationModeSessionHostCandidateV1 | null = null;
  const sessionFactory = {
    createSession(request: Readonly<{ schemaVersion: 1; generation: number; modeKind: ModeKind }>) {
      calls.requests.push(request);
      if (options.failCreate === true) throw new Error('factory unavailable');
      let state = 'created';
      const sessionId = `session-${request.generation}`;
      const session = {
        start() {
          calls.starts += 1;
          state = 'running';
          return { generation: request.generation, modeKind: request.modeKind };
        },
        step() {
          calls.steps += 1;
          if (options.failStep === true) throw new Error('session step failed');
          state = 'reward-pending';
          return { terminal: true };
        },
        pause() { state = 'paused'; },
        resume() { state = 'running'; },
        settle() {
          calls.settlements += 1;
          if (options.recoverSettlementOnce === true && !recoveryUsed) {
            recoveryUsed = true;
            state = 'learning-pending';
            throw new ArenaV2LearningSettlementPendingErrorCandidateV1(
              new Error('lease busy'),
            );
          }
          if (options.restartSettlementOnce === true && !recoveryUsed) {
            recoveryUsed = true;
            state = 'learning-pending';
            throw new ArenaV2SettlementRestartRequiredErrorCandidateV1(
              'post-reward-learning',
              new Error('write indeterminate'),
            );
          }
          state = 'settled';
          return { reward: { committed: true }, learning: { committed: true } };
        },
        getSnapshot() { return { state }; },
        destroy() {
          calls.destroys += 1;
          calls.destroyedSessionIds.push(sessionId);
          if (options.swallowDestroyReentry === true && calls.destroys === 1) {
            try { hostReference?.destroy(); } catch {
              // The outer Host must retain the swallowed reentry marker.
            }
          }
          if (options.destroyThenableOnce === true && calls.destroys === 1) {
            return {
              then() { calls.destroyThenCalls += 1; },
            };
          }
          if (remainingDestroyFailures > 0) {
            remainingDestroyFailures -= 1;
            throw new Error(`destroy failed for ${sessionId}`);
          }
          state = 'destroyed';
          return undefined;
        },
      };
      if (options.destroyAccessor === true) {
        Object.defineProperty(session, 'destroy', {
          enumerable: true,
          get() {
            calls.destroyGetterCalls += 1;
            return () => undefined;
          },
        });
      }
      if (options.missingStep === true) {
        delete (session as Partial<typeof session>).step;
      }
      return session;
    },
  };
  const host = new ArenaV2InformationModeSessionHostCandidateV1({
    registry: ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
    sessionFactory,
  });
  hostReference = host;
  host.start({ initialScreenId: SCREEN.HOME });
  return { calls, host };
}

function dispatch(
  host: ArenaV2InformationModeSessionHostCandidateV1,
  screenId: string,
  intentId: string,
  selectedModeKind: ModeKind | null = null,
  resultDecision: 'play-again' | 'next-goal' | null = null,
  resultTargetScreenId: string | null = resultDecision === 'next-goal' ? SCREEN.HOME : null,
) {
  return host.dispatchPrimaryIntent({
    expectedRevision: host.getSnapshot().navigation.revision,
    screenId,
    intentId,
    selectedModeKind,
    resultDecision,
    resultTargetScreenId,
  });
}

function startRace(host: ArenaV2InformationModeSessionHostCandidateV1) {
  dispatch(host, SCREEN.HOME, INTENT.OPEN_MODE_SELECT);
  return dispatch(host, SCREEN.MODE_SELECT, INTENT.START_SELECTED_MODE, 'race');
}

function reachResult(host: ArenaV2InformationModeSessionHostCandidateV1) {
  host.stepMatch({ direction: 0, jumpPressed: false, primaryPressed: false });
  return host.settleMatch();
}

describe('Arena V2 information and Mode Session host candidate V1', () => {
  it('joins the two-click path to one Mode/Learning session and exposes result only after settlement', () => {
    const value = harness();
    expect(startRace(value.host)).toMatchObject({
      navigation: { command: 'start-match', selectedModeKind: 'race' },
      matchStart: { generation: 1, modeKind: 'race' },
      snapshot: { state: 'match-running', generation: 1, modeSessionState: 'running' },
    });
    value.host.pauseMatch();
    value.host.resumeMatch();
    expect(value.host.stepMatch(null).snapshot).toMatchObject({
      state: 'match-settlement-pending',
      modeSessionState: 'reward-pending',
      navigation: { surface: 'match', currentScreenId: null },
    });
    expect(value.host.settleMatch()).toMatchObject({
      navigation: { screenId: SCREEN.RESULT_REWARD, surface: 'information' },
      snapshot: { state: 'result', modeSessionState: 'settled' },
    });
    expect(dispatch(
      value.host,
      SCREEN.RESULT_REWARD,
      INTENT.PLAY_AGAIN_OR_NEXT,
      null,
      'next-goal',
    ).snapshot).toMatchObject({
      state: 'information', selectedModeKind: null, modeSessionState: null,
      navigation: { currentScreenId: SCREEN.HOME },
    });
    expect(value.calls.destroys).toBe(1);
  });

  it('destroys the settled generation before play-again and creates one new generation', () => {
    const value = harness();
    startRace(value.host);
    reachResult(value.host);
    expect(dispatch(
      value.host,
      SCREEN.RESULT_REWARD,
      INTENT.PLAY_AGAIN_OR_NEXT,
      'race',
      'play-again',
    ).snapshot).toMatchObject({
      state: 'match-running', generation: 2, selectedModeKind: 'race',
      modeSessionState: 'running',
    });
    expect(value.calls.requests).toEqual([
      { schemaVersion: 1, generation: 1, modeKind: 'race' },
      { schemaVersion: 1, generation: 2, modeKind: 'race' },
    ]);
    expect(value.calls.destroys).toBe(1);
  });

  it('opens the existing result page on recoverable settlement and retries the retained session', () => {
    const value = harness({ recoverSettlementOnce: true });
    startRace(value.host);
    value.host.stepMatch(null);
    const before = value.host.getSnapshot().navigation;
    expect(() => value.host.settleMatch()).toThrow(/Learning结算仍待恢复/u);
    expect(value.host.getSnapshot()).toMatchObject({
      state: 'result', modeSessionState: 'learning-pending',
      navigation: {
        revision: before.revision + 1,
        surface: 'information',
        currentScreenId: SCREEN.RESULT_REWARD,
      },
    });
    expect(value.host.settleMatch().snapshot.state).toBe('result');
    expect(value.calls.settlements).toBe(2);
  });

  it('keeps the existing result page and Session evidence for restart-required settlement', () => {
    const value = harness({ restartSettlementOnce: true });
    startRace(value.host);
    value.host.stepMatch(null);
    expect(() => value.host.settleMatch()).toThrow(/必须重启恢复/u);
    expect(value.host.getSnapshot()).toMatchObject({
      state: 'result',
      modeSessionState: 'learning-pending',
      navigation: { surface: 'information', currentScreenId: SCREEN.RESULT_REWARD },
    });
    expect(value.calls.destroys).toBe(0);
    value.host.destroy();
    expect(value.calls.destroys).toBe(1);
  });

  it('fails closed when a committed navigation transition cannot create its Mode Session', () => {
    const value = harness({ failCreate: true });
    dispatch(value.host, SCREEN.HOME, INTENT.OPEN_MODE_SELECT);
    expect(() => dispatch(
      value.host,
      SCREEN.MODE_SELECT,
      INTENT.START_SELECTED_MODE,
      'duel',
    )).toThrow(/失败关闭/);
    expect(value.host.getSnapshot()).toMatchObject({
      state: 'failed', selectedModeKind: null, modeSessionState: null,
      navigation: { lifecycle: 'destroyed', currentScreenId: null },
    });
  });

  it('rejects stale or hostile UI intent without consuming a generation', () => {
    const value = harness();
    const before = value.host.getSnapshot();
    expect(() => value.host.dispatchPrimaryIntent({
      expectedRevision: 9,
      screenId: SCREEN.HOME,
      intentId: INTENT.OPEN_MODE_SELECT,
      selectedModeKind: null,
      resultDecision: null,
      resultTargetScreenId: null,
    })).toThrow(/漂移/);
    expect(value.host.getSnapshot()).toEqual(before);
    expect(value.calls.requests).toHaveLength(0);
  });

  it('retains the exact failed Session owner and retries it before becoming destroyed', () => {
    const value = harness({ destroyFailures: 1 });
    startRace(value.host);
    expect(() => value.host.destroy()).toThrow(/清理不完整|销毁失败/u);
    expect(value.host.getSnapshot()).toMatchObject({
      state: 'failed',
      selectedModeKind: 'race',
      modeSessionState: 'running',
    });
    expect(value.calls.destroyedSessionIds).toEqual(['session-1']);

    value.host.destroy();
    expect(value.host.state).toBe('destroyed');
    expect(value.calls.destroyedSessionIds).toEqual(['session-1', 'session-1']);
    value.host.destroy();
    expect(value.calls.destroyedSessionIds).toEqual(['session-1', 'session-1']);
  });

  it('does not create a new generation when replacement, result release, or fail cleanup fails', () => {
    const replacement = harness({ destroyFailures: 1 });
    startRace(replacement.host);
    reachResult(replacement.host);
    expect(() => dispatch(
      replacement.host,
      SCREEN.RESULT_REWARD,
      INTENT.PLAY_AGAIN_OR_NEXT,
      'race',
      'play-again',
    )).toThrow(/失败关闭|清理/u);
    expect(replacement.calls.requests).toEqual([
      { schemaVersion: 1, generation: 1, modeKind: 'race' },
    ]);
    expect(replacement.calls.destroyedSessionIds).toEqual(['session-1', 'session-1']);
    replacement.host.destroy();

    const release = harness({ destroyFailures: 1 });
    startRace(release.host);
    reachResult(release.host);
    expect(() => dispatch(
      release.host,
      SCREEN.RESULT_REWARD,
      INTENT.PLAY_AGAIN_OR_NEXT,
      null,
      'next-goal',
    )).toThrow(/失败关闭|清理/u);
    expect(release.calls.requests).toHaveLength(1);
    expect(release.calls.destroyedSessionIds).toEqual(['session-1', 'session-1']);
    release.host.destroy();

    const failedStep = harness({ failStep: true, destroyFailures: 1 });
    startRace(failedStep.host);
    expect(() => failedStep.host.stepMatch(null)).toThrow(/失败|清理不完整/u);
    expect(failedStep.host.getSnapshot()).toMatchObject({
      state: 'failed',
      selectedModeKind: 'race',
      modeSessionState: 'running',
    });
    expect(failedStep.calls.destroyedSessionIds).toEqual(['session-1']);
    failedStep.host.destroy();
    expect(failedStep.calls.destroyedSessionIds).toEqual(['session-1', 'session-1']);
  });

  it('fails on swallowed destroy reentry without double-owning or double-destroying the Session', () => {
    const value = harness({ swallowDestroyReentry: true });
    startRace(value.host);
    expect(() => value.host.destroy()).toThrow(/重入|清理不完整/u);
    expect(value.host.getSnapshot()).toMatchObject({
      state: 'failed',
      selectedModeKind: null,
      modeSessionState: null,
      navigation: { lifecycle: 'active' },
    });
    expect(value.calls.destroyedSessionIds).toEqual(['session-1']);
    value.host.destroy();
    value.host.destroy();
    expect(value.host.state).toBe('destroyed');
    expect(value.calls.destroyedSessionIds).toEqual(['session-1']);
  });

  it('does not invoke hostile then or accessor cleanup ports and remains explicitly closable', () => {
    const thenable = harness({ destroyThenableOnce: true });
    startRace(thenable.host);
    expect(() => thenable.host.destroy()).toThrow(/同步完成|清理不完整/u);
    expect(thenable.calls.destroyThenCalls).toBe(0);
    expect(thenable.host.getSnapshot()).toMatchObject({
      state: 'failed',
      selectedModeKind: 'race',
      modeSessionState: 'running',
    });
    thenable.host.destroy();
    expect(thenable.host.state).toBe('destroyed');
    expect(thenable.calls.destroyedSessionIds).toEqual(['session-1', 'session-1']);

    const accessor = harness({ destroyAccessor: true });
    expect(() => startRace(accessor.host)).toThrow(/数据方法|失败关闭/u);
    expect(accessor.calls.destroyGetterCalls).toBe(0);
    expect(accessor.host.state).toBe('failed');
    accessor.host.destroy();
    expect(accessor.host.state).toBe('destroyed');
  });

  it('retains a returned session for cleanup when full business port capture fails', () => {
    const value = harness({ missingStep: true, destroyFailures: 1 });
    expect(() => startRace(value.host)).toThrow(/step|清理不完整/u);
    expect(value.host.state).toBe('failed');
    expect(value.calls.destroyedSessionIds).toEqual(['session-1']);
    value.host.destroy();
    expect(value.host.state).toBe('destroyed');
    expect(value.calls.destroyedSessionIds).toEqual(['session-1', 'session-1']);
  });

  it('keeps the candidate isolated and destroys the active generation once', () => {
    const value = harness();
    startRace(value.host);
    value.host.destroy();
    value.host.destroy();
    expect(value.host.state).toBe('destroyed');
    expect(value.calls.destroys).toBe(1);
    expect(ARENA_V2_INFORMATION_MODE_SESSION_HOST_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable', hardGate: false,
      defaultEntryWired: false, defaultNavigationWired: false,
      settledResultFactsVisibleOnlyAfterRewardAndLearningSettlement: true,
      pendingSettlementStatusMayUseExistingResultPage: true,
      restartRequiredSettlementRetainsReadOnlyResultForCrossRestartRecovery: true,
      genericRecoverableFlagsFailClosed: true,
      sessionFactoryPortPreflightsBeforeNavigationConstruction: true,
      cleanupRetriesOnlyIncompleteSessionAndNavigationOwners: true,
      terminalStateWaitsForSessionAndNavigationOwners: true,
      returnedSessionDestroyCapturedBeforeBusinessPortTransfer: true,
      failedPortCaptureRetainsPendingSessionCleanupOwnership: true,
      validationStatus: 'not-run',
    });
  });
});
